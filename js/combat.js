/* ============================================================================
 * js/combat.js — всё, что связано с дракой и добычей:
 *   • попадания мечом по дуге взмаха (с отбрасыванием);
 *   • снаряды (плевки стрелков, а на Этапе 4 — волшебная палочка);
 *   • урон героям и их «падение» в обморок + подъём напарником;
 *   • конфеты и сердечки: выпадение, притягивание, подбор;
 *   • частицы и всплывающие надписи.
 * ========================================================================== */
(function () {
  'use strict';

  var particlesList = [];
  var dropsList = [];
  var shotsList = [];
  var textsList = [];

  var puddlesList = [];      // липкие лужи от боссов
  var supersList = [];       // идущие суперприёмы Ам Няма
  var starsList = [];        // падающие звёзды суперприёма кошечки
  var ringsList = [];        // расходящиеся кольца (удар суперприёма, приземление звезды)
  var PICKUP_MAGNET = 115;   // с какого расстояния конфета летит к герою
  var PICKUP_RADIUS = 26;    // на каком расстоянии считается подобранной

  /* ------------------------------------------------------------------------
   * Серия и суперприём — числа нарочно скромные, чтобы не ломать экономику.
   * ---------------------------------------------------------------------- */
  var STREAK_STEP = 25;      // каждые 25 попаданий без урона — маленькая награда
  var STREAK_CANDY_MAX = 3;  // больше трёх конфет за одну отметку не выпадает
  var SUPER_HITS = 45;       // сколько попаданий копит шкала суперприёма
  var AMNOM_PULL = 0.55;     // сколько Ам Ням втягивает слизней перед укусом
  var AMNOM_PULL_R = 260;    // откуда втягивает
  var AMNOM_BITE_R = 150;    // кого задевает укус
  var AMNOM_DAMAGE = 4;      // урон укуса (умножается на силу героя)
  var STAR_COUNT = 8;        // сколько звёзд падает у кошечки
  var STAR_DAMAGE = 1.6;     // урон одной звезды (умножается на силу героя)
  var STAR_RADIUS = 58;      // кого задевает одна звезда
  var STAR_FALL = 0.5;       // сколько звезда летит с неба

  var Combat = {
    drops: dropsList,
    shots: shotsList,

    puddles: puddlesList,

    /** Липкая лужа: пока герой в ней, он вязнет. */
    addPuddle: function (x, y, color) {
      puddlesList.push({ x: x, y: y, r: 52, life: 9, max: 9, color: color || '#ffd36e' });
    },

    /* ======================================================================
     * Сеть: хозяин отдаёт «что лежит на земле и что летит»,
     * гость этим пользуется вместо своего расчёта (js/online.js).
     * ==================================================================== */
    netState: function () {
      return {
        drops: dropsList.map(function (d) {
          return { x: Math.round(d.x), y: Math.round(d.y), k: d.kind };
        }),
        shots: shotsList.map(function (s) {
          return {
            x: Math.round(s.x), y: Math.round(s.y), r: s.r,
            vx: Math.round(s.vx), vy: Math.round(s.vy),
            c: s.color, d: s.dark, f: s.from === 'hero' ? 1 : 0,
            sp: +(s.spin || 0).toFixed(2)
          };
        }),
        puddles: puddlesList.map(function (p) {
          return { x: Math.round(p.x), y: Math.round(p.y), r: Math.round(p.r),
            l: +p.life.toFixed(1), m: p.max, c: p.color };
        })
      };
    },

    setNetState: function (drops, shots, puddles) {
      dropsList.length = 0;
      (drops || []).forEach(function (d) {
        dropsList.push({ kind: d.k, x: d.x, y: d.y, vx: 0, vy: 0,
          bob: (d.x + d.y) * 0.05, life: 9, settle: 0 });
      });

      shotsList.length = 0;
      (shots || []).forEach(function (s) {
        shotsList.push({ from: s.f ? 'hero' : 'enemy', x: s.x, y: s.y, vx: s.vx || 0, vy: s.vy || 0,
          r: s.r, damage: 0, color: s.c, dark: s.d, life: 1, spin: s.sp });
      });

      puddlesList.length = 0;
      (puddles || []).forEach(function (p) {
        puddlesList.push({ x: p.x, y: p.y, r: p.r, life: p.l, max: p.m, color: p.c });
      });
    },

    /** У гостя живут только брызги и надписи — остальное присылает хозяин. */
    updateVisualsOnly: function (dt) {
      updateParticles(dt);
      updateTexts(dt);
      updateSupers(dt, false);
      for (var i = 0; i < dropsList.length; i++) dropsList[i].bob += dt * 5;
      // Снаряды летят дальше между кадрами хозяина — без рывков
      for (var j = 0; j < shotsList.length; j++) {
        var s = shotsList[j];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.spin += dt * 8;
      }
    },

    reset: function () {
      puddlesList.length = 0;
      supersList.length = 0;
      starsList.length = 0;
      ringsList.length = 0;
      particlesList.length = 0;
      dropsList.length = 0;
      shotsList.length = 0;
      textsList.length = 0;
    },

    update: function (dt) {
      updatePuddles(dt);
      swordHits();
      updateSupers(dt, true);
      updateShots(dt);
      updateDrops(dt);
      updateParticles(dt);
      updateTexts(dt);
    },

    /* ----- то, что рисуется ПОД героями (лежит на земле) ----- */
    drawGround: function (c) {
      drawPuddles(c);
      drawDrops(c);
      drawStarShadows(c);
      drawSuperPull(c);
    },

    /* ----- то, что рисуется ПОВЕРХ героев ----- */
    drawAir: function (c) {
      drawShots(c);
      drawStars(c);
      drawRings(c);
      drawParticles(c);
      drawTexts(c);
    },

    /* ======================================================================
     * Урон герою. Возвращает true, если удар прошёл.
     * ==================================================================== */
    damagePlayer: function (p, dmg, fromX, fromY) {
      if (p.downed || p.invul > 0 || p.hp <= 0) return false;
      if (p.dashTimer > 0) return false;   // в рывке герой неуязвим

      // Экипировка даёт шанс увернуться
      if (p.dodge > 0 && Math.random() < p.dodge) {
        p.invul = 0.35;
        if (window.Sound) Sound.play('dodge');
        Combat.floatText(p.x, p.y - 70, 'мимо!', '#8fd6ff');
        Combat.particles(p.x, p.y - 40, '#cdeeff', 6, { speed: 90, star: true });
        return false;
      }

      p.hp -= dmg;
      p.invul = 1.2;                 // короткая неуязвимость, чтобы не съели мгновенно
      // Пропустил удар — серия обрывается
      if (p.streak >= 10) Combat.floatText(p.x, p.y - 96, 'серия ' + p.streak + ' прервана', '#c9a6d6');
      p.streak = 0;
      Game.stats.damage = (Game.stats.damage || 0) + dmg;
      if (window.Sound) Sound.play('hurt');
      if (window.Online) Online.fx('hurt', p.x, p.y - 40);
      p.hurtFlash = 0.3;
      Players.push(p, p.x - fromX, p.y - fromY, 260);
      // Героя напарника двигает его телефон — толчок отправляем туда
      if (p.isRemote && window.Online) Online.kickMate(p.x - fromX, p.y - fromY, 260);
      Combat.shake(5);
      Combat.particles(p.x, p.y - 40, '#ff7aa2', 8, { speed: 120 });
      Combat.floatText(p.x, p.y - 70, '-' + dmg, '#ff5f8f');

      if (p.hp <= 0) {
        p.hp = 0;
        p.downed = true;
        if (window.Sound) Sound.play('down');
        p.reviveProgress = 0;
        Combat.floatText(p.x, p.y - 80, 'ой…', '#ff5f8f');
        // Оба лежат — партия проиграна
        var anyUp = Players.list.some(function (q) { return !q.downed; });
        if (!anyUp) Game.defeat();
        else Game.banner(p.name + ' в обмороке!', 'подойдите и постойте рядом, чтобы поднять', 2.6);
      }
      return true;
    },

    /* ======================================================================
     * Снаряды
     * ==================================================================== */

    /** Прилипчивый удар: герой ненадолго становится медленнее. */
    slowPlayer: function (p, seconds) {
      // Зимний наряд не даёт замёрзнуть и увязнуть
      if (p.noSlow) {
        Combat.floatText(p.x, p.y - 60, 'не мёрзну!', '#bfe9ff');
        return;
      }
      p.slowTimer = Math.max(p.slowTimer || 0, seconds || 1.2);
      Combat.floatText(p.x, p.y - 60, 'вязко!', '#9fdcff');
    },

    /** Плевок слизня-стрелка в героя. */
    enemyShot: function (e, target, slow) {
      var dx = target.x - e.x, dy = (target.y - 40) - (e.y - e.r);
      var d = Math.hypot(dx, dy) || 1;
      shotsList.push({
        from: 'enemy',
        x: e.x, y: e.y - e.r,
        vx: dx / d * e.def.bulletSpeed,
        vy: dy / d * e.def.bulletSpeed,
        r: 9, damage: e.damage || e.def.damage,
        slow: slow || 0,
        color: e.def.body, dark: e.def.dark,
        life: 3.2, spin: 0
      });
    },

    /** Снаряд босса — крупнее и заметнее обычного плевка. */
    bossShot: function (e, angle, speed) {
      shotsList.push({
        from: 'enemy',
        x: e.x, y: e.y - e.r * 0.8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 13, damage: e.damage,
        slow: 0,
        color: e.bossDef.body, dark: e.bossDef.dark,
        life: 4, spin: 0
      });
    },

    /** Выстрел героя (волшебная палочка появится на Этапе 4). */
    heroShot: function (p, angle, opts) {
      opts = opts || {};
      shotsList.push({
        from: 'hero',
        owner: p,
        x: p.x, y: p.y - 40,
        vx: Math.cos(angle) * (opts.speed || 330),
        vy: Math.sin(angle) * (opts.speed || 330),
        r: opts.r || 8,
        damage: opts.damage || 1,
        knockback: opts.knockback || 140,
        color: opts.color || '#ffd8ec', dark: opts.dark || p.color,
        life: 1.6, spin: 0
      });
    },

    /* ======================================================================
     * Добыча
     * ==================================================================== */
    dropCandy: function (x, y) { addDrop(x, y, 'candy'); },
    dropHeart: function (x, y) { addDrop(x, y, 'heart'); },
    /** Редчайшая добыча: звёздная пыль для секретного оружия. */
    dropDust: function (x, y) {
      addDrop(x, y, 'dust');
      Combat.particles(x, y - 10, '#ffdf5e', 22, { speed: 170, star: true, size: 5 });
      Combat.floatText(x, y - 26, '✦ звёздная пыль!', '#ffd24a');
      Combat.shake(5);
    },

    /* ======================================================================
     * Мелочи: частицы, надписи, тряска экрана
     * ==================================================================== */
    particles: function (x, y, color, count, opts) {
      opts = opts || {};
      for (var i = 0; i < count; i++) {
        var a = Math.random() * Math.PI * 2;
        var sp = (opts.speed || 100) * (0.35 + Math.random() * 0.65);
        particlesList.push({
          x: x, y: y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
          size: (opts.size || 4) * (0.6 + Math.random() * 0.8),
          life: 0.45 + Math.random() * 0.3, max: 0.75,
          color: color,
          star: !!opts.star
        });
      }
    },

    /* ======================================================================
     * Попадания мечом — общее для хозяина и гостя
     * ==================================================================== */

    /**
     * Кого задело лезвие героя к этому кадру (каждого — один раз за взмах).
     * Хозяин считает так свои удары, а гость — свои: он сам решает, по кому
     * попал, и сразу показывает удар, не дожидаясь ответа хозяина.
     */
    sweepTargets: function (p) {
      var out = [];
      var s = p.swing;
      if (!s || p.downed) return out;

      var t = 1 - p.attackTimer / s.time;
      var angle = Players.swingAngleOf(p, t);

      for (var j = 0; j < Enemies.list.length; j++) {
        var e = Enemies.list[j];
        if (e.dead || e.spawnIn > 0) continue;
        if (s.hit.indexOf(e) >= 0) continue;   // одним взмахом — один раз

        var dx = e.x - p.x, dy = e.y - p.y;
        var dist = Math.hypot(dx, dy);
        if (dist > s.radius + e.r) continue;

        // Учитываем размер слизня: толстяка задеть проще
        var half = Math.asin(Math.min(0.95, e.r / Math.max(e.r, dist)));
        if (!inSweep(s.from, angle, Math.atan2(dy, dx), half)) continue;

        s.hit.push(e);
        out.push(e);
      }
      return out;
    },

    /** Сила удара: урон взмаха с множителем оружия, а перчатки чемпиона иногда дают крит. */
    rollHit: function (p, damage) {
      var dmg = damage * (p.damageMul || 1);
      var crit = p.crit > 0 && Math.random() < p.crit;
      if (crit) dmg *= 2;
      return { dmg: Math.round(dmg * 10) / 10, crit: crit };
    },

    /** Надпись урона над слизнем. */
    hitText: function (dmg, crit) {
      return (crit ? 'КРИТ ' : '') + '-' + dmg;
    },

    /** Отклик на попадание: звук, цифра урона, искры, тряска. */
    hitFeedback: function (p, e, dmg, crit, spin) {
      if (window.Sound) Sound.play(crit ? 'crit' : 'hit', p.comboIndex);
      Combat.floatText(e.x + (Math.random() * 16 - 8), e.y - e.r * 1.8,
        Combat.hitText(dmg, crit), crit ? '#ffd24a' : '#fff2a8');
      Combat.particles(e.x, e.y - e.r * 0.8, crit ? '#ffdf5e' : '#ffffff',
        crit ? 10 : 4, { speed: 130, star: true });
      Combat.shake(spin ? 4 : (crit ? 5 : 2));
    },

    /**
     * Удар героя по слизню — общий для своих ударов и ударов гостя.
     * move — номер удара (Players.combo), crit — был ли крит
     * (если не указан, бросаем кубик). Возвращает { dmg, crit } или null.
     */
    strike: function (p, e, move, crit) {
      var step = Players.combo[move] || Players.combo[0];
      if (crit == null) crit = p.crit > 0 && Math.random() < p.crit;
      var dmg = Math.round(step.damage * (p.damageMul || 1) * (crit ? 2 : 1) * 10) / 10;
      var knock = step.knockback * (p.knockMul || 1) * (crit ? 1.4 : 1);

      // Заряженный удар сносит щит целиком — и сразу бьёт
      if (step.breakShield && e.shield > 0) {
        e.shield = 0;
        e.shieldTimer = 6;
        Combat.floatText(e.x, e.y - e.r * 2.2, 'щит сломан!', '#cdeeff');
        if (window.Online) Online.fx('text', e.x, e.y - e.r * 2.2, 'щит сломан!');
      }

      // Щит или призрачность — слизень сам покажет «щит!» / «сквозь!»
      if (!Enemies.hurt(e, dmg, p.x, p.y, knock)) return null;
      if (step.stun && !e.dead) Enemies.stun(e, step.stun);

      Combat.hitFeedback(p, e, dmg, crit, step.spin);
      addStreak(p);
      Combat.chargeSuper(p);
      return { dmg: dmg, crit: crit };
    },

    /** Попадание копит шкалу суперприёма. */
    chargeSuper: function (p) {
      if (p.superUsed >= p.superCharges || p.superMeter >= 1) return;
      p.superMeter = Math.min(1, p.superMeter + (p.superFill || 1) / SUPER_HITS);
      if (p.superMeter >= 1) {
        if (window.Sound) Sound.play('superready');
        Combat.floatText(p.x, p.y - 124, 'суперприём готов!', '#ffd24a');
        Combat.particles(p.x, p.y - 50, '#ffdf5e', 14, { speed: 130, star: true });
        if (window.Online) Online.fx('text', p.x, p.y - 124, 'суперприём готов!');
      }
    },

    /**
     * Суперприём (считает хозяин). У каждого героя свой:
     *   Ам Ням — «АМ!»: втягивает слизней вокруг и кусает всех рядом;
     *   кошечка — «Звездопад»: звёзды падают на ближайших слизней.
     */
    startSuper: function (p) {
      if (p.downed || !Players.superReady(p)) return false;
      p.superUsed++;
      p.superMeter = 0;
      if (window.Sound) Sound.play('super');
      Combat.shake(8);

      if (p.hero === 'omnom') {
        superVisual(p, true);
        Combat.floatText(p.x, p.y - 110, 'АМ!', '#8fd14f');
      } else {
        Combat.floatText(p.x, p.y - 110, 'Звездопад!', '#ffd24a');
        Combat.particles(p.x, p.y - 60, '#fff6b0', 16, { speed: 160, star: true });
        var targets = Enemies.list.filter(function (e) {
          return !e.dead && e.spawnIn <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < 440;
        }).sort(function (a, b) {
          return Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y);
        }).slice(0, STAR_COUNT);
        for (var i = 0; i < STAR_COUNT; i++) {
          var x, y;
          if (targets.length) {
            var t = targets[i % targets.length];
            x = t.x; y = t.y;
          } else {
            // Никого рядом — звёзды падают вокруг героини
            var a = i / STAR_COUNT * Math.PI * 2;
            x = p.x + Math.cos(a) * 110; y = p.y + Math.sin(a) * 70;
          }
          var delay = i * 0.13;
          Combat.fallingStar(x, y, delay, p);
          if (window.Online) Online.fx('star', x, y, null, { dl: delay });
        }
      }
      if (window.Online) Online.fx('super', p.x, p.y - 60, p.hero);
      return true;
    },

    /** Звезда суперприёма. owner — герой, если звезда настоящая (у хозяина). */
    fallingStar: function (x, y, delay, owner) {
      starsList.push({ x: x, y: y, delay: delay || 0, t: 0, owner: owner || null });
    },

    /** Гостю пришло «суперприём начался» — показываем без урона. */
    superFx: function (hero, x, y) {
      var p = hero === 'omnom' ? Players.p1 : Players.p2;
      if (window.Sound) Sound.play('super');
      Combat.shake(8);
      if (hero === 'omnom' && p) {
        superVisual(p, false);
        Combat.floatText(p.x, p.y - 110, 'АМ!', '#8fd14f');
      } else {
        Combat.floatText(x, y - 50, 'Звездопад!', '#ffd24a');
      }
    },

    floatText: function (x, y, text, color) {
      textsList.push({ x: x, y: y, text: text, color: color, life: 0.9 });
    },

    shake: function (amount) {
      Game.shakeAmount = Math.min(14, (Game.shakeAmount || 0) + amount);
    }
  };

  /* ------------------------------------------------------------------------
   * Попадания мечом: для каждого героя во время взмаха проверяем,
   * кто попал в сектор дуги и ещё не был задет этим же взмахом.
   * ---------------------------------------------------------------------- */
  function swordHits() {
    // Взмах гостя у хозяина только рисуется: по кому он попал, гость
    // присылает сам (js/online.js), иначе урон прошёл бы дважды
    var host = window.Online && Online.isHost();

    for (var i = 0; i < Players.list.length; i++) {
      var p = Players.list[i];
      var s = p.swing;
      if (!s || p.downed || (host && p.isRemote)) continue;

      var hits = Combat.sweepTargets(p);
      for (var j = 0; j < hits.length; j++) {
        var e = hits[j];
        var r = Combat.strike(p, e, s.index | 0);
        if (!r) continue;
        if (window.Online) {
          Online.fx('hit', e.x, e.y - e.r * 0.8);
          Online.fx('dmg', e.x, e.y - e.r * 1.8, Combat.hitText(r.dmg, r.crit),
            { i: e.netId, c: r.crit ? 1 : 0 });
        }
      }
    }
  }

  /* ------------------------------------------------------------------------
   * Серия попаданий: каждые STREAK_STEP ударов без урона — горстка конфет.
   * Горстка маленькая (1, потом 2, дальше максимум 3), чтобы серия радовала,
   * но не заменяла обычную добычу.
   * ---------------------------------------------------------------------- */
  function addStreak(p) {
    p.streak = (p.streak || 0) + 1;
    if (p.streak > (Game.stats.bestStreak || 0)) Game.stats.bestStreak = p.streak;
    if (p.streak % STREAK_STEP) return;

    var n = Math.min(STREAK_CANDY_MAX, p.streak / STREAK_STEP);
    for (var i = 0; i < n; i++) Combat.dropCandy(p.x, p.y - 10);
    var text = 'серия ' + p.streak + '! +' + n + ' 🍬';
    Combat.floatText(p.x, p.y - 124, text, '#ffb04a');
    Combat.particles(p.x, p.y - 60, '#ffca4a', 10, { speed: 120, star: true });
    if (window.Online) Online.fx('text', p.x, p.y - 124, text);
    if (window.Sound) Sound.play('streak');
  }

  /* ------------------------------------------------------------------------
   * Суперприёмы
   * ---------------------------------------------------------------------- */

  /** «АМ!» Ам Няма: live — считать урон (у хозяина) или только показать. */
  function superVisual(p, live) {
    supersList.push({ p: p, t: 0, live: live, bitten: false });
  }

  function updateSupers(dt, live) {
    var i, j, e;

    for (i = supersList.length - 1; i >= 0; i--) {
      var s = supersList[i];
      var p = s.p;
      s.t += dt;

      if (s.t < AMNOM_PULL) {
        // Втягивает слизней к себе (боссы слишком тяжёлые)
        if (s.live) {
          for (j = 0; j < Enemies.list.length; j++) {
            e = Enemies.list[j];
            if (e.dead || e.isBoss || e.spawnIn > 0) continue;
            var dx = p.x - e.x, dy = p.y - e.y;
            var d = Math.hypot(dx, dy) || 1;
            if (d > AMNOM_PULL_R || d < 46) continue;
            var pull = 420 * (1 - (e.def.knockResist || 0) * 0.5) * dt;
            e.x += dx / d * Math.min(pull, d - 46);
            e.y += dy / d * Math.min(pull, d - 46);
          }
        }
        if (Math.random() < 0.6) {
          var a = Math.random() * Math.PI * 2;
          Combat.particles(p.x + Math.cos(a) * AMNOM_PULL_R * 0.8,
            p.y - 30 + Math.sin(a) * AMNOM_PULL_R * 0.5, '#d8ffb0', 1, { speed: 20 });
        }
      } else if (!s.bitten) {
        s.bitten = true;
        Combat.shake(12);
        ringsList.push({ x: p.x, y: p.y - 30, r0: 30, r1: AMNOM_BITE_R + 20, t: 0, life: 0.4, color: '#8fd14f' });
        Combat.particles(p.x, p.y - 40, '#b8f28a', 26, { speed: 260, size: 6, star: true });
        if (window.Sound) Sound.play('boom');
        if (s.live) {
          var dmg = Math.round(AMNOM_DAMAGE * (p.damageMul || 1) * (p.superMul || 1) * 10) / 10;
          hurtAround(p, p.x, p.y, AMNOM_BITE_R, dmg, 460);
        }
      } else if (s.t > AMNOM_PULL + 0.3) {
        supersList.splice(i, 1);
      }
    }

    for (i = starsList.length - 1; i >= 0; i--) {
      var st = starsList[i];
      if (st.delay > 0) { st.delay -= dt; continue; }
      st.t += dt;
      if (st.t < STAR_FALL) continue;

      // Звезда упала
      starsList.splice(i, 1);
      ringsList.push({ x: st.x, y: st.y, r0: 10, r1: STAR_RADIUS + 10, t: 0, life: 0.3, color: '#ffd24a' });
      Combat.particles(st.x, st.y - 10, '#ffdf5e', 10, { speed: 160, star: true });
      Combat.shake(3);
      if (window.Sound) Sound.play('star');
      if (live && st.owner) {
        var o = st.owner;
        var sdmg = Math.round(STAR_DAMAGE * (o.damageMul || 1) * (o.superMul || 1) * 10) / 10;
        hurtAround(o, st.x, st.y, STAR_RADIUS, sdmg, 200);
      }
    }

    for (i = ringsList.length - 1; i >= 0; i--) {
      ringsList[i].t += dt;
      if (ringsList[i].t >= ringsList[i].life) ringsList.splice(i, 1);
    }
  }

  /** Урон суперприёма всем слизням в круге. Шкалу и серию он не копит. */
  function hurtAround(p, x, y, radius, dmg, knock) {
    var list = Enemies.list.slice();
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.dead || e.spawnIn > 0) continue;
      if (Math.hypot(e.x - x, e.y - y) > radius + e.r) continue;
      if (!Enemies.hurt(e, dmg, x, y, knock)) continue;
      Combat.floatText(e.x + (Math.random() * 16 - 8), e.y - e.r * 1.8, '-' + dmg, '#ffd24a');
      if (window.Online) {
        Online.fx('dmg', e.x, e.y - e.r * 1.8, '-' + dmg, { i: e.netId, c: 1 });
      }
    }
  }

  /** Вихрь вокруг Ам Няма, пока он втягивает слизней. */
  function drawSuperPull(c) {
    for (var i = 0; i < supersList.length; i++) {
      var s = supersList[i];
      if (s.t >= AMNOM_PULL) continue;
      var k = s.t / AMNOM_PULL;
      c.save();
      c.translate(s.p.x, s.p.y - 20);
      c.strokeStyle = '#8fd14f';
      c.lineWidth = 4;
      c.setLineDash([18, 14]);
      for (var j = 0; j < 3; j++) {
        var r = AMNOM_PULL_R * (1 - ((k + j / 3) % 1));
        c.globalAlpha = 0.5 * (r / AMNOM_PULL_R);
        c.beginPath();
        c.ellipse(0, 0, r, r * 0.55, 0, s.t * 6 + j, s.t * 6 + j + Math.PI * 2);
        c.stroke();
      }
      c.restore();
    }
  }

  /** Тени на земле — сюда упадёт звезда. */
  function drawStarShadows(c) {
    for (var i = 0; i < starsList.length; i++) {
      var st = starsList[i];
      var k = st.delay > 0 ? 0.15 : 0.15 + 0.85 * (st.t / STAR_FALL);
      c.save();
      c.globalAlpha = 0.35 * k + 0.1;
      c.fillStyle = '#6a55c9';
      c.beginPath();
      c.ellipse(st.x, st.y, STAR_RADIUS * (0.4 + 0.6 * k), STAR_RADIUS * 0.4 * (0.4 + 0.6 * k), 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  /** Сами падающие звёзды. */
  function drawStars(c) {
    for (var i = 0; i < starsList.length; i++) {
      var st = starsList[i];
      if (st.delay > 0) continue;
      var k = st.t / STAR_FALL;
      var y = st.y - 20 - 340 * (1 - k * k);
      c.save();
      c.translate(st.x + (1 - k) * 60, y);
      // Хвост
      c.globalAlpha = 0.45;
      c.strokeStyle = '#fff6b0';
      c.lineWidth = 8;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(30, -60);
      c.stroke();
      c.globalAlpha = 1;
      c.rotate(k * 6);
      c.fillStyle = '#ffdf5e';
      c.strokeStyle = '#e0a413';
      c.lineWidth = 2.5;
      c.beginPath();
      for (var j = 0; j < 10; j++) {
        var a = -Math.PI / 2 + j * Math.PI / 5;
        var r = j % 2 ? 7 : 17;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }
  }

  function drawRings(c) {
    for (var i = 0; i < ringsList.length; i++) {
      var g = ringsList[i];
      var k = g.t / g.life;
      c.save();
      c.globalAlpha = 0.8 * (1 - k);
      c.strokeStyle = g.color;
      c.lineWidth = 10 * (1 - k) + 2;
      c.beginPath();
      var r = g.r0 + (g.r1 - g.r0) * k;
      c.ellipse(g.x, g.y, r, r * 0.6, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }

  /* ------------------------------------------------------------------------
   * Липкие лужи
   * ---------------------------------------------------------------------- */
  function updatePuddles(dt) {
    for (var i = puddlesList.length - 1; i >= 0; i--) {
      var q = puddlesList[i];
      q.life -= dt;
      if (q.life <= 0) { puddlesList.splice(i, 1); continue; }

      for (var j = 0; j < Players.list.length; j++) {
        var p = Players.list[j];
        if (p.downed) continue;
        if (Math.hypot(p.x - q.x, p.y - q.y) < q.r) Combat.slowPlayer(p, 0.4);
      }
    }
  }

  function drawPuddles(c) {
    for (var i = 0; i < puddlesList.length; i++) {
      var q = puddlesList[i];
      var k = Math.min(1, q.life / 1.2);
      c.save();
      c.globalAlpha = 0.45 * k;
      c.fillStyle = q.color;
      c.beginPath();
      c.ellipse(q.x, q.y, q.r, q.r * 0.45, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 0.6 * k;
      c.lineWidth = 3;
      c.strokeStyle = '#ffffff';
      c.stroke();
      c.restore();
    }
  }

  /** Приводит угол к диапазону [0, 2π). */
  function norm(a) {
    a = a % (Math.PI * 2);
    return a < 0 ? a + Math.PI * 2 : a;
  }

  /**
   * Прошло ли лезвие (от угла from до угла now) через угол a.
   * half — «толщина» цели в радианах: крупного врага задеть легче.
   */
  function inSweep(from, now, a, half) {
    var total = now - from;               // может быть отрицательным (обратный взмах)
    if (total >= 0) {
      var d = norm(a - from);
      return d <= total + half || d >= Math.PI * 2 - half;
    }
    var d2 = norm(from - a);
    return d2 <= -total + half || d2 >= Math.PI * 2 - half;
  }

  /* ------------------------------------------------------------------------
   * Снаряды
   * ---------------------------------------------------------------------- */
  function updateShots(dt) {
    for (var i = shotsList.length - 1; i >= 0; i--) {
      var s = shotsList[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      s.spin += dt * 8;

      var gone = s.life <= 0;
      var a = Game.arena, m = 60;
      if (s.x < a.left - m || s.x > a.right + m || s.y < a.top - m || s.y > a.bottom + m) gone = true;

      if (!gone && s.from === 'enemy') {
        for (var j = 0; j < Players.list.length; j++) {
          var p = Players.list[j];
          if (p.downed || p.invul > 0 || p.dashTimer > 0) continue;   // рывком проскакивают сквозь плевки
          if (Math.hypot(p.x - s.x, (p.y - 40) - s.y) < s.r + 22) {
            if (Combat.damagePlayer(p, s.damage, s.x, s.y) && s.slow) {
              Combat.slowPlayer(p, s.slow);
            }
            gone = true;
            break;
          }
        }
      } else if (!gone && s.from === 'hero') {
        for (var k = 0; k < Enemies.list.length; k++) {
          var e = Enemies.list[k];
          if (e.dead || e.spawnIn > 0) continue;
          if (Math.hypot(e.x - s.x, (e.y - e.r) - s.y) < s.r + e.r) {
            if (Enemies.hurt(e, s.damage, s.x, s.y, s.knockback)) {
              Combat.floatText(e.x, e.y - e.r * 1.8, '-' + s.damage, '#ffe6f3');
              if (window.Online) {
                Online.fx('dmg', e.x, e.y - e.r * 1.8, '-' + s.damage, { i: e.netId, w: 1 });
              }
            }
            gone = true;
            break;
          }
        }
      }

      if (gone) {
        Combat.particles(s.x, s.y, s.color, 6, { speed: 90 });
        shotsList.splice(i, 1);
      }
    }
  }

  function drawShots(c) {
    for (var i = 0; i < shotsList.length; i++) {
      var s = shotsList[i];
      c.save();
      c.translate(s.x, s.y);
      // Хвостик
      c.globalAlpha = 0.35;
      c.fillStyle = s.color;
      c.beginPath();
      c.ellipse(-s.vx * 0.03, -s.vy * 0.03, s.r * 1.5, s.r * 0.8, Math.atan2(s.vy, s.vx), 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      // Сам шарик
      c.rotate(s.spin);
      c.fillStyle = s.color;
      c.strokeStyle = s.dark;
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(0, 0, s.r, 0, Math.PI * 2);
      c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.beginPath();
      c.arc(-s.r * 0.3, -s.r * 0.3, s.r * 0.28, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  /* ------------------------------------------------------------------------
   * Конфеты и сердечки
   * ---------------------------------------------------------------------- */
  function addDrop(x, y, kind) {
    var a = Math.random() * Math.PI * 2;
    var sp = 40 + Math.random() * 70;
    dropsList.push({
      kind: kind,
      x: x, y: y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      bob: Math.random() * Math.PI * 2,
      life: kind === 'dust' ? 999 : 14,   // конфета лежит недолго, пыль ждёт сколько нужно
      settle: 0.35
    });
  }

  function updateDrops(dt) {
    for (var i = dropsList.length - 1; i >= 0; i--) {
      var d = dropsList[i];
      d.bob += dt * 5;
      d.life -= dt;

      if (d.settle > 0) {
        // Отлетает от места гибели слизня и тормозит
        d.settle -= dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vx *= 0.88; d.vy *= 0.88;
      } else {
        // Притягивается к ближайшему герою
        var p = nearestUpPlayer(d.x, d.y);
        if (p) {
          var dx = p.x - d.x, dy = (p.y - 20) - d.y;
          var dist = Math.hypot(dx, dy) || 1;
          var reach = PICKUP_MAGNET * (p.magnet || 1);
          if (dist < reach) {
            var pull = 260 * (1 - dist / reach) + 90;
            d.x += dx / dist * pull * dt;
            d.y += dy / dist * pull * dt;
          }
          if (dist < PICKUP_RADIUS) {
            pickUp(d, p);
            dropsList.splice(i, 1);
            continue;
          }
        }
      }

      if (d.life <= 0) dropsList.splice(i, 1);
    }
  }

  function pickUp(d, p) {
    if (d.kind === 'candy') {
      Game.stats.candy++;
      Game.stats.candyTotal++;
      var got = Shop.addCoin(p.hero, 1) || 1;   // домик иногда добавляет лишнюю
      if (window.Sound) Sound.play('candy');
      if (window.Online) Online.fx('candy', d.x, d.y - 10, got);
      Combat.floatText(d.x, d.y - 10, '+' + got, '#ffca4a');
      Combat.particles(d.x, d.y, '#ffd36e', 5, { speed: 70, star: true });
    } else if (d.kind === 'heart') {
      if (p.hp < p.maxHp) p.hp++;
      if (window.Sound) Sound.play('heart');
      Combat.floatText(d.x, d.y - 10, '+♥', '#ff8fb4');
      Combat.particles(d.x, d.y, '#ff9fc4', 7, { speed: 80 });
    } else {
      // Звёздная пыль — в копилку того, кто поднял
      Shop.addDust(p.hero, 1);
      Shop.save();
      Game.stats.dust = (Game.stats.dust || 0) + 1;
      if (window.Online) Online.fx('dust', d.x, d.y - 10);
      if (window.Sound) Sound.play('dust');
      Combat.floatText(d.x, d.y - 12, '✦ +1', '#ffd24a');
      Combat.particles(d.x, d.y, '#ffdf5e', 14, { speed: 120, star: true });
      Game.banner('Звёздная пыль! ✦', p.name + ', теперь у тебя её ' + Shop.dust[p.hero], 2);
    }
  }

  function nearestUpPlayer(x, y) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < Players.list.length; i++) {
      var p = Players.list[i];
      if (p.downed) continue;
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  function drawDrops(c) {
    for (var i = 0; i < dropsList.length; i++) {
      var d = dropsList[i];
      var hop = Math.sin(d.bob) * 3;
      var fade = d.life < 3 ? (Math.sin(d.life * 12) * 0.4 + 0.6) : 1;  // мигает перед исчезновением

      c.save();
      c.globalAlpha = fade;
      c.fillStyle = 'rgba(60, 110, 50, 0.18)';
      c.beginPath();
      c.ellipse(d.x, d.y + 6, 9, 3.5, 0, 0, Math.PI * 2);
      c.fill();

      c.translate(d.x, d.y + hop);
      if (d.kind === 'candy') {
        c.rotate(Math.sin(d.bob * 0.5) * 0.3);
        // фантик
        c.fillStyle = '#ffb3d1';
        c.beginPath();
        c.moveTo(-5, 0); c.lineTo(-12, -6); c.lineTo(-12, 6); c.closePath();
        c.moveTo(5, 0); c.lineTo(12, -6); c.lineTo(12, 6); c.closePath();
        c.fill();
        // конфета
        c.fillStyle = '#ff8fb4';
        c.strokeStyle = '#d45d8e';
        c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.beginPath(); c.arc(-2.2, -2.2, 2.2, 0, Math.PI * 2); c.fill();
      } else if (d.kind === 'dust') {
        // Звёздочка с ореолом и искрами
        c.rotate(d.bob * 0.6);
        var glow = c.createRadialGradient(0, 0, 2, 0, 0, 20);
        glow.addColorStop(0, 'rgba(255, 240, 160, 0.85)');
        glow.addColorStop(1, 'rgba(255, 223, 94, 0)');
        c.fillStyle = glow;
        c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffdf5e';
        c.strokeStyle = '#e0a413';
        c.lineWidth = 2;
        c.beginPath();
        for (var si = 0; si < 10; si++) {
          var sa = -Math.PI / 2 + si * Math.PI / 5;
          var sr = si % 2 ? 4 : 10;
          c.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
        }
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#fff8d8';
        c.beginPath(); c.arc(-2, -2, 2.4, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = '#ff6f9d';
        c.strokeStyle = '#d33f74';
        c.lineWidth = 2;
        heartPath(c, 9);
        c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.8)';
        c.beginPath(); c.arc(-3, -3, 2, 0, Math.PI * 2); c.fill();
      }
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

  /* ------------------------------------------------------------------------
   * Частицы и надписи
   * ---------------------------------------------------------------------- */
  function updateParticles(dt) {
    for (var i = particlesList.length - 1; i >= 0; i--) {
      var q = particlesList[i];
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.9; q.vy *= 0.9;
      q.life -= dt;
      if (q.life <= 0) particlesList.splice(i, 1);
    }
  }

  function drawParticles(c) {
    for (var i = 0; i < particlesList.length; i++) {
      var q = particlesList[i];
      var k = Math.max(0, q.life / q.max);
      c.save();
      c.globalAlpha = k;
      c.fillStyle = q.color;
      if (q.star) {
        c.beginPath();
        var s = q.size * (0.6 + k);
        c.moveTo(q.x, q.y - s);
        c.quadraticCurveTo(q.x, q.y, q.x + s, q.y);
        c.quadraticCurveTo(q.x, q.y, q.x, q.y + s);
        c.quadraticCurveTo(q.x, q.y, q.x - s, q.y);
        c.quadraticCurveTo(q.x, q.y, q.x, q.y - s);
        c.fill();
      } else {
        c.beginPath();
        c.arc(q.x, q.y, q.size * (0.4 + k), 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }

  function updateTexts(dt) {
    for (var i = textsList.length - 1; i >= 0; i--) {
      var t = textsList[i];
      t.y -= 34 * dt;
      t.life -= dt;
      if (t.life <= 0) textsList.splice(i, 1);
    }
  }

  function drawTexts(c) {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (var i = 0; i < textsList.length; i++) {
      var t = textsList[i];
      c.save();
      c.globalAlpha = Math.min(1, t.life * 1.6);
      c.font = '900 17px Nunito, "Segoe UI", sans-serif';
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(90, 59, 63, 0.55)';
      c.strokeText(t.text, t.x, t.y);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, t.y);
      c.restore();
    }
  }

  window.Combat = Combat;
})();

