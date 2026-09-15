/* ============================================================================
 * js/touch.js — управление пальцами на телефоне и планшете.
 *
 * Как это работает:
 *   • левая часть экрана — джойстик: прижимаете палец где угодно, и там же
 *     появляется кружок; ведёте — герой бежит;
 *   • правая часть — удар: тап бьёт один раз, зажатый палец бьёт очередями;
 *   • в режиме «Двое» экран делится пополам: у каждого свой джойстик и своя
 *     половина для ударов (удобно на планшете).
 *
 * Ещё этот файл подгоняет игру под экран телефона: растягивает поле на весь
 * экран и — если телефон держат вертикально и не переворачивается — поворачивает
 * картинку на 90°, чтобы играть было можно и с заблокированным автоповоротом.
 *
 * На компьютере модуль спит и ничему не мешает.
 * ========================================================================== */
(function () {
  'use strict';

  var Touch = {
    active: false,          // включено ли сенсорное управление
    rot: { on: false, ox: 0, oy: 0, w: 1, h: 1 },
    zones: [],              // зоны экрана по игрокам
    pointers: {},           // активные касания: id → что оно делает
    sticks: []              // нарисованные джойстики
  };

  var stage, canvas;

  /* ------------------------------------------------------------------------
   * Включение
   * ---------------------------------------------------------------------- */
  Touch.init = function () {
    stage = document.getElementById('stage');
    canvas = document.getElementById('game');

    // Сенсорный экран? (на компьютере с мышкой ничего не включаем)
    Touch.active = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    // ?touch=1 в адресе — чтобы проверить управление на компьютере
    if (location.search.indexOf('touch=1') >= 0) Touch.active = true;
    if (!Touch.active) return;

    document.body.classList.add('touch');

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Касания по кнопкам («В меню», «во весь экран») не должны считаться ударом
    var bar = document.getElementById('topbar');
    if (bar) bar.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

    window.addEventListener('orientationchange', function () { setTimeout(Touch.layout, 120); });
    Touch.layout();
  };

  /* ------------------------------------------------------------------------
   * Размер и поворот: игра занимает весь экран телефона
   * ---------------------------------------------------------------------- */
  Touch.layout = function () {
    if (!Touch.active) return;

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var ratio = Game.W / Game.H;              // 1.6 (16:10)
    var rotate = vh > vw * 1.05;              // телефон держат вертикально
    var w, h, ox, oy;

    if (rotate) {
      // Ширина элемента ляжет вдоль высоты экрана
      w = Math.min(vh, vw * ratio);
      h = w / ratio;
      ox = (vw - h) / 2;
      oy = (vh - w) / 2;
      stage.style.transform =
        'translate(' + ox + 'px,' + oy + 'px) rotate(90deg) translate(0, -100%)';
    } else {
      w = Math.min(vw, vh * ratio);
      h = w / ratio;
      ox = (vw - w) / 2;
      oy = (vh - h) / 2;
      stage.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
    }

    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    Touch.rot = { on: rotate, ox: ox, oy: oy, w: w, h: h };

    var hint = document.getElementById('rotate-hint');
    if (hint) hint.hidden = true;             // на телефоне играем как есть

    Game.resize();
  };

  /** Точка касания на экране → координаты внутри игрового поля (960×600). */
  function toLogical(clientX, clientY) {
    var r = Touch.rot;
    var ex, ey;
    if (r.on) {
      ex = clientY - r.oy;
      ey = r.h - (clientX - r.ox);
    } else {
      ex = clientX - r.ox;
      ey = clientY - r.oy;
    }
    return { x: ex / r.w * Game.W, y: ey / r.h * Game.H };
  }
  Touch.toLogical = toLogical;

  /* ------------------------------------------------------------------------
   * Зоны экрана
   *   соло:  левая часть — джойстик, правая — удары
   *   двое:  экран пополам, у каждого свой джойстик и своя кнопка удара
   * ---------------------------------------------------------------------- */
  function buildZones() {
    Touch.zones = [];
    if (!Players.list.length) return;

    var humans = Players.list.filter(function (p) { return !p.isAI && !p.isRemote; });

    if (humans.length <= 1) {
      Touch.zones.push({
        player: humans[0] || Players.p1,
        stick: { x0: 0, x1: Game.W * 0.55 },
        fire: { x0: Game.W * 0.55, x1: Game.W },
        button: { x: Game.W - 108, y: Game.H - 104 }
      });
    } else {
      Touch.zones.push({
        player: humans[0],
        stick: { x0: 0, x1: Game.W * 0.26 },
        fire: { x0: Game.W * 0.26, x1: Game.W * 0.5 },
        button: { x: Game.W * 0.37, y: Game.H - 96 }
      });
      Touch.zones.push({
        player: humans[1],
        stick: { x0: Game.W * 0.74, x1: Game.W },
        fire: { x0: Game.W * 0.5, x1: Game.W * 0.74 },
        button: { x: Game.W * 0.63, y: Game.H - 96 }
      });
    }
  }
  Touch.buildZones = buildZones;

  function zoneAt(lx) {
    for (var i = 0; i < Touch.zones.length; i++) {
      var z = Touch.zones[i];
      if (lx >= z.stick.x0 && lx < z.stick.x1) return { zone: z, kind: 'stick' };
      if (lx >= z.fire.x0 && lx < z.fire.x1) return { zone: z, kind: 'fire' };
    }
    return null;
  }

  /* ------------------------------------------------------------------------
   * Касания
   * ---------------------------------------------------------------------- */
  function onDown(e) {
    if (Game.state !== 'playing') return;     // в меню работают обычные кнопки
    if (window.Shop && Shop.inGame) return;   // в лавке посреди забега — тоже кнопки
    var pos = toLogical(e.clientX, e.clientY);
    var hit = zoneAt(pos.x);
    if (!hit) return;

    e.preventDefault();
    if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }

    if (hit.kind === 'stick') {
      Touch.pointers[e.pointerId] = {
        kind: 'stick', zone: hit.zone,
        ox: pos.x, oy: pos.y, x: pos.x, y: pos.y
      };
    } else {
      Touch.pointers[e.pointerId] = { kind: 'fire', zone: hit.zone };
    }
  }

  function onMove(e) {
    var t = Touch.pointers[e.pointerId];
    if (!t || t.kind !== 'stick') return;
    e.preventDefault();
    var pos = toLogical(e.clientX, e.clientY);
    t.x = pos.x;
    t.y = pos.y;
  }

  function onUp(e) {
    delete Touch.pointers[e.pointerId];
  }

  /** Все касания сбрасываются при выходе в меню и в начале партии. */
  Touch.reset = function () {
    Touch.pointers = {};
    buildZones();
  };

  /* ------------------------------------------------------------------------
   * Что читает players.js
   * Возвращает { dx, dy, attack } или null, если героем управляют не пальцем.
   * ---------------------------------------------------------------------- */
  var MAX_STICK = 58;      // на сколько пикселей можно отвести палец до максимума

  Touch.inputFor = function (p) {
    if (!Touch.active) return null;
    var res = null;
    for (var id in Touch.pointers) {
      var t = Touch.pointers[id];
      if (t.zone.player !== p) continue;
      if (!res) res = { dx: 0, dy: 0, attack: false };

      if (t.kind === 'fire') {
        res.attack = true;
      } else {
        var dx = t.x - t.ox, dy = t.y - t.oy;
        var d = Math.hypot(dx, dy);
        if (d > 8) {                       // мёртвая зона, чтобы не дёргался
          var k = Math.min(1, d / MAX_STICK);
          res.dx = dx / d * k;
          res.dy = dy / d * k;
        }
      }
    }
    return res;
  };

  /* ------------------------------------------------------------------------
   * Рисование джойстиков и кнопок поверх игры
   * ---------------------------------------------------------------------- */
  Touch.draw = function (c) {
    if (!Touch.active || Game.state !== 'playing') return;

    // Кнопки удара — всегда на своих местах
    for (var i = 0; i < Touch.zones.length; i++) {
      var z = Touch.zones[i];
      var pressed = false;
      for (var id in Touch.pointers) {
        var t = Touch.pointers[id];
        if (t.zone === z && t.kind === 'fire') pressed = true;
      }
      drawFireButton(c, z, pressed);
    }

    // Джойстики — там, где сейчас палец
    for (var id2 in Touch.pointers) {
      var s = Touch.pointers[id2];
      if (s.kind !== 'stick') continue;
      drawStick(c, s);
    }
  };

  function drawStick(c, s) {
    var dx = s.x - s.ox, dy = s.y - s.oy;
    var d = Math.hypot(dx, dy);
    var k = d > 0 ? Math.min(1, MAX_STICK / d) : 0;
    var kx = s.ox + dx * k, ky = s.oy + dy * k;

    c.save();
    // Основание
    c.globalAlpha = 0.28;
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(s.ox, s.oy, MAX_STICK, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.5;
    c.lineWidth = 3;
    c.strokeStyle = '#ffffff';
    c.stroke();
    // Шарик
    c.globalAlpha = 0.8;
    c.fillStyle = s.zone.player.color;
    c.beginPath(); c.arc(kx, ky, 26, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.9;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }

  function drawFireButton(c, z, pressed) {
    var b = z.button;
    var r = pressed ? 46 : 50;

    c.save();
    c.globalAlpha = pressed ? 0.85 : 0.5;
    c.fillStyle = z.player.color;
    c.beginPath(); c.arc(b.x, b.y, r, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.9;
    c.lineWidth = 3.5;
    c.strokeStyle = '#ffffff';
    c.stroke();

    // Значок взмаха — дужка со звёздочкой
    c.globalAlpha = 0.95;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 5;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(b.x, b.y, r * 0.5, -Math.PI * 0.85, Math.PI * 0.1);
    c.stroke();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(b.x + r * 0.5 * Math.cos(Math.PI * 0.1), b.y + r * 0.5 * Math.sin(Math.PI * 0.1), 4.5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  window.Touch = Touch;
})();

