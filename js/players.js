/* ============================================================================
 * js/players.js — герои: управление, движение, замах и ИИ кошечки.
 *
 * Игрок 1 — Ам Ням:   WASD, удар: E или Пробел
 * Игрок 2 — кошечка:  стрелки, удар: Enter
 * В режиме «Один игрок» кошечкой управляет ИИ (Players.updateAI).
 *
 * Герой хранится как простой объект (см. makePlayer). Урон, здоровье и
 * попадания мечом появятся на Этапе 3 в combat.js — здесь только движение,
 * анимация и «замах» без последствий.
 * ========================================================================== */
(function () {
  'use strict';

  /* Раскладка клавиш. Можно указывать несколько клавиш на одно действие. */
  var CONTROLS = {
    p1: {
      up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      attack: ['KeyE', 'Space']
    },
    p2: {
      up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      attack: ['Enter', 'NumpadEnter']
    },
    // В сетевой игре телефон (или клавиатура) один на игрока — годится любая раскладка
    both: {
      up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
      left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
      attack: ['KeyE', 'Space', 'Enter', 'NumpadEnter']
    }
  };

  /* Базовые характеристики. На Этапе 4 их будут менять улучшения. */
  var BASE = {
    speed: 205,        // пикселей в секунду
    accel: 1900,       // как быстро разгоняется
    friction: 1500,    // как быстро тормозит
    swingRadius: 78,   // радиус дуги взмаха (на Этапе 3 станет зоной урона)
    maxHp: 5
  };

  /**
   * Комбо из трёх ударов. Если бить не останавливаясь, взмахи идут по цепочке:
   *   1) взмах слева направо,
   *   2) обратный взмах — быстрее,
   *   3) вертушка на 360° — медленнее, больше радиус, сильнее толчок.
   * Если сделать паузу, цепочка сбрасывается на первый удар.
   *
   * time   — длительность взмаха
   * rest   — пауза после взмаха до следующего удара
   * arc    — какой угол проходит лезвие
   * way    — в какую сторону идёт дуга (1 — по часовой, -1 — против)
   * lunge  — рывок героя вперёд в момент удара
   * damage/knockback — понадобятся врагам на Этапе 3
   */
  var COMBO = [
    { time: 0.24, rest: 0.10, arc: 2.0, way: 1, radiusK: 1.00, lunge: 165, damage: 1, knockback: 210 },
    { time: 0.21, rest: 0.10, arc: 2.1, way: -1, radiusK: 1.06, lunge: 195, damage: 1, knockback: 240 },
    { time: 0.46, rest: 0.34, arc: Math.PI * 2, way: 1, radiusK: 1.22, lunge: 120, damage: 2, knockback: 380, spin: true }
  ];

  /** Окно, пока ещё можно продолжить комбо после окончания взмаха. */
  var COMBO_WINDOW = 0.55;

  /** Зажата ли хоть одна клавиша действия. */
  function held(keys, list) {
    for (var i = 0; i < list.length; i++) if (Game.keys[list[i]]) return true;
    return false;
  }
  /** Нажата ли клавиша именно в этом кадре. */
  function tapped(list) {
    for (var i = 0; i < list.length; i++) if (Game.pressed[list[i]]) return true;
    return false;
  }

  function makePlayer(opts) {
    return {
      hero: opts.hero,            // 'omnom' | 'cat'
      costume: 'base',            // сменится на Этапе 7 в гардеробе
      name: opts.name,
      label: opts.label,          // подпись над головой
      color: opts.color,          // цвет подписи и дуги взмаха
      controls: opts.controls,
      isAI: !!opts.isAI,

      x: opts.x, y: opts.y,       // позиция «между лапками» на арене
      vx: 0, vy: 0,
      facing: opts.facing || 1,   // 1 — вправо, -1 — влево
      aimX: opts.facing || 1,     // куда полетит удар (последнее направление движения)
      aimY: 0,

      speed: BASE.speed,
      maxHp: BASE.maxHp,
      hp: BASE.maxHp,

      weaponId: null,                    // что в лапке (см. js/weapons.js)
      weaponLevel: 0,                    // прокачка оружия
      knockMul: 1,                       // множитель отбрасывания от оружия
      atkSpeed: 1,                       // скорость ударов от оружия
      baseSwingRadius: BASE.swingRadius, // размах без оружия

      walk: 0,                    // фаза анимации шага
      attackTimer: 0,             // сколько осталось махать
      cooldown: 0,                // сколько осталось до следующего удара
      swing: null,                // параметры текущего взмаха (см. Players.attack)
      comboIndex: 0,              // какой удар в цепочке следующий
      comboTimer: 0,              // сколько осталось, чтобы продолжить комбо
      swingRadius: BASE.swingRadius,
      hitFlash: 0,                // вспышка после вертушки

      damageMul: 1,               // множитель урона (оружие + улучшения)
      wand: 0,                    // волшебная палочка: удар ещё и стреляет
      magnet: 1,                  // насколько далеко притягиваются конфеты
      slowTimer: 0,               // герой временно увяз (липкие враги)
      dodge: 0,                   // шанс увернуться от удара (экипировка)
      crit: 0,                    // шанс удвоенного урона (перчатки)
      runCards: [],               // карточки, взятые в этом забеге
      invul: 0,                   // неуязвимость после получения урона
      hurtFlash: 0,               // красная вспышка «ой!»
      downed: false,              // лежит в обмороке
      reviveProgress: 0,          // как долго напарник поднимает

      aiTimer: 0,                 // таймеры ИИ
      aiWander: { x: 0, y: 0 }
    };
  }

  var Players = {
    list: [],
    p1: null,
    p2: null,
    BASE: BASE,        // базовые характеристики, ими пользуется upgrades.js

    /** Создаёт героев для новой партии. mode: 'solo' | 'duo'. */
    create: function (mode) {
      var a = Game.arena;
      var cx = (a.left + a.right) / 2;
      var cy = (a.top + a.bottom) / 2;

      Players.p1 = makePlayer({
        hero: 'omnom', name: 'Ам Ням', label: 'P1', color: '#6fb33a',
        controls: CONTROLS.p1, x: cx - 90, y: cy + 40, facing: 1
      });
      Players.p2 = makePlayer({
        hero: 'cat', name: 'Кошечка', label: mode === 'solo' ? 'ИИ' : 'P2', color: '#e0739f',
        controls: CONTROLS.p2, x: cx + 90, y: cy + 40, facing: -1,
        isAI: mode === 'solo'
      });
      Players.list = [Players.p1, Players.p2];

      // Сетевая игра: мой герой — мой, второй — напарника с другого телефона
      if (window.Online && Online.active) {
        var mine = Online.myHero === 'omnom' ? Players.p1 : Players.p2;
        var mate = mine === Players.p1 ? Players.p2 : Players.p1;
        mine.isAI = false; mine.isRemote = false;
        mine.label = 'Я';
        mine.controls = CONTROLS.both;        // на своём телефоне удобно любыми клавишами
        mate.isAI = false; mate.isRemote = true;
        mate.label = 'Напарник';
      }

      // Оружие из лавки + купленные постоянные улучшения
      Upgrades.recalc(Players.p1);
      Upgrades.recalc(Players.p2);
      Players.p1.hp = Players.p1.maxHp;
      Players.p2.hp = Players.p2.maxHp;
    },

    /** Живые герои (пригодится врагам и ИИ на следующих этапах). */
    alive: function () {
      return Players.list.filter(function (p) { return p.hp > 0; });
    },

    update: function (dt) {
      for (var i = 0; i < Players.list.length; i++) {
        var p = Players.list[i];

        if (p.downed) {
          updateDowned(p, dt);
          continue;
        }

        if (p.isRemote) {
          followRemote(p, dt);
        } else {
          var dir = p.isAI ? Players.updateAI(p, dt) : readKeys(p);
          movePlayer(p, dir, dt);
        }
        updateTimers(p, dt);
      }
    },

    /**
     * Гость ведёт своего героя сам, не дожидаясь хозяина: так управление
     * отзывается мгновенно, как у хозяина. Всё остальное (слизни, урон,
     * конфеты) по-прежнему считает хозяин комнаты.
     */
    updateLocal: function (p, dt) {
      if (!p || p.downed) return;
      movePlayer(p, readKeys(p), dt);
      updateTimers(p, dt);
    },

    /** Угол лезвия в момент t (0…1) — combat.js считает по нему попадания. */
    swingAngleOf: function (p, t) { return swingAngle(p, t); },

    /* ----------------------------------------------------------------------
     * ИИ кошечки в режиме «Один игрок». Приоритеты по порядку:
     *   1) напарник лежит — бежим поднимать;
     *   2) есть слизни — идём к ближайшему и бьём, когда он рядом;
     *   3) никого нет — гуляем рядом с Ам Нямом.
     * -------------------------------------------------------------------- */
    updateAI: function (p, dt) {
      var mate = (p === Players.p1) ? Players.p2 : Players.p1;
      var want = { x: 0, y: 0 };
      p.aiTimer -= dt;

      var foe = (window.Enemies && Enemies.list.length) ? nearestEnemy(p) : null;

      if (mate.downed) {
        // Поднимаем напарника: подходим вплотную и стоим рядом
        var rx = mate.x - p.x, ry = mate.y - p.y;
        var rd = Math.hypot(rx, ry) || 1;
        if (rd > 42) { want.x = rx / rd; want.y = ry / rd; }
      } else if (foe) {
        var dx = foe.x - p.x, dy = foe.y - p.y;
        var dist = Math.hypot(dx, dy) || 1;
        var reach = p.swingRadius * 0.8 + foe.r;

        // На последнем сердечке или в толпе кошечка осторожничает
        var scared = p.hp <= 1 || crowded(p, 4);
        var keep = scared ? reach + 55 : reach;

        // Если ей плохо, а рядом лежит сердечко — бежит за ним
        var heal = scared ? nearestHeart(p) : null;
        if (heal) {
          var hx = heal.x - p.x, hy = heal.y - p.y;
          var hd = Math.hypot(hx, hy) || 1;
          want.x = hx / hd; want.y = hy / hd;
          p.aimX = want.x; p.aimY = want.y;
          return want;
        }

        if (dist > keep) {                        // подбегаем
          want.x = dx / dist; want.y = dy / dist;
        } else if (dist < keep * 0.62) {          // слишком близко — отступаем
          want.x = -dx / dist * 0.85; want.y = -dy / dist * 0.85;
        } else {
          // Кружит вокруг слизня, а не стоит столбом
          want.x = -dy / dist * 0.5; want.y = dx / dist * 0.5;
        }

        // Бьём, когда слизень в досягаемости
        if (dist < reach + 12 && p.cooldown <= 0) Players.attack(p, Math.atan2(dy, dx));
      } else {
        var mx = mate.x - p.x, my = mate.y - p.y;
        var md = Math.hypot(mx, my) || 1;

        if (p.aiTimer <= 0) {                     // новая точка «потоптаться»
          p.aiTimer = 1.2 + Math.random() * 1.6;
          var ang = Math.random() * Math.PI * 2;
          p.aiWander.x = Math.cos(ang) * 40;
          p.aiWander.y = Math.sin(ang) * 30;
          if (Math.random() < 0.3) Players.attack(p, Math.atan2(my, mx));
        }

        if (md > 130) { want.x = mx / md; want.y = my / md; }
        else if (md < 70) { want.x = -mx / md; want.y = -my / md; }
        else {
          var tx = mate.x + p.aiWander.x - p.x;
          var ty = mate.y + p.aiWander.y - p.y;
          var tl = Math.hypot(tx, ty);
          if (tl > 12) { want.x = tx / tl * 0.65; want.y = ty / tl * 0.65; }
        }
      }

      // Кошечка тоже «целится» туда, куда бежит
      var wl = Math.hypot(want.x, want.y);
      if (wl > 0.05) { p.aimX = want.x / wl; p.aimY = want.y / wl; }
      return want;
    },

    /**
     * Начать взмах. Бьём в ту сторону, куда герой бежит (8 направлений:
     * вверх, вниз, вбок и по диагоналям), а если стоит — куда смотрел.
     * angle — можно задать угол вручную (этим пользуется ИИ).
     */
    attack: function (p, angle) {
      if (p.cooldown > 0 || p.attackTimer > 0 || p.hp <= 0) return false;

      var aim = (angle != null) ? angle : Math.atan2(p.aimY, p.aimX);
      var step = COMBO[p.comboIndex];
      var spd = p.atkSpeed || 1;            // быстрое оружие машет чаще
      var time = step.time / spd;

      if (window.Sound) Sound.play('swing');
      p.swing = {
        aim: aim,
        from: step.spin ? aim - 0.5 : aim - step.arc / 2 * step.way,
        to: step.spin ? aim - 0.5 + step.arc : aim + step.arc / 2 * step.way,
        radius: p.swingRadius * step.radiusK,
        damage: step.damage,
        knockback: step.knockback * (p.knockMul || 1),
        spin: !!step.spin,
        time: time,
        index: p.comboIndex,
        hit: []           // кого уже задели этим взмахом (пригодится на Этапе 3)
      };

      p.attackTimer = time;
      p.cooldown = time + step.rest / spd;
      p.comboTimer = time + COMBO_WINDOW;

      // Гость сообщает хозяину о каждом своём ударе — урон посчитает хозяин
      var guest = window.Online && Online.isGuest();
      if (guest && !p.isRemote) Online.noteAttack();

      // Волшебная палочка: вместе со взмахом летит звёздочка
      // (у гостя звёздочки присылает хозяин вместе с картинкой мира)
      if (p.wand > 0 && !guest) {
        var shots = p.wand >= 3 ? 2 : 1;
        for (var si = 0; si < shots; si++) {
          var spread = shots > 1 ? (si === 0 ? -0.12 : 0.12) : 0;
          Combat.heroShot(p, aim + spread, {
            damage: Math.round(p.wand * p.damageMul * 0.6 * 10) / 10,
            color: p.hero === 'cat' ? '#ffd7f0' : '#d8ffb0',
            dark: p.color,
            knockback: 120
          });
        }
      }

      // Рывок в сторону удара — удар чувствуется весомее
      Players.push(p, Math.cos(aim), Math.sin(aim), step.lunge);

      // Поворачиваем героя лицом к удару (если бьём не строго вверх/вниз)
      if (Math.abs(Math.cos(aim)) > 0.25) p.facing = Math.cos(aim) > 0 ? 1 : -1;

      // Следующий удар в цепочке; после вертушки начинаем заново
      p.comboIndex = (p.comboIndex + 1) % COMBO.length;
      return true;
    },

    /** Толчок (отбрасывание) — пригодится врагам на Этапе 3. */
    push: function (p, dx, dy, force) {
      var d = Math.hypot(dx, dy) || 1;
      p.vx += dx / d * force;
      p.vy += dy / d * force;
    },

    /* ----------------------------------------------------------------------
     * Отрисовка. Герои сортируются по Y: кто ниже — рисуется поверх.
     * -------------------------------------------------------------------- */
    draw: function (c) {
      var sorted = Players.list.slice().sort(function (a, b) { return a.y - b.y; });
      for (var i = 0; i < sorted.length; i++) drawPlayer(c, sorted[i]);
    },

    /** Рисование одного героя — порядок задаёт main.js вместе с врагами. */
    drawOne: function (c, p) { drawPlayer(c, p); }
  };

  /* ------------------------------------------------------------------------
   * Чтение клавиш живого игрока → направление движения (-1..1 по осям)
   * ---------------------------------------------------------------------- */
  /**
   * Прочитать управление, ничего не делая: {x, y, a}.
   * Нужно сетевой игре — гость отправляет это хозяину (js/online.js).
   */
  Players.rawInput = function (p) {
    var ctl = p.controls;
    var x = 0, y = 0, a = false;
    if (inShop()) return { x: 0, y: 0, a: false };
    if (held(Game.keys, ctl.left)) x -= 1;
    if (held(Game.keys, ctl.right)) x += 1;
    if (held(Game.keys, ctl.up)) y -= 1;
    if (held(Game.keys, ctl.down)) y += 1;

    var touch = window.Touch ? Touch.inputFor(p) : null;
    if (touch) {
      if (touch.dx || touch.dy) { x = touch.dx; y = touch.dy; }
      if (touch.attack) a = true;
    }
    if (tapped(ctl.attack)) a = true;
    return { x: x, y: y, a: a };
  };

  /** Игрок заглянул в лавку посреди забега — его герой стоит и не бьёт. */
  function inShop() {
    return !!(window.Shop && Shop.inGame);
  }

  function readKeys(p) {
    var ctl = p.controls;
    var dir = { x: 0, y: 0 };
    if (inShop()) return dir;
    if (held(Game.keys, ctl.left)) dir.x -= 1;
    if (held(Game.keys, ctl.right)) dir.x += 1;
    if (held(Game.keys, ctl.up)) dir.y -= 1;
    if (held(Game.keys, ctl.down)) dir.y += 1;

    // Управление пальцем (телефон/планшет) — работает вместе с клавиатурой
    var touch = window.Touch ? Touch.inputFor(p) : null;
    if (touch) {
      if (touch.dx || touch.dy) { dir.x = touch.dx; dir.y = touch.dy; }
      // Палец на кнопке удара — бьём очередями, как только проходит задержка
      if (touch.attack && p.cooldown <= 0) Players.attack(p);
    }

    // Запоминаем направление — в него и уйдёт удар (в том числе вверх и вниз)
    if (dir.x || dir.y) {
      var l = Math.hypot(dir.x, dir.y);
      p.aimX = dir.x / l;
      p.aimY = dir.y / l;
    }

    if (tapped(ctl.attack)) Players.attack(p);
    return dir;
  }

  /**
   * Герой напарника с другого телефона (считает хозяин комнаты).
   * Напарник сам двигает своего героя и присылает, где тот стоит и куда
   * смотрит, — здесь герой плавно идёт в эту точку. Удары напарника
   * выполняются здесь же: попадания и урон считает хозяин.
   */
  function followRemote(p, dt) {
    var inp = window.Online && Online.remoteInput;
    if (!inp || inp.px == null) {                 // напарник ещё ничего не прислал
      movePlayer(p, { x: 0, y: 0 }, dt);
      return;
    }
    var k = Math.min(1, dt * 18);
    p.x += (inp.px - p.x) * k;
    p.y += (inp.py - p.y) * k;
    p.vx = inp.vx;
    p.vy = inp.vy;
    if (inp.f) p.facing = inp.f;
    if (inp.ax || inp.ay) { p.aimX = inp.ax; p.aimY = inp.ay; }
    p.walk += dt * (Math.hypot(p.vx, p.vy) > 20 ? 9 : 2.4);

    // Удар ждёт, пока пройдёт задержка, но не дольше трети секунды
    if (inp.atk > 0) {
      if (Players.attack(p)) inp.atk--;
      else if ((inp.atkAge += dt) > 0.35) { inp.atk = 0; }
      if (!inp.atk) inp.atkAge = 0;
    }
  }

  /* ------------------------------------------------------------------------
   * Движение с разгоном и торможением + границы арены
   * ---------------------------------------------------------------------- */
  function movePlayer(p, dir, dt) {
    var len = Math.hypot(dir.x, dir.y);
    var attacking = p.attackTimer > 0;

    // Особенности арены: на льду скользко, в песке медленнее
    var icy = Game.mod.ice;
    var sandy = Game.mod.sand;

    if (len > 0 && !attacking) {
      // По диагонали скорость такая же, как по прямой
      var nx = dir.x / len, ny = dir.y / len;
      var target = p.speed * (sandy ? 0.82 : 1) * (p.slowTimer > 0 ? 0.55 : 1);
      if (icy) target *= 1.1;
      var accel = BASE.accel * (icy ? 0.35 : 1);
      p.vx += (nx * target - p.vx) * Math.min(1, accel / target * dt);
      p.vy += (ny * target - p.vy) * Math.min(1, accel / target * dt);
      if (Math.abs(nx) > 0.2) p.facing = nx > 0 ? 1 : -1;
      p.walk += dt * 9;
    } else {
      // Во время удара управление не работает: герой скользит по инерции
      // от рывка — поэтому удар и ощущается как удар.
      var sp = Math.hypot(p.vx, p.vy);
      var baseDrop = attacking ? 680 : BASE.friction;
      if (icy) baseDrop *= 0.22;            // на льду тормозить нечем
      var drop = baseDrop * dt;
      if (sp <= drop) { p.vx = 0; p.vy = 0; }
      else { p.vx -= p.vx / sp * drop; p.vy -= p.vy / sp * drop; }
      p.walk += dt * (len > 0 ? 5 : 2.4); // на месте — спокойное «дыхание»
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Звёздный ветер сдувает героев в сторону
    if (Game.mod.wind) {
      p.x += Game.wind.x * dt;
      p.y += Game.wind.y * dt;
    }

    // Границы арены: дальше края герой не убежит
    var a = Game.arena;
    if (p.x < a.left) { p.x = a.left; p.vx = 0; }
    if (p.x > a.right) { p.x = a.right; p.vx = 0; }
    if (p.y < a.top) { p.y = a.top; p.vy = 0; }
    if (p.y > a.bottom) { p.y = a.bottom; p.vy = 0; }
  }

  /** Ближайшее сердечко на земле — за ним ИИ бежит, когда ранен. */
  function nearestHeart(p) {
    if (!window.Combat) return null;
    var best = null, bestD = 260;
    for (var i = 0; i < Combat.drops.length; i++) {
      var d = Combat.drops[i];
      if (d.kind !== 'heart') continue;
      var dist = Math.hypot(d.x - p.x, d.y - p.y);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best;
  }

  /** Многовато ли слизней вокруг героя (чтобы ИИ не лез в толпу). */
  function crowded(p, limit) {
    var n = 0;
    for (var i = 0; i < Enemies.list.length; i++) {
      var e = Enemies.list[i];
      if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 110) n++;
    }
    return n >= limit;
  }

  /** Ближайший слизень к герою. */
  function nearestEnemy(p) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < Enemies.list.length; i++) {
      var e = Enemies.list[i];
      if (e.dead || e.spawnIn > 0) continue;
      var d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  /* ------------------------------------------------------------------------
   * Герой в обмороке: лежит, пока напарник не поднимет.
   * Напарнику достаточно постоять рядом — через пару секунд герой встаёт
   * с двумя сердечками. Вот вам и кооператив ♥
   * ---------------------------------------------------------------------- */
  var REVIVE_TIME = 2.2;
  var REVIVE_RANGE = 64;

  function updateDowned(p, dt) {
    p.vx *= 0.85; p.vy *= 0.85;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.attackTimer = 0;
    p.swing = null;
    if (p.invul > 0) p.invul = Math.max(0, p.invul - dt);
    if (p.hurtFlash > 0) p.hurtFlash = Math.max(0, p.hurtFlash - dt);

    // Есть ли рядом напарник на ногах
    var helper = null;
    for (var i = 0; i < Players.list.length; i++) {
      var q = Players.list[i];
      if (q === p || q.downed) continue;
      if (Math.hypot(q.x - p.x, q.y - p.y) < REVIVE_RANGE) helper = q;
    }

    if (helper) {
      p.reviveProgress += dt;
      if (p.reviveProgress >= REVIVE_TIME) {
        p.downed = false;
        if (window.Sound) Sound.play('revive');
        p.reviveProgress = 0;
        p.hp = Math.min(p.maxHp, 2);
        p.invul = 1.4;
        Combat.floatText(p.x, p.y - 80, 'спасибо! ♥', '#ff8fb4');
        Combat.particles(p.x, p.y - 40, '#ffd6e6', 16, { speed: 130, star: true });
      }
    } else {
      p.reviveProgress = Math.max(0, p.reviveProgress - dt * 0.5);
    }
  }

  function updateTimers(p, dt) {
    if (p.slowTimer > 0) p.slowTimer = Math.max(0, p.slowTimer - dt);
    if (p.invul > 0) p.invul = Math.max(0, p.invul - dt);
    if (p.hurtFlash > 0) p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    if (p.attackTimer > 0) {
      p.attackTimer = Math.max(0, p.attackTimer - dt);
      // Вертушка на середине даёт вспышку вокруг героя
      if (p.swing && p.swing.spin && p.attackTimer === 0) p.hitFlash = 0.35;
    }
    if (p.attackTimer === 0) p.swing = null;
    if (p.cooldown > 0) p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);

    // Не успел ударить снова — цепочка комбо сбрасывается на первый удар
    if (p.comboTimer > 0) {
      p.comboTimer = Math.max(0, p.comboTimer - dt);
      if (p.comboTimer === 0) p.comboIndex = 0;
    }
  }

  /* ------------------------------------------------------------------------
   * Рисование героя: тень, дуга взмаха, спрайт, подпись
   * ---------------------------------------------------------------------- */
  /** Плавное начало-конец взмаха: сначала резко, в конце мягко. */
  function ease(t) { return 1 - Math.pow(1 - t, 2.2); }

  /** Текущий угол лезвия для взмаха p.swing. */
  function swingAngle(p, t) {
    var s = p.swing;
    return s.from + (s.to - s.from) * (s.spin ? t : ease(t));
  }

  function drawPlayer(c, p) {
    if (p.downed) { drawDowned(c, p); return; }

    var moving = Math.hypot(p.vx, p.vy) > 20;
    var s = p.swing;
    var t = s ? 1 - p.attackTimer / s.time : 0; // 0→1 за взмах

    // Прыгающая походка: подпрыгивает и пружинит.
    // Чем меньше здоровья, тем тяжелее дыхание и заметнее дрожь.
    var tired = Emotions.tiredness(p);
    var hop = moving ? Math.abs(Math.sin(p.walk)) * (7 - tired * 2.5) : 0;
    var squash = 1 + Math.sin(p.walk * (moving ? 2 : 1)) * (moving ? 0.05 : 0.03 + tired * 0.05);
    var tremble = tired ? Math.sin(Game.time * 17) * 0.02 * tired : 0;

    // Наклон в сторону удара; на вертушке герой ещё и разворачивается
    var facing = p.facing;
    var lean = tremble;
    if (s) {
      var a = swingAngle(p, t);
      lean = Math.sin(t * Math.PI) * (s.spin ? 0.3 : 0.24) * (Math.cos(s.aim) >= 0 ? 1 : -1);
      if (s.spin) facing = Math.cos(a) >= 0 ? 1 : -1;
      if (s.spin) squash *= 1 + Math.sin(t * Math.PI) * 0.06;
    }

    Game.drawShadow(c, p.x, p.y, 30 - hop * 0.25);

    if (p.hitFlash > 0) drawFlash(c, p);
    if (s) drawSwing(c, p, t);

    // Мигание после удара: пару раз пропадаем
    var blink = p.invul > 0 && Math.floor(p.invul * 12) % 2 === 0 ? 0.45 : 1;

    drawHeroSprite(c, p, p.x, p.y - hop, {
      flip: facing < 0,
      squashX: 1 / squash,
      squashY: squash,
      rot: lean,
      alpha: blink,
      step: moving ? 1 : 0
    });

    // Оружие в лапке — тем же кодом, что и на карточке в магазине
    Weapons.drawInHand(c, p, hop);

    // Настроение на мордочке: бровки, капелька, нотки
    Emotions.draw(c, p, hop);

    // Красная вспышка «ой!» поверх героя
    if (p.hurtFlash > 0) {
      c.save();
      c.globalAlpha = p.hurtFlash * 0.8;
      c.fillStyle = '#ff5f8f';
      c.beginPath();
      c.ellipse(p.x, p.y - 40 - hop, 34, 42, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    // Подпись над головой (P1 / P2 / ИИ) и сердечки
    var tagY = p.y - hop - 104;
    c.font = '900 13px Nunito, "Segoe UI", sans-serif';
    var tagW = Math.max(40, c.measureText(p.label).width + 18);   // «Напарник» длиннее «P1»
    c.fillStyle = p.color;
    Game.roundRect(c, p.x - tagW / 2, tagY - 11, tagW, 22, 11);
    c.fill();
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(p.label, p.x, tagY + 1);

    drawHearts(c, p, tagY - 24);
  }

  /* ------------------------------------------------------------------------
   * Ножки на бегу.
   *
   * Спрайты у нас — цельные картинки, поэтому «шаг» делаем так: нижнюю полосу
   * картинки (там, где лапки) рисуем отдельно, разрезав пополам, и по очереди
   * приподнимаем половинки. Верх картинки при этом рисуется без этой полосы,
   * чтобы лапки не двоились. Получается, что герой перебирает лапками.
   *
   * Числа — в пикселях исходного спрайта, считая от точки между лапками.
   * ---------------------------------------------------------------------- */
  var LEGS = {
    // top — линия разреза: ниже неё только лапки, туловище не трогаем
    omnom: { top: -34, bottom: 30, split: -2, squash: 0.3 },
    cat: { top: -15, bottom: 30, split: 0, squash: 0.34 }
  };

  function drawHeroSprite(c, p, x, y, opts) {
    var name = Assets.spriteName(p.hero, p.costume);
    var sp = Assets.sprites[name];
    var img = Assets.images[name];
    var legs = LEGS[p.hero];
    var scale = Assets.drawScale;

    // Нет картинки или герой стоит — рисуем обычным способом
    if (!sp || !img || !legs || !opts.step) {
      Game.drawSprite(c, name, x, y, scale, opts);
      return;
    }

    // Фаза шага: лапки по очереди поджимаются (сжимаются по высоте),
    // из-за чего лапка будто отрывается от земли. Так надёжнее, чем
    // сдвигать её: при сдвиге край лапки уезжал за границу обрезки и
    // на мгновение пропадал.
    var kA = Math.max(0, Math.sin(p.walk)) * legs.squash;
    var kB = Math.max(0, Math.sin(p.walk + Math.PI)) * legs.squash;

    c.save();
    c.translate(x, y);
    if (opts.alpha != null) c.globalAlpha = opts.alpha;
    if (opts.rot) c.rotate(opts.rot);
    c.scale(scale * (opts.squashX || 1) * (opts.flip ? -1 : 1), scale * (opts.squashY || 1));

    var W = 400;                       // с запасом по бокам
    var left = -sp.ax, top = -sp.ay;

    // 1) всё, что выше лапок
    c.save();
    c.beginPath();
    c.rect(-W, -W, W * 2, W + legs.top);
    c.clip();
    c.drawImage(img, left, top, sp.w, sp.h);
    c.restore();

    // 2) левая лапка — поджимается к линии разреза
    drawLeg(c, img, left, top, sp, legs, -W, W + legs.split, kA);

    // 3) правая лапка — в противофазе
    drawLeg(c, img, left, top, sp, legs, legs.split, W, kB);

    c.restore();
  }

  /**
   * Одна лапка: обрезаем её половину полосы и сжимаем по высоте к линии
   * разреза. Содержимое при этом остаётся внутри обрезки — ничего не пропадает.
   */
  function drawLeg(c, img, left, top, sp, legs, x0, width, k) {
    c.save();
    c.beginPath();
    c.rect(x0, legs.top, width, legs.bottom - legs.top);
    c.clip();
    c.translate(0, legs.top);
    c.scale(1, 1 - k);
    c.translate(0, -legs.top);
    c.drawImage(img, left, top, sp.w, sp.h);
    c.restore();
  }

  /** Сердечки жизни над головой плюс цифры «осталось/всего». */
  function drawHearts(c, p, y) {
    var step = 15;
    var total = (p.maxHp - 1) * step;
    var label = p.hp + '/' + p.maxHp;

    c.save();
    c.font = '900 12px Nunito, "Segoe UI", sans-serif';
    var lw = c.measureText(label).width;
    // Сердечки и подпись стоят рядом, вместе по центру над головой
    var block = total + 14 + lw;
    var x0 = p.x - block / 2 + 7;

    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255, 250, 244, 0.9)';
    c.strokeText(label, x0 + total + 12, y + 1);
    c.fillStyle = p.hp <= 1 ? '#e0455f' : '#5b3b3f';
    c.fillText(label, x0 + total + 12, y + 1);
    c.restore();

    for (var i = 0; i < p.maxHp; i++) {
      var full = i < p.hp;
      c.save();
      c.translate(x0 + i * step, y);
      c.globalAlpha = full ? 1 : 0.35;
      c.fillStyle = full ? '#ff6f9d' : '#ffffff';
      c.strokeStyle = '#d33f74';
      c.lineWidth = 1.6;
      heartPath(c, 6);
      c.fill();
      c.stroke();
      c.restore();
    }
  }

  function heartPath(c, s) {
    c.beginPath();
    c.moveTo(0, s * 0.42);
    c.bezierCurveTo(-s * 1.15, -s * 0.32, -s * 0.45, -s * 1.05, 0, -s * 0.42);
    c.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.15, -s * 0.32, 0, s * 0.42);
    c.closePath();
  }

  /** Герой в обмороке: лежит, вокруг кружочек подъёма. */
  function drawDowned(c, p) {
    Game.drawShadow(c, p.x, p.y, 32);
    Game.drawSprite(c, Assets.spriteName(p.hero, p.costume), p.x, p.y, Assets.drawScale * 0.95, {
      flip: p.facing < 0,
      rot: (p.facing < 0 ? 1 : -1) * Math.PI / 2,
      alpha: 0.85
    });

    Emotions.drawDowned(c, p);

    // Полоска подъёма напарником
    var k = p.reviveProgress / REVIVE_TIME;
    c.save();
    c.translate(p.x, p.y - 58);
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(0, 0, 20, -Math.PI / 2, Math.PI * 2 - Math.PI / 2);
    c.stroke();
    if (k > 0) {
      c.strokeStyle = p.color;
      c.beginPath();
      c.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, k));
      c.stroke();
    }
    c.fillStyle = '#fff';
    c.font = '900 14px Nunito, "Segoe UI", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('zZ', 0, 1);
    c.restore();
  }

  /**
   * Дуга взмаха: светлый шлейф от начала взмаха до текущего угла,
   * яркая кромка цветом героя и искорки на острие.
   * На Этапе 3 по этой же дуге будет считаться урон, а меч получит свой вид.
   */
  function drawSwing(c, p, t) {
    var s = p.swing;
    var a = swingAngle(p, t);
    var r = s.radius;
    var trail = Weapons.of(p).trail || '#ffffff';

    c.save();
    c.translate(p.x, p.y - 34);
    c.lineCap = 'round';

    // Светлый шлейф: рисуем дугу кусочками, к концу они ярче и толще
    var seg = s.spin ? 20 : 10;
    for (var i = 0; i < seg; i++) {
      var a0 = s.from + (a - s.from) * (i / seg);
      var a1 = s.from + (a - s.from) * ((i + 1) / seg);
      var k = i / seg;
      c.globalAlpha = (0.05 + 0.36 * k) * (1 - t * 0.3);
      c.lineWidth = 4 + 9 * k;
      c.strokeStyle = trail;
      c.beginPath();
      c.arc(0, 0, r * 0.9, a0, a1 + 0.02);
      c.stroke();
    }

    // Яркая кромка на текущем угле — цветом героя
    c.globalAlpha = 0.9 * (1 - t * 0.45);
    c.lineWidth = s.spin ? 6 : 5;
    c.strokeStyle = p.color;
    c.beginPath();
    c.arc(0, 0, r * 0.9, a - 0.32, a);
    c.stroke();

    // Искорки на острие
    var tipX = Math.cos(a) * r * 0.9, tipY = Math.sin(a) * r * 0.9;
    c.globalAlpha = 0.85 * (1 - t * 0.5);
    c.fillStyle = '#fffdf2';
    star(c, tipX, tipY, 7 + Math.sin(t * 9) * 2);
    c.globalAlpha = 0.5 * (1 - t);
    star(c, tipX * 0.82 - 4, tipY * 0.82 + 3, 4);
    c.restore();
  }

  /** Четырёхлучевая звёздочка-искорка. */
  function star(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y - s);
    c.quadraticCurveTo(x + s * 0.16, y - s * 0.16, x + s, y);
    c.quadraticCurveTo(x + s * 0.16, y + s * 0.16, x, y + s);
    c.quadraticCurveTo(x - s * 0.16, y + s * 0.16, x - s, y);
    c.quadraticCurveTo(x - s * 0.16, y - s * 0.16, x, y - s);
    c.fill();
  }

  /** Вспышка-кольцо после вертушки. */
  function drawFlash(c, p) {
    var k = 1 - p.hitFlash / 0.35;   // 0 → 1
    c.save();
    c.globalAlpha = (1 - k) * 0.7;
    c.strokeStyle = p.color;
    c.lineWidth = 7 * (1 - k) + 2;
    c.beginPath();
    c.arc(p.x, p.y - 34, p.swingRadius * (0.9 + k * 0.7), 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  window.Players = Players;
})();

