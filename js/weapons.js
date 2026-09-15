/* ============================================================================
 * js/weapons.js — оружие героев: по 27 штук каждому.
 *
 * Всё оружие нарисовано прямо кодом (никаких картинок): одна и та же функция
 * рисует его и на карточке в магазине, и в лапке у героя, и вдоль дуги взмаха.
 *
 * Система координат оружия: рукоять в точке (0, 0), клинок смотрит вправо,
 * длина примерно 46–56 пикселей. Поворотом и масштабом занимается вызывающий код.
 *
 * Характеристики — множители к базовым:
 *   damage — урон, speed — скорость ударов, reach — размах (радиус дуги),
 *   knock  — сила отбрасывания (если не указана, обычная).
 *
 * Цена: price — в конфетах, dust — в звёздной пыли (редкая валюта с врагов).
 * Прокачка (см. Weapons.LEVEL_*): каждый уровень добавляет урон, скорость и
 * чуть-чуть размаха. Максимум +5.
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * Прокачка
   * ---------------------------------------------------------------------- */
  var MAX_LEVEL = 5;
  var LEVEL_DAMAGE = 0.10;   // +10% урона за уровень
  var LEVEL_SPEED = 0.04;    // +4% скорости ударов
  var LEVEL_REACH = 0.02;    // +2% размаха

  /* ------------------------------------------------------------------------
   * Помощники для рисования
   * ---------------------------------------------------------------------- */
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function star(c, x, y, r, points, inner) {
    points = points || 5;
    inner = inner || 0.45;
    c.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var a = -Math.PI / 2 + i * Math.PI / points;
      var rad = i % 2 ? r * inner : r;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }

  /** Рукоять с гардой — общая заготовка. */
  function grip(c, color, dark, guard) {
    c.fillStyle = color;
    c.strokeStyle = dark;
    c.lineWidth = 2;
    rr(c, -12, -3.5, 16, 7, 3.5);
    c.fill(); c.stroke();
    if (guard) {
      c.fillStyle = guard;
      rr(c, 2, -9, 6, 18, 3);
      c.fill(); c.stroke();
    }
  }

  /** Клинок-«листик»: универсальная форма меча. */
  function blade(c, len, half, fill, line, tip) {
    c.fillStyle = fill;
    c.strokeStyle = line;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(5, -half);
    c.lineTo(len * 0.72, -half * (tip || 0.85));
    c.lineTo(len, 0);
    c.lineTo(len * 0.72, half * (tip || 0.85));
    c.lineTo(5, half);
    c.closePath();
    c.fill(); c.stroke();
  }

  function shine(c, len) {
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(11, -2); c.lineTo(len * 0.7, -1);
    c.stroke();
  }

  function stick(c, len, color, w) {
    c.strokeStyle = color;
    c.lineWidth = w || 5;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(-10, 0); c.lineTo(len, 0); c.stroke();
  }

  /* ------------------------------------------------------------------------
   * Оружие Ам Няма
   * ---------------------------------------------------------------------- */
  var OMNOM = [
    { id: 'wood', name: 'Деревянный меч', desc: 'С него все начинали',
      price: 0, damage: 1, speed: 1, reach: 1, trail: '#ffffff',
      draw: function (c) {
        c.fillStyle = '#e0b27a'; c.strokeStyle = '#a26f3c'; c.lineWidth = 2;
        rr(c, 6, -5, 40, 10, 4); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.35)'; rr(c, 10, -3.4, 28, 3, 1.5); c.fill();
        grip(c, '#a2703f', '#6d4622', '#c98b4b');
      } },

    { id: 'lolly', name: 'Леденец', desc: 'Сладкий и на удивление крепкий',
      price: 20, damage: 1.25, speed: 1.1, reach: 1, trail: '#ffc2dd',
      draw: function (c) {
        stick(c, 26, '#d9a86a', 6);
        c.fillStyle = '#ff8fb4'; c.strokeStyle = '#d45d8e'; c.lineWidth = 2.5;
        c.beginPath(); c.arc(34, 0, 13, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = '#fff3f8'; c.lineWidth = 3; c.beginPath();
        for (var i = 0; i < 40; i++) {
          var a = i * 0.42, rad = i * 0.32;
          var px = 34 + Math.cos(a) * rad, py = Math.sin(a) * rad;
          i ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.stroke();
      } },

    { id: 'fork', name: 'Вилочка', desc: 'Лёгкая — машет очень часто',
      price: 45, damage: 1.2, speed: 1.45, reach: 0.95, trail: '#eaf6ff',
      draw: function (c) {
        stick(c, 30, '#cfd8e3', 6);
        c.strokeStyle = '#cfd8e3'; c.lineWidth = 4;
        for (var i = -1; i <= 1; i++) {
          c.beginPath(); c.moveTo(30, i * 6); c.lineTo(48, i * 8); c.stroke();
        }
        c.strokeStyle = '#98a6b8'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(30, -9); c.lineTo(30, 9); c.stroke();
        grip(c, '#8d97a6', '#5f6775', null);
      } },

    { id: 'ice', name: 'Ледяной клинок', desc: 'Холодит лапку, но бьёт крепко',
      price: 80, damage: 1.7, speed: 0.95, reach: 1.1, trail: '#cdeeff',
      draw: function (c) {
        var g = c.createLinearGradient(4, 0, 50, 0);
        g.addColorStop(0, '#bfe9ff'); g.addColorStop(1, '#ffffff');
        blade(c, 50, 7, g, '#6fb6e0');
        shine(c, 50);
        grip(c, '#8fd0ea', '#4b8fb3', '#d7f2ff');
      } },

    { id: 'cookie', name: 'Печенье-булава', desc: 'Тяжёлая: бьёт редко, зато раскидывает',
      price: 130, damage: 2.3, speed: 0.72, reach: 1.05, knock: 1.7, trail: '#f0d0a0',
      draw: function (c) {
        stick(c, 24, '#b5744a', 7);
        c.fillStyle = '#e3b06a'; c.strokeStyle = '#a9762f'; c.lineWidth = 2.5;
        c.beginPath(); c.arc(36, 0, 17, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#6b4423';
        var chips = [[32, -6], [42, -2], [34, 7], [44, 8], [38, 0]];
        for (var i = 0; i < chips.length; i++) {
          c.beginPath(); c.arc(chips[i][0], chips[i][1], 2.6, 0, Math.PI * 2); c.fill();
        }
      } },

    { id: 'mint', name: 'Мятная катана', desc: 'Быстрая и длинная',
      price: 200, damage: 2.2, speed: 1.25, reach: 1.2, trail: '#c8ffe8',
      draw: function (c) {
        c.strokeStyle = '#8fe6c4'; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.moveTo(6, 4); c.quadraticCurveTo(34, -2, 58, -10); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(10, 2); c.quadraticCurveTo(34, -4, 54, -10); c.stroke();
        c.strokeStyle = '#3aa982'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(6, 8); c.quadraticCurveTo(34, 2, 60, -8); c.stroke();
        grip(c, '#2f6f5c', '#1d4a3c', '#a8f0d6');
      } },

    { id: 'gold', name: 'Золотой меч', desc: 'Блестит так, что слизни щурятся',
      price: 290, damage: 2.7, speed: 1, reach: 1.15, trail: '#ffe9a8',
      draw: function (c) {
        var g = c.createLinearGradient(0, -8, 0, 8);
        g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.5, '#ffc93c'); g.addColorStop(1, '#e09a13');
        blade(c, 54, 7.5, g, '#b87a0d');
        grip(c, '#8c5a2b', '#5d3a17', '#ffd96b');
        c.fillStyle = '#ff5f8f'; c.strokeStyle = '#c23a66'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(5, 0, 4.2, 0, Math.PI * 2); c.fill(); c.stroke();
      } },

    { id: 'choco', name: 'Шоколадный тесак', desc: 'Широкий, задевает целую компанию',
      price: 400, damage: 3.1, speed: 0.85, reach: 1.35, knock: 1.3, trail: '#e0b48a',
      draw: function (c) {
        var g = c.createLinearGradient(0, -12, 0, 12);
        g.addColorStop(0, '#8b5a2b'); g.addColorStop(0.5, '#6f4320'); g.addColorStop(1, '#4a2c13');
        c.fillStyle = g; c.strokeStyle = '#3b2210'; c.lineWidth = 2;
        c.beginPath();
        c.moveTo(6, -13); c.lineTo(46, -13); c.lineTo(52, 0); c.lineTo(46, 13); c.lineTo(6, 13);
        c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.5;
        for (var i = 1; i < 3; i++) {
          c.beginPath(); c.moveTo(6 + i * 14, -12); c.lineTo(6 + i * 14, 12); c.stroke();
        }
        grip(c, '#d9a86a', '#a9762f', null);
      } },

    { id: 'star', name: 'Звёздный клинок', desc: 'Оставляет за собой звёздочки',
      price: 550, damage: 3.5, speed: 1.15, reach: 1.25, trail: '#e6d4ff',
      draw: function (c) {
        var g = c.createLinearGradient(4, -8, 56, 8);
        g.addColorStop(0, '#dcd0ff'); g.addColorStop(0.6, '#a88bff'); g.addColorStop(1, '#fff6b0');
        blade(c, 56, 8, g, '#6a55c9');
        c.fillStyle = '#fff6b0';
        star(c, 30, 0, 5); c.fill();
        star(c, 44, -1, 3); c.fill();
        grip(c, '#6a55c9', '#42338a', '#b9a6ff');
      } },

    /* --- секретные: только за звёздную пыль --- */
    { id: 'ladle', name: 'Половник', desc: 'Тяжёлый черпак — бьёт от души',
      price: 65, damage: 1.45, speed: 1.05, reach: 1.05, knock: 1.2, trail: '#ffe9c2',
      draw: function (c) {
        stick(c, 30, '#c7d2dd', 6);
        c.fillStyle = '#e3e9f0'; c.strokeStyle = '#7c8896'; c.lineWidth = 2.5;
        c.beginPath(); c.arc(38, 0, 13, Math.PI * 0.35, Math.PI * 1.65); c.closePath();
        c.fill(); c.stroke();
        c.fillStyle = '#ffcf5e';
        c.beginPath(); c.arc(37, 0, 8, Math.PI * 0.45, Math.PI * 1.55); c.closePath(); c.fill();
        grip(c, '#8a6a4a', '#5b3b25', '#c7d2dd');
      } },

    { id: 'donut', name: 'Пончик-молот', desc: 'Мягкий на вид, тяжёлый на деле',
      price: 240, damage: 2.6, speed: 0.8, reach: 1.1, knock: 1.9, trail: '#ffd7f0',
      draw: function (c) {
        stick(c, 28, '#d9a86a', 7);
        c.fillStyle = '#f0c07a'; c.strokeStyle = '#b8830d'; c.lineWidth = 2.5;
        c.beginPath(); c.arc(40, 0, 16, 0, Math.PI * 2);
        c.arc(40, 0, 5.5, 0, Math.PI * 2, true); c.fill('evenodd'); c.stroke();
        c.fillStyle = '#ff8fb4';
        c.beginPath(); c.arc(40, 0, 16, Math.PI * 0.8, Math.PI * 2.2); c.fill();
        c.fillStyle = '#ffffff';
        [[34, -10], [47, -7], [43, 9], [32, 6]].forEach(function (p) {
          c.beginPath(); c.arc(p[0], p[1], 1.8, 0, Math.PI * 2); c.fill();
        });
        grip(c, '#a2703f', '#6d4622', '#ffd7a8');
      } },

    { id: 'beam', name: 'Карамельный луч', desc: 'Светится и режет воздух',
      price: 470, damage: 3.2, speed: 1.3, reach: 1.3, trail: '#ffd0a8',
      draw: function (c) {
        var g = c.createLinearGradient(6, 0, 60, 0);
        g.addColorStop(0, '#fff3d8'); g.addColorStop(0.5, '#ffb04a'); g.addColorStop(1, '#fff7e6');
        c.save();
        c.globalAlpha = 0.35; c.strokeStyle = '#ffb04a'; c.lineWidth = 13; c.lineCap = 'round';
        c.beginPath(); c.moveTo(8, 0); c.lineTo(58, 0); c.stroke();
        c.restore();
        c.strokeStyle = g; c.lineWidth = 7; c.lineCap = 'round';
        c.beginPath(); c.moveTo(8, 0); c.lineTo(58, 0); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(12, -1); c.lineTo(52, -1); c.stroke();
        grip(c, '#7a4526', '#4a2a13', '#ffd96b');
      } },

    { id: 'fang', name: 'Клык дракончика', desc: 'Достался от морозного дракона', secret: true,
      dust: 10, damage: 4, speed: 1.25, reach: 1.3, knock: 1.4, trail: '#cdd8ff',
      draw: function (c) {
        c.fillStyle = '#eef3ff'; c.strokeStyle = '#5568a8'; c.lineWidth = 2.2;
        c.beginPath();
        c.moveTo(4, -8);
        c.quadraticCurveTo(38, -13, 60, 0);
        c.quadraticCurveTo(36, 4, 4, 8);
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#bfe9ff';
        c.beginPath();
        c.moveTo(10, -4); c.quadraticCurveTo(34, -7, 50, -0.5);
        c.quadraticCurveTo(32, 1, 10, 3); c.closePath(); c.fill();
        c.fillStyle = '#ffffff';
        for (var i = 0; i < 3; i++) {
          c.beginPath(); c.arc(18 + i * 13, -2 - i, 1.8, 0, Math.PI * 2); c.fill();
        }
        grip(c, '#5568a8', '#33406b', '#cdd8ff');
      } },

    { id: 'rainbow', name: 'Радужный клинок', desc: 'Переливается всеми цветами', secret: true,
      dust: 4, damage: 3.2, speed: 1.3, reach: 1.2, trail: '#ffd6f5',
      draw: function (c) {
        var g = c.createLinearGradient(4, -8, 54, 8);
        ['#ff9aa2', '#ffd36e', '#b8f28a', '#8fd6ff', '#c9a6ff'].forEach(function (col, i, a) {
          g.addColorStop(i / (a.length - 1), col);
        });
        blade(c, 54, 8, g, '#ffffff');
        c.globalAlpha = 0.8; shine(c, 54); c.globalAlpha = 1;
        grip(c, '#ffffff', '#c7b6d6', '#ffd6f5');
      } },

    { id: 'comet', name: 'Клинок-комета', desc: 'Отбрасывает слизней через всю арену', secret: true,
      dust: 8, damage: 3.8, speed: 1.1, reach: 1.3, knock: 2.2, trail: '#aee4ff',
      draw: function (c) {
        c.fillStyle = 'rgba(150, 210, 255, 0.45)';
        c.beginPath(); c.moveTo(-14, -6); c.lineTo(8, 0); c.lineTo(-14, 6); c.closePath(); c.fill();
        var g = c.createLinearGradient(4, 0, 58, 0);
        g.addColorStop(0, '#2f5d8a'); g.addColorStop(0.5, '#7fc7ff'); g.addColorStop(1, '#ffffff');
        blade(c, 58, 8, g, '#2f5d8a');
        c.fillStyle = '#ffffff';
        star(c, 46, 0, 5, 4, 0.3); c.fill();
        star(c, 28, -3, 3, 4, 0.3); c.fill();
        grip(c, '#2f5d8a', '#1b3a58', '#aee4ff');
      } },

    { id: 'omnom', name: 'Меч Ам Няма', desc: 'Легенда лавки. Сильный, как сам Ам Ням', secret: true,
      dust: 14, damage: 4.6, speed: 1.2, reach: 1.4, knock: 1.6, trail: '#d8ffb0',
      draw: function (c) {
        var g = c.createLinearGradient(4, -10, 62, 10);
        g.addColorStop(0, '#eaffd0'); g.addColorStop(0.55, '#8fd14f'); g.addColorStop(1, '#ffffff');
        blade(c, 62, 9, g, '#3f7a1f');
        c.fillStyle = '#ffffff'; c.strokeStyle = '#3f7a1f'; c.lineWidth = 1.6;
        c.beginPath(); c.arc(24, -2, 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#2b2b2b';
        c.beginPath(); c.arc(25, -2, 2.4, 0, Math.PI * 2); c.fill();
        grip(c, '#4e8a2a', '#2f5c18', '#d8ffb0');
      } },

    /* --- ещё восемь: пять за конфеты и три секретных --- */
    { id: 'spoon', name: 'Ложка', desc: 'Удобная, как за обедом',
      price: 30, damage: 1.15, speed: 1.2, reach: 1, trail: '#f2f6fa',
      draw: function (c) {
        stick(c, 28, '#cfd8e3', 5);
        c.fillStyle = '#e3e9f0'; c.strokeStyle = '#7c8896'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(40, 0, 11, 7.5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.8)';
        c.beginPath(); c.ellipse(37, -2.5, 4.5, 2, -0.2, 0, Math.PI * 2); c.fill();
        grip(c, '#8d97a6', '#5f6775', null);
      } },

    { id: 'marsh', name: 'Зефирная дубинка', desc: 'Пухлая, а слизни отлетают',
      price: 100, damage: 1.8, speed: 0.85, reach: 1.05, knock: 1.5, trail: '#fff0f5',
      draw: function (c) {
        stick(c, 22, '#d9a86a', 6);
        var cols = ['#fff4f8', '#ffc9dc', '#fff4f8'];
        for (var i = 0; i < 3; i++) {
          c.fillStyle = cols[i]; c.strokeStyle = '#d98eae'; c.lineWidth = 2;
          rr(c, 20 + i * 11, -10, 12, 20, 5); c.fill(); c.stroke();
        }
        grip(c, '#a2703f', '#6d4622', null);
      } },

    { id: 'waffle', name: 'Вафельный меч', desc: 'Хрустит при каждом ударе',
      price: 170, damage: 2.2, speed: 1.05, reach: 1.15, trail: '#f5dca8',
      draw: function (c) {
        c.fillStyle = '#e8b86a'; c.strokeStyle = '#a9762f'; c.lineWidth = 2;
        rr(c, 6, -7, 46, 14, 3); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(140, 90, 30, 0.6)'; c.lineWidth = 1.4;
        for (var i = 1; i < 6; i++) {
          c.beginPath(); c.moveTo(6 + i * 7.7, -7); c.lineTo(6 + i * 7.7, 7); c.stroke();
        }
        c.beginPath(); c.moveTo(6, 0); c.lineTo(52, 0); c.stroke();
        grip(c, '#8c5a2b', '#5d3a17', '#f5dca8');
      } },

    { id: 'jelly', name: 'Мармеладная сабля', desc: 'Гнётся, но режет быстро',
      price: 350, damage: 2.9, speed: 1.2, reach: 1.2, trail: '#ffb0c8',
      draw: function (c) {
        c.lineCap = 'round';
        c.strokeStyle = '#c23a66'; c.lineWidth = 11;
        c.beginPath(); c.moveTo(6, 2); c.quadraticCurveTo(32, 6, 56, -8); c.stroke();
        c.strokeStyle = '#ff6f9f'; c.lineWidth = 8;
        c.beginPath(); c.moveTo(6, 2); c.quadraticCurveTo(32, 6, 56, -8); c.stroke();
        c.fillStyle = '#ffffff';
        [[18, 3], [30, 3.5], [42, 0], [51, -5]].forEach(function (p) {
          c.beginPath(); c.arc(p[0], p[1], 1.4, 0, Math.PI * 2); c.fill();
        });
        grip(c, '#7a2a48', '#4a1428', '#ffb0c8');
      } },

    { id: 'ruby', name: 'Рубиновый клинок', desc: 'Горит алым огоньком',
      price: 510, damage: 3.35, speed: 1.05, reach: 1.25, trail: '#ffb3b3',
      draw: function (c) {
        var g = c.createLinearGradient(4, -8, 56, 8);
        g.addColorStop(0, '#ffe0e0'); g.addColorStop(0.5, '#ff5f6f'); g.addColorStop(1, '#ffd0d0');
        blade(c, 56, 8, g, '#a8243a');
        shine(c, 56);
        grip(c, '#5d3a17', '#3b2210', '#ffd96b');
        c.fillStyle = '#ff2f4f'; c.strokeStyle = '#8a1428'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(5, -5); c.lineTo(9, 0); c.lineTo(5, 5); c.lineTo(1, 0);
        c.closePath(); c.fill(); c.stroke();
      } },

    { id: 'honey', name: 'Медовый клинок', desc: 'Липкий: слизни не успевают увернуться', secret: true,
      dust: 5, damage: 3.3, speed: 1.25, reach: 1.2, trail: '#ffe08a',
      draw: function (c) {
        var g = c.createLinearGradient(4, 0, 54, 0);
        g.addColorStop(0, '#ffcf5e'); g.addColorStop(1, '#fff3c0');
        blade(c, 54, 8, g, '#c9860d');
        c.fillStyle = '#ffb627';
        c.beginPath(); c.moveTo(20, 7); c.quadraticCurveTo(22, 14, 24, 7); c.fill();
        c.beginPath(); c.moveTo(34, 6); c.quadraticCurveTo(36, 12, 38, 6); c.fill();
        grip(c, '#8c5a2b', '#5d3a17', '#ffcf5e');
      } },

    { id: 'thunder', name: 'Грозовой меч', desc: 'Бьёт с раскатом грома', secret: true,
      dust: 6, damage: 3.5, speed: 1.2, reach: 1.25, knock: 1.5, trail: '#fff59a',
      draw: function (c) {
        var g = c.createLinearGradient(4, -8, 56, 8);
        g.addColorStop(0, '#6f7fa8'); g.addColorStop(1, '#c6d2f0');
        blade(c, 56, 8, g, '#3a4670');
        c.fillStyle = '#fff59a'; c.strokeStyle = '#c9a20d'; c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(18, -5); c.lineTo(32, -2); c.lineTo(27, 0); c.lineTo(44, 4);
        c.lineTo(28, 2); c.lineTo(32, 0); c.closePath(); c.fill(); c.stroke();
        grip(c, '#3a4670', '#232b47', '#fff59a');
      } },

    { id: 'sun', name: 'Солнечный меч', desc: 'Сияет почти как легенда', secret: true,
      dust: 12, damage: 4.3, speed: 1.2, reach: 1.35, knock: 1.3, trail: '#ffe7a0',
      draw: function (c) {
        c.save();
        c.globalAlpha = 0.35; c.fillStyle = '#ffd24a';
        c.beginPath(); c.arc(4, 0, 15, 0, Math.PI * 2); c.fill();
        c.restore();
        var g = c.createLinearGradient(4, 0, 60, 0);
        g.addColorStop(0, '#ffb627'); g.addColorStop(0.6, '#ffe7a0'); g.addColorStop(1, '#ffffff');
        blade(c, 60, 8.5, g, '#c9860d');
        shine(c, 60);
        grip(c, '#c9860d', '#8a5a08', '#ffe7a0');
        c.fillStyle = '#fff3c0'; star(c, 5, 0, 6, 8, 0.5); c.fill();
      } },

    /* --- самые-самые: чуть сильнее прежних лучших --- */
    { id: 'candysword', name: 'Леденцовый палаш', desc: 'Лучшее, что можно купить за конфеты',
      price: 680, damage: 3.7, speed: 1.15, reach: 1.3, trail: '#ffd0e0',
      draw: function (c) {
        blade(c, 58, 8.5, '#ffffff', '#c23a66');
        c.save();
        c.beginPath();
        c.moveTo(5, -8.5); c.lineTo(58 * 0.72, -7.2); c.lineTo(58, 0);
        c.lineTo(58 * 0.72, 7.2); c.lineTo(5, 8.5); c.closePath(); c.clip();
        c.strokeStyle = '#ff5f8f'; c.lineWidth = 4;
        for (var i = 0; i < 8; i++) {
          c.beginPath(); c.moveTo(2 + i * 8, 10); c.lineTo(10 + i * 8, -10); c.stroke();
        }
        c.restore();
        shine(c, 58);
        grip(c, '#7a2a48', '#4a1428', '#ffd0e0');
      } },

    { id: 'starfall', name: 'Клинок звездопада', desc: 'С неба сыплются звёзды прямо на слизней', secret: true,
      dust: 16, damage: 4.8, speed: 1.25, reach: 1.4, knock: 1.6, trail: '#e6d4ff',
      draw: function (c) {
        c.save();
        c.globalAlpha = 0.35; c.strokeStyle = '#a88bff'; c.lineWidth = 15; c.lineCap = 'round';
        c.beginPath(); c.moveTo(10, 0); c.lineTo(58, 0); c.stroke();
        c.restore();
        var g = c.createLinearGradient(4, -9, 62, 9);
        g.addColorStop(0, '#2e2466'); g.addColorStop(0.55, '#6a55c9'); g.addColorStop(1, '#e6d4ff');
        blade(c, 62, 9, g, '#1f1850');
        c.fillStyle = '#fff6b0';
        star(c, 20, -2, 3.2); c.fill();
        star(c, 34, 2, 4); c.fill();
        star(c, 48, -1, 3); c.fill();
        grip(c, '#42338a', '#241a55', '#fff6b0');
      } },

    { id: 'candyking', name: 'Меч Короля Сладостей', desc: 'Новая легенда лавки. Сильнее не бывает', secret: true,
      dust: 18, damage: 5, speed: 1.25, reach: 1.45, knock: 1.7, trail: '#fff0b8',
      draw: function (c) {
        c.save();
        c.globalAlpha = 0.3; c.fillStyle = '#ffd96b';
        c.beginPath(); c.ellipse(34, 0, 34, 15, 0, 0, Math.PI * 2); c.fill();
        c.restore();
        var g = c.createLinearGradient(4, 0, 64, 0);
        g.addColorStop(0, '#ffc93c'); g.addColorStop(0.4, '#fff3c0');
        g.addColorStop(0.7, '#ff8fb4'); g.addColorStop(1, '#ffffff');
        blade(c, 64, 9.5, g, '#b87a0d');
        shine(c, 64);
        c.fillStyle = '#ff5f8f'; c.strokeStyle = '#c23a66'; c.lineWidth = 1.4;
        c.beginPath(); c.arc(30, 0, 3.5, 0, Math.PI * 2); c.fill(); c.stroke();
        grip(c, '#b87a0d', '#7a5008', '#ffd96b');
        c.fillStyle = '#ffd96b'; c.strokeStyle = '#b87a0d'; c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(-12, -8); c.lineTo(-9, -3); c.lineTo(-6, -9); c.lineTo(-3, -3);
        c.lineTo(0, -8); c.lineTo(0, 0); c.lineTo(-12, 0); c.closePath();
        c.fill(); c.stroke();
      } }
  ];

  /* ------------------------------------------------------------------------
   * Оружие кошечки — более волшебное
   * ---------------------------------------------------------------------- */
  var CAT = [
    { id: 'toy', name: 'Игрушечный меч', desc: 'Из коробки с игрушками',
      price: 0, damage: 1, speed: 1, reach: 1, trail: '#ffffff',
      draw: function (c) {
        c.fillStyle = '#ffd9e6'; c.strokeStyle = '#d98eae'; c.lineWidth = 2;
        rr(c, 6, -5, 38, 10, 5); c.fill(); c.stroke();
        c.fillStyle = '#ff9fc4';
        c.beginPath(); c.arc(14, 0, 3.6, 0, Math.PI * 2); c.fill();
        for (var i = -1; i <= 1; i++) {
          c.beginPath(); c.arc(19, i * 4.2, 1.7, 0, Math.PI * 2); c.fill();
        }
        grip(c, '#d98eae', '#a45c7c', '#ffe6ef');
      } },

    { id: 'wand', name: 'Волшебная палочка', desc: 'Лёгкая, машет очень быстро',
      price: 20, damage: 1.2, speed: 1.3, reach: 1.05, trail: '#ffd7f0',
      draw: function (c) {
        stick(c, 30, '#a2703f', 5);
        c.fillStyle = '#ff8fd0'; c.strokeStyle = '#d45d9e'; c.lineWidth = 2;
        star(c, 38, 0, 12); c.fill(); c.stroke();
        c.fillStyle = '#fff0fa'; star(c, 38, 0, 5); c.fill();
      } },

    { id: 'fish', name: 'Рыбка-меч', desc: 'Скользкая, но очень шустрая',
      price: 45, damage: 1.3, speed: 1.4, reach: 1, trail: '#cfefff',
      draw: function (c) {
        c.fillStyle = '#9bd8f0'; c.strokeStyle = '#4e93b5'; c.lineWidth = 2;
        c.beginPath();
        c.moveTo(6, 0); c.quadraticCurveTo(26, -12, 48, 0); c.quadraticCurveTo(26, 12, 6, 0);
        c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(6, 0); c.lineTo(-6, -9); c.lineTo(-6, 9); c.closePath();
        c.fill(); c.stroke();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(36, -1, 3.4, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#2b2b2b';
        c.beginPath(); c.arc(37, -1, 1.6, 0, Math.PI * 2); c.fill();
      } },

    { id: 'umbrella', name: 'Зонтик', desc: 'Широкий замах — задевает сразу нескольких',
      price: 80, damage: 1.6, speed: 0.95, reach: 1.35, trail: '#ffd2d2',
      draw: function (c) {
        stick(c, 24, '#b5744a', 4.5);
        c.strokeStyle = '#b5744a'; c.lineWidth = 4;
        c.beginPath(); c.arc(-14, -4, 4.5, Math.PI * 0.5, Math.PI * 1.6); c.stroke();
        var colors = ['#ff8f8f', '#fff4f4', '#ff8f8f'];
        for (var i = 0; i < 3; i++) {
          c.fillStyle = colors[i]; c.strokeStyle = '#d45d5d'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(24, 0);
          c.arc(24, 0, 20, Math.PI * (0.5 + i / 3), Math.PI * (0.5 + (i + 1) / 3));
          c.closePath(); c.fill(); c.stroke();
        }
        c.fillStyle = '#ffe08a';
        c.beginPath(); c.arc(24, 0, 3.5, 0, Math.PI * 2); c.fill();
      } },

    { id: 'icicle', name: 'Сосулька', desc: 'Острая и звонкая',
      price: 130, damage: 2.1, speed: 1.1, reach: 1.1, trail: '#d9f3ff',
      draw: function (c) {
        var g = c.createLinearGradient(0, 0, 54, 0);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#9ed8f5');
        blade(c, 54, 9, g, '#5ea9cf', 0.55);
        c.fillStyle = 'rgba(255,255,255,0.9)';
        star(c, 20, -2, 3.5, 4, 0.3); c.fill();
        star(c, 36, 1, 2.6, 4, 0.3); c.fill();
        grip(c, '#bfeaff', '#5ea9cf', null);
      } },

    { id: 'cane', name: 'Карамельная трость', desc: 'Крючком цепляет всех вокруг',
      price: 200, damage: 2.4, speed: 1.1, reach: 1.25, knock: 1.4, trail: '#ffd4dc',
      draw: function (c) {
        c.lineCap = 'round';
        c.strokeStyle = '#ffffff'; c.lineWidth = 9;
        c.beginPath(); c.moveTo(-8, 0); c.lineTo(34, 0);
        c.arc(40, -8, 9, Math.PI * 0.5, Math.PI * 1.9); c.stroke();
        c.strokeStyle = '#ff6f8f'; c.lineWidth = 3;
        for (var i = 0; i < 5; i++) {
          c.beginPath(); c.moveTo(-4 + i * 9, -4.5); c.lineTo(1 + i * 9, 4.5); c.stroke();
        }
      } },

    { id: 'ribbon', name: 'Лента-хлыст', desc: 'Длинная и стремительная',
      price: 290, damage: 2.6, speed: 1.35, reach: 1.45, trail: '#ffc2e8',
      draw: function (c) {
        c.strokeStyle = '#ff8fd0'; c.lineWidth = 6; c.lineCap = 'round';
        c.beginPath();
        c.moveTo(2, 0);
        c.bezierCurveTo(20, -14, 36, 14, 58, -4);
        c.stroke();
        c.strokeStyle = '#ffd7f0'; c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(2, 0); c.bezierCurveTo(20, -12, 36, 12, 56, -4);
        c.stroke();
        c.fillStyle = '#ff5fae';
        c.beginPath(); c.arc(58, -4, 4, 0, Math.PI * 2); c.fill();
        grip(c, '#d45d9e', '#9c3d70', null);
      } },

    { id: 'moon', name: 'Лунный серп', desc: 'Режет по широкой дуге',
      price: 400, damage: 3, speed: 0.95, reach: 1.4, knock: 1.3, trail: '#e7e2ff',
      draw: function (c) {
        c.fillStyle = '#f4f0ff'; c.strokeStyle = '#8b7fc7'; c.lineWidth = 2;
        c.beginPath();
        c.arc(30, 0, 24, Math.PI * 0.62, Math.PI * 1.38);
        c.arc(38, 0, 22, Math.PI * 1.32, Math.PI * 0.68, true);
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#ffe08a';
        star(c, 18, -14, 3.4); c.fill();
        grip(c, '#8b7fc7', '#5d5391', null);
      } },

    { id: 'staff', name: 'Звёздный жезл', desc: 'Сияет ярче всех звёзд',
      price: 550, damage: 3.4, speed: 1.15, reach: 1.3, trail: '#fff0b8',
      draw: function (c) {
        stick(c, 32, '#8c5a2b', 6);
        c.strokeStyle = '#ffd96b'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-6, -3); c.lineTo(20, -3); c.stroke();
        c.fillStyle = '#ffdf5e'; c.strokeStyle = '#e0a413'; c.lineWidth = 2.5;
        star(c, 44, 0, 15); c.fill(); c.stroke();
        c.fillStyle = '#fff8d8'; star(c, 44, 0, 6.5); c.fill();
      } },

    /* --- секретные: только за звёздную пыль --- */
    { id: 'feather', name: 'Пёрышко', desc: 'Щекочет так, что слизни разбегаются',
      price: 65, damage: 1.25, speed: 1.55, reach: 1.05, trail: '#fff0fa',
      draw: function (c) {
        stick(c, 22, '#d98eae', 4);
        c.fillStyle = '#ffe6ef'; c.strokeStyle = '#d45d8e'; c.lineWidth = 2;
        c.beginPath();
        c.moveTo(20, 0);
        c.quadraticCurveTo(38, -14, 56, -2);
        c.quadraticCurveTo(38, 12, 20, 0);
        c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = '#ffb4d2'; c.lineWidth = 1.6;
        for (var i = 0; i < 5; i++) {
          c.beginPath();
          c.moveTo(24 + i * 6, -1);
          c.lineTo(28 + i * 6, -7 + i * 1.6);
          c.stroke();
        }
      } },

    { id: 'bell', name: 'Колокольчик', desc: 'Звенит — и слизни отлетают',
      price: 240, damage: 2.5, speed: 0.9, reach: 1.15, knock: 1.8, trail: '#fff3c9',
      draw: function (c) {
        stick(c, 26, '#d9a86a', 6);
        c.fillStyle = '#ffd96b'; c.strokeStyle = '#b87a0d'; c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(30, -14);
        c.quadraticCurveTo(52, -14, 52, 10);
        c.lineTo(30, 10);
        c.quadraticCurveTo(30, -14, 30, -14);
        c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(41, 10, 11, 4, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#b87a0d';
        c.beginPath(); c.arc(41, 15, 4, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.beginPath(); c.ellipse(35, -4, 3, 7, 0.3, 0, Math.PI * 2); c.fill();
      } },

    { id: 'crystal', name: 'Кристальный клинок', desc: 'Прозрачный и очень острый',
      price: 470, damage: 3.2, speed: 1.2, reach: 1.35, trail: '#d9f3ff',
      draw: function (c) {
        var g = c.createLinearGradient(6, -9, 60, 9);
        g.addColorStop(0, '#eaf9ff'); g.addColorStop(0.5, '#9ed8f5'); g.addColorStop(1, '#ffffff');
        blade(c, 60, 9, g, '#4b8fb3');
        c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(10, -3); c.lineTo(48, -1); c.stroke();
        c.beginPath(); c.moveTo(14, 4); c.lineTo(44, 2); c.stroke();
        c.fillStyle = '#bfe9ff';
        c.beginPath();
        c.moveTo(2, 0); c.lineTo(-4, -7); c.lineTo(-10, 0); c.lineTo(-4, 7);
        c.closePath(); c.fill();
        grip(c, '#7fc4e0', '#3f7a96', '#eaf9ff');
      } },

    { id: 'aurora', name: 'Северное сияние', desc: 'Светится всеми цветами зимы', secret: true,
      dust: 10, damage: 4, speed: 1.3, reach: 1.4, trail: '#c9ffe8',
      draw: function (c) {
        c.save();
        c.globalAlpha = 0.4;
        var g2 = c.createLinearGradient(6, -12, 62, 12);
        g2.addColorStop(0, '#8fe6c4'); g2.addColorStop(0.5, '#9ed8f5'); g2.addColorStop(1, '#c9a6ff');
        c.strokeStyle = g2; c.lineWidth = 16; c.lineCap = 'round';
        c.beginPath(); c.moveTo(10, 0); c.lineTo(58, 0); c.stroke();
        c.restore();
        var g = c.createLinearGradient(6, 0, 62, 0);
        g.addColorStop(0, '#eafff6'); g.addColorStop(0.45, '#8fe6c4'); g.addColorStop(1, '#c9a6ff');
        blade(c, 62, 8, g, '#3f8f78');
        c.fillStyle = '#ffffff';
        star(c, 26, -3, 3.5, 4, 0.3); c.fill();
        star(c, 44, 2, 3, 4, 0.3); c.fill();
        grip(c, '#4aa88a', '#2c6b56', '#eafff6');
      } },

    { id: 'rainbowwand', name: 'Радужная палочка', desc: 'Машет так быстро, что рябит в глазах', secret: true,
      dust: 4, damage: 3.1, speed: 1.45, reach: 1.15, trail: '#ffe0f7',
      draw: function (c) {
        var g = c.createLinearGradient(-10, 0, 34, 0);
        ['#ff9aa2', '#ffd36e', '#b8f28a', '#8fd6ff'].forEach(function (col, i, a) {
          g.addColorStop(i / (a.length - 1), col);
        });
        c.strokeStyle = g; c.lineWidth = 6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-10, 0); c.lineTo(32, 0); c.stroke();
        c.fillStyle = '#ffffff'; c.strokeStyle = '#c9a6ff'; c.lineWidth = 2;
        star(c, 42, 0, 14); c.fill(); c.stroke();
        c.fillStyle = '#ffd6f5'; star(c, 42, 0, 6); c.fill();
      } },

    { id: 'cometstaff', name: 'Кометный жезл', desc: 'Сбивает слизней с лапок', secret: true,
      dust: 8, damage: 3.7, speed: 1.15, reach: 1.35, knock: 2, trail: '#bfe8ff',
      draw: function (c) {
        c.fillStyle = 'rgba(150, 210, 255, 0.4)';
        c.beginPath(); c.moveTo(-16, -7); c.lineTo(6, 0); c.lineTo(-16, 7); c.closePath(); c.fill();
        stick(c, 34, '#2f5d8a', 6);
        c.fillStyle = '#8fd6ff'; c.strokeStyle = '#2f5d8a'; c.lineWidth = 2.5;
        c.beginPath(); c.arc(46, 0, 12, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#ffffff';
        star(c, 46, 0, 6, 4, 0.3); c.fill();
      } },

    { id: 'heart', name: 'Сердце кошечки', desc: 'Легенда лавки. Бьёт с любовью', secret: true,
      dust: 14, damage: 4.4, speed: 1.25, reach: 1.35, trail: '#ffc6dd',
      draw: function (c) {
        stick(c, 30, '#d45d8e', 6);
        var g = c.createRadialGradient(44, 0, 2, 44, 0, 18);
        g.addColorStop(0, '#fff0f5'); g.addColorStop(1, '#ff5f8f');
        c.fillStyle = g; c.strokeStyle = '#c23a66'; c.lineWidth = 2.5;
        var s = 15;
        c.save(); c.translate(44, 0); c.rotate(Math.PI / 2);
        c.beginPath();
        c.moveTo(0, s * 0.42);
        c.bezierCurveTo(-s * 1.15, -s * 0.32, -s * 0.45, -s * 1.05, 0, -s * 0.42);
        c.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.15, -s * 0.32, 0, s * 0.42);
        c.closePath(); c.fill(); c.stroke();
        c.restore();
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.beginPath(); c.arc(40, -5, 3, 0, Math.PI * 2); c.fill();
      } },

    /* --- ещё восемь: пять за конфеты и три секретных --- */
    { id: 'brush', name: 'Кисточка', desc: 'Раскрашивает слизней в синяки',
      price: 30, damage: 1.15, speed: 1.25, reach: 1, trail: '#d7c9ff',
      draw: function (c) {
        stick(c, 30, '#e0b27a', 5);
        c.fillStyle = '#cfd8e3'; c.strokeStyle = '#7c8896'; c.lineWidth = 1.6;
        rr(c, 28, -4.5, 8, 9, 2); c.fill(); c.stroke();
        c.fillStyle = '#a88bff'; c.strokeStyle = '#6a55c9'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(36, -5); c.quadraticCurveTo(50, -4, 54, 0);
        c.quadraticCurveTo(50, 4, 36, 5); c.closePath(); c.fill(); c.stroke();
      } },

    { id: 'yarn', name: 'Клубок на ниточке', desc: 'Раскручивается и сбивает с лапок',
      price: 100, damage: 1.7, speed: 0.9, reach: 1.2, knock: 1.5, trail: '#ffc2dd',
      draw: function (c) {
        c.strokeStyle = '#ff8fb4'; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-8, 0); c.bezierCurveTo(10, -8, 20, 8, 32, 0); c.stroke();
        c.fillStyle = '#ff8fb4'; c.strokeStyle = '#d45d8e'; c.lineWidth = 2.2;
        c.beginPath(); c.arc(42, 0, 12, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = '#ffd7e8'; c.lineWidth = 1.5;
        for (var i = -1; i <= 1; i++) {
          c.beginPath(); c.ellipse(42, 0, 11, 4.5, 0.7 + i * 0.7, 0, Math.PI * 2); c.stroke();
        }
      } },

    { id: 'flower', name: 'Цветочек', desc: 'Пахнет весной, колет шипами',
      price: 170, damage: 2.1, speed: 1.2, reach: 1.1, trail: '#ffe0f0',
      draw: function (c) {
        stick(c, 34, '#6fbf4a', 4.5);
        c.fillStyle = '#8fd14f';
        c.beginPath(); c.ellipse(16, -5, 7, 3, -0.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffb4d2'; c.strokeStyle = '#d45d8e'; c.lineWidth = 1.6;
        for (var i = 0; i < 5; i++) {
          var a = i * Math.PI * 2 / 5;
          c.beginPath(); c.arc(44 + Math.cos(a) * 7, Math.sin(a) * 7, 6, 0, Math.PI * 2);
          c.fill(); c.stroke();
        }
        c.fillStyle = '#ffdf5e';
        c.beginPath(); c.arc(44, 0, 4.5, 0, Math.PI * 2); c.fill();
      } },

    { id: 'fan', name: 'Веер', desc: 'Взмах — и ветер сдувает всех вокруг',
      price: 350, damage: 2.8, speed: 1.15, reach: 1.4, trail: '#d9f0ff',
      draw: function (c) {
        var cols = ['#9ed8f5', '#ffffff', '#ffb4d2', '#ffffff', '#9ed8f5'];
        for (var i = 0; i < 5; i++) {
          var a0 = -0.7 + i * 0.28, a1 = a0 + 0.28;
          c.fillStyle = cols[i]; c.strokeStyle = '#4e93b5'; c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 52, a0, a1); c.closePath();
          c.fill(); c.stroke();
        }
        c.fillStyle = '#d45d9e';
        c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
        stick(c, 2, '#a2703f', 5);
      } },

    { id: 'snowflake', name: 'Снежный жезл', desc: 'Морозит так, что слизни стучат зубами',
      price: 510, damage: 3.3, speed: 1.2, reach: 1.25, trail: '#e3f6ff',
      draw: function (c) {
        stick(c, 34, '#7fc4e0', 5);
        c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round';
        for (var i = 0; i < 6; i++) {
          var a = i * Math.PI / 3;
          c.beginPath(); c.moveTo(46, 0); c.lineTo(46 + Math.cos(a) * 13, Math.sin(a) * 13); c.stroke();
        }
        c.strokeStyle = '#5ea9cf'; c.lineWidth = 1.4;
        for (i = 0; i < 6; i++) {
          a = i * Math.PI / 3;
          c.beginPath(); c.moveTo(46, 0); c.lineTo(46 + Math.cos(a) * 13, Math.sin(a) * 13); c.stroke();
        }
        c.fillStyle = '#eaf9ff';
        c.beginPath(); c.arc(46, 0, 3.5, 0, Math.PI * 2); c.fill();
      } },

    { id: 'butterfly', name: 'Крылышки бабочки', desc: 'Порхает быстрее ветра', secret: true,
      dust: 5, damage: 3.2, speed: 1.4, reach: 1.2, trail: '#ffe0a8',
      draw: function (c) {
        stick(c, 30, '#6a55c9', 4);
        c.fillStyle = '#ffb04a'; c.strokeStyle = '#a8561f'; c.lineWidth = 1.8;
        c.beginPath(); c.ellipse(40, -9, 11, 8, -0.4, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(40, 9, 11, 8, 0.4, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#ffe9a8';
        c.beginPath(); c.arc(42, -9, 3, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(42, 9, 3, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#42338a'; rr(c, 30, -2, 22, 4, 2); c.fill();
      } },

    { id: 'bubble', name: 'Пузырьковая палочка', desc: 'Пузыри лопаются и расталкивают слизней', secret: true,
      dust: 6, damage: 3.4, speed: 1.2, reach: 1.3, knock: 1.8, trail: '#d9f3ff',
      draw: function (c) {
        stick(c, 30, '#ff8fd0', 4.5);
        c.strokeStyle = '#ff8fd0'; c.lineWidth = 3;
        c.beginPath(); c.arc(38, 0, 7, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(190, 235, 255, 0.55)'; c.strokeStyle = '#8fd6ff'; c.lineWidth = 1.6;
        [[50, -6, 7], [56, 7, 5], [46, 12, 3.5]].forEach(function (b) {
          c.beginPath(); c.arc(b[0], b[1], b[2], 0, Math.PI * 2); c.fill(); c.stroke();
        });
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(48, -8, 1.8, 0, Math.PI * 2); c.fill();
      } },

    { id: 'scepter', name: 'Королевский скипетр', desc: 'Для самой важной кошечки', secret: true,
      dust: 12, damage: 4.1, speed: 1.25, reach: 1.35, trail: '#fff0b8',
      draw: function (c) {
        stick(c, 34, '#e0a413', 5.5);
        c.fillStyle = '#ffd96b'; c.strokeStyle = '#b87a0d'; c.lineWidth = 2;
        c.beginPath();
        c.moveTo(34, -10); c.lineTo(40, -4); c.lineTo(46, -12); c.lineTo(52, -4);
        c.lineTo(58, -10); c.lineTo(56, 8); c.lineTo(36, 8); c.closePath();
        c.fill(); c.stroke();
        c.fillStyle = '#ff5fae';
        c.beginPath(); c.arc(46, 2, 3.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#8fd6ff';
        c.beginPath(); c.arc(39, 3, 2, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(53, 3, 2, 0, Math.PI * 2); c.fill();
      } },

    /* --- самые-самые: чуть сильнее прежних лучших --- */
    { id: 'trident', name: 'Жемчужный трезубец', desc: 'Лучшее, что можно купить за конфеты',
      price: 680, damage: 3.6, speed: 1.2, reach: 1.35, trail: '#d9f3ff',
      draw: function (c) {
        stick(c, 36, '#7fc4e0', 5);
        c.strokeStyle = '#4b8fb3'; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(36, -11); c.lineTo(36, 11); c.stroke();
        for (var i = -1; i <= 1; i++) {
          c.beginPath(); c.moveTo(36, i * 10); c.lineTo(56, i * 10); c.stroke();
        }
        c.fillStyle = '#eaf9ff'; c.strokeStyle = '#4b8fb3'; c.lineWidth = 1.6;
        for (i = -1; i <= 1; i++) {
          c.beginPath(); c.moveTo(56, i * 10 - 3); c.lineTo(62, i * 10); c.lineTo(56, i * 10 + 3);
          c.closePath(); c.fill(); c.stroke();
        }
        c.fillStyle = '#fff0fa'; c.strokeStyle = '#d98eae';
        c.beginPath(); c.arc(30, 0, 4.5, 0, Math.PI * 2); c.fill(); c.stroke();
      } },

    { id: 'paw', name: 'Звёздная лапка', desc: 'Мягкие подушечки, железный удар', secret: true,
      dust: 16, damage: 4.6, speed: 1.3, reach: 1.4, knock: 1.5, trail: '#ffd7f0',
      draw: function (c) {
        stick(c, 32, '#c9a6ff', 6);
        c.fillStyle = '#ffe6ef'; c.strokeStyle = '#d45d8e'; c.lineWidth = 2.2;
        c.beginPath(); c.ellipse(46, 0, 11, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#ff8fb4';
        c.beginPath(); c.ellipse(44, 0, 5, 6, 0, 0, Math.PI * 2); c.fill();
        [[53, -9], [57, -3], [57, 3], [53, 9]].forEach(function (p) {
          c.beginPath(); c.arc(p[0], p[1], 2.6, 0, Math.PI * 2); c.fill();
        });
        c.fillStyle = '#fff6b0'; star(c, 22, 0, 4); c.fill();
      } },

    { id: 'galaxy', name: 'Галактический жезл', desc: 'Новая легенда лавки. Целая галактика в лапке', secret: true,
      dust: 18, damage: 4.8, speed: 1.3, reach: 1.45, knock: 1.4, trail: '#e0ccff',
      draw: function (c) {
        stick(c, 34, '#42338a', 6);
        c.save();
        c.globalAlpha = 0.4; c.fillStyle = '#c9a6ff';
        c.beginPath(); c.arc(46, 0, 20, 0, Math.PI * 2); c.fill();
        c.restore();
        var g = c.createRadialGradient(46, 0, 1, 46, 0, 14);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ff8fd0');
        g.addColorStop(0.7, '#6a55c9'); g.addColorStop(1, '#241a55');
        c.fillStyle = g; c.strokeStyle = '#241a55'; c.lineWidth = 2.2;
        c.beginPath(); c.arc(46, 0, 14, 0, Math.PI * 2); c.fill(); c.stroke();
        c.strokeStyle = '#ffd96b'; c.lineWidth = 1.8;
        c.beginPath(); c.ellipse(46, 0, 20, 5, -0.4, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#ffffff';
        star(c, 41, -5, 2.4, 4, 0.3); c.fill();
        star(c, 51, 5, 2, 4, 0.3); c.fill();
      } }
  ];

  /* ------------------------------------------------------------------------
   * Лапки героев: рукоять кладём ровно в ту лапку, которая нарисована на
   * спрайте, — никаких дорисованных рук. Координаты сняты со спрайтов
   * (точка отсчёта — между лапками, масштаб уже игровой).
   *   x, y  — где герой держит рукоять;
   *   angle — под каким углом торчит клинок, когда герой просто бежит.
   * ---------------------------------------------------------------------- */
  var HAND = {
    // У Ам Няма на спрайте поднята левая лапка — та самая, которой рыцарь
    // держит меч; у кошечки берём её левую лапку. Клинок смотрит вверх-влево,
    // как на исходных картинках.
    omnom: { x: -30, y: -48, angle: -1.95 },
    cat: { x: -13, y: -19, angle: -2.05 }
  };

  /** Оружие в лавке идёт по цене: сначала за конфеты, потом секретное за пыль. */
  function byPrice(a, b) {
    if (!!a.secret !== !!b.secret) return a.secret ? 1 : -1;
    return a.secret ? (a.dust - b.dust) : (a.price - b.price);
  }
  OMNOM.sort(byPrice);
  CAT.sort(byPrice);

  var Weapons = {
    lists: { omnom: OMNOM, cat: CAT },
    MAX_LEVEL: MAX_LEVEL,

    /** Найти оружие по герою и ключу. */
    get: function (hero, id) {
      var list = Weapons.lists[hero] || OMNOM;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return list[0];
    },

    /** Оружие, которое сейчас в лапке у героя. */
    of: function (p) {
      return Weapons.get(p.hero, p.weaponId || Weapons.lists[p.hero][0].id);
    },

    /** Характеристики с учётом прокачки. */
    stats: function (w, level) {
      level = level || 0;
      return {
        damage: w.damage * (1 + LEVEL_DAMAGE * level),
        speed: w.speed * (1 + LEVEL_SPEED * level),
        reach: w.reach * (1 + LEVEL_REACH * level),
        knock: (w.knock || 1)
      };
    },

    /**
     * Сколько стоит следующий уровень прокачки (в конфетах).
     * Секретное оружие качать дороже — оно и так сильное.
     */
    upgradeCost: function (w, level) {
      var base = w.secret ? (w.dust * 45) : Math.max(15, Math.round(w.price * 0.3));
      // Сундук с мечами дома делает прокачку дешевле
      var off = window.Home ? Home.upgradeDiscount() : 1;
      return Math.round(base * (level + 1) * off);
    },

    /** Надеть оружие и пересчитать характеристики героя. */
    equip: function (p, id, level) {
      var w = Weapons.get(p.hero, id);
      var st = Weapons.stats(w, level || 0);
      p.weaponId = w.id;
      p.weaponLevel = level || 0;
      p.damageMul = st.damage;
      p.atkSpeed = st.speed;
      p.knockMul = st.knock;
      p.swingRadius = p.baseSwingRadius * st.reach;
      return w;
    },

    /** Нарисовать оружие в его собственных координатах. */
    drawShape: function (c, w, scale) {
      c.save();
      c.scale(scale, scale);
      c.lineJoin = 'round';
      w.draw(c);
      c.restore();
    },

    /**
     * Оружие в лапке героя. Рукоять ставится в нарисованную лапку спрайта,
     * при взмахе едет по дуге вместе с ударом.
     */
    drawInHand: function (c, p, hop) {
      var w = Weapons.of(p);
      var h = HAND[p.hero] || HAND.omnom;
      var side = p.facing > 0 ? 1 : -1;
      var s = p.swing;

      c.save();
      if (s) {
        // Взмах: рукоять на дуге, клинок смотрит наружу
        var t = 1 - p.attackTimer / s.time;
        var a = Players.swingAngleOf(p, t);
        var dist = s.radius * 0.3;
        c.translate(p.x + Math.cos(a) * dist, (p.y - 34) + Math.sin(a) * dist);
        c.rotate(a);
        Weapons.drawShape(c, w, 0.85);
      } else {
        // Держит лапкой; на бегу лапка качается в такт шагам
        var moving = Math.hypot(p.vx, p.vy) > 20;
        var swingArm = moving ? Math.sin(p.walk) : Math.sin(p.walk * 0.5) * 0.25;
        c.translate(p.x + side * h.x, p.y + h.y - hop + swingArm * (moving ? 3 : 1));
        c.scale(side, 1);          // отражаем вместе с героем
        c.rotate(h.angle + swingArm * (moving ? 0.22 : 0.05));
        Weapons.drawShape(c, w, 0.72);
      }
      c.restore();
    },

    /** Картинка для карточки магазина. */
    drawIcon: function (c, w, x, y, scale) {
      c.save();
      c.translate(x, y);
      c.rotate(-0.5);
      c.translate(-24 * scale, 0);
      Weapons.drawShape(c, w, scale);
      c.restore();
    }
  };

  window.Weapons = Weapons;
})();

