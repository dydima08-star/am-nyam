/* ============================================================================
 * js/boss.js — боссы: по одному в конце каждого из двадцати четырёх миров.
 *
 * Босс живёт в том же списке, что и обычные слизни (Enemies.list), только с
 * пометкой isBoss — поэтому удары мечом, отбрасывание и всё остальное работают
 * для него сами собой. Отличается он поведением и размером.
 *
 * У каждого босса три фазы. На 2/3 и на 1/3 здоровья он злится: ускоряется и
 * открывает новые приёмы. Перед опасными приёмами он замирает и показывает
 * предупреждение — круг или стрелку на земле, так что всегда есть секунда
 * отбежать.
 *
 * Приёмы (из них собираются наборы фаз):
 *   dash   — рывок через всю арену
 *   slam   — прыжок и удар с волной по кругу
 *   spread — веер снарядов во все стороны
 *   aimed  — три прицельных плевка
 *   summon — зовёт помощников
 *   spin   — крутится волчком и катается по арене
 *   shield — ненадолго закрывается щитом
 *   puddle — разливает липкие лужи
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * Двадцать четыре босса. hp — базовое здоровье (дальше умножается на сложность
   * мира), shape — форма тела, abilities — наборы приёмов по фазам.
   * ---------------------------------------------------------------------- */
  var BOSSES = [
    { name: 'Королева-желе', title: 'хозяйка сладкого луга', shape: 'crown',
      hp: 55, r: 58, speed: 44, body: '#8fd14f', dark: '#3f7a1f', accent: '#ffd54a',
      abilities: [['dash', 'summon'], ['dash', 'summon', 'spread'], ['spin', 'dash', 'summon', 'spread']] },

    { name: 'Клубничный великан', title: 'ягодный силач', shape: 'berry',
      hp: 70, r: 62, speed: 40, body: '#ff8fb4', dark: '#c23a66', accent: '#ffffff',
      abilities: [['slam', 'summon'], ['slam', 'dash', 'spread'], ['slam', 'spin', 'summon', 'spread']] },

    { name: 'Мятный вихрь', title: 'быстрый и свежий', shape: 'swirl',
      hp: 78, r: 54, speed: 62, body: '#8fe6c4', dark: '#2f8f6c', accent: '#ffffff',
      abilities: [['dash', 'aimed'], ['spin', 'dash', 'aimed'], ['spin', 'dash', 'spread', 'summon']] },

    { name: 'Медовый шмель', title: 'липкий и вредный', shape: 'bee',
      hp: 88, r: 58, speed: 50, body: '#ffc93c', dark: '#a9762f', accent: '#5b3b3f',
      abilities: [['puddle', 'aimed'], ['puddle', 'dash', 'summon'], ['puddle', 'spread', 'dash', 'summon']] },

    { name: 'Снеговик-громила', title: 'три снежных кома', shape: 'snowman',
      hp: 100, r: 64, speed: 44, body: '#ffffff', dark: '#7fa8c4', accent: '#ff6f6f',
      abilities: [['dash', 'spread'], ['slam', 'dash', 'summon'], ['spin', 'slam', 'spread', 'summon']] },

    { name: 'Ледяная королева', title: 'холод в каждом взгляде', shape: 'icecrown',
      hp: 112, r: 58, speed: 48, body: '#bfe9ff', dark: '#4b8fb3', accent: '#ffffff',
      abilities: [['aimed', 'puddle'], ['spread', 'puddle', 'shield'], ['spread', 'dash', 'summon', 'shield']] },

    { name: 'Хозяин снежного леса', title: 'старый и крепкий', shape: 'antlers',
      hp: 126, r: 66, speed: 40, body: '#c6dbe0', dark: '#5d7a80', accent: '#a8cfd6',
      abilities: [['slam', 'summon'], ['slam', 'dash', 'shield'], ['slam', 'spin', 'summon', 'spread']] },

    { name: 'Морозный дракончик', title: 'дышит вьюгой', shape: 'dragon',
      hp: 140, r: 60, speed: 56, body: '#cdd8ff', dark: '#5568a8', accent: '#ffffff',
      abilities: [['spread', 'dash'], ['spread', 'dash', 'aimed'], ['spread', 'spin', 'dash', 'summon']] },

    { name: 'Карамельный краб', title: 'клешни как ножницы', shape: 'claws',
      hp: 152, r: 64, speed: 52, body: '#ff8f8f', dark: '#c23a3a', accent: '#ffd7a8',
      abilities: [['dash', 'puddle'], ['dash', 'spin', 'puddle'], ['dash', 'spin', 'spread', 'summon']] },

    { name: 'Кит из карамели', title: 'огромный и добрый, но злится', shape: 'whale',
      hp: 168, r: 72, speed: 36, body: '#ff9f70', dark: '#c2532a', accent: '#ffe9d6',
      abilities: [['slam', 'spread'], ['slam', 'spread', 'summon'], ['slam', 'spin', 'spread', 'summon']] },

    { name: 'Зефирная принцесса', title: 'нежная снаружи', shape: 'tiara',
      hp: 180, r: 58, speed: 54, body: '#ffd7f0', dark: '#d45d9e', accent: '#ffffff',
      abilities: [['summon', 'aimed'], ['summon', 'shield', 'spread'], ['summon', 'shield', 'spread', 'dash']] },

    { name: 'Кисельный змей', title: 'течёт куда хочет', shape: 'serpent',
      hp: 196, r: 62, speed: 58, body: '#9fb8f0', dark: '#4a5f96', accent: '#d9e6ff',
      abilities: [['dash', 'puddle'], ['dash', 'puddle', 'spread'], ['dash', 'spin', 'puddle', 'summon']] },

    { name: 'Шоколадный голем', title: 'тяжёлый как плитка', shape: 'bar',
      hp: 214, r: 70, speed: 34, body: '#8b5a2b', dark: '#3b2210', accent: '#e3b06a',
      abilities: [['slam', 'summon'], ['slam', 'dash', 'shield'], ['slam', 'spin', 'summon', 'spread']] },

    { name: 'Пряничный мастер', title: 'печёт помощников', shape: 'chef',
      hp: 230, r: 60, speed: 46, body: '#e3b06a', dark: '#8b5a2b', accent: '#ffffff',
      abilities: [['summon', 'aimed'], ['summon', 'spread', 'shield'], ['summon', 'spread', 'dash', 'shield']] },

    { name: 'Ореховый барон', title: 'скорлупа крепче камня', shape: 'nutcap',
      hp: 248, r: 66, speed: 48, body: '#d9a86a', dark: '#7a4526', accent: '#fff0c2',
      abilities: [['dash', 'shield'], ['dash', 'slam', 'shield'], ['dash', 'spin', 'slam', 'summon']] },

    { name: 'Какао-волна', title: 'поднимается из реки', shape: 'wave',
      hp: 266, r: 68, speed: 52, body: '#6f4320', dark: '#2f1a0c', accent: '#d9a86a',
      abilities: [['puddle', 'spread'], ['puddle', 'spread', 'summon'], ['puddle', 'spin', 'spread', 'dash']] },

    { name: 'Звёздный садовник', title: 'растит колючие звёзды', shape: 'star',
      hp: 286, r: 62, speed: 54, body: '#ffdf5e', dark: '#c99a13', accent: '#ffffff',
      abilities: [['spread', 'summon'], ['spread', 'summon', 'aimed'], ['spread', 'spin', 'summon', 'dash']] },

    { name: 'Лунный страж', title: 'светится в темноте', shape: 'moonhalo',
      hp: 306, r: 64, speed: 50, body: '#cdd8ff', dark: '#5568a8', accent: '#ffffff',
      abilities: [['shield', 'aimed'], ['shield', 'spread', 'dash'], ['shield', 'spread', 'spin', 'summon']] },

    { name: 'Комета-хулиганка', title: 'носится без остановки', shape: 'comet',
      hp: 326, r: 58, speed: 74, body: '#8fd6ff', dark: '#2f5d8a', accent: '#ffffff',
      abilities: [['dash', 'dash', 'spread'], ['dash', 'spin', 'spread'], ['dash', 'spin', 'spread', 'summon']] },

    { name: 'Король конфет', title: 'хозяин звёздного замка', shape: 'kingcrown',
      hp: 420, r: 76, speed: 52, body: '#ff8fd0', dark: '#8a2f6a', accent: '#ffdf5e',
      abilities: [['summon', 'spread', 'dash'], ['summon', 'spread', 'slam', 'shield'],
                  ['summon', 'spread', 'spin', 'dash', 'slam']] },

    { name: 'Облачный барашек', title: 'пушистый, но бодается', shape: 'fleece',
      hp: 440, r: 70, speed: 56, body: '#ffffff', dark: '#8fa8c8', accent: '#ffd6ec',
      abilities: [['dash', 'summon'], ['dash', 'slam', 'summon'], ['dash', 'spin', 'slam', 'summon']] },

    { name: 'Радужный единорог', title: 'стреляет всеми цветами', shape: 'horn',
      hp: 470, r: 64, speed: 60, body: '#f3e8ff', dark: '#8a6ac9', accent: '#ffdf5e',
      abilities: [['spread', 'aimed'], ['spread', 'aimed', 'dash'], ['spread', 'spin', 'aimed', 'summon']] },

    { name: 'Грозовой великан', title: 'гремит и мечет молнии', shape: 'bolt',
      hp: 500, r: 76, speed: 42, body: '#8a93b8', dark: '#3a4266', accent: '#ffe066',
      abilities: [['slam', 'aimed'], ['slam', 'spread', 'puddle'], ['slam', 'spin', 'spread', 'summon']] },

    { name: 'Тёмный Король конфет', title: 'вернулся — и он последний', shape: 'darkcrown',
      hp: 600, r: 80, speed: 56, body: '#5a2f52', dark: '#1a0d1a', accent: '#ffdf5e',
      abilities: [['spread', 'dash', 'aimed'], ['summon', 'spread', 'slam', 'shield'],
                  ['summon', 'spread', 'spin', 'dash', 'slam', 'puddle']] }
  ];

  var Boss = {
    list: BOSSES,

    /** Описание босса для мира (1…24). */
    forWorld: function (num) {
      return BOSSES[Math.max(0, Math.min(BOSSES.length - 1, (num || 1) - 1))];
    },

    /** Готовит поля босса на созданном враге. */
    setup: function (e, worldNum) {
      var def = Boss.forWorld(worldNum);
      var world = Config.world(worldNum);

      e.isBoss = true;
      e.bossDef = def;
      e.name = def.name;
      e.r = def.r;
      e.speed = def.speed;
      e.hp = e.maxHp = Math.round(def.hp * (0.8 + world.enemyHp * 0.6));
      e.damage = 2 + Math.min(3, Math.floor((worldNum - 1) / 5));
      e.phase = 1;
      e.abilityTimer = 2.2;       // первая атака не сразу
      e.abilityIndex = 0;
      e.action = null;            // что сейчас делает
      e.actionTime = 0;
      e.telegraph = 0;            // сколько ещё показывать предупреждение
      e.aimX = 0; e.aimY = 0;
      e.shield = 0;
      e.spinAngle = 0;
      e.rage = 1;
      return e;
    },

    /* ----------------------------------------------------------------------
     * Поведение
     * -------------------------------------------------------------------- */
    update: function (e, dt) {
      var target = nearestPlayer(e.x, e.y);
      e.wobble += dt * 4;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
      if (e.hitCooldown > 0) e.hitCooldown -= dt;
      e.squash += (1 - e.squash) * Math.min(1, dt * 8);

      checkPhase(e);

      // Пока идёт приём — занимаемся им
      if (e.action) {
        runAction(e, target, dt);
      } else if (target) {
        // Между приёмами босс просто идёт к герою
        var dx = target.x - e.x, dy = target.y - e.y;
        var d = Math.hypot(dx, dy) || 1;
        if (d > e.r + 30) {
          e.walkVx += (dx / d * e.speed * e.rage - e.walkVx) * Math.min(1, dt * 3);
          e.walkVy += (dy / d * e.speed * e.rage - e.walkVy) * Math.min(1, dt * 3);
        } else {
          e.walkVx *= 0.9; e.walkVy *= 0.9;
        }

        e.abilityTimer -= dt;
        if (e.abilityTimer <= 0) startAbility(e, target);
      }

      // Касание босса больно
      if (target && e.hitCooldown <= 0) {
        var td = Math.hypot(target.x - e.x, target.y - e.y);
        if (td < e.r + 24) {
          if (Combat.damagePlayer(target, e.damage, e.x, e.y)) e.hitCooldown = 1.1;
        }
      }

      // Движение и затухание отлёта
      var ksp = Math.hypot(e.kx, e.ky);
      if (ksp > 0) {
        var drop = 1200 * dt;
        if (ksp <= drop) { e.kx = 0; e.ky = 0; }
        else { e.kx -= e.kx / ksp * drop; e.ky -= e.ky / ksp * drop; }
      }
      e.vx = e.walkVx + e.kx;
      e.vy = e.walkVy + e.ky;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      var a = Game.arena, m = 10;
      e.x = Math.max(a.left - m, Math.min(a.right + m, e.x));
      e.y = Math.max(a.top - m, Math.min(a.bottom + m, e.y));
    },

    draw: function (c, e) { drawBoss(c, e); },

    /** Полоса здоровья наверху экрана. */
    drawBar: function (c) {
      var e = Boss.current();
      if (!e) return;

      var W = Game.W;
      var w = W * 0.66, x = (W - w) / 2, y = 74;
      var k = Math.max(0, e.hp / e.maxHp);

      c.save();
      c.fillStyle = 'rgba(60, 40, 45, 0.35)';
      Game.roundRect(c, x - 4, y - 4, w + 8, 26, 13);
      c.fill();

      c.fillStyle = 'rgba(255, 250, 244, 0.35)';
      Game.roundRect(c, x, y, w, 18, 9);
      c.fill();

      var g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, e.bossDef.body);
      g.addColorStop(1, e.bossDef.accent);
      c.fillStyle = g;
      Game.roundRect(c, x, y, Math.max(6, w * k), 18, 9);
      c.fill();

      // Засечки фаз
      c.strokeStyle = 'rgba(90, 59, 63, 0.4)';
      c.lineWidth = 2;
      [0.33, 0.66].forEach(function (p) {
        c.beginPath();
        c.moveTo(x + w * p, y);
        c.lineTo(x + w * p, y + 18);
        c.stroke();
      });

      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.font = '900 18px Nunito, "Segoe UI", sans-serif';
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(255, 250, 244, 0.9)';
      c.strokeText(e.name, W / 2, y - 8);
      c.fillStyle = '#5b3b3f';
      c.fillText(e.name, W / 2, y - 8);

      c.font = '800 12px Nunito, "Segoe UI", sans-serif';
      c.fillStyle = 'rgba(90, 59, 63, 0.75)';
      c.fillText(Math.ceil(e.hp) + ' / ' + e.maxHp + '   ·   фаза ' + e.phase, W / 2, y + 32);
      c.restore();
    },

    /** Босс, который сейчас на арене (или null). */
    current: function () {
      for (var i = 0; i < Enemies.list.length; i++) {
        if (Enemies.list[i].isBoss && !Enemies.list[i].dead) return Enemies.list[i];
      }
      return null;
    }
  };

  /* ------------------------------------------------------------------------
   * Фазы: на 2/3 и 1/3 здоровья босс злится
   * ---------------------------------------------------------------------- */
  function checkPhase(e) {
    var k = e.hp / e.maxHp;
    var want = k > 0.66 ? 1 : (k > 0.33 ? 2 : 3);
    if (want > e.phase) {
      e.phase = want;
      e.rage = 1 + (want - 1) * 0.18;
      e.abilityIndex = 0;
      e.abilityTimer = 0.6;
      e.shield = 0;
      Combat.shake(10);
      Combat.particles(e.x, e.y - e.r * 0.5, e.bossDef.accent, 30, { speed: 220, star: true });
      Game.banner(e.name + ' злится!', want === 3 ? 'последняя фаза — держитесь!' : 'приёмов стало больше', 2);
    }
  }

  /* ------------------------------------------------------------------------
   * Запуск приёма
   * ---------------------------------------------------------------------- */
  function startAbility(e, target) {
    var set = e.bossDef.abilities[e.phase - 1];
    var name = set[e.abilityIndex % set.length];
    e.abilityIndex++;

    var dx = target ? target.x - e.x : 1;
    var dy = target ? target.y - e.y : 0;
    var d = Math.hypot(dx, dy) || 1;
    e.aimX = dx / d;
    e.aimY = dy / d;
    e.targetX = target ? target.x : e.x;
    e.targetY = target ? target.y : e.y;

    e.action = name;
    e.actionTime = 0;
    e.telegraph = (name === 'dash' || name === 'slam') ? 0.75 : 0.45;
    e.walkVx = 0; e.walkVy = 0;
  }

  /* ------------------------------------------------------------------------
   * Выполнение приёма
   * ---------------------------------------------------------------------- */
  function runAction(e, target, dt) {
    e.actionTime += dt;

    // Пока идёт предупреждение — босс замер и дрожит
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      e.walkVx *= 0.8; e.walkVy *= 0.8;
      if (e.telegraph > 0) return;
      fireAbility(e, target);
      return;
    }

    // Продолжение длительных приёмов
    if (e.action === 'dash') {
      if (e.actionTime > 1.1) endAction(e, 1.1);
    } else if (e.action === 'spin') {
      e.spinAngle += dt * 9;
      if (target) {
        var dx = target.x - e.x, dy = target.y - e.y;
        var d = Math.hypot(dx, dy) || 1;
        e.walkVx = dx / d * e.speed * 1.5;
        e.walkVy = dy / d * e.speed * 1.5;
      }
      if (e.actionTime > 3) endAction(e, 1.4);
    } else if (e.action === 'shield') {
      if (e.actionTime > 4) { e.shield = 0; endAction(e, 1.2); }
    } else {
      endAction(e, 1.3);
    }
  }

  function endAction(e, rest) {
    e.action = null;
    e.abilityTimer = Math.max(0.5, rest / e.rage);
  }

  /** Сам момент атаки — после предупреждения. */
  function fireAbility(e, target) {
    var world = Config.world(Game.world);

    if (e.action === 'dash') {
      e.kx = e.aimX * 900;
      e.ky = e.aimY * 900;
      Combat.particles(e.x, e.y, e.bossDef.accent, 16, { speed: 180 });
      Combat.shake(6);

    } else if (e.action === 'slam') {
      // Приземление с волной
      e.x = e.targetX; e.y = e.targetY;
      e.squash = 0.6;
      Combat.shake(12);
      Combat.particles(e.x, e.y, e.bossDef.body, 30, { speed: 260, size: 6 });
      for (var i = 0; i < Players.list.length; i++) {
        var p = Players.list[i];
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 110) {
          Combat.damagePlayer(p, e.damage, e.x, e.y);
        }
      }

    } else if (e.action === 'spread') {
      var n = 8 + e.phase * 2;
      for (var s = 0; s < n; s++) {
        var a = (Math.PI * 2 * s / n) + e.wobble * 0.2;
        Combat.bossShot(e, a, 190 + e.phase * 20);
      }
      Combat.shake(4);

    } else if (e.action === 'aimed') {
      for (var k = 0; k < 3; k++) {
        var ang = Math.atan2(e.aimY, e.aimX) + (k - 1) * 0.22;
        Combat.bossShot(e, ang, 260);
      }

    } else if (e.action === 'summon') {
      var type = world.newcomer || 'fast';
      var count = 2 + e.phase;
      for (var m = 0; m < count; m++) {
        var ma = Math.PI * 2 * m / count;
        var kid = Enemies.spawn(type, e.x + Math.cos(ma) * (e.r + 30), e.y + Math.sin(ma) * (e.r + 24));
        kid.spawnIn = 0.3;
      }
      Combat.particles(e.x, e.y - e.r * 0.5, e.bossDef.accent, 20, { speed: 150, star: true });

    } else if (e.action === 'shield') {
      e.shield = 999;                  // непробиваемый, пока идёт приём
      Combat.particles(e.x, e.y - e.r * 0.5, '#ffffff', 18, { speed: 120, star: true });

    } else if (e.action === 'puddle') {
      for (var q = 0; q < 3 + e.phase; q++) {
        var pa = Math.random() * Math.PI * 2;
        var pd = 60 + Math.random() * 180;
        Combat.addPuddle(e.x + Math.cos(pa) * pd, e.y + Math.sin(pa) * pd, e.bossDef.body);
      }

    } else if (e.action === 'spin') {
      Combat.shake(5);
      return;                          // вертушка крутится дальше в runAction
    }

    if (e.action !== 'spin' && e.action !== 'shield' && e.action !== 'dash') {
      endAction(e, 1.3);
    }
  }

  /* ------------------------------------------------------------------------
   * Рисование
   * ---------------------------------------------------------------------- */
  function drawBoss(c, e) {
    var def = e.bossDef;
    var sq = e.squash * (1 + Math.sin(e.wobble) * 0.04);
    var r = e.r;
    var h = r * 1.1 * sq;
    var w = r * (2 - sq) * 0.95;

    // Предупреждение под ногами
    if (e.telegraph > 0) drawTelegraph(c, e);

    c.save();
    c.translate(e.x, e.y);

    // Тень
    c.fillStyle = 'rgba(40, 30, 40, 0.25)';
    c.beginPath();
    c.ellipse(0, 0, w * 0.85, w * 0.3, 0, 0, Math.PI * 2);
    c.fill();

    if (e.action === 'spin') c.rotate(e.spinAngle);

    // Тело
    c.beginPath();
    c.moveTo(-w, 0);
    c.bezierCurveTo(-w, -h * 1.9, w, -h * 1.9, w, 0);
    var bumps = 4;
    for (var i = 0; i < bumps; i++) {
      var x0 = w - (2 * w) * (i / bumps);
      var x1 = w - (2 * w) * ((i + 1) / bumps);
      c.quadraticCurveTo((x0 + x1) / 2, 8 + Math.sin(e.wobble + i) * 4, x1, 0);
    }
    c.closePath();
    c.fillStyle = e.flash > 0 ? '#ffffff' : def.body;
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = e.flash > 0 ? '#ffffff' : def.dark;
    c.stroke();

    // Блик
    c.globalAlpha = 0.4;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(-w * 0.35, -h * 1.05, w * 0.22, h * 0.34, -0.4, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;

    // Черта формы
    drawShape(c, e, w, h, def);

    // Глаза
    var eye = r * 0.2;
    c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(-w * 0.3, -h * 0.95, eye, eye * 1.1, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(w * 0.3, -h * 0.95, eye, eye * 1.1, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2b2e';
    var look = Math.max(-1, Math.min(1, e.vx / 120));
    c.beginPath(); c.arc(-w * 0.3 + look * 4, -h * 0.95, eye * 0.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(w * 0.3 + look * 4, -h * 0.95, eye * 0.5, 0, Math.PI * 2); c.fill();

    // Сердитые брови в третьей фазе
    if (e.phase >= 3) {
      c.strokeStyle = '#3a2b2e';
      c.lineWidth = 4;
      c.lineCap = 'round';
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(s * w * 0.3 - s * eye, -h * 1.3);
        c.lineTo(s * w * 0.3 + s * eye, -h * 1.15);
        c.stroke();
      }
    }

    // Рот
    c.strokeStyle = '#3a2b2e';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, -h * 0.55, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();

    c.restore();

    // Щит
    if (e.shield > 0) {
      c.save();
      c.globalAlpha = 0.35 + Math.sin(Game.time * 6) * 0.12;
      c.strokeStyle = '#ffffff';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(e.x, e.y - h * 0.7, r * 1.5, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.18;
      c.fillStyle = '#cdeeff';
      c.fill();
      c.restore();
    }
  }

  /* ------------------------------------------------------------------------
   * Форма босса: у каждого своя узнаваемая примета — корона, клешни,
   * рожки, хвост кометы. Рисуется в системе координат босса (0,0 — под ним),
   * w — половина ширины тела, h — высота, def — описание босса.
   * ---------------------------------------------------------------------- */

  /** Мягкий контур для деталек. */
  function edge(c, def, width) {
    c.lineWidth = width || 3;
    c.strokeStyle = def.dark;
    c.stroke();
  }

  /** Зубчатая корона: n зубцов от x=-half до x=+half. */
  function crownPath(c, y, half, tooth) {
    c.beginPath();
    c.moveTo(-half, y);
    c.lineTo(-half * 0.72, y - tooth);
    c.lineTo(-half * 0.36, y - tooth * 0.45);
    c.lineTo(0, y - tooth * 1.25);
    c.lineTo(half * 0.36, y - tooth * 0.45);
    c.lineTo(half * 0.72, y - tooth);
    c.lineTo(half, y);
    c.closePath();
  }

  /** Пятиконечная звёздочка. */
  function star(c, x, y, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr = i % 2 ? r * 0.45 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }

  var SHAPES = {
    /* 1 — Королева-желе */
    crown: function (c, e, w, h, def) {
      crownPath(c, -h * 1.36, w * 0.52, h * 0.7);
      c.fill(); edge(c, def);
    },

    /* 2 — Клубничный великан: листик-шапочка и зёрнышки */
    berry: function (c, e, w, h, def) {
      c.save();
      c.fillStyle = '#7fd04f';
      for (var i = 0; i < 5; i++) {
        c.save();
        c.translate(0, -h * 1.34);
        c.rotate(-Math.PI / 2 + (i - 2) * 0.55);
        c.beginPath();
        c.ellipse(0, -w * 0.32, w * 0.12, w * 0.34, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      c.restore();
      c.fillStyle = '#fff3cf';
      for (var k = 0; k < 7; k++) {
        var a = 0.5 + k * 0.3;
        c.beginPath();
        c.ellipse(Math.cos(a) * w * 0.6, -h * 0.5 + Math.sin(a) * h * 0.35, 3.5, 5, a, 0, Math.PI * 2);
        c.fill();
      }
    },

    /* 3 — Мятный вихрь: спираль на теле и вихревые рожки */
    swirl: function (c, e, w, h, def) {
      c.save();
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath();
      for (var t = 0; t < 15; t++) {
        var a = t * 0.55 + e.wobble * 0.6;
        var rr = t * (w * 0.045);
        c.lineTo(Math.cos(a) * rr, -h * 0.62 + Math.sin(a) * rr * 0.7);
      }
      c.stroke();
      c.restore();
      c.fillStyle = def.accent;
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(s * w * 0.5, -h * 1.3);
        c.quadraticCurveTo(s * w * 0.95, -h * 2.0, s * w * 0.38, -h * 1.62);
        c.closePath();
        c.fill(); edge(c, def);
      }
    },

    /* 4 — Медовый шмель: крылышки и полоски */
    bee: function (c, e, w, h, def) {
      c.save();
      c.globalAlpha = 0.55; c.fillStyle = '#ffffff';
      for (var s = -1; s <= 1; s += 2) {
        c.save();
        c.translate(s * w * 0.85, -h * 1.1);
        c.rotate(s * (0.5 + Math.sin(e.wobble * 5) * 0.25));
        c.beginPath(); c.ellipse(0, 0, w * 0.42, h * 0.26, 0, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      c.restore();
      c.save();
      c.beginPath();
      c.moveTo(-w, 0); c.bezierCurveTo(-w, -h * 1.9, w, -h * 1.9, w, 0); c.closePath();
      c.clip();
      c.fillStyle = def.accent;
      for (var i = 0; i < 3; i++) c.fillRect(-w, -h * (0.25 + i * 0.36), w * 2, h * 0.16);
      c.restore();
    },

    /* 5 — Снеговик-громила: ведро на голове и носик-морковка */
    snowman: function (c, e, w, h, def) {
      c.fillStyle = '#9fb4c4';
      c.beginPath();
      c.moveTo(-w * 0.42, -h * 1.35);
      c.lineTo(-w * 0.34, -h * 1.95);
      c.lineTo(w * 0.34, -h * 1.95);
      c.lineTo(w * 0.42, -h * 1.35);
      c.closePath(); c.fill(); edge(c, def);
      c.fillStyle = def.accent;
      c.beginPath();
      c.moveTo(0, -h * 0.92); c.lineTo(w * 0.58, -h * 0.8); c.lineTo(0, -h * 0.7);
      c.closePath(); c.fill();
      c.fillStyle = '#4a5f70';
      for (var i = 0; i < 3; i++) {
        c.beginPath(); c.arc(0, -h * (0.42 - i * 0.14), 4.5, 0, Math.PI * 2); c.fill();
      }
    },

    /* 6 — Ледяная королева: корона из льдинок */
    icecrown: function (c, e, w, h, def) {
      c.fillStyle = '#ffffff';
      for (var i = -2; i <= 2; i++) {
        var hh = h * (1.75 + (2 - Math.abs(i)) * 0.22);
        c.beginPath();
        c.moveTo(i * w * 0.3 - w * 0.11, -h * 1.3);
        c.lineTo(i * w * 0.3, -hh);
        c.lineTo(i * w * 0.3 + w * 0.11, -h * 1.3);
        c.closePath(); c.fill(); edge(c, def, 2.5);
      }
    },

    /* 7 — Хозяин снежного леса: ветвистые рога */
    antlers: function (c, e, w, h, def) {
      c.save();
      c.strokeStyle = def.dark; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(s * w * 0.42, -h * 1.3);
        c.lineTo(s * w * 0.62, -h * 1.95);
        c.lineTo(s * w * 0.5, -h * 2.35);
        c.stroke();
        c.beginPath(); c.moveTo(s * w * 0.55, -h * 1.75); c.lineTo(s * w * 0.95, -h * 1.95); c.stroke();
        c.beginPath(); c.moveTo(s * w * 0.58, -h * 2.1); c.lineTo(s * w * 0.92, -h * 2.35); c.stroke();
      }
      c.restore();
    },

    /* 8 — Морозный дракончик: гребень по спинке и крылышки */
    dragon: function (c, e, w, h, def) {
      c.fillStyle = def.accent;
      for (var i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(i * w * 0.28 - w * 0.13, -h * 1.28);
        c.lineTo(i * w * 0.28, -h * (1.95 - Math.abs(i) * 0.16));
        c.lineTo(i * w * 0.28 + w * 0.13, -h * 1.28);
        c.closePath(); c.fill(); edge(c, def, 2.5);
      }
      c.save();
      c.globalAlpha = 0.6; c.fillStyle = def.accent;
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(s * w * 0.8, -h * 1.1);
        c.quadraticCurveTo(s * w * 1.7, -h * 1.6, s * w * 1.5, -h * 0.4);
        c.quadraticCurveTo(s * w * 1.1, -h * 0.7, s * w * 0.8, -h * 1.1);
        c.closePath(); c.fill();
      }
      c.restore();
    },

    /* 9 — Карамельный краб: клешни по бокам */
    claws: function (c, e, w, h, def) {
      c.fillStyle = def.body;
      for (var s = -1; s <= 1; s += 2) {
        var cx = s * w * 1.15, cy = -h * 0.75 + Math.sin(e.wobble * 2 + s) * 5;
        c.beginPath(); c.arc(cx, cy, w * 0.33, 0.55, Math.PI * 2 - 0.55); c.closePath();
        c.fill(); edge(c, def, 4);
        c.beginPath();
        c.moveTo(cx, cy); c.lineTo(cx + s * w * 0.36, cy - w * 0.36);
        c.strokeStyle = def.dark; c.lineWidth = 5; c.stroke();
      }
      c.fillStyle = def.accent;
      for (var i = -1; i <= 1; i++) {
        c.beginPath(); c.ellipse(i * w * 0.4, -h * 0.35, w * 0.1, h * 0.12, 0, 0, Math.PI * 2); c.fill();
      }
    },

    /* 10 — Кит из карамели: фонтанчик и хвост */
    whale: function (c, e, w, h, def) {
      c.save();
      c.globalAlpha = 0.8; c.strokeStyle = '#cdeeff'; c.lineWidth = 5; c.lineCap = 'round';
      for (var s = -1; s <= 1; s++) {
        c.beginPath();
        c.moveTo(0, -h * 1.35);
        c.quadraticCurveTo(s * w * 0.4, -h * 1.85, s * w * 0.55, -h * 2.15);
        c.stroke();
      }
      c.restore();
      c.fillStyle = def.body;
      c.beginPath();
      c.moveTo(-w * 0.95, -h * 0.5);
      c.quadraticCurveTo(-w * 1.6, -h * 0.9, -w * 1.75, -h * 0.15);
      c.quadraticCurveTo(-w * 1.45, -h * 0.45, -w * 0.95, -h * 0.2);
      c.closePath(); c.fill(); edge(c, def, 4);
      c.fillStyle = def.accent;
      c.beginPath(); c.ellipse(w * 0.45, -h * 0.45, w * 0.25, h * 0.3, 0.4, 0, Math.PI * 2); c.fill();
    },

    /* 11 — Зефирная принцесса: диадема и бантик */
    tiara: function (c, e, w, h, def) {
      crownPath(c, -h * 1.34, w * 0.4, h * 0.42);
      c.fill(); edge(c, def, 2.5);
      c.fillStyle = def.dark;
      c.beginPath(); c.arc(0, -h * 1.6, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = def.accent;              // бантик сбоку
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(w * 0.86 + s * w * 0.16, -h * 1.05 - s * h * 0.12, w * 0.17, h * 0.13, s * 0.5, 0, Math.PI * 2);
        c.fill(); edge(c, def, 2);
      }
      c.beginPath(); c.arc(w * 0.86, -h * 1.05, w * 0.07, 0, Math.PI * 2); c.fill(); edge(c, def, 2);
    },

    /* 12 — Кисельный змей: колечко-хвост позади и язычок */
    serpent: function (c, e, w, h, def) {
      c.save();
      c.globalAlpha = 0.75;
      c.strokeStyle = def.body; c.lineWidth = w * 0.3; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-w * 0.8, -h * 0.3);
      c.quadraticCurveTo(-w * 2.1, -h * (0.9 + Math.sin(e.wobble) * 0.1), -w * 1.1, -h * 1.4);
      c.stroke();
      c.restore();
      c.strokeStyle = '#ff6f8f'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, -h * 0.42);
      c.lineTo(0, -h * 0.1);
      c.moveTo(0, -h * 0.1); c.lineTo(-5, -h * 0.02);
      c.moveTo(0, -h * 0.1); c.lineTo(5, -h * 0.02);
      c.stroke();
    },

    /* 13 — Шоколадный голем: дольки плитки и каменные плечи */
    bar: function (c, e, w, h, def) {
      c.save();
      c.beginPath();
      c.moveTo(-w, 0); c.bezierCurveTo(-w, -h * 1.9, w, -h * 1.9, w, 0); c.closePath();
      c.clip();
      c.strokeStyle = 'rgba(255,240,210,0.4)'; c.lineWidth = 4;
      for (var i = -1; i <= 1; i++) {
        c.beginPath(); c.moveTo(i * w * 0.5, -h * 2); c.lineTo(i * w * 0.5, 0); c.stroke();
      }
      for (var j = 1; j <= 2; j++) {
        c.beginPath(); c.moveTo(-w, -h * 0.6 * j); c.lineTo(w, -h * 0.6 * j); c.stroke();
      }
      c.restore();
      c.fillStyle = def.accent;
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(s * w * 0.88, -h * 1.05, w * 0.26, h * 0.3, s * 0.4, 0, Math.PI * 2);
        c.fill(); edge(c, def, 3);
      }
    },

    /* 14 — Пряничный мастер: поварской колпак и глазурь */
    chef: function (c, e, w, h, def) {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(-w * 0.3, -h * 1.72, w * 0.26, 0, Math.PI * 2);
      c.arc(w * 0.3, -h * 1.72, w * 0.26, 0, Math.PI * 2);
      c.arc(0, -h * 1.92, w * 0.3, 0, Math.PI * 2);
      c.fill();
      c.fillRect(-w * 0.42, -h * 1.62, w * 0.84, h * 0.3);
      edge(c, def, 2.5);
      c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(-w * 0.62, -h * 0.3);      // глазурь понизу, чтобы не закрывать лицо
      for (var i = 0; i < 4; i++) c.lineTo(-w * 0.62 + (i + 1) * w * 0.31, -h * (i % 2 ? 0.3 : 0.12));
      c.stroke();
    },

    /* 15 — Ореховый барон: скорлупка-шапочка */
    nutcap: function (c, e, w, h, def) {
      c.fillStyle = def.dark;
      c.beginPath();
      c.moveTo(-w * 0.95, -h * 1.18);
      c.quadraticCurveTo(0, -h * 2.25, w * 0.95, -h * 1.18);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
      for (var i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(i * w * 0.45, -h * 1.18);
        c.lineTo(i * w * 0.3, -h * 1.95);
        c.stroke();
      }
      c.fillStyle = def.dark;
      c.beginPath(); c.ellipse(0, -h * 2.1, 5, h * 0.16, 0, 0, Math.PI * 2); c.fill();
    },

    /* 16 — Какао-волна: гребень волны и брызги */
    wave: function (c, e, w, h, def) {
      c.fillStyle = def.accent;
      c.beginPath();
      c.moveTo(-w * 0.95, -h * 1.2);
      c.quadraticCurveTo(-w * 0.3, -h * 2.15, w * 0.7, -h * 1.75);
      c.quadraticCurveTo(w * 0.2, -h * 1.5, w * 0.95, -h * 1.15);
      c.quadraticCurveTo(0, -h * 1.45, -w * 0.95, -h * 1.2);
      c.closePath(); c.fill(); edge(c, def, 2.5);
      c.globalAlpha = 0.8;
      for (var i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(w * (0.4 + i * 0.3), -h * (2.0 + Math.sin(e.wobble + i) * 0.1), 4 - i, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    },

    /* 17 — Звёздный садовник: звезда над головой */
    star: function (c, e, w, h, def) {
      c.save();
      c.translate(0, -h * 1.6);
      c.rotate(e.wobble * 0.5);
      star(c, 0, 0, w * 0.38);
      c.fill(); edge(c, def, 3);
      c.restore();
      c.fillStyle = 'rgba(255,255,255,0.8)';
      star(c, -w * 0.75, -h * 0.9, 6); c.fill();
      star(c, w * 0.8, -h * 1.15, 5); c.fill();
    },

    /* 18 — Лунный страж: месяц и светящийся ореол */
    moonhalo: function (c, e, w, h, def) {
      c.save();
      c.globalAlpha = 0.28 + Math.sin(Game.time * 2) * 0.08;
      var g = c.createRadialGradient(0, -h * 0.9, w * 0.3, 0, -h * 0.9, w * 1.7);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, -h * 0.9, w * 1.7, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = '#fff6d5';
      c.beginPath();
      c.arc(0, -h * 1.62, w * 0.32, 0, Math.PI * 2);
      c.arc(w * 0.14, -h * 1.68, w * 0.29, 0, Math.PI * 2, true);
      c.fill('evenodd');
    },

    /* 19 — Комета-хулиганка: огненный хвост */
    comet: function (c, e, w, h, def) {
      var dir = e.vx >= 0 ? -1 : 1;
      c.save();
      c.globalAlpha = 0.6;
      var g = c.createLinearGradient(dir * w * 0.6, 0, dir * w * 3.2, 0);
      g.addColorStop(0, def.accent);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(dir * w * 0.6, -h * 1.4);
      c.quadraticCurveTo(dir * w * 3.4, -h * 1.1, dir * w * 1.0, -h * 0.2);
      c.closePath(); c.fill();
      c.restore();
      c.fillStyle = '#ffffff';
      star(c, 0, -h * 1.55, w * 0.28); c.fill(); edge(c, def, 2.5);
    },

    /* 20 — Король конфет: большая корона и воротник */
    kingcrown: function (c, e, w, h, def) {
      c.fillStyle = def.accent;
      crownPath(c, -h * 1.3, w * 0.72, h * 0.95);
      c.fill(); edge(c, def, 4);
      c.fillStyle = '#ff5f9f';
      c.beginPath(); c.arc(0, -h * 1.5, 6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(-w * 0.45, -h * 1.4, 4.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(w * 0.45, -h * 1.4, 4.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff';              // пушистый воротник
      for (var i = -3; i <= 3; i++) {
        c.beginPath();
        c.arc(i * w * 0.28, -h * 0.22, w * 0.17, 0, Math.PI * 2);
        c.fill();
      }
    },

    /* 21 — Облачный барашек: кудряшки-облачка и рожки-завитки */
    fleece: function (c, e, w, h, def) {
      c.fillStyle = '#ffffff';
      for (var i = -3; i <= 3; i++) {
        c.beginPath();
        c.arc(i * w * 0.24, -h * 1.38 + Math.abs(i) * h * 0.1, w * 0.2, 0, Math.PI * 2);
        c.fill(); edge(c, def, 2.5);
      }
      c.strokeStyle = def.accent; c.lineWidth = 7; c.lineCap = 'round';
      for (var s = -1; s <= 1; s += 2) {        // завиток слева и его отражение справа
        c.save();
        c.scale(s, 1);
        c.beginPath();
        c.arc(w * 0.78, -h * 1.0, w * 0.2, -Math.PI * 0.6, Math.PI * 0.9);
        c.stroke();
        c.restore();
      }
    },

    /* 22 — Радужный единорог: золотой рог и радужная грива */
    horn: function (c, e, w, h, def) {
      var mane = ['#ff8f8f', '#ffc46e', '#8fe6a8', '#8fc8ff', '#c9a6ff'];
      c.lineCap = 'round'; c.lineWidth = 7;
      for (var i = 0; i < mane.length; i++) {
        c.strokeStyle = mane[i];
        c.beginPath();
        c.moveTo(-w * 0.1 - i * w * 0.14, -h * 1.3 + i * h * 0.06);
        c.quadraticCurveTo(-w * 0.6 - i * w * 0.1, -h * 1.1 + Math.sin(Game.time * 3 + i) * 5,
          -w * 0.75 - i * w * 0.06, -h * 0.5 + i * h * 0.05);
        c.stroke();
      }
      c.fillStyle = def.accent;
      c.beginPath();
      c.moveTo(-w * 0.14, -h * 1.32); c.lineTo(w * 0.14, -h * 1.32); c.lineTo(w * 0.05, -h * 2.25);
      c.closePath(); c.fill(); edge(c, def, 3);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2;
      for (var k = 1; k <= 3; k++) {
        var y = -h * (1.32 + k * 0.22);
        c.beginPath(); c.moveTo(-w * (0.13 - k * 0.03), y); c.lineTo(w * (0.13 - k * 0.025), y - 4); c.stroke();
      }
    },

    /* 23 — Грозовой великан: тучка на голове и молнии */
    bolt: function (c, e, w, h, def) {
      c.fillStyle = '#5d668c';
      c.beginPath();
      c.arc(0, -h * 1.55, w * 0.34, 0, Math.PI * 2);
      c.arc(-w * 0.4, -h * 1.4, w * 0.26, 0, Math.PI * 2);
      c.arc(w * 0.42, -h * 1.42, w * 0.28, 0, Math.PI * 2);
      c.fill();
      if (Math.sin(Game.time * 5) > 0.2) {       // молния то вспыхивает, то гаснет
        c.fillStyle = def.accent;
        for (var s = -1; s <= 1; s += 2) {
          var x = s * w * 0.95;
          c.beginPath();
          c.moveTo(x, -h * 1.5); c.lineTo(x + s * 10, -h * 1.1); c.lineTo(x - s * 2, -h * 1.1);
          c.lineTo(x + s * 8, -h * 0.65); c.lineTo(x - s * 12, -h * 1.2); c.lineTo(x - s * 1, -h * 1.2);
          c.closePath(); c.fill(); edge(c, def, 2);
        }
      }
    },

    /* 24 — Тёмный Король конфет: огромная корона и тёмная дымка */
    darkcrown: function (c, e, w, h, def) {
      c.save();
      c.globalAlpha = 0.3 + Math.sin(Game.time * 2.4) * 0.1;
      var g = c.createRadialGradient(0, -h * 0.8, w * 0.4, 0, -h * 0.8, w * 1.9);
      g.addColorStop(0, '#8a2f6a');
      g.addColorStop(1, 'rgba(26,13,26,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, -h * 0.8, w * 1.9, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = def.accent;
      crownPath(c, -h * 1.3, w * 0.8, h * 1.1);
      c.fill(); edge(c, def, 4);
      c.fillStyle = '#b44dff';
      c.beginPath(); c.arc(0, -h * 1.55, 7, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(-w * 0.5, -h * 1.45, 5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(w * 0.5, -h * 1.45, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2a1428';              // тёмный воротник
      for (var i = -3; i <= 3; i++) {
        c.beginPath();
        c.arc(i * w * 0.28, -h * 0.22, w * 0.17, 0, Math.PI * 2);
        c.fill();
      }
    }
  };

  /** Отличительная черта формы босса. */
  function drawShape(c, e, w, h, def) {
    c.fillStyle = def.accent;
    c.strokeStyle = def.dark;
    c.lineWidth = 3;
    if (SHAPES[def.shape]) SHAPES[def.shape](c, e, w, h, def);
  }

  /** Предупреждение о приёме: круг или стрелка на земле. */
  function drawTelegraph(c, e) {
    var k = 1 - e.telegraph / 0.75;
    c.save();
    c.globalAlpha = 0.35 + Math.sin(Game.time * 22) * 0.2;

    if (e.action === 'dash') {
      // Полоса в сторону рывка
      c.translate(e.x, e.y);
      c.rotate(Math.atan2(e.aimY, e.aimX));
      c.fillStyle = '#ff6f8f';
      c.fillRect(0, -e.r * 0.7, 520, e.r * 1.4);
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.fillRect(0, -6, 520 * k, 12);

    } else if (e.action === 'slam') {
      c.fillStyle = 'rgba(255, 111, 143, 0.5)';
      c.beginPath();
      c.ellipse(e.targetX, e.targetY, (e.r + 110) * (0.4 + k * 0.6), (e.r + 110) * 0.4 * (0.4 + k * 0.6), 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 4;
      c.stroke();

    } else {
      c.fillStyle = 'rgba(255, 223, 94, 0.4)';
      c.beginPath();
      c.ellipse(e.x, e.y, e.r * 1.6, e.r * 0.6, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  /** Ближайший герой (копия из enemies.js — боссу тоже нужна). */
  function nearestPlayer(x, y) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < Players.list.length; i++) {
      var p = Players.list[i];
      if (p.downed) continue;
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  window.Boss = Boss;
})();

