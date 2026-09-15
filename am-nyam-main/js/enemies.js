/* ============================================================================
 * js/enemies.js — слизни четырёх видов и волны.
 *
 * Виды:
 *   normal  — обычный слизень: идёт напролом;
 *   fast    — быстрый: лёгкий, вихляет из стороны в сторону, но хрупкий;
 *   tank    — толстяк: медленный, много здоровья, почти не отлетает, бьёт сильно;
 *   shooter — стрелок: держится поодаль и плюётся конфетными снарядами.
 *
 * Волны описаны в WAVES. На Этапе 5 описание миров и волн переедет в
 * js/config.js, а в конце каждого мира появится босс.
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * Характеристики видов
   * body / dark — цвет тела и контура, candy — сколько конфет выпадает
   * ---------------------------------------------------------------------- */
  var TYPES = {
    /* --- четвёрка с самого начала --- */
    normal: { name: 'слизень', hp: 2, speed: 58, r: 24, damage: 1, candy: 1, dust: 0.01,
      body: '#8fd14f', dark: '#4e8a2a', knockResist: 0 },
    fast: { name: 'шустрик', hp: 2, speed: 116, r: 20, damage: 1, candy: 1, dust: 0.01,
      body: '#ffb4d2', dark: '#d45d8e', knockResist: 0, wiggle: 3.2 },
    tank: { name: 'толстяк', hp: 7, speed: 34, r: 36, damage: 2, candy: 3, dust: 0.04,
      body: '#b3a4ff', dark: '#6a55c9', knockResist: 0.75 },
    shooter: { name: 'плевака', hp: 3, speed: 46, r: 23, damage: 1, candy: 2, dust: 0.02,
      body: '#ffd36e', dark: '#c98b1e', knockResist: 0.2,
      keepDistance: 190, shootEvery: 2.1, bulletSpeed: 210 },

    /* --- по одному новому виду на каждый следующий мир --- */
    jumper: { name: 'прыгун', hp: 3, speed: 52, r: 22, damage: 1, candy: 2, dust: 0.012,
      body: '#b8f28a', dark: '#4e8a2a', knockResist: 0.1, jumpEvery: 2.0, jumpPower: 430, ears: true },

    bomber: { name: 'бомбочка', hp: 2, speed: 84, r: 21, damage: 1, candy: 2, dust: 0.015,
      body: '#ff9f70', dark: '#c2532a', knockResist: 0, explode: { radius: 96, damage: 2 } },

    splitter: { name: 'делюн', hp: 4, speed: 54, r: 28, damage: 1, candy: 2, dust: 0.015,
      body: '#ffe08a', dark: '#c9942a', knockResist: 0.2, split: { type: 'fast', count: 2 } },

    honey: { name: 'медовик', hp: 5, speed: 44, r: 26, damage: 1, candy: 3, dust: 0.02,
      body: '#ffcf5e', dark: '#b8830d', knockResist: 0.4, sticky: 1.4 },

    snowball: { name: 'снежок', hp: 3, speed: 60, r: 22, damage: 1, candy: 2, dust: 0.015,
      body: '#eaf6ff', dark: '#7fa8c4', knockResist: 0.1,
      keepDistance: 230, shootEvery: 2.6, bulletSpeed: 165, slowShot: 1.2 },

    icy: { name: 'ледышка', hp: 4, speed: 62, r: 23, damage: 1, candy: 2, dust: 0.018,
      body: '#bfe9ff', dark: '#4b8fb3', knockResist: 0.1, sticky: 1.6, icyDeath: true },

    spike: { name: 'колючка', hp: 4, speed: 72, r: 22, damage: 2, candy: 3, dust: 0.02,
      body: '#cdd8ff', dark: '#5568a8', knockResist: 0.3, spiky: true },

    drift: { name: 'сугробик', hp: 8, speed: 30, r: 34, damage: 2, candy: 4, dust: 0.03,
      body: '#ffffff', dark: '#8fb0c4', knockResist: 0.8, shield: 3 },

    crab: { name: 'крабик', hp: 5, speed: 58, r: 25, damage: 2, candy: 3, dust: 0.02,
      body: '#ff8f8f', dark: '#c23a3a', knockResist: 0.3, chargeEvery: 2.6, chargePower: 520 },

    jelly: { name: 'медуза', hp: 4, speed: 46, r: 26, damage: 1, candy: 3, dust: 0.025,
      body: '#ffd7f0', dark: '#d45d9e', knockResist: 1, ghost: true },

    shell: { name: 'ракушка', hp: 9, speed: 28, r: 32, damage: 2, candy: 4, dust: 0.03,
      body: '#ffe6ef', dark: '#c98b9e', knockResist: 0.85, shield: 4, regen: 0.6 },

    octo: { name: 'осьминожек', hp: 6, speed: 40, r: 28, damage: 1, candy: 4, dust: 0.03,
      body: '#c9a6ff', dark: '#6a55c9', knockResist: 0.3, summon: { type: 'fast', every: 4.5, count: 2 } },

    ginger: { name: 'пряник', hp: 6, speed: 48, r: 26, damage: 1, candy: 4, dust: 0.03,
      body: '#e3b06a', dark: '#8b5a2b', knockResist: 0.3, heal: { every: 3.2, amount: 2, radius: 170 } },

    choco: { name: 'шоколадка', hp: 12, speed: 30, r: 38, damage: 3, candy: 5, dust: 0.04,
      body: '#8b5a2b', dark: '#3b2210', knockResist: 0.9, spiky: true },

    nut: { name: 'орешек', hp: 6, speed: 104, r: 21, damage: 2, candy: 4, dust: 0.03,
      body: '#d9a86a', dark: '#7a4526', knockResist: 0.2, chargeEvery: 2.0, chargePower: 620 },

    cocoa: { name: 'капелька какао', hp: 7, speed: 52, r: 30, damage: 2, candy: 4, dust: 0.035,
      body: '#6f4320', dark: '#2f1a0c', knockResist: 0.4, split: { type: 'bomber', count: 3 } },

    starlet: { name: 'звёздочка', hp: 6, speed: 66, r: 22, damage: 2, candy: 5, dust: 0.04,
      body: '#ffdf5e', dark: '#c99a13', knockResist: 0.2,
      orbit: 210, shootEvery: 1.9, bulletSpeed: 240, keepDistance: 210 },

    comet: { name: 'кометка', hp: 7, speed: 128, r: 22, damage: 2, candy: 5, dust: 0.04,
      body: '#8fd6ff', dark: '#2f5d8a', knockResist: 0.2, chargeEvery: 1.8, chargePower: 700, trail: true },

    moon: { name: 'лунный слизень', hp: 9, speed: 48, r: 28, damage: 2, candy: 6, dust: 0.05,
      body: '#e7e2ff', dark: '#6a55c9', knockResist: 0.5, ghost: true, regen: 1.2 },

    shade: { name: 'тень короля', hp: 14, speed: 54, r: 32, damage: 3, candy: 8, dust: 0.06,
      body: '#5a2f52', dark: '#1a0d1a', knockResist: 0.8, shield: 5,
      summon: { type: 'spike', every: 5, count: 2 } }
  };

  /* ------------------------------------------------------------------------
   * Волны. Каждая волна — список пачек {type, count}.
   * pause — сколько секунд отдыха перед волной.
   * ---------------------------------------------------------------------- */
  /** Волны текущего забега: обычные — из js/config.js, бесконечные — из js/endless.js. */
  function waves() {
    if (Game.endless && window.Endless) return Endless.list;
    return Config.world(Game.world).waves;
  }

  var DIE_TIME = 0.22;   // сколько длится «лопание» побеждённого слизня
  var netSeq = 0;        // номера слизней для игры вдвоём

  var Enemies = {
    list: [],
    dying: [],          // побеждённые слизни, которые ещё доигрывают лопание
    types: TYPES,

    /* --- состояние волн --- */
    wave: 0,            // номер текущей волны (1, 2, 3…)
    queue: [],          // кого ещё предстоит выпустить в этой волне
    spawnTimer: 0,
    pauseTimer: 0,
    state: 'idle',      // 'pause' | 'spawning' | 'clearing' | 'done'

    /** Сброс при старте новой партии. */
    reset: function () {
      Enemies.list = [];
      Enemies.dying = [];
      Enemies.wave = 0;
      Enemies.queue = [];
      Enemies.state = 'pause';
      Enemies.pauseTimer = 1.6;
      Enemies.spawnTimer = 0;
      Enemies.killed = 0;
      Enemies.total = totalEnemies();
      // На каких долях забега предлагать карточку
      Enemies.offerAt = (window.Home && Home.offers() > 1) ? [0.34, 0.68] : [0.5];
    },

    killed: 0,      // сколько слизней уже побеждено в этом забеге
    total: 0,       // сколько их всего запланировано
    offerAt: [0.5], // на каких долях забега предлагать карточку прокачки
    waveTotal: 0,   // сколько слизней в текущей волне (для полоски вверху)

    /** Сколько слизней ещё живо. */
    aliveCount: function () { return Enemies.list.length; },

    update: function (dt) {
      updateWaves(dt);
      for (var i = Enemies.list.length - 1; i >= 0; i--) {
        var e = Enemies.list[i];
        if (e.spawnIn > 0) e.spawnIn -= dt;
        if (e.isBoss) Boss.update(e, dt);
        else updateEnemy(e, dt);
        if (e.dead) {
          Enemies.list.splice(i, 1);
          Enemies.bury(e);
        }
      }
      Enemies.updateDying(dt);
      separate();   // чтобы слизни не слипались в одну кучу
    },

    /**
     * Слизень побеждён: он уже не в игре, но ещё мгновение раздувается
     * и тает на месте — так видно, что его добил именно этот удар.
     */
    bury: function (e) {
      if (e.isBoss || e.dieT != null) return;   // босс уходит со своими эффектами
      e.dieT = DIE_TIME;
      Enemies.dying.push(e);
    },

    /** Слизень вернулся в игру (гость поторопился его похоронить). */
    unbury: function (e) {
      var k = Enemies.dying.indexOf(e);
      if (k >= 0) Enemies.dying.splice(k, 1);
      e.dieT = null;
    },

    updateDying: function (dt) {
      for (var i = Enemies.dying.length - 1; i >= 0; i--) {
        var e = Enemies.dying[i];
        e.dieT -= dt;
        if (e.dieT <= 0) { e.dieT = null; Enemies.dying.splice(i, 1); }
      }
    },

    /** Рисование одного слизня (порядок задаёт main.js — кто ниже, тот поверх). */
    drawOne: function (c, e) {
      if (e.dieT != null) {
        // Лопается: раздувается и тает
        var k = 1 - Math.max(0, e.dieT) / DIE_TIME;
        var s = 1 + k * 0.3;
        c.save();
        c.globalAlpha = 1 - k;
        c.translate(e.x, e.y);
        c.scale(s, s);
        c.translate(-e.x, -e.y);
        drawSlime(c, e);
        c.restore();
        return;
      }
      e.isBoss ? Boss.draw(c, e) : drawSlime(c, e);
    },

    draw: function (c) {
      var sorted = Enemies.list.slice().sort(function (a, b) { return a.y - b.y; });
      for (var i = 0; i < sorted.length; i++) drawSlime(c, sorted[i]);
    },

    /** Создать слизня в точке (используется волнами и боссами на Этапе 5). */
    spawn: function (typeName, x, y) {
      var t = TYPES[typeName] || TYPES.normal;
      var world = Config.world(Game.world);
      // Чем дальше мир, тем крепче и быстрее слизни;
      // в бесконечной волне прибавка продолжается с каждой волной
      var boost = (Game.endless && window.Endless) ? Endless.hpMul() : 1;
      var hp = Math.max(1, Math.round(t.hp * world.enemyHp * boost));
      var e = {
        type: typeName, def: t,
        world: world,
        damage: t.damage + (world.enemyDamage - 1),
        x: x, y: y,
        vx: 0, vy: 0,        // итоговая скорость (для взгляда и расчётов)
        walkVx: 0, walkVy: 0, // скорость ходьбы — ею управляет ИИ слизня
        kx: 0, ky: 0,         // отдельная скорость отлёта от удара, она затухает
        hp: hp, maxHp: hp,
        r: t.r,
        speed: t.speed * world.enemySpeed * (Game.mod.sand ? 0.85 : 1) * (0.9 + Math.random() * 0.2),
        flash: 0,               // белая вспышка при попадании
        wobble: Math.random() * Math.PI * 2,
        squash: 1,
        spawnIn: 0.45,          // время «выныривания» из земли
        shootTimer: 0.8 + Math.random(),
        hitCooldown: 0,         // чтобы не бил героя каждый кадр
        // повадки: щит, прыжки, рывки, призыв, лечение, призрачность
        shield: t.shield || 0,
        maxShield: t.shield || 0,
        shieldTimer: 0,
        jumpTimer: (t.jumpEvery || 0) * Math.random(),
        chargeTimer: (t.chargeEvery || 0) * (0.5 + Math.random()),
        charging: 0,            // >0 — замер перед рывком (предупреждение)
        summonTimer: t.summon ? t.summon.every * Math.random() : 0,
        healTimer: t.heal ? t.heal.every * Math.random() : 0,
        ghostPhase: Math.random() * 4,
        netId: ++netSeq,        // по этому номеру слизня узнаёт телефон гостя
        dead: false
      };
      Enemies.list.push(e);
      return e;
    },

    /** Выпустить босса текущего мира. */
    spawnBoss: function () {
      var a = Game.arena;
      var e = Enemies.spawn('tank', (a.left + a.right) / 2, a.top + 40);
      Boss.setup(e, Game.world);
      e.spawnIn = 1.2;
      e.knockResistBoss = 0.92;
      Combat.shake(10);
      return e;
    },

    /** Урон слизню. Вызывается из combat.js. Возвращает true, если урон прошёл. */
    hurt: function (e, dmg, fromX, fromY, knockback) {
      // Призрак неуязвим, пока полупрозрачный
      if (e.def.ghost && e.ghostAlpha < 0.45) {
        Combat.floatText(e.x, e.y - e.r * 1.6, 'сквозь!', '#d9c8ff');
        if (window.Online) Online.fx('text', e.x, e.y - e.r * 1.6, 'сквозь!');
        return false;
      }

      // Щит принимает удар на себя
      if (e.shield > 0) {
        e.shield--;
        e.flash = 0.12;
        e.shieldTimer = 6;
        Combat.floatText(e.x, e.y - e.r * 1.8, 'щит!', '#cdeeff');
        if (window.Online) Online.fx('text', e.x, e.y - e.r * 1.8, 'щит!');
        Combat.particles(e.x, e.y - e.r * 0.6, '#ffffff', 6, { speed: 110, star: true });
        if (knockback) {
          var sdx = e.x - fromX, sdy = e.y - fromY;
          var sd = Math.hypot(sdx, sdy) || 1;
          e.kx += sdx / sd * knockback * 0.3;
          e.ky += sdy / sd * knockback * 0.3;
        }
        return false;
      }

      e.hp -= dmg;
      e.flash = 0.14;
      e.squash = 0.72;

      if (knockback) {
        var dx = e.x - fromX, dy = e.y - fromY;
        var d = Math.hypot(dx, dy) || 1;
        var k = knockback * (1 - (e.isBoss ? 0.92 : e.def.knockResist));
        e.kx += dx / d * k;
        e.ky += dy / d * k;
      }

      if (e.hp <= 0) kill(e);
      else Combat.particles(e.x, e.y - e.r * 0.6, e.def.body, 5, { speed: 90 });
      return true;
    }
  };

  /* ------------------------------------------------------------------------
   * Гибель слизня: брызги, конфеты, иногда сердечко
   * ---------------------------------------------------------------------- */
  function kill(e) {
    e.dead = true;
    Game.stats.kills++;
    if (window.Sound) Sound.play(e.isBoss ? 'bossdown' : 'pop');
    if (window.Online) Online.fx('kill', e.x, e.y - e.r * 0.6, e.def.body, { i: e.netId });

    // Босса победили — мир пройден
    if (e.isBoss) {
      Combat.particles(e.x, e.y - e.r * 0.5, e.bossDef.accent, 60, { speed: 320, size: 7, star: true });
      Combat.shake(14);
      var world = Config.world(Game.world);
      // Щедрая награда: конфеты и гарантированная звёздная пыль
      var bonus = Math.round(60 * world.candyMul);
      var bonusDust = 1 + Math.floor(Game.world / 7);
      Game.bossBonus = { candy: bonus, dust: bonusDust };
      for (var bi = 0; bi < Players.list.length; bi++) {
        var bp = Players.list[bi];
        Shop.addCoin(bp.hero, bonus);
        Shop.addDust(bp.hero, bonusDust);
        Combat.floatText(bp.x, bp.y - 90, '+' + bonus + ' конфет ✦', '#ffd24a');
      }
      // Остальные слизни разбегаются
      for (var bj = Enemies.list.length - 1; bj >= 0; bj--) {
        var minion = Enemies.list[bj];
        if (minion === e || minion.dead) continue;
        minion.dead = true;
        Combat.particles(minion.x, minion.y, minion.def.body, 8, { speed: 140 });
      }
      Enemies.state = 'done';
      Game.worldCleared();
      return;
    }

    Enemies.killed++;

    // Карточку прокачки дают на определённых отметках забега
    // (обычно одну — на середине; с полкой книжек дома две)
    if (Enemies.offerAt.length && Enemies.total &&
        Enemies.killed >= Math.ceil(Enemies.total * Enemies.offerAt[0])) {
      Enemies.offerAt.shift();
      Upgrades.offer();
    }
    Combat.particles(e.x, e.y - e.r * 0.6, e.def.body, 14, { speed: 150, size: 5 });
    Combat.shake(e.def.r > 30 ? 6 : 3);

    // Бомбочка взрывается, задевая героев рядом
    if (e.def.explode) {
      var ex = e.def.explode;
      if (window.Sound) Sound.play('boom');
      if (window.Online) Online.fx('boom', e.x, e.y - e.r * 0.5);
      Combat.particles(e.x, e.y - e.r * 0.5, '#ffb46b', 26, { speed: 240, size: 6 });
      Combat.shake(8);
      for (var pi = 0; pi < Players.list.length; pi++) {
        var pl = Players.list[pi];
        if (Math.hypot(pl.x - e.x, pl.y - e.y) < ex.radius) {
          Combat.damagePlayer(pl, ex.damage, e.x, e.y);
        }
      }
    }

    // Делюн распадается на мелких
    if (e.def.split && !e.isSplit) {
      for (var si = 0; si < e.def.split.count; si++) {
        var a = Math.PI * 2 * si / e.def.split.count;
        var kid = Enemies.spawn(e.def.split.type, e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 20);
        kid.isSplit = true;
        kid.r *= 0.8;
        kid.hp = Math.max(1, Math.round(kid.hp * 0.6));
        kid.maxHp = kid.hp;
        kid.spawnIn = 0.2;
      }
    }

    // Ледышка оставляет после себя скользкую лужу
    if (e.def.icyDeath) {
      Combat.particles(e.x, e.y, '#cdeeff', 14, { speed: 120, star: true });
    }

    var world = e.world || Config.world(Game.world);
    var candy = Math.round(e.def.candy * world.candyMul *
      ((Game.endless && window.Endless) ? Endless.candyMul() : 1));
    for (var i = 0; i < candy; i++) Combat.dropCandy(e.x, e.y);
    // Сердечко выпадает нечасто — и тем приятнее
    if (Math.random() < 0.14) Combat.dropHeart(e.x, e.y);
    // Звёздная пыль — совсем редко, но в дальних мирах чуть чаще
    var dustChance = (e.def.dust || 0) * world.dustMul * (window.Home ? Home.dustMul() : 1);
    if (Math.random() < dustChance) Combat.dropDust(e.x, e.y);
  }

  /* ------------------------------------------------------------------------
   * Логика волн
   * ---------------------------------------------------------------------- */
  function updateWaves(dt) {
    if (Enemies.state === 'done') return;

    if (Enemies.state === 'pause') {
      // Вдвоём перерыв ждёт, пока кто-то выбирает в лавке (но не бесконечно)
      if (window.Online && Online.isHost() && Online.holdBreak(dt)) return;
      Enemies.pauseTimer -= dt;
      if (Enemies.pauseTimer <= 0) startWave(Enemies.wave + 1);
      return;
    }

    if (Enemies.state === 'spawning') {
      Enemies.spawnTimer -= dt;
      var maxAlive = waves()[Enemies.wave - 1].maxAlive;
      if (Enemies.spawnTimer <= 0 && Enemies.queue.length && Enemies.list.length < maxAlive) {
        spawnAtEdge(Enemies.queue.shift());
        Enemies.spawnTimer = waves()[Enemies.wave - 1].spawnEvery;
      }
      if (!Enemies.queue.length) Enemies.state = 'clearing';
      return;
    }

    if (Enemies.state === 'boss') return;   // идёт бой с боссом

    if (Enemies.state === 'clearing' && Enemies.list.length === 0) {
      // Волна зачищена
      if (Game.endless) {
        // Бесконечная волна: готовим следующую и идём дальше
        rewardWave();
        Endless.nextWave();
        Enemies.state = 'pause';
        Enemies.pauseTimer = 3;
        Game.banner('Волна ' + Enemies.wave + ' зачищена!', 'дальше будет сложнее', 2.2);
        Shop.save();
      } else if (Enemies.wave >= waves().length) {
        // Последняя волна пройдена — выходит босс мира
        rewardWave();
        Enemies.state = 'boss';
        if (window.Sound) Sound.play('boss');
        var def = Boss.forWorld(Game.world);
        Game.banner('Босс: ' + def.name, def.title, 3);
        Enemies.spawnBoss();
      } else {
        Enemies.state = 'pause';
        Enemies.pauseTimer = waves()[Enemies.wave].pause;
        Game.banner('Волна ' + Enemies.wave + ' зачищена!', 'Можно заглянуть в лавку мечей', 2.4);
        Shop.save();

        rewardWave();
      }
    }
  }

  /** Награда за зачищенную волну: сердечко и горсть конфет каждому. */
  function rewardWave() {
    var bonus = Math.round((8 + Enemies.wave * 4) * Config.world(Game.world).candyMul);
    for (var i = 0; i < Players.list.length; i++) {
      var p = Players.list[i];
      if (p.downed) continue;
      if (p.hp < p.maxHp) p.hp++;
      Shop.addCoin(p.hero, bonus);
      Game.stats.candy += bonus;
      Game.stats.candyTotal += bonus;
      Combat.floatText(p.x, p.y - 80, '+' + bonus + ' конфет', '#ffca4a');
    }
  }

  /** Сколько всего слизней в забеге — нужно, чтобы поймать его середину. */
  function totalEnemies() {
    var n = 0;
    var list = waves();
    for (var i = 0; i < list.length; i++) {
      for (var j = 0; j < list[i].groups.length; j++) n += list[i].groups[j].count;
    }
    return n;
  }

  function startWave(n) {
    Enemies.wave = n;
    var w = waves()[n - 1];
    Enemies.queue = [];
    for (var i = 0; i < w.groups.length; i++) {
      for (var j = 0; j < w.groups[i].count; j++) Enemies.queue.push(w.groups[i].type);
    }
    shuffle(Enemies.queue);
    Enemies.waveTotal = Enemies.queue.length;   // для полоски волны в HUD
    Enemies.state = 'spawning';
    Enemies.spawnTimer = 0;
    Game.banner('Волна ' + n, 'слизней: ' + Enemies.queue.length, 1.8);
    if (window.Sound) Sound.play('wave');
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
  }

  /** Слизни вылезают из-за края арены. */
  function spawnAtEdge(type) {
    var a = Game.arena;
    var side = (Math.random() * 4) | 0;
    var x, y;
    if (side === 0) { x = a.left + Math.random() * (a.right - a.left); y = a.top - 20; }
    else if (side === 1) { x = a.right + 20; y = a.top + Math.random() * (a.bottom - a.top); }
    else if (side === 2) { x = a.left + Math.random() * (a.right - a.left); y = a.bottom + 20; }
    else { x = a.left - 20; y = a.top + Math.random() * (a.bottom - a.top); }
    var e = Enemies.spawn(type, x, y);
    Combat.particles(x, y, e.def.body, 8, { speed: 70 });
  }

  /* ------------------------------------------------------------------------
   * Поведение слизня
   * ---------------------------------------------------------------------- */
  function updateEnemy(e, dt) {
    e.wobble += dt * 6;
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
    if (e.hitCooldown > 0) e.hitCooldown -= dt;
    e.squash += (1 - e.squash) * Math.min(1, dt * 9);   // возвращаем форму после удара
    if (e.spawnIn > 0) { e.spawnIn -= dt; }

    var target = nearestPlayer(e.x, e.y);

    // Щит восстанавливается, если слизня давно не били
    if (e.maxShield && e.shield < e.maxShield) {
      e.shieldTimer -= dt;
      if (e.shieldTimer <= 0) { e.shield = e.maxShield; e.shieldTimer = 0; }
    }

    // Медленное восстановление здоровья
    if (e.def.regen && e.hp < e.maxHp) {
      e.hp = Math.min(e.maxHp, e.hp + e.def.regen * dt);
    }

    // Призрак то появляется, то тает
    if (e.def.ghost) {
      e.ghostPhase += dt;
      e.ghostAlpha = 0.5 + Math.sin(e.ghostPhase * 1.1) * 0.5;
    }

    // Пряник лечит соседей
    if (e.def.heal && e.spawnIn <= 0) {
      e.healTimer -= dt;
      if (e.healTimer <= 0) {
        e.healTimer = e.def.heal.every;
        var healed = 0;
        for (var hi = 0; hi < Enemies.list.length; hi++) {
          var mate = Enemies.list[hi];
          if (mate === e || mate.dead || mate.hp >= mate.maxHp) continue;
          if (Math.hypot(mate.x - e.x, mate.y - e.y) > e.def.heal.radius) continue;
          mate.hp = Math.min(mate.maxHp, mate.hp + e.def.heal.amount);
          Combat.floatText(mate.x, mate.y - mate.r * 1.8, '+' + e.def.heal.amount, '#8fd14f');
          healed++;
          if (healed >= 3) break;
        }
        if (healed) Combat.particles(e.x, e.y - e.r, '#b8f28a', 10, { speed: 100, star: true });
      }
    }

    // Осьминожек и тень зовут подмогу
    if (e.def.summon && e.spawnIn <= 0 && Enemies.list.length < 26) {
      e.summonTimer -= dt;
      if (e.summonTimer <= 0) {
        e.summonTimer = e.def.summon.every;
        for (var ci = 0; ci < e.def.summon.count; ci++) {
          var ang = Math.random() * Math.PI * 2;
          var kid2 = Enemies.spawn(e.def.summon.type, e.x + Math.cos(ang) * 40, e.y + Math.sin(ang) * 32);
          kid2.spawnIn = 0.3;
        }
        Combat.particles(e.x, e.y - e.r, e.def.body, 12, { speed: 120 });
      }
    }

    if (target && e.spawnIn <= 0) {
      var dx = target.x - e.x, dy = target.y - e.y;
      var dist = Math.hypot(dx, dy) || 1;
      var want = e.speed;

      if (e.def.keepDistance) {
        // Стрелок: подходит на дистанцию выстрела и там топчется
        if (dist > e.def.keepDistance + 30) want = e.speed;
        else if (dist < e.def.keepDistance - 40) want = -e.speed * 0.8;
        else want = 0;

        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && dist < e.def.keepDistance + 90) {
          e.shootTimer = e.def.shootEvery;
          Combat.enemyShot(e, target, e.def.slowShot);
          e.squash = 0.85;
        }
      }

      // Прыгун время от времени скачет в сторону героя
      if (e.def.jumpEvery) {
        e.jumpTimer -= dt;
        if (e.jumpTimer <= 0 && dist < 420) {
          e.jumpTimer = e.def.jumpEvery;
          e.kx += dx / dist * e.def.jumpPower;
          e.ky += dy / dist * e.def.jumpPower;
          e.squash = 0.7;
          Combat.particles(e.x, e.y, e.def.body, 6, { speed: 80 });
        }
      }

      // Крабик, орешек и кометка разгоняются: сначала замирают, потом рывок
      if (e.def.chargeEvery) {
        if (e.charging > 0) {
          e.charging -= dt;
          want = 0;
          if (e.charging <= 0) {
            e.kx += dx / dist * e.def.chargePower;
            e.ky += dy / dist * e.def.chargePower;
            Combat.particles(e.x, e.y - e.r * 0.5, e.def.body, 10, { speed: 150 });
          }
        } else {
          e.chargeTimer -= dt;
          if (e.chargeTimer <= 0 && dist < 360) {
            e.chargeTimer = e.def.chargeEvery;
            e.charging = 0.45;          // предупреждение: слизень замер и дрожит
            want = 0;
          }
        }
      }

      // Звёздочка кружит вокруг героя
      if (e.def.orbit && dist < e.def.orbit + 60 && dist > 60) {
        var tx2 = -dy / dist, ty2 = dx / dist;
        e.walkVx += (tx2 * e.speed - e.walkVx) * Math.min(1, dt * 3);
        e.walkVy += (ty2 * e.speed - e.walkVy) * Math.min(1, dt * 3);
      }

      if (want !== 0) {
        var nx = dx / dist, ny = dy / dist;
        // Шустрики бегут не по прямой, а вихляя
        if (e.def.wiggle) {
          var side = Math.sin(e.wobble * 0.5) * 0.55;
          var tx = -ny, ty = nx;
          nx += tx * side; ny += ty * side;
          var l = Math.hypot(nx, ny); nx /= l; ny /= l;
        }
        e.walkVx += (nx * want - e.walkVx) * Math.min(1, dt * 4.5);
        e.walkVy += (ny * want - e.walkVy) * Math.min(1, dt * 4.5);
      } else {
        e.walkVx -= e.walkVx * Math.min(1, dt * 6);
        e.walkVy -= e.walkVy * Math.min(1, dt * 6);
      }

      // Задел героя — кусает (не чаще раза в секунду)
      var touch = e.r + 20;
      if (dist < touch && e.hitCooldown <= 0) {
        var contact = (e.damage || e.def.damage) + (e.def.spiky ? 1 : 0);
        if (Combat.damagePlayer(target, contact, e.x, e.y)) {
          if (e.def.sticky) Combat.slowPlayer(target, e.def.sticky);
          e.hitCooldown = 1.6;
          e.squash = 0.8;
          // Слизень отскакивает после укуса — герой успевает отбежать
          e.kx -= dx / dist * 170;
          e.ky -= dy / dist * 170;
        }
      }
    }

    // Отлёт от удара затухает отдельно, чтобы не тормозить обычную ходьбу
    var ksp = Math.hypot(e.kx, e.ky);
    if (ksp > 0) {
      var drop = (Game.mod.ice ? 260 : 900) * dt;   // на льду слизни скользят дольше
      if (ksp <= drop) { e.kx = 0; e.ky = 0; }
      else { e.kx -= e.kx / ksp * drop; e.ky -= e.ky / ksp * drop; }
    }

    // Пока слизня отбрасывает, он не идёт вперёд
    var stunned = ksp > 90;
    e.vx = (stunned ? 0 : e.walkVx) + e.kx;
    e.vy = (stunned ? 0 : e.walkVy) + e.ky;

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // Звёздный ветер сдувает и слизней
    if (Game.mod.wind) {
      e.x += Game.wind.x * 0.7 * dt;
      e.y += Game.wind.y * 0.7 * dt;
    }

    // Границы: чуть шире арены, чтобы враги могли заходить с краёв
    var a = Game.arena, m = 40;
    e.x = Math.max(a.left - m, Math.min(a.right + m, e.x));
    e.y = Math.max(a.top - m, Math.min(a.bottom + m, e.y));
  }

  /** Ближайший живой герой (лежачие не считаются). */
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

  /** Мягкое расталкивание, чтобы слизни не залезали друг в друга. */
  function separate() {
    var list = Enemies.list;
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var a = list[i], b = list[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var min = (a.r + b.r) * 0.8;
        var d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < min * min) {
          var d = Math.sqrt(d2);
          var push = (min - d) * 0.35;
          var nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }
  }

  /* ------------------------------------------------------------------------
   * Рисование слизня
   * ---------------------------------------------------------------------- */
  /* ------------------------------------------------------------------------
   * Приметы видов: маленькие детальки, по которым слизня узнают в лицо.
   * Рисуются уже в системе координат слизня (0,0 — под лапками),
   * w — половина ширины тела, h — высота, r — радиус, t — описание вида.
   * ---------------------------------------------------------------------- */
  function outline(c, t, width) {
    c.lineWidth = width || 3;
    c.strokeStyle = t.dark;
    c.stroke();
  }

  /** Ушки-капельки (шустрик, прыгун). */
  function drawEars(c, t, w, h, tall) {
    c.fillStyle = t.body;
    for (var s = -1; s <= 1; s += 2) {
      c.beginPath();
      c.moveTo(s * w * 0.55, -h * 1.2);
      c.quadraticCurveTo(s * w * (tall ? 1.0 : 0.95), -h * (tall ? 2.5 : 2.0), s * w * 0.25, -h * (tall ? 1.75 : 1.55));
      c.closePath();
      c.fill(); outline(c, t, 3);
    }
  }

  /** Шипы по макушке (колючка, шоколадка). */
  function drawSpikes(c, t, w, h, n, len) {
    c.fillStyle = t.dark;
    for (var i = 0; i < n; i++) {
      var a = Math.PI + (i + 0.5) / n * Math.PI;
      var x = Math.cos(a) * w * 0.85, y = -h * 0.95 + Math.sin(a) * h * 0.6;
      c.beginPath();
      c.moveTo(x - 5, y);
      c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      c.lineTo(x + 5, y);
      c.closePath(); c.fill();
    }
  }

  /** Снежинка-звёздочка из чёрточек. */
  function drawFlake(c, x, y, r, color) {
    c.save();
    c.strokeStyle = color; c.lineWidth = 2; c.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var a = i * Math.PI / 3;
      c.beginPath();
      c.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      c.stroke();
    }
    c.restore();
  }

  var MARKS = {
    fast: function (c, e, w, h, r, t) { drawEars(c, t, w, h, false); },

    tank: function (c, e, w, h) {                 // пластина-броня
      c.strokeStyle = 'rgba(255,255,255,0.65)'; c.lineWidth = 5;
      c.beginPath(); c.arc(0, -h * 0.55, w * 0.62, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    },

    shooter: function (c, e, w, h) {              // звёздочка на лбу
      c.fillStyle = '#fff6d5'; starShape(c, 0, -h * 1.35, 7);
    },

    jumper: function (c, e, w, h, r, t) {         // длинные заячьи уши
      drawEars(c, t, w, h, true);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(s * w * 0.62, -h * 1.85, w * 0.09, h * 0.22, s * 0.35, 0, Math.PI * 2);
        c.fill();
      }
    },

    bomber: function (c, e, w, h, r, t) {         // фитилёк с искрой
      c.strokeStyle = '#5b3a25'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, -h * 1.5);
      c.quadraticCurveTo(w * 0.35, -h * 1.95, w * 0.1, -h * 2.15);
      c.stroke();
      var blink = 0.6 + Math.abs(Math.sin(e.wobble * 3)) * 0.4;
      c.fillStyle = '#fff0a8'; c.globalAlpha = blink;
      c.beginPath(); c.arc(w * 0.1, -h * 2.2, 5, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    },

    splitter: function (c, e, w, h, r, t) {       // пунктир-разрез по серединке
      c.save();
      c.strokeStyle = t.dark; c.lineWidth = 4; c.lineCap = 'round';
      c.setLineDash([6, 6]);
      c.beginPath(); c.moveTo(0, -h * 1.68); c.lineTo(0, -1); c.stroke();
      c.setLineDash([]);
      c.fillStyle = t.dark;               // «ножнички» на макушке
      c.beginPath(); c.arc(-4, -h * 1.85, 4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(4, -h * 1.85, 4, 0, Math.PI * 2); c.fill();
      c.restore();
    },

    honey: function (c, e, w, h, r, t) {          // соты и стекающий мёд
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2.5;
      for (var k = -1; k <= 1; k += 2) {
        c.beginPath();
        for (var i = 0; i < 6; i++) {
          var a = i * Math.PI / 3;
          c.lineTo(k * w * 0.42 + Math.cos(a) * w * 0.24, -h * (k < 0 ? 0.55 : 0.95) + Math.sin(a) * w * 0.24);
        }
        c.closePath(); c.stroke();
      }
      c.fillStyle = t.dark;               // капли мёда снизу
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.ellipse(s * w * 0.5, 4 + Math.sin(e.wobble + s) * 2, w * 0.13, h * 0.22, 0, 0, Math.PI * 2);
        c.fill();
      }
    },

    snowball: function (c, e, w, h, r, t) {       // снежная шапочка
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(-w * 0.8, -h * 1.1);
      c.quadraticCurveTo(0, -h * 1.85, w * 0.8, -h * 1.1);
      c.quadraticCurveTo(w * 0.4, -h * 1.25, 0, -h * 1.05);
      c.quadraticCurveTo(-w * 0.4, -h * 1.25, -w * 0.8, -h * 1.1);
      c.closePath(); c.fill(); outline(c, t, 2.5);
      drawFlake(c, w * 0.75, -h * 1.6, 6, t.dark);
    },

    icy: function (c, e, w, h, r, t) {            // ледяные осколки на плечиках
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(s * w * 0.75, -h * 0.5);
        c.lineTo(s * w * 0.95, -h * 1.25);
        c.lineTo(s * w * 0.5, -h * 0.85);
        c.closePath(); c.fill(); outline(c, t, 2);
      }
      drawFlake(c, 0, -h * 1.6, 7, '#ffffff');
    },

    spike: function (c, e, w, h, r, t) { drawSpikes(c, t, w, h, 5, 11); },

    drift: function (c, e, w, h, r, t) {          // сугроб в три слоя + носик-морковка
      c.strokeStyle = 'rgba(160,190,210,0.8)'; c.lineWidth = 3;
      for (var i = 1; i <= 2; i++) {
        c.beginPath();
        c.arc(0, -h * 0.35 * i, w * (0.8 - i * 0.12), Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
      }
      c.fillStyle = '#ff9f4a';
      c.beginPath();
      c.moveTo(0, -h * 0.72); c.lineTo(w * 0.55, -h * 0.62); c.lineTo(0, -h * 0.55);
      c.closePath(); c.fill();
    },

    crab: function (c, e, w, h, r, t) {           // клешни
      c.fillStyle = t.body;
      for (var s = -1; s <= 1; s += 2) {
        var cx = s * w * 1.15, cy = -h * 0.55 + Math.sin(e.wobble * 2 + s) * 3;
        c.beginPath(); c.arc(cx, cy, w * 0.3, 0.5, Math.PI * 2 - 0.5); c.closePath();
        c.fill(); outline(c, t, 3);
        c.beginPath();
        c.moveTo(cx, cy); c.lineTo(cx + s * w * 0.32, cy - w * 0.3);
        c.strokeStyle = t.dark; c.lineWidth = 3; c.stroke();
      }
    },

    jelly: function (c, e, w, h, r, t) {          // щупальца-верёвочки
      c.strokeStyle = t.dark; c.lineWidth = 3; c.lineCap = 'round'; c.globalAlpha = 0.8;
      for (var i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(i * w * 0.32, -2);
        c.quadraticCurveTo(i * w * 0.32 + Math.sin(e.wobble + i) * 6, h * 0.25,
          i * w * 0.32 + Math.sin(e.wobble + i) * 10, h * 0.5);
        c.stroke();
      }
      c.globalAlpha = 1;
    },

    shell: function (c, e, w, h, r, t) {          // веер ракушки
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3;
      for (var i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(0, -h * 0.15);
        c.lineTo(i * w * 0.38, -h * 1.25);
        c.stroke();
      }
    },

    octo: function (c, e, w, h, r, t) {           // ножки-осьминожки
      c.fillStyle = t.body;
      for (var i = -2; i <= 2; i++) {
        var x = i * w * 0.42;
        c.beginPath();
        c.ellipse(x, 2 + Math.abs(Math.sin(e.wobble + i)) * 3, w * 0.16, h * 0.2, 0, 0, Math.PI * 2);
        c.fill(); outline(c, t, 2.5);
      }
    },

    ginger: function (c, e, w, h, r, t) {         // глазурь-зигзаг и пуговки
      c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(-w * 0.7, -h * 1.15);
      for (var i = 0; i < 4; i++) c.lineTo(-w * 0.7 + (i + 1) * w * 0.35, -h * (i % 2 ? 1.15 : 0.95));
      c.stroke();
      c.fillStyle = '#ff8fb4';
      c.beginPath(); c.arc(0, -h * 0.42, 4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(0, -h * 0.18, 4, 0, Math.PI * 2); c.fill();
    },

    choco: function (c, e, w, h, r, t) {          // плитка-дольки и шипы
      c.strokeStyle = 'rgba(255,240,210,0.45)'; c.lineWidth = 2.5;
      for (var i = -1; i <= 1; i++) {
        c.beginPath(); c.moveTo(i * w * 0.45, -h * 1.25); c.lineTo(i * w * 0.45, -h * 0.1); c.stroke();
      }
      c.beginPath(); c.moveTo(-w * 0.8, -h * 0.68); c.lineTo(w * 0.8, -h * 0.68); c.stroke();
      drawSpikes(c, t, w, h, 4, 9);
    },

    nut: function (c, e, w, h, r, t) {            // шапочка жёлудя
      c.fillStyle = t.dark;
      c.beginPath();
      c.moveTo(-w * 0.85, -h * 1.05);
      c.quadraticCurveTo(0, -h * 1.95, w * 0.85, -h * 1.05);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
      for (var i = -1; i <= 1; i++) {
        c.beginPath(); c.moveTo(i * w * 0.4, -h * 1.05); c.lineTo(i * w * 0.28, -h * 1.7); c.stroke();
      }
    },

    cocoa: function (c, e, w, h, r, t) {          // капля сверху и парок
      c.fillStyle = t.body;
      c.beginPath();
      c.moveTo(0, -h * 2.05);
      c.quadraticCurveTo(w * 0.3, -h * 1.5, 0, -h * 1.35);
      c.quadraticCurveTo(-w * 0.3, -h * 1.5, 0, -h * 2.05);
      c.closePath(); c.fill(); outline(c, t, 2.5);
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2.5; c.lineCap = 'round';
      for (var s = -1; s <= 1; s += 2) {
        c.beginPath();
        c.moveTo(s * w * 0.5, -h * 1.5);
        c.quadraticCurveTo(s * w * 0.75, -h * 1.85, s * w * 0.5, -h * 2.1);
        c.stroke();
      }
    },

    starlet: function (c, e, w, h, r, t) {        // корона из лучиков
      c.save();
      c.translate(0, -h * 0.85);
      c.rotate(e.wobble * 0.4);
      c.fillStyle = 'rgba(255,255,255,0.75)';
      for (var i = 0; i < 5; i++) {
        c.save(); c.rotate(i * Math.PI * 2 / 5);
        c.beginPath();
        c.moveTo(-4, -w * 0.9); c.lineTo(4, -w * 0.9); c.lineTo(0, -w * 1.5);
        c.closePath(); c.fill();
        c.restore();
      }
      c.restore();
    },

    comet: function (c, e, w, h, r, t) {          // огненный хвост позади
      var dir = e.vx >= 0 ? -1 : 1;
      c.globalAlpha = 0.55;
      c.fillStyle = '#ffe9a8';
      c.beginPath();
      c.moveTo(dir * w * 0.7, -h * 1.1);
      c.quadraticCurveTo(dir * w * 2.6, -h * 0.9, dir * w * 1.1, -h * 0.25);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = '#ffffff'; starShape(c, 0, -h * 1.5, 6);
    },

    moon: function (c, e, w, h, r, t) {           // месяц на лбу и звёздочки
      c.fillStyle = '#fff6d5';
      c.beginPath();
      c.arc(0, -h * 1.45, 9, 0, Math.PI * 2);
      c.arc(4, -h * 1.5, 8, 0, Math.PI * 2, true);
      c.fill('evenodd');
      c.fillStyle = 'rgba(255,255,255,0.8)';
      starShape(c, -w * 0.7, -h * 1.1, 4);
      starShape(c, w * 0.72, -h * 1.35, 3.5);
    },

    shade: function (c, e, w, h, r, t) {          // корона-тень
      c.fillStyle = '#ffdf5e';
      c.beginPath();
      c.moveTo(-w * 0.6, -h * 1.2);
      c.lineTo(-w * 0.6, -h * 1.75); c.lineTo(-w * 0.2, -h * 1.45);
      c.lineTo(0, -h * 1.9); c.lineTo(w * 0.2, -h * 1.45);
      c.lineTo(w * 0.6, -h * 1.75); c.lineTo(w * 0.6, -h * 1.2);
      c.closePath(); c.fill(); outline(c, t, 2);
    }
  };

  function drawSlime(c, e) {
    var t = e.def;
    var appear = e.spawnIn > 0 ? 1 - e.spawnIn / 0.45 : 1;  // вылезает из земли
    var sq = e.squash * (1 + Math.sin(e.wobble) * 0.05);
    var r = e.r * appear;
    var h = r * 1.15 * sq;          // высота тела
    var w = r * (2 - sq) * 0.98;    // ширина (сжался — расплылся)

    c.save();
    c.translate(e.x, e.y);

    // Тень
    c.fillStyle = 'rgba(60, 110, 50, 0.22)';
    c.beginPath();
    c.ellipse(0, 0, w * 0.8, w * 0.28, 0, 0, Math.PI * 2);
    c.fill();

    // Тело — капелька с волнистым низом
    c.beginPath();
    c.moveTo(-w, 0);
    c.bezierCurveTo(-w, -h * 1.75, w, -h * 1.75, w, 0);
    var bumps = 3;                       // низ — волнистый, как у желе
    for (var i = 0; i < bumps; i++) {
      var x0 = w - (2 * w) * (i / bumps);
      var x1 = w - (2 * w) * ((i + 1) / bumps);
      c.quadraticCurveTo((x0 + x1) / 2, 5 + Math.sin(e.wobble + i) * 2.5, x1, 0);
    }
    c.closePath();
    c.fillStyle = e.flash > 0 ? '#ffffff' : t.body;
    c.fill();
    c.lineWidth = t.knockResist > 0.5 ? 4 : 3;
    c.strokeStyle = e.flash > 0 ? '#ffffff' : t.dark;
    c.stroke();

    // Блик
    c.globalAlpha = 0.55;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(-w * 0.35, -h * 0.95, w * 0.22, h * 0.3, -0.4, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;

    // Приметы вида: у каждого слизня своя узнаваемая деталька
    if (MARKS[e.type]) MARKS[e.type](c, e, w, h, r, t);

    // Глазки
    var eye = r * 0.22;
    c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(-w * 0.3, -h * 0.85, eye, eye * 1.1, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(w * 0.3, -h * 0.85, eye, eye * 1.1, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2b2e';
    var look = Math.max(-1, Math.min(1, e.vx / 70));
    c.beginPath(); c.arc(-w * 0.3 + look * 2, -h * 0.85, eye * 0.52, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(w * 0.3 + look * 2, -h * 0.85, eye * 0.52, 0, Math.PI * 2); c.fill();

    // Ротик
    c.strokeStyle = '#3a2b2e';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, -h * 0.5, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();

    c.restore();

    // Здоровье слизня: полоска (когда уже поцарапали) и цифры «осталось/всего»
    if (e.spawnIn <= 0 && e.dieT == null) {
      var by = e.y - e.r * 2.3;

      if (e.hp < e.maxHp) {
        var bw = Math.max(26, e.r * 1.5);
        c.fillStyle = 'rgba(60,40,45,0.35)';
        Game.roundRect(c, e.x - bw / 2, by, bw, 6, 3); c.fill();
        c.fillStyle = t.body;
        Game.roundRect(c, e.x - bw / 2, by, bw * Math.max(0, e.hp / e.maxHp), 6, 3); c.fill();
      }

      var label = Math.max(0, Math.ceil(e.hp)) + '/' + e.maxHp;
      c.save();
      c.font = '900 12px Nunito, "Segoe UI", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 3.5;
      c.strokeStyle = 'rgba(255, 250, 244, 0.9)';
      c.strokeText(label, e.x, e.y + 14);
      c.fillStyle = t.dark;
      c.fillText(label, e.x, e.y + 14);
      c.restore();
    }
  }

  /** Маленькая пятиконечная звёздочка. */
  function starShape(c, x, y, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr = i % 2 ? r * 0.45 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
  }

  window.Enemies = Enemies;
})();

