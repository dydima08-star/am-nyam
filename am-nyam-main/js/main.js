/* ============================================================================
 * js/main.js — игровой цикл и связывание всего вместе.
 *
 * Здесь живёт глобальный объект Game:
 *   • канвас с логическим разрешением 960×600 (чёткий на любых экранах);
 *   • клавиатура (Game.keys — зажатые клавиши, Game.pressed — нажатые в этом кадре);
 *   • состояния игры: 'loading' → 'menu' → 'playing';
 *   • цикл requestAnimationFrame: update(dt) → render().
 *
 * Остальные файлы (players.js, enemies.js, ...) на следующих этапах будут
 * добавлять свои системы, а main.js — вызывать их в нужном порядке.
 * ========================================================================== */
(function () {
  'use strict';

  var Game = {
    VERSION: 11,        // номер версии — видно в углу экрана, чтобы понимать,
                         // обновился ли сайт после заливки
    W: 960,              // логическая ширина арены
    H: 600,              // логическая высота арены
    state: 'loading',    // 'loading' | 'menu' | 'playing'
    mode: null,          // 'solo' | 'duo'
    time: 0,             // секунд с запуска
    keys: Object.create(null),     // зажатые сейчас клавиши (по e.code)
    pressed: Object.create(null),  // нажатые в текущем кадре (сбрасываются в конце кадра)
    fps: 60,
    pixelScale: 1,       // сколько реальных пикселей канваса в одном логическом

    world: 1,            // номер текущего мира (1…20)
    mod: {},             // особенность арены: лёд, песок, темнота, ветер
    wind: { x: 0, y: 0, timer: 0 },
    stats: { candy: 0, candyTotal: 0, kills: 0 },  // конфеты и убитые слизни
    shakeAmount: 0,      // тряска экрана при ударах
    bannerData: null,    // крупная надпись посреди экрана («Волна 2»)
    defeatTimer: 0,      // отсчёт до возврата в меню после поражения
    mapTimer: 0,         // отсчёт до возврата на карту после пройденного мира
    bossBonus: null,     // награда за побеждённого босса (для подписи «Мир пройден»)
    endless: false,      // идёт бесконечная волна (js/endless.js)
    finalWin: false,     // только что пройден двадцатый мир

    /**
     * Границы арены: дальше этих координат герои (а потом и враги) не уходят.
     * Координаты считаются по точке «между лапками» героя.
     */
    arena: { left: 70, right: 890, top: 175, bottom: 560 }
  };
  window.Game = Game;

  var canvas, ctx, stage;
  var bgCache = null;    // заранее нарисованный фон арены (перерисовывается при ресайзе)
  var floaties = [];     // летающие сердечки/конфетки на фоне

  /* ------------------------------------------------------------------------
   * Утилиты
   * ---------------------------------------------------------------------- */

  /** Детерминированный генератор случайных чисел — фон всегда одинаковый. */
  Game.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /** Путь скруглённого прямоугольника (ctx.roundRect есть не во всех браузерах). */
  Game.roundRect = function (c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };

  /**
   * Рисует спрайт героя так, что его «якорь» (точка между лапками) стоит в (x, y).
   * opts: { flip — смотреть влево, squashX/squashY — пружинка, rot — наклон, alpha }
   */
  Game.drawSprite = function (c, name, x, y, scale, opts) {
    opts = opts || {};
    var s = Assets.sprites[name];
    var img = Assets.images[name];
    c.save();
    c.translate(x, y);
    if (opts.alpha != null) c.globalAlpha = opts.alpha;
    if (!s || !img) {
      // Заглушка, если картинка не загрузилась
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(0, -30, 28, 0, Math.PI * 2);
      c.fill();
      c.restore();
      return;
    }
    if (opts.rot) c.rotate(opts.rot);
    c.scale(scale * (opts.squashX || 1) * (opts.flip ? -1 : 1), scale * (opts.squashY || 1));
    c.drawImage(img, -s.ax, -s.ay, s.w, s.h);
    c.restore();
  };

  /** Мягкая тень под персонажем. */
  Game.drawShadow = function (c, x, y, rx) {
    c.save();
    c.fillStyle = 'rgba(60, 110, 50, 0.22)';
    c.beginPath();
    c.ellipse(x, y, rx, rx * 0.32, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  };

  /* ------------------------------------------------------------------------
   * Проверка обновлений.
   *
   * Браузер любит показывать сохранённую в памяти страницу, и понять, залилась
   * новая версия или нет, бывает трудно. Поэтому игра сама тихонько смотрит,
   * что сейчас лежит на сайте: если там номер больше — показывает кнопку
   * «обновиться», и одно нажатие загружает свежую версию.
   * ---------------------------------------------------------------------- */
  function checkForUpdate() {
    if (!/^https?:$/.test(window.location.protocol) || !window.fetch) return;
    var url = window.location.pathname + '?just-checking=' + Date.now();

    fetch(url, { cache: 'no-store', headers: { Range: 'bytes=0-3000' } })
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var m = /AMNYAM-VERSION:\s*(\d+)/.exec(text);
        if (!m) return;
        var fresh = parseInt(m[1], 10);
        if (!(fresh > Game.VERSION)) return;
        showUpdateButton(fresh);
      })
      .catch(function () { /* нет связи — и не надо */ });
  }

  function showUpdateButton(fresh) {
    var line = document.getElementById('version-line');
    if (!line) return;
    line.innerHTML = '';

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-update';
    b.textContent = '✨ версия ' + fresh + ' — обновить';
    b.addEventListener('click', function () {
      window.location.replace(window.location.pathname + '?v=' + fresh);
    });
    line.appendChild(b);
  }

  /* ------------------------------------------------------------------------
   * Экраны (DOM-оверлеи). На Этапе 8 это переедет в ui.js.
   * ---------------------------------------------------------------------- */
  /** Показать номер версии (или кнопку обновления) в углу экрана. */
  function refreshVersionLine() {
    var ver = document.getElementById('version-line');
    if (!ver) return;
    // Во время игры не мешаем — показываем только на экранах меню
    ver.hidden = (Game.state === 'playing' || Game.state === 'paused');
    if (!ver.querySelector('button')) ver.textContent = 'v' + Game.VERSION;
  }
  Game.refreshVersionLine = refreshVersionLine;

  Game.showScreen = function (name) {
    // Любой другой экран закрывает лавку, открытую посреди забега
    if (name !== 'shop' && window.Shop && Shop.inGame) Shop.leaveGame();
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.toggle('active', screens[i].id === 'screen-' + name);
    }
    document.getElementById('topbar').hidden = (Game.state !== 'playing');
    refreshVersionLine();
  };

  /* ------------------------------------------------------------------------
   * Размер канваса: логические 960×600, реальные пиксели — по размеру сцены
   * и плотности экрана, чтобы спрайты не мылились.
   * ---------------------------------------------------------------------- */
  Game.resize = function () {
    // offsetWidth/Height, а не getBoundingClientRect: на телефоне поле может
    // быть повёрнуто на 90°, и тогда rect показывает перевёрнутые размеры.
    var cw = stage.offsetWidth, ch = stage.offsetHeight;
    // На телефоне ограничиваем плотность пикселей — так игра идёт плавнее
    var maxDpr = (window.Touch && Touch.active) ? 1.6 : 2;
    var dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    var bw = Math.max(1, Math.round(cw * dpr));
    var bh = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      Game.pixelScale = bw / Game.W;
      bgCache = null; // фон перерисуем в новом разрешении
    }
  };

  /* ------------------------------------------------------------------------
   * Фон арены «Сладкий луг» (на Этапе 5 фоны миров переедут в config.js).
   * Рисуется один раз в отдельный канвас, дальше просто копируется.
   * ---------------------------------------------------------------------- */
  function buildBackground() {
    var world = Config.world(Game.world);
    var off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    var c = off.getContext('2d');
    var W = Game.W, H = Game.H;
    c.scale(Game.pixelScale, Game.pixelScale);
    var rnd = Game.rng(7 + Game.world * 13);

    // Основа — градиент от неба к земле
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, world.sky);
    g.addColorStop(1, world.ground);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    // Мягкие пятна света и тени
    for (var i = 0; i < 14; i++) {
      var px = rnd() * W, py = rnd() * H, pr = 60 + rnd() * 120;
      var rg = c.createRadialGradient(px, py, 0, px, py, pr);
      var light = rnd() < 0.5;
      rg.addColorStop(0, light ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.10)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = rg;
      c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }

    // Украшения своего края
    DECOR[world.decor](c, W, H, rnd, world);

    // Виньетка
    var vg = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    vg.addColorStop(0, 'rgba(255,255,255,0)');
    vg.addColorStop(1, world.dark ? 'rgba(0,0,0,0.45)' : 'rgba(60,90,50,0.26)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);

    // Граница арены — светлая тропинка
    var a = Game.arena;
    c.save();
    c.lineJoin = 'round';
    Game.roundRect(c, a.left - 30, a.top - 74, (a.right - a.left) + 60, (a.bottom - a.top) + 104, 46);
    c.strokeStyle = world.dark ? 'rgba(255, 250, 235, 0.25)' : 'rgba(255, 252, 235, 0.55)';
    c.lineWidth = 16;
    c.stroke();
    c.strokeStyle = 'rgba(120, 180, 100, 0.25)';
    c.lineWidth = 3;
    c.stroke();
    c.restore();

    return off;
  }

  /* ------------------------------------------------------------------------
   * Украшения фона — у каждого края свои
   * ---------------------------------------------------------------------- */
  var DECOR = {
    /** Луга: травинки и цветочки. */
    meadow: function (c, W, H, rnd, world) {
      c.strokeStyle = 'rgba(90, 160, 70, 0.35)';
      c.lineWidth = 2;
      c.lineCap = 'round';
      for (var i = 0; i < 140; i++) {
        var tx = rnd() * W, ty = rnd() * H;
        c.beginPath();
        c.moveTo(tx - 4, ty - 7); c.quadraticCurveTo(tx - 3, ty - 2, tx - 1, ty);
        c.moveTo(tx, ty - 10); c.lineTo(tx, ty);
        c.moveTo(tx + 4, ty - 7); c.quadraticCurveTo(tx + 3, ty - 2, tx + 1, ty);
        c.stroke();
      }
      for (i = 0; i < 46; i++) flower(c, rnd() * W, rnd() * H, 3 + rnd() * 2.5, world.accent[(rnd() * 4) | 0]);
    },

    /** Зима: сугробы, ёлочки, снежинки. */
    winter: function (c, W, H, rnd, world) {
      for (var i = 0; i < 22; i++) {
        var x = rnd() * W, y = rnd() * H, r = 20 + rnd() * 40;
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.beginPath();
        c.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2);
        c.fill();
      }
      for (i = 0; i < 12; i++) {
        var fx = rnd() * W, fy = rnd() * H, fh = 26 + rnd() * 22;
        c.fillStyle = 'rgba(80, 140, 110, 0.55)';
        c.beginPath();
        c.moveTo(fx, fy - fh); c.lineTo(fx + fh * 0.42, fy); c.lineTo(fx - fh * 0.42, fy);
        c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.75)';
        c.beginPath();
        c.moveTo(fx, fy - fh); c.lineTo(fx + fh * 0.2, fy - fh * 0.5); c.lineTo(fx - fh * 0.2, fy - fh * 0.5);
        c.closePath(); c.fill();
      }
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (i = 0; i < 60; i++) {
        c.beginPath();
        c.arc(rnd() * W, rnd() * H, 1.5 + rnd() * 2, 0, Math.PI * 2);
        c.fill();
      }
    },

    /** Берег: песчинки, ракушки, полоса прибоя. */
    beach: function (c, W, H, rnd, world) {
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (var i = 0; i < 300; i++) {
        c.fillRect(rnd() * W, rnd() * H, 2, 2);
      }
      // прибой сверху
      var wg = c.createLinearGradient(0, 0, 0, 120);
      wg.addColorStop(0, 'rgba(140, 210, 240, 0.75)');
      wg.addColorStop(1, 'rgba(140, 210, 240, 0)');
      c.fillStyle = wg;
      c.fillRect(0, 0, W, 120);
      c.strokeStyle = 'rgba(255,255,255,0.7)';
      c.lineWidth = 3;
      for (i = 0; i < 3; i++) {
        c.beginPath();
        for (var x = 0; x <= W; x += 20) {
          var y = 70 + i * 16 + Math.sin(x / 46 + i) * 6;
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      // ракушки
      for (i = 0; i < 18; i++) {
        var sx = rnd() * W, sy = 160 + rnd() * (H - 200), sr = 5 + rnd() * 4;
        c.fillStyle = world.accent[(rnd() * 4) | 0];
        c.beginPath();
        c.arc(sx, sy, sr, Math.PI, 0);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.12)';
        c.lineWidth = 1.2;
        for (var k = -2; k <= 2; k++) {
          c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + k * sr * 0.4, sy - sr * 0.95); c.stroke();
        }
      }
    },

    /** Шоколад: кусочки плитки, капли и крошки. */
    choco: function (c, W, H, rnd, world) {
      for (var i = 0; i < 16; i++) {
        var x = rnd() * W, y = rnd() * H, w = 26 + rnd() * 26;
        c.save();
        c.translate(x, y);
        c.rotate(rnd() * Math.PI);
        c.fillStyle = 'rgba(255,255,255,0.06)';
        c.fillRect(-w / 2, -w / 3, w, w * 0.66);
        c.strokeStyle = 'rgba(255,255,255,0.10)';
        c.lineWidth = 2;
        c.strokeRect(-w / 2, -w / 3, w, w * 0.66);
        c.restore();
      }
      for (i = 0; i < 70; i++) {
        c.fillStyle = world.accent[(rnd() * 4) | 0];
        c.globalAlpha = 0.25 + rnd() * 0.3;
        c.beginPath();
        c.ellipse(rnd() * W, rnd() * H, 3 + rnd() * 4, 2 + rnd() * 3, rnd() * 3, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    },

    /** Звёзды: россыпь звёздочек, туманности и маленькая луна. */
    star: function (c, W, H, rnd, world) {
      for (var i = 0; i < 8; i++) {
        var nx = rnd() * W, ny = rnd() * H, nr = 70 + rnd() * 120;
        var ng = c.createRadialGradient(nx, ny, 0, nx, ny, nr);
        ng.addColorStop(0, 'rgba(200, 160, 255, 0.22)');
        ng.addColorStop(1, 'rgba(200, 160, 255, 0)');
        c.fillStyle = ng;
        c.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
      }
      for (i = 0; i < 130; i++) {
        var sx = rnd() * W, sy = rnd() * H, s = 1 + rnd() * 2.4;
        c.fillStyle = rnd() < 0.25 ? world.accent[(rnd() * 4) | 0] : '#ffffff';
        c.globalAlpha = 0.5 + rnd() * 0.5;
        c.beginPath();
        c.arc(sx, sy, s, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      // луна
      c.fillStyle = 'rgba(255, 248, 216, 0.9)';
      c.beginPath(); c.arc(W - 120, 90, 34, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.10)';
      c.beginPath(); c.arc(W - 130, 82, 7, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(W - 108, 100, 5, 0, Math.PI * 2); c.fill();
    }
  };

  function flower(c, fx, fy, fr, color) {
    c.fillStyle = color;
    for (var p = 0; p < 5; p++) {
      var a = p / 5 * Math.PI * 2;
      c.beginPath();
      c.arc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, fr * 0.75, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffb347';
    c.beginPath();
    c.arc(fx, fy, fr * 0.55, 0, Math.PI * 2);
    c.fill();
  }

  /* ------------------------------------------------------------------------
   * Летающие сердечки и конфетки — украшение и наглядная проверка цикла.
   * ---------------------------------------------------------------------- */
  function initFloaties() {
    var rnd = Game.rng(42);
    floaties = [];
    for (var i = 0; i < 22; i++) {
      floaties.push({
        x: rnd() * Game.W,
        y: rnd() * Game.H,
        size: 7 + rnd() * 8,
        speed: 12 + rnd() * 22,
        phase: rnd() * Math.PI * 2,
        kind: ['heart', 'candy', 'sparkle'][i % 3],
        color: ['#ff9fc4', '#ffd36e', '#9fdcff', '#c9b3ff'][(rnd() * 4) | 0]
      });
    }
  }

  function updateFloaties(dt) {
    for (var i = 0; i < floaties.length; i++) {
      var f = floaties[i];
      f.y -= f.speed * dt;
      if (f.y < -20) { f.y = Game.H + 20; }
    }
  }

  function drawHeart(c, s) {
    c.beginPath();
    c.moveTo(0, s * 0.35);
    c.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
    c.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
    c.fill();
  }

  function drawCandy(c, s) {
    c.beginPath();
    c.moveTo(-s * 0.55, 0); c.lineTo(-s * 1.1, -s * 0.45); c.lineTo(-s * 1.1, s * 0.45); c.closePath();
    c.moveTo(s * 0.55, 0);  c.lineTo(s * 1.1, -s * 0.45);  c.lineTo(s * 1.1, s * 0.45);  c.closePath();
    c.fill();
    c.beginPath();
    c.arc(0, 0, s * 0.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath();
    c.arc(-s * 0.2, -s * 0.2, s * 0.18, 0, Math.PI * 2);
    c.fill();
  }

  function drawSparkle(c, s) {
    c.beginPath();
    for (var k = 0; k < 4; k++) {
      var a = k * Math.PI / 2;
      c.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      c.lineTo(Math.cos(a + Math.PI / 4) * s * 0.3, Math.sin(a + Math.PI / 4) * s * 0.3);
    }
    c.closePath();
    c.fill();
  }

  function drawFloaties(c, alpha) {
    for (var i = 0; i < floaties.length; i++) {
      var f = floaties[i];
      var x = f.x + Math.sin(Game.time * 1.3 + f.phase) * 10;
      c.save();
      c.globalAlpha = alpha;
      c.translate(x, f.y);
      c.rotate(Math.sin(Game.time + f.phase) * 0.3);
      c.fillStyle = f.color;
      if (f.kind === 'heart') drawHeart(c, f.size);
      else if (f.kind === 'candy') drawCandy(c, f.size);
      else drawSparkle(c, f.size);
      c.restore();
    }
  }

  /* ------------------------------------------------------------------------
   * Запуск партии и возврат в меню
   * ---------------------------------------------------------------------- */
  /** Крупная надпись посреди арены на несколько секунд. */
  Game.banner = function (text, sub, seconds) {
    Game.bannerData = { text: text, sub: sub || '', life: seconds || 2, max: seconds || 2 };
  };

  /** Оба героя в обмороке — партия проиграна (полный экран будет на Этапе 8). */
  Game.defeat = function () {
    if (Game.defeatTimer > 0) return;
    Game.defeatTimer = 3;
    if (window.Sound) Sound.play('lose');
    Game.banner('Герои устали…', 'конфет собрано: ' + Game.stats.candyTotal, 3);
  };

  /** Переехать в мир: свои цвета, свой фон и своя особенность арены. */
  Game.applyWorld = function (worldNum) {
    var world = Config.world(worldNum);
    Game.world = world.num;
    Game.mod = {
      ice: world.modifier === 'ice',
      sand: world.modifier === 'sand',
      dark: world.modifier === 'dark',
      wind: world.modifier === 'wind'
    };
    Game.wind = { x: 0, y: 0, timer: 0 };
    bgCache = null;                      // фон нового мира
    var bar = document.getElementById('topbar-mode');
    if (bar) {
      bar.textContent = Game.endless
        ? 'Бесконечная волна · ' + world.name
        : 'Мир ' + world.num + ' · ' + world.name;
    }
    return world;
  };

  Game.startGame = function (mode, worldNum) {
    // Играть можно только вдвоём: без напарника на связи забег не начинается
    if (!(window.Online && Online.active && Net.isOpen())) {
      if (window.Online && Online.active) Online.open();
      else Game.toMenu();
      return;
    }
    Game.mode = mode || Game.mode || 'net';
    Game.state = 'playing';
    var world = Game.applyWorld(worldNum || Game.world);

    Game.stats = { candy: 0, candyTotal: 0, kills: 0, dust: 0, damage: 0, time: 0 };
    Game.shakeAmount = 0;
    Game.bannerData = null;
    Game.defeatTimer = 0;
    Game.mapTimer = 0;
    Game.bossBonus = null;
    Game.finalWin = false;
    Online.resetRun();                 // сетевые хвосты прошлого забега
    // Ужин и крепкий сон действуют этот забег. Считает их хозяин комнаты:
    // у гостя общее сохранение только копия, её не трогаем
    if (window.Home && !Online.isGuest()) Home.beginRun();
    Players.create(Game.mode);   // герои встают в центр арены
    Enemies.reset();        // очередь волн с начала
    Combat.reset();         // ни конфет, ни снарядов с прошлой партии
    Upgrades.resetRun();               // карточки прошлого забега забываем
    if (window.Touch) Touch.reset();   // джойстики под текущий режим
    document.getElementById('btn-shop-game').hidden = true;
    // Убираем фокус с кнопок, чтобы Пробел/Enter не «нажимали» их во время игры
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (!Game.endless) {
      Game.banner(world.name, 'Мир ' + world.num + ' · ' + world.region.name, 2.6);
    }
    if (window.Online && Online.isHost()) {
      Online.command('start', { world: world.num, endless: !!Game.endless });
    }
    Game.showScreen(null);
  };

  /** Мир пройден: награда, открытие следующего и возврат на карту. */
  Game.worldCleared = function () {
    var world = Config.world(Game.world);
    WorldMap.markCleared(world.num);

    for (var i = 0; i < Players.list.length; i++) {
      var p = Players.list[i];
      Shop.addCoin(p.hero, world.clearCandy);
      if (world.clearDust) Shop.addDust(p.hero, world.clearDust);
    }
    Shop.save();

    // Награду за босса уже выдали в enemies.js — в подписи показываем всё вместе
    var bb = Game.bossBonus || { candy: 0, dust: 0 };
    var totalCandy = world.clearCandy + bb.candy;
    var totalDust = (world.clearDust || 0) + bb.dust;
    Game.bossBonus = null;

    if (window.Home) Home.allowRest();   // дома снова можно выспаться
    if (window.Sound) Sound.play('win');
    if (window.Online && Online.isHost()) Online.command('cleared');
    Game.finalWin = (world.num === Config.count);
    if (Game.finalWin && Shop.best.worlds < Config.count) {
      Shop.best.worlds = Config.count;
      Shop.save();
    }

    Game.banner('Мир пройден! ♥',
      'каждому +' + totalCandy + ' конфет' +
      (totalDust ? ' и ✦' + totalDust + ' пыли' : ''), 3.5);
    Game.mapTimer = 4;
  };

  Game.toMenu = function () {
    if (window.Shop) Shop.save();
    // Пока мы в комнате, «В меню» возвращает обоих в комнату.
    // Совсем уйти можно кнопкой «Выйти из комнаты».
    if (window.Online && Online.active) {
      Online.backToRoom(true);
      return;
    }
    Game.endless = false;
    Game.finalWin = false;
    Game.state = 'menu';
    Players.list = [];
    if (window.Touch) Touch.reset();
    var sub = document.getElementById('endless-sub');
    if (sub && window.Shop) {
      sub.textContent = Shop.best.endless
        ? 'рекорд: ' + Shop.best.endless + ' волн'
        : 'сколько продержитесь?';
    }
    Game.showScreen('menu');
  };

  /* ------------------------------------------------------------------------
   * Клавиатура
   * ---------------------------------------------------------------------- */
  // Клавиши, которые не должны прокручивать страницу во время игры
  var BLOCKED = { Space: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Enter: 1 };

  function onKeyDown(e) {
    if (!e.repeat) Game.pressed[e.code] = true;
    Game.keys[e.code] = true;
    if (Game.state === 'playing' && BLOCKED[e.code]) e.preventDefault();
  }
  function onKeyUp(e) {
    Game.keys[e.code] = false;
  }
  // Если окно потеряло фокус — «отпускаем» все клавиши, чтобы герой не бежал сам
  function onBlur() {
    Game.keys = Object.create(null);
  }

  /* ------------------------------------------------------------------------
   * Обновление и отрисовка
   * ---------------------------------------------------------------------- */
  function update(dt) {
    updateFloaties(dt);

    if (Game.state === 'levelup') {
      Upgrades.handleKeys();          // выбор карточки клавишами 1/2/3
    } else if (Game.state === 'paused') {
      if (Game.pressed.Escape || Game.pressed.KeyP) UI.resume();
    } else if (Game.state === 'result') {
      if (Game.pressed.Escape) Game.toMenu();
    } else if (Game.state === 'playing') {
      if (Game.pressed.Escape || Game.pressed.KeyP) {
        if (Shop.inGame) Shop.close();          // Esc в лавке — назад к арене
        else UI.pause();
        return;
      }

      Game.stats.time += dt;

      // В сетевой игре мир считает хозяин комнаты, гость ведёт своего героя
      // и показывает присланную картинку
      if (window.Online && Online.isGuest()) {
        Online.update(dt);
        updateShopButton();
        return;
      }

      updateWind(dt);
      Players.update(dt);
      Enemies.update(dt);
      Combat.update(dt);
      if (window.Online) Online.update(dt);

      // Тряска экрана затухает
      if (Game.shakeAmount > 0) Game.shakeAmount = Math.max(0, Game.shakeAmount - dt * 26);

      // Крупная надпись живёт заданное время
      if (Game.bannerData) {
        Game.bannerData.life -= dt;
        if (Game.bannerData.life <= 0) Game.bannerData = null;
      }

      updateShopButton();

      // После пройденного мира герои возвращаются домой отдохнуть
      if (Game.mapTimer > 0) {
        Game.mapTimer -= dt;
        if (Game.mapTimer <= 0) {
          if (window.Online && Online.active) {
            // Сюда доходит только хозяин: он выбирает следующий мир,
            // а гость возвращается в комнату и ждёт
            if (Game.finalWin && window.UI) UI.showResult('final');
            else { Online.command('room'); WorldMap.open('net'); }
          } else if (Game.finalWin && window.UI) {
            UI.showResult('final');          // прошли всю игру — показываем итоги
          } else if (window.Home) {
            Home.open('after');
            Game.banner('Дома! ♥', 'можно поспать и поужинать перед новым миром', 2.6);
          } else WorldMap.open();
        }
      }

      // После поражения возвращаемся в меню
      if (Game.defeatTimer > 0) {
        Game.defeatTimer -= dt;
        if (Game.defeatTimer <= 0) {
          if (Game.endless && window.Endless) Endless.finish();
          UI.showResult(Game.endless ? 'endless' : 'defeat');
        }
      }
    }
  }

  /**
   * В передышке между волнами можно заглянуть в лавку. Вдвоём — каждый сам:
   * пока кто-то в лавке, перерыв ждёт (enemies.js), а когда волна всё же
   * начинается, лавка закрывается, чтобы герой не стоял под ударами.
   */
  function updateShopButton() {
    var online = !!(window.Online && Online.active);
    var canShop = online
      ? (Enemies.state === 'pause' && Enemies.wave > 0 && Game.defeatTimer <= 0)
      : (Enemies.state === 'pause' || Enemies.state === 'done');
    var shopBtn = document.getElementById('btn-shop-game');
    if (shopBtn.hidden === canShop) shopBtn.hidden = !canShop;
    if (online && Shop.inGame && !canShop) Shop.close();
  }

  function render() {
    var c = ctx;
    // Тряска: сдвигаем всю картинку на пару пикселей в случайную сторону
    var sh = Game.shakeAmount;
    var shx = sh ? (Math.random() - 0.5) * sh : 0;
    var shy = sh ? (Math.random() - 0.5) * sh : 0;

    c.setTransform(1, 0, 0, 1, 0, 0);
    if (!bgCache) bgCache = buildBackground();
    c.drawImage(bgCache, shx * Game.pixelScale, shy * Game.pixelScale);

    c.setTransform(Game.pixelScale, 0, 0, Game.pixelScale, shx * Game.pixelScale, shy * Game.pixelScale);

    if (Game.state === 'playing' || Game.state === 'shop' || Game.state === 'levelup' ||
        Game.state === 'paused' || Game.state === 'result') {
      drawFloaties(c, 0.28);
      Combat.drawGround(c);     // конфеты и сердечки лежат на земле
      drawEntities(c);          // герои и слизни — кто ниже, тот поверх
      Combat.drawAir(c);        // снаряды, брызги, надписи
      if (Game.mod.dark) drawDarkness(c);
      Boss.drawBar(c);          // полоса здоровья босса
      if (window.UI) UI.drawHud(c);
      drawStageHint(c);
      drawBanner(c);
      if (window.Touch) Touch.draw(c);   // джойстики и кнопки на телефоне
    } else if (Game.state === 'home') {
      Home.drawRoom(c);         // уютная комната вместо арены
      drawBanner(c);
    } else {
      drawFloaties(c, 0.75);
    }
  }

  /* ------------------------------------------------------------------------
   * Темнота шоколадной страны: всё поле затемнено, светло только вокруг героев.
   * Рисуем на отдельном холсте, чтобы «прорезать» в темноте круги.
   * ---------------------------------------------------------------------- */
  var darkCanvas = null;
  function drawDarkness(c) {
    var W = Game.W, H = Game.H;
    if (!darkCanvas) darkCanvas = document.createElement('canvas');
    if (darkCanvas.width !== W || darkCanvas.height !== H) {
      darkCanvas.width = W;
      darkCanvas.height = H;
    }
    var d = darkCanvas.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.clearRect(0, 0, W, H);
    d.fillStyle = 'rgba(12, 6, 20, 0.72)';
    d.fillRect(0, 0, W, H);

    d.globalCompositeOperation = 'destination-out';
    for (var i = 0; i < Players.list.length; i++) {
      var p = Players.list[i];
      var r = p.downed ? 90 : 165;
      var g = d.createRadialGradient(p.x, p.y - 30, r * 0.25, p.x, p.y - 30, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.65, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.fillRect(p.x - r, p.y - 30 - r, r * 2, r * 2);
    }
    d.globalCompositeOperation = 'source-over';

    c.drawImage(darkCanvas, 0, 0, W, H);
  }

  /** Герои и враги рисуются одним списком, отсортированным по Y. */
  function drawEntities(c) {
    var ents = [];
    var i;
    for (i = 0; i < Players.list.length; i++) ents.push({ y: Players.list[i].y, p: Players.list[i] });
    for (i = 0; i < Enemies.list.length; i++) ents.push({ y: Enemies.list[i].y, e: Enemies.list[i] });
    // Лопающиеся слизни ещё мгновение видны на своём месте
    for (i = 0; i < Enemies.dying.length; i++) ents.push({ y: Enemies.dying[i].y, e: Enemies.dying[i] });
    ents.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < ents.length; i++) {
      if (ents[i].p) Players.drawOne(c, ents[i].p);
      else Enemies.drawOne(c, ents[i].e);
    }
  }

  /* ------------------------------------------------------------------------
   * Звёздный ветер: раз в несколько секунд меняет направление и сдувает всех.
   * Действует только в мирах Звёздной страны.
   * ---------------------------------------------------------------------- */
  function updateWind(dt) {
    if (!Game.mod.wind) return;
    Game.wind.timer -= dt;
    if (Game.wind.timer <= 0) {
      Game.wind.timer = 5 + Math.random() * 4;
      var a = Math.random() * Math.PI * 2;
      Game.wind.x = Math.cos(a) * 46;
      Game.wind.y = Math.sin(a) * 30;
      Game.banner('Звёздный ветер!', 'держитесь лапками', 1.4);
    }
  }

  /** Крупная надпись посреди арены («Волна 2», «Волна зачищена»). */
  function drawBanner(c) {
    var b = Game.bannerData;
    if (!b) return;
    var k = b.life / b.max;
    var appear = Math.min(1, (1 - k) * 6);          // въезжает
    var fade = Math.min(1, k * 4);                  // и растворяется
    var alpha = Math.min(appear, fade);

    c.save();
    c.globalAlpha = alpha;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    var y = 150 - (1 - appear) * 20;

    c.fillStyle = 'rgba(255, 250, 244, 0.9)';
    Game.roundRect(c, Game.W / 2 - 210, y - 40, 420, b.sub ? 78 : 56, 22);
    c.fill();

    c.fillStyle = '#5b3b3f';
    c.font = '900 30px Nunito, "Segoe UI", sans-serif';
    c.fillText(b.text, Game.W / 2, y - 8);
    if (b.sub) {
      c.font = '700 15px Nunito, "Segoe UI", sans-serif';
      c.fillStyle = '#8a6a6e';
      c.fillText(b.sub, Game.W / 2, y + 20);
    }
    c.restore();
  }

  /** Временная панель: волна и конфеты (на Этапе 8 будет нормальный HUD). */
  function drawStageHint(c) {
    var world = Config.world(Game.world);
    var total = Game.endless ? 0 : world.waves.length;
    var wave = Enemies.state === 'boss' ? 'БОСС!'
      : (Enemies.wave
        ? ('Волна ' + Enemies.wave + (total ? ' из ' + total : ''))
        : 'Приготовьтесь…');
    // Перерыв ждёт того, кто в лавке, — пусть второй видит почему
    if (Enemies.state === 'pause' && window.Online && Online.someoneInShop()) {
      wave = Shop.inGame ? 'вы в лавке — волна ждёт' : 'напарник в лавке — волна ждёт';
    }

    c.fillStyle = 'rgba(255, 250, 244, 0.85)';
    Game.roundRect(c, Game.W / 2 - 200, Game.H - 62, 400, 50, 18);
    c.fill();
    c.fillStyle = '#5b3b3f';
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.font = '900 17px Nunito, "Segoe UI", sans-serif';
    var where = Game.endless ? ('♾ ' + world.name) : ('Мир ' + world.num + ': ' + world.name);
    c.fillText(where + '   ·   ' + wave, Game.W / 2, Game.H - 38);
    c.font = '700 13px Nunito, "Segoe UI", sans-serif';
    c.fillStyle = '#8a6a6e';
    c.fillText('Ам Ням: ' + Shop.coins.omnom + ' конфет, пыли ' + Shop.dust.omnom +
      '   ·   Кошечка: ' + Shop.coins.cat + ' конфет, пыли ' + Shop.dust.cat,
      Game.W / 2, Game.H - 20);

    // Счётчик кадров (для отладки цикла)
    c.textAlign = 'left';
    c.font = '700 12px Nunito, "Segoe UI", sans-serif';
    c.fillStyle = 'rgba(60, 90, 50, 0.6)';
    c.fillText(Math.round(Game.fps) + ' FPS · ' + Game.time.toFixed(1) + ' c', 14, Game.H - 16);
  }

  /* ------------------------------------------------------------------------
   * Игровой цикл
   * ---------------------------------------------------------------------- */
  var lastTs = null;
  function frame(ts) {
    var now = ts / 1000;
    // dt ограничен 50 мс: после сворачивания вкладки игра не «перепрыгнет»
    var dt = lastTs === null ? 0 : Math.min(0.05, now - lastTs);
    lastTs = now;
    Game.time += dt;
    if (dt > 0) Game.fps += (1 / dt - Game.fps) * 0.1;

    update(dt);
    render();

    Game.pressed = Object.create(null);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------------
   * Инициализация
   * ---------------------------------------------------------------------- */
  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    stage = document.getElementById('stage');

    Shop.init();            // кошельки и покупки из памяти браузера
    WorldMap.init();        // карта миров
    Home.init();            // домик: ужин, сон и обустройство
    Sound.init();           // звуки (синтезируются в браузере)
    UI.init();              // пауза и экран итогов
    Online.init();          // игра по сети
    refreshVersionLine();
    setTimeout(checkForUpdate, 2500);   // не появилась ли на сайте версия посвежее
    Touch.init();           // сенсорное управление, если экран сенсорный
    Game.resize();
    window.addEventListener('resize', function () {
      Touch.layout();       // на телефоне пересчитываем размер и поворот
      Game.resize();
    });
    if (window.ResizeObserver) new ResizeObserver(Game.resize).observe(stage);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // На телефоне игра разворачивается на весь экран, как только зовём напарника
    Game.goFullscreen = function () {
      if (Touch.active && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    };
    document.getElementById('btn-menu').addEventListener('click', function () { Game.toMenu(); });

    // Кнопка «во весь экран» — только на телефоне и только если браузер умеет
    var full = document.getElementById('btn-full');
    var root = document.documentElement;
    if (Touch.active && root.requestFullscreen) {
      full.hidden = false;
      full.addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else root.requestFullscreen().catch(function () {});
      });
      document.addEventListener('fullscreenchange', function () {
        setTimeout(function () { Touch.layout(); Game.resize(); }, 120);
      });
    }

    // Портреты в меню — те же спрайты, что и в игре
    document.getElementById('portrait-omnom').src = Assets.sprites.omnom_base.src;
    document.getElementById('portrait-cat').src = Assets.sprites.cat_base.src;

    initFloaties();
    requestAnimationFrame(frame);

    var bar = document.getElementById('loading-bar');
    Assets.load(function (done, total) {
      bar.style.width = Math.round(done / total * 100) + '%';
    }).then(function () {
      // Небольшая пауза, чтобы полоска загрузки успела дойти до конца
      setTimeout(Game.toMenu, 250);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

