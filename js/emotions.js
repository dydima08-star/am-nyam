/* ============================================================================
 * js/emotions.js — настроение героев на мордочке.
 *
 * Сами спрайты у нас нарисованные и всегда улыбаются, поэтому настроение
 * показываем добавками поверх: бровки, капелька пота, нотки радости,
 * звёздочки вокруг головы, когда герой лежит без сил.
 *
 * Состояния:
 *   happy  — здоровья больше трёх четвертей: пританцовывает, над головой нотки;
 *   ok     — обычное состояние, без добавок;
 *   tired  — меньше 40% здоровья: хмурые бровки, капелька, тяжёлое дыхание;
 *   hurt   — только что получил удар: зажмурился, над головой «!»;
 *   downed — лежит в обмороке: вокруг головы кружатся звёздочки.
 *
 * Координаты глаз подобраны по спрайтам: FACE — смещение от точки между лапками.
 * ========================================================================== */
(function () {
  'use strict';

  var FACE = {
    omnom: { cx: 9, cy: -41, eye: 8, brow: 13 },
    cat: { cx: 0, cy: -45, eye: 9, brow: 10 }
  };

  var Emotions = {
    /** Какое сейчас настроение у героя. */
    of: function (p) {
      if (p.downed) return 'downed';
      if (p.hurtFlash > 0) return 'hurt';
      var k = p.hp / p.maxHp;
      if (k <= 0.4) return 'tired';
      if (k >= 0.75) return 'happy';
      return 'ok';
    },

    /**
     * Насколько «тяжело» герою — этим players.js делает дыхание медленнее
     * и добавляет усталую дрожь.
     */
    tiredness: function (p) {
      var k = p.hp / p.maxHp;
      return k <= 0.4 ? (1 - k / 0.4) : 0;
    },

    /** Мордочка на герое, который на ногах. */
    draw: function (c, p, hop) {
      var mood = Emotions.of(p);
      if (mood === 'ok') return;

      var f = FACE[p.hero] || FACE.omnom;
      var side = p.facing > 0 ? 1 : -1;
      var cx = p.x + side * f.cx;
      var cy = p.y + f.cy - hop;

      if (mood === 'hurt') {
        brows(c, cx, cy - f.brow, f.eye, 'angry');
        mark(c, cx + side * 26, cy - 26, '!', '#ff5f8f');
      } else if (mood === 'tired') {
        brows(c, cx, cy - f.brow, f.eye, 'worried');
        sweat(c, cx + side * 20, cy - 8, Game.time * 1.6 + p.x * 0.01);
      } else if (mood === 'happy') {
        happyNote(c, p, cx, cy);
      }
    },

    /** Звёздочки вокруг головы лежачего героя. */
    drawDowned: function (c, p) {
      c.save();
      c.translate(p.x, p.y - 46);
      for (var i = 0; i < 3; i++) {
        var a = Game.time * 2.2 + i * Math.PI * 2 / 3;
        var x = Math.cos(a) * 26;
        var y = Math.sin(a) * 9 - 4;
        var s = 5 + Math.sin(a) * 1.6;
        c.globalAlpha = 0.55 + Math.sin(a) * 0.35;
        c.fillStyle = '#ffdf5e';
        c.strokeStyle = '#e0a413';
        c.lineWidth = 1.4;
        starPath(c, x, y, s);
        c.fill(); c.stroke();
      }
      c.restore();
    }
  };

  /* ------------------------------------------------------------------------
   * Кусочки мордочки
   * ---------------------------------------------------------------------- */

  /** Бровки: 'angry' — домиком вниз (зажмурился), 'worried' — грустно вверх. */
  function brows(c, cx, cy, eye, kind) {
    c.save();
    c.strokeStyle = '#5b3b3f';
    c.lineWidth = 3.2;
    c.lineCap = 'round';
    for (var s = -1; s <= 1; s += 2) {
      var x = cx + s * eye;
      c.beginPath();
      if (kind === 'angry') {
        c.moveTo(x - s * 5, cy - 3);
        c.lineTo(x + s * 5, cy + 2.5);
      } else {
        c.moveTo(x - s * 5, cy + 2.5);
        c.lineTo(x + s * 5, cy - 2);
      }
      c.stroke();
    }
    c.restore();
  }

  /** Капелька пота — набухает и скатывается. */
  function sweat(c, x, y, t) {
    var k = (t % 2) / 2;                 // 0…1 по кругу
    var fall = k * 16;
    var alpha = k < 0.75 ? 1 : (1 - (k - 0.75) / 0.25);
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = '#9fdcff';
    c.strokeStyle = '#5ea9cf';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x, y + fall - 7);
    c.quadraticCurveTo(x + 5, y + fall + 1, x, y + fall + 5);
    c.quadraticCurveTo(x - 5, y + fall + 1, x, y + fall - 7);
    c.closePath();
    c.fill(); c.stroke();
    c.restore();
  }

  /** Восклицательный знак в облачке. */
  function mark(c, x, y, text, color) {
    c.save();
    c.fillStyle = '#fffaf4';
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, y, 11, 0, Math.PI * 2);
    c.fill(); c.stroke();
    c.fillStyle = color;
    c.font = '900 15px Nunito, "Segoe UI", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, y + 1);
    c.restore();
  }

  /** Когда всё хорошо — над головой изредка всплывает нотка или сердечко. */
  function happyNote(c, p, cx, cy) {
    var period = 3.4;
    var phase = (Game.time + (p.hero === 'cat' ? 1.7 : 0)) % period;
    if (phase > 1.4) return;             // большую часть времени ничего нет

    var k = phase / 1.4;
    var x = cx + 22 + Math.sin(k * 6) * 4;
    var y = cy - 22 - k * 26;
    c.save();
    c.globalAlpha = 1 - k;
    c.fillStyle = p.color;
    if (Math.floor(Game.time / period) % 2) {
      // сердечко
      var s = 7;
      c.beginPath();
      c.moveTo(x, y + s * 0.42);
      c.bezierCurveTo(x - s * 1.15, y - s * 0.32, x - s * 0.45, y - s * 1.05, x, y - s * 0.42);
      c.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.15, y - s * 0.32, x, y + s * 0.42);
      c.fill();
    } else {
      // нотка
      c.beginPath();
      c.ellipse(x - 3, y + 4, 4.2, 3.4, -0.4, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = p.color;
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(x + 0.6, y + 4);
      c.lineTo(x + 2.4, y - 7);
      c.stroke();
      c.beginPath();
      c.moveTo(x + 2.4, y - 7);
      c.quadraticCurveTo(x + 8, y - 6, x + 6, y - 1);
      c.stroke();
    }
    c.restore();
  }

  function starPath(c, x, y, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rad = i % 2 ? r * 0.45 : r;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }

  window.Emotions = Emotions;
})();

