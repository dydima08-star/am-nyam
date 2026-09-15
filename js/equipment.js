/* ============================================================================
 * js/equipment.js — экипировка героев: шлем, тело, ноги и перчатки.
 *
 * У каждого героя свой набор из 32 вещей: по восемь на шлем, тело, ноги
 * и перчатки. Перчатки самые дорогие, зато дают урон, скорость ударов
 * и шанс критического удара.
 *
 * Всё нарисовано кодом, как и оружие: одна функция рисует значок и на
 * карточке в лавке, и где угодно ещё.
 *
 * Прокачка: купленную вещь можно улучшить до +5 за конфеты (дорогие уровни —
 * и за пыль). Каждый уровень делает все её полезные характеристики на 15%
 * сильнее; штрафы (например, медленный бег в панцире) не растут. Вещи, которые
 * дают только сердечки, вдобавок получают +1% уклонения за уровень.
 *
 * Характеристики вещи (stats):
 *   hp       — сколько добавить сердечек
 *   dodge    — шанс увернуться от удара (0.05 = 5%)
 *   speed    — прибавка к скорости бега (доля)
 *   atkSpeed — прибавка к скорости ударов
 *   damage   — прибавка к урону
 *   crit     — шанс удвоенного урона
 *   magnet   — насколько дальше притягиваются конфеты
 * ========================================================================== */
(function () {
  'use strict';

  var SLOTS = [
    { id: 'helmet', name: 'Шлем' },
    { id: 'body', name: 'Тело' },
    { id: 'boots', name: 'Ноги' },
    { id: 'gloves', name: 'Перчатки' }
  ];

  /* ------------------------------------------------------------------------
   * Помощники рисования (значок рисуется вокруг точки 0,0, размер ~56)
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

  function fill(c, a, b) { c.fillStyle = a; c.strokeStyle = b; c.lineWidth = 2.5; c.fill(); c.stroke(); }

  function star(c, x, y, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5;
      var rad = i % 2 ? r * 0.45 : r;
      c.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
    }
    c.closePath();
  }

  /* --- шлемы --- */
  function drawLeaf(c, col) {                       // листик / бантик-основа
    c.beginPath();
    c.moveTo(-24, 8);
    c.quadraticCurveTo(-6, -28, 24, -10);
    c.quadraticCurveTo(6, 20, -24, 8);
    c.closePath();
    fill(c, col.a, col.b);
    c.strokeStyle = col.b; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-20, 6); c.quadraticCurveTo(0, -4, 20, -9); c.stroke();
  }

  function drawPot(c, col) {                        // кастрюлька / шапочка
    rr(c, -22, -12, 44, 26, 6); fill(c, col.a, col.b);
    rr(c, -26, -18, 52, 8, 4); fill(c, col.c || col.a, col.b);
    c.beginPath(); c.arc(0, -22, 5, 0, Math.PI * 2); fill(c, col.c || col.a, col.b);
  }

  function drawKnightHelm(c, col) {                 // рыцарский шлем
    c.beginPath();
    c.moveTo(-20, 14); c.lineTo(-20, -6);
    c.quadraticCurveTo(0, -28, 20, -6); c.lineTo(20, 14);
    c.closePath(); fill(c, col.a, col.b);
    c.fillStyle = col.b;
    for (var i = -1; i <= 1; i++) rr(c, i * 9 - 2.5, -2, 5, 12, 2), c.fill();
    c.strokeStyle = col.c || '#ff6f8f'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -24); c.quadraticCurveTo(10, -34, 6, -18); c.stroke();
  }

  function drawCrown(c, col) {                      // корона
    c.beginPath();
    c.moveTo(-24, 12); c.lineTo(-20, -14); c.lineTo(-8, 0); c.lineTo(0, -20);
    c.lineTo(8, 0); c.lineTo(20, -14); c.lineTo(24, 12);
    c.closePath(); fill(c, col.a, col.b);
    c.fillStyle = col.c || '#ff5f8f';
    c.beginPath(); c.arc(0, 6, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-13, 6, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(13, 6, 3, 0, Math.PI * 2); c.fill();
  }

  function drawBow(c, col) {                        // бантик
    c.beginPath();
    c.moveTo(0, 0); c.quadraticCurveTo(-26, -18, -22, 2); c.quadraticCurveTo(-20, 18, 0, 0);
    c.closePath(); fill(c, col.a, col.b);
    c.beginPath();
    c.moveTo(0, 0); c.quadraticCurveTo(26, -18, 22, 2); c.quadraticCurveTo(20, 18, 0, 0);
    c.closePath(); fill(c, col.a, col.b);
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); fill(c, col.c || '#fff', col.b);
  }

  /* --- тело --- */
  function drawScarf(c, col) {
    c.beginPath();
    c.moveTo(-26, -10); c.quadraticCurveTo(0, 6, 26, -10);
    c.quadraticCurveTo(0, 20, -26, -10);
    c.closePath(); fill(c, col.a, col.b);
    rr(c, 10, -4, 12, 26, 5); fill(c, col.a, col.b);
    c.strokeStyle = col.c || '#fff'; c.lineWidth = 2.5;
    for (var i = 0; i < 3; i++) {
      c.beginPath(); c.moveTo(11, 2 + i * 6); c.lineTo(21, 0 + i * 6); c.stroke();
    }
  }

  function drawVest(c, col) {
    c.beginPath();
    c.moveTo(-20, -16); c.lineTo(-8, -16); c.lineTo(0, -8); c.lineTo(8, -16); c.lineTo(20, -16);
    c.lineTo(24, 18); c.lineTo(-24, 18);
    c.closePath(); fill(c, col.a, col.b);
    c.strokeStyle = col.b; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -8); c.lineTo(0, 18); c.stroke();
    c.fillStyle = col.c || '#ffd96b';
    c.beginPath(); c.arc(-8, 2, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-8, 12, 3, 0, Math.PI * 2); c.fill();
  }

  function drawPlate(c, col) {
    c.beginPath();
    c.moveTo(-22, -16); c.lineTo(22, -16); c.lineTo(24, 6);
    c.quadraticCurveTo(0, 24, -24, 6);
    c.closePath(); fill(c, col.a, col.b);
    c.strokeStyle = col.b; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-16, -8); c.lineTo(16, -8); c.stroke();
    c.beginPath(); c.moveTo(0, -16); c.lineTo(0, 14); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.ellipse(-10, -4, 5, 8, 0.3, 0, Math.PI * 2); c.fill();
  }

  function drawCape(c, col) {
    c.beginPath();
    c.moveTo(-10, -18); c.lineTo(10, -18); c.lineTo(26, 20);
    c.quadraticCurveTo(0, 10, -26, 20);
    c.closePath(); fill(c, col.a, col.b);
    rr(c, -12, -22, 24, 8, 4); fill(c, col.c || '#fff', col.b);
  }

  /* --- ноги --- */
  function drawSlippers(c, col) {
    for (var s = -1; s <= 1; s += 2) {
      c.beginPath();
      c.ellipse(s * 13, 6, 12, 8, 0, 0, Math.PI * 2);
      fill(c, col.a, col.b);
      c.beginPath(); c.arc(s * 13, 0, 6, Math.PI, 0); fill(c, col.c || col.a, col.b);
    }
  }

  function drawSneakers(c, col) {
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, 0); c.scale(s, 1);
      c.beginPath();
      c.moveTo(-10, 10); c.lineTo(-10, -6); c.quadraticCurveTo(-2, -10, 6, 2);
      c.lineTo(11, 10); c.closePath();
      fill(c, col.a, col.b);
      rr(c, -12, 8, 24, 6, 3); fill(c, col.c || '#fff', col.b);
      c.restore();
    }
  }

  function drawBoots(c, col) {
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, 0); c.scale(s, 1);
      c.beginPath();
      c.moveTo(-9, -16); c.lineTo(5, -16); c.lineTo(6, 4); c.lineTo(13, 12); c.lineTo(-9, 12);
      c.closePath(); fill(c, col.a, col.b);
      rr(c, -10, -18, 17, 6, 3); fill(c, col.c || '#ffd96b', col.b);
      c.restore();
    }
  }

  function drawSprings(c, col) {
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, -2);
      rr(c, -10, -16, 20, 12, 4); fill(c, col.a, col.b);
      c.strokeStyle = col.c || '#8fd0ea'; c.lineWidth = 3.5; c.lineCap = 'round';
      c.beginPath();
      for (var i = 0; i < 4; i++) {
        c.moveTo(-8, -2 + i * 5); c.lineTo(8, 1 + i * 5);
      }
      c.stroke();
      c.restore();
    }
  }

  function drawSkates(c, col) {
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, -4); c.scale(s, 1);
      c.beginPath();
      c.moveTo(-9, -14); c.lineTo(7, -14); c.lineTo(8, 6); c.lineTo(-9, 6);
      c.closePath(); fill(c, col.a, col.b);
      c.strokeStyle = col.c || '#9ed8f5'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-10, 10); c.lineTo(12, 10); c.stroke();
      c.restore();
    }
  }

  /* --- перчатки --- */
  function drawMitten(c, col) {
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, 0); c.scale(s, 1);
      rr(c, -9, -12, 18, 20, 8); fill(c, col.a, col.b);
      rr(c, -13, -4, 7, 10, 3.5); fill(c, col.a, col.b);
      rr(c, -10, 6, 20, 6, 3); fill(c, col.c || '#fff', col.b);
      c.restore();
    }
  }

  function drawBattleGlove(c, col) {
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, 0); c.scale(s, 1);
      rr(c, -10, -14, 20, 22, 6); fill(c, col.a, col.b);
      c.fillStyle = col.c || '#ffd96b';
      for (var i = 0; i < 3; i++) { c.beginPath(); c.arc(-4 + i * 5, -10, 2.6, 0, Math.PI * 2); c.fill(); }
      rr(c, -12, 6, 24, 7, 3); fill(c, col.c || '#ffd96b', col.b);
      c.restore();
    }
  }

  function drawChampGlove(c, col) {
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, 2); c.scale(s, 1);
      rr(c, -11, -16, 22, 24, 7); fill(c, col.a, col.b);
      rr(c, -15, -6, 8, 11, 4); fill(c, col.a, col.b);
      c.restore();
    }
    c.fillStyle = '#fff6b0';
    star(c, 0, -16, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    star(c, -18, -6, 3.5); c.fill();
    star(c, 18, -8, 3); c.fill();
  }

  function drawCap(c, col) {                        // кепка с козырьком
    // козырёк
    c.beginPath();
    c.moveTo(-2, 4);
    c.quadraticCurveTo(24, 2, 22, 9);
    c.quadraticCurveTo(10, 12, -2, 10);
    c.closePath(); fill(c, col.b, col.b);
    // сама шапочка
    c.beginPath();
    c.moveTo(-16, 5);
    c.quadraticCurveTo(-16, -18, 2, -18);
    c.quadraticCurveTo(18, -18, 18, 5);
    c.closePath(); fill(c, col.a, col.b);
    // пуговка и полоска
    c.fillStyle = col.c || '#fff';
    c.beginPath(); c.arc(1, -17, 3.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = col.c || '#fff'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-14, 1); c.lineTo(16, 1); c.stroke();
  }

  function drawBoltGlove(c, col) {                  // перчатки-молнии
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, 1); c.scale(s, 1);
      rr(c, -10, -15, 21, 23, 7); fill(c, col.a, col.b);
      rr(c, -14, -5, 8, 11, 4); fill(c, col.a, col.b);
      c.restore();
    }
    c.fillStyle = '#fff3a8'; c.strokeStyle = '#c99a13'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(2, -20); c.lineTo(-7, -4); c.lineTo(0, -4);
    c.lineTo(-3, 12); c.lineTo(8, -7); c.lineTo(1, -7);
    c.closePath(); c.fill(); c.stroke();
  }

  function drawSandals(c, col) {                    // сандалики / валенки
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, 2); c.scale(s, 1);
      // голенище
      rr(c, -8, -16, 16, 20, 5); fill(c, col.a, col.b);
      // подошва носком вперёд
      c.beginPath();
      c.moveTo(-8, 2);
      c.lineTo(13, 2);
      c.quadraticCurveTo(16, 9, 8, 9);
      c.lineTo(-8, 9);
      c.closePath(); fill(c, col.c || '#fff', col.b);
      // ремешок
      c.strokeStyle = col.b; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-7, -6); c.lineTo(7, -6); c.stroke();
      c.restore();
    }
  }

  /* --- самые-самые: рисунки для новых легенд --- */
  function drawStarCrown(c, col) {                  // звёздная корона
    c.save();
    c.globalAlpha = 0.3; c.fillStyle = col.c || '#fff6b0';
    c.beginPath(); c.ellipse(0, -2, 30, 22, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    drawCrown(c, col);
    c.fillStyle = '#fff6b0'; c.strokeStyle = col.b; c.lineWidth = 1.5;
    star(c, 0, -24, 6); c.fill(); c.stroke();
    star(c, -20, -18, 4); c.fill(); c.stroke();
    star(c, 20, -18, 4); c.fill(); c.stroke();
  }

  function drawWings(c, col) {                      // крылышки
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.scale(s, 1);
      c.beginPath();
      c.moveTo(4, -4);
      c.quadraticCurveTo(20, -26, 30, -14);
      c.quadraticCurveTo(26, -4, 30, 4);
      c.quadraticCurveTo(22, 8, 26, 16);
      c.quadraticCurveTo(12, 16, 4, 6);
      c.closePath(); fill(c, col.a, col.b);
      c.strokeStyle = col.b; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(8, -2); c.lineTo(24, -10); c.stroke();
      c.beginPath(); c.moveTo(8, 2); c.lineTo(24, 4); c.stroke();
      c.restore();
    }
    c.beginPath(); c.ellipse(0, 2, 7, 13, 0, 0, Math.PI * 2); fill(c, col.c || '#fff', col.b);
  }

  function drawWingBoots(c, col) {                  // сапожки с крылышками
    drawBoots(c, col);
    c.fillStyle = '#ffffff'; c.strokeStyle = col.b; c.lineWidth = 1.8;
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, -8); c.scale(s, 1);
      c.beginPath();
      c.moveTo(-9, -2); c.quadraticCurveTo(-22, -14, -24, -4);
      c.quadraticCurveTo(-18, 0, -22, 4); c.quadraticCurveTo(-14, 4, -9, 3);
      c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  }

  function drawCrystalGlove(c, col) {               // хрустальные перчатки
    for (var s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 13, 2); c.scale(s, 1);
      rr(c, -11, -16, 22, 24, 7); fill(c, col.a, col.b);
      rr(c, -15, -6, 8, 11, 4); fill(c, col.a, col.b);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.beginPath(); c.ellipse(-4, -9, 3, 6, 0.3, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    c.fillStyle = col.c || '#b8f0ff'; c.strokeStyle = col.b; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -26); c.lineTo(7, -16); c.lineTo(0, -4); c.lineTo(-7, -16);
    c.closePath(); c.fill(); c.stroke();
  }

  /* ------------------------------------------------------------------------
   * Наборы вещей. Цены в конфетах; dust — цена в звёздной пыли.
   * ---------------------------------------------------------------------- */
  function item(slot, id, name, desc, price, stats, draw, col, dust) {
    return { slot: slot, id: id, name: name, desc: desc, price: price || 0,
      dust: dust || 0, stats: stats, draw: function (c) { draw(c, col); } };
  }

  var OMNOM = [
    item('helmet', 'leaf', 'Листочек', 'простой, но свой', 60,
      { hp: 1 }, drawLeaf, { a: '#8fd14f', b: '#4e8a2a' }),
    item('helmet', 'pot', 'Кастрюлька', 'звенит, зато крепкая', 160,
      { hp: 2 }, drawPot, { a: '#cfd8e3', b: '#7c8896', c: '#eef3f8' }),
    item('helmet', 'knight', 'Рыцарский шлем', 'настоящее железо', 380,
      { hp: 3, dodge: 0.05 }, drawKnightHelm, { a: '#c7d2dd', b: '#6b7886', c: '#ff6f8f' }),
    item('helmet', 'crown', 'Корона Ам Няма', 'для самых важных', 0,
      { hp: 4, dodge: 0.08 }, drawCrown, { a: '#ffc93c', b: '#b87a0d', c: '#ff5f8f' }, 6),

    item('body', 'scarf', 'Красный шарфик', 'греет и подбадривает', 70,
      { hp: 1 }, drawScarf, { a: '#ff6f6f', b: '#c23a3a', c: '#fff' }),
    item('body', 'vest', 'Кожаный жилет', 'держит удар', 180,
      { hp: 2, dodge: 0.04 }, drawVest, { a: '#b5744a', b: '#7a4526', c: '#ffd96b' }),
    item('body', 'plate', 'Стальной панцирь', 'тяжёлый, зато надёжный', 420,
      { hp: 3, dodge: 0.10, speed: -0.05 }, drawPlate, { a: '#c7d2dd', b: '#6b7886' }),
    item('body', 'choco', 'Шоколадная броня', 'вкусная и очень прочная', 0,
      { hp: 4, dodge: 0.14 }, drawPlate, { a: '#8b5a2b', b: '#4a2c13' }, 8),

    item('boots', 'slippers', 'Тапочки', 'мягкие и уютные', 50,
      { speed: 0.05 }, drawSlippers, { a: '#ffb3d1', b: '#d45d8e', c: '#fff' }),
    item('boots', 'sneakers', 'Кроссовки', 'бегать — так бегать', 150,
      { speed: 0.10 }, drawSneakers, { a: '#8fd14f', b: '#4e8a2a', c: '#fff' }),
    item('boots', 'runners', 'Сапожки-скороходы', 'ветер в лапках', 350,
      { speed: 0.18, dodge: 0.04 }, drawBoots, { a: '#b5744a', b: '#7a4526', c: '#ffd96b' }),
    item('boots', 'springs', 'Пружинки', 'прыг — и уже далеко', 0,
      { speed: 0.26, dodge: 0.08 }, drawSprings, { a: '#c7d2dd', b: '#6b7886', c: '#8fd0ea' }, 7),

    item('helmet', 'cap', 'Кепка-звёздочка', 'козырёк от солнышка', 250,
      { hp: 2, speed: 0.04 }, drawCap, { a: '#8fd6ff', b: '#2f5d8a', c: '#ffdf5e' }),

    item('body', 'jacket', 'Тёплая куртка', 'мягкая, но держит удар', 280,
      { hp: 2, dodge: 0.07 }, drawVest, { a: '#8fd14f', b: '#3f7a1f', c: '#fff' }),

    item('boots', 'sandals', 'Сандалики', 'лёгкие, лапки дышат', 240,
      { speed: 0.14 }, drawSandals, { a: '#e3b06a', b: '#8b5a2b', c: '#ffe9a8' }),

    item('gloves', 'work', 'Рабочие рукавицы', 'просто и надёжно', 550,
      { damage: 0.10, atkSpeed: 0.05, hp: 1 }, drawMitten, { a: '#b5744a', b: '#7a4526', c: '#ffd96b' }),
    item('gloves', 'bolt', 'Перчатки-молнии', 'удары сыплются градом', 0,
      { atkSpeed: 0.22, damage: 0.10, crit: 0.05 }, drawBoltGlove, { a: '#ffdf5e', b: '#c99a13' }, 13),

    item('gloves', 'mittens', 'Митенки', 'лапки не мёрзнут', 300,
      { atkSpeed: 0.08 }, drawMitten, { a: '#9fdcff', b: '#4e93b5', c: '#fff' }),
    item('gloves', 'battle', 'Боевые перчатки', 'бьют ощутимо сильнее', 0,
      { damage: 0.15, atkSpeed: 0.10 }, drawBattleGlove, { a: '#6b4423', b: '#3b2210', c: '#ffd96b' }, 10),
    item('gloves', 'champ', 'Перчатки чемпиона', 'иногда бьют вдвое сильнее', 0,
      { damage: 0.25, atkSpeed: 0.15, crit: 0.15 }, drawChampGlove, { a: '#ffc93c', b: '#b87a0d' }, 18),

    /* --- самые-самые: по три новые вещи в каждый слот --- */
    item('helmet', 'viking', 'Шлем викинга', 'лучший шлем за конфеты', 520,
      { hp: 3, dodge: 0.07, speed: 0.03 }, drawKnightHelm, { a: '#b5744a', b: '#5e3418', c: '#ffd96b' }),
    item('helmet', 'candycrown', 'Леденцовая корона', 'сладкая, но крепкая', 0,
      { hp: 4, dodge: 0.10 }, drawCrown, { a: '#ffb3d1', b: '#c23a66', c: '#8fd6ff' }, 8),
    item('helmet', 'starcrown', 'Звёздная корона', 'новая легенда лавки', 0,
      { hp: 5, dodge: 0.12 }, drawStarCrown, { a: '#ffd96b', b: '#a8700a', c: '#fff6b0' }, 10),

    item('body', 'knightarmor', 'Рыцарские латы', 'лучшая броня за конфеты', 580,
      { hp: 3, dodge: 0.12 }, drawPlate, { a: '#e3e9f0', b: '#5a6776' }),
    item('body', 'candyarmor', 'Карамельный панцирь', 'слизни об него зубы ломают', 0,
      { hp: 4, dodge: 0.16 }, drawPlate, { a: '#ff8fb4', b: '#a8284f' }, 10),
    item('body', 'wings', 'Крылья Ам Няма', 'от них удары пролетают мимо', 0,
      { hp: 5, dodge: 0.18 }, drawWings, { a: '#e8fbff', b: '#4e93b5', c: '#8fd14f' }, 12),

    item('boots', 'jumpers', 'Сапоги-прыгуны', 'лучшие ножки за конфеты', 480,
      { speed: 0.20, dodge: 0.05 }, drawBoots, { a: '#4e8a2a', b: '#2a4f14', c: '#ffdf5e' }),
    item('boots', 'rockets', 'Ракетные пружинки', 'быстрее ветра', 0,
      { speed: 0.28, dodge: 0.09 }, drawSprings, { a: '#ff6f6f', b: '#a82a2a', c: '#ffdf5e' }, 9),
    item('boots', 'wingboots', 'Крылатые сапожки', 'бегут, не касаясь земли', 0,
      { speed: 0.32, dodge: 0.10 }, drawWingBoots, { a: '#8fd6ff', b: '#2f5d8a', c: '#fff6b0' }, 11),

    item('gloves', 'iron', 'Железные кулачки', 'лучшие перчатки за конфеты', 750,
      { damage: 0.14, atkSpeed: 0.08, hp: 1 }, drawBattleGlove, { a: '#c7d2dd', b: '#5a6776', c: '#ff6f8f' }),
    item('gloves', 'candyfist', 'Сахарные кулаки', 'сладкий, но мощный удар', 0,
      { damage: 0.27, atkSpeed: 0.17, crit: 0.16 }, drawChampGlove, { a: '#ff8fb4', b: '#a8284f' }, 20),
    item('gloves', 'crystal', 'Хрустальные перчатки', 'сильнее не бывает', 0,
      { damage: 0.30, atkSpeed: 0.18, crit: 0.18 }, drawCrystalGlove, { a: '#bfefff', b: '#2f7fa8', c: '#e6d4ff' }, 22)
  ];

  var CAT = [
    item('helmet', 'bow', 'Бантик', 'самое важное — красота', 60,
      { hp: 1 }, drawBow, { a: '#ff9fc4', b: '#d45d8e', c: '#fff0f5' }),
    item('helmet', 'beanie', 'Вязаная шапочка', 'в ней тепло и спокойно', 160,
      { hp: 2 }, drawPot, { a: '#7aa6d6', b: '#41618a', c: '#cfe0f5' }),
    item('helmet', 'knight', 'Шлем кошечки', 'с розовым пёрышком', 380,
      { hp: 3, dodge: 0.05 }, drawKnightHelm, { a: '#e3e9f0', b: '#8a97a6', c: '#ff9fc4' }),
    item('helmet', 'tiara', 'Корона кошечки', 'принцесса на арене', 0,
      { hp: 4, dodge: 0.08 }, drawCrown, { a: '#ffd7f0', b: '#d45d9e', c: '#ff5f8f' }, 6),

    item('body', 'scarf', 'Полосатый шарф', 'длинный и пушистый', 70,
      { hp: 1 }, drawScarf, { a: '#ff8f8f', b: '#c23a3a', c: '#fff4f4' }),
    item('body', 'sweater', 'Тёплый свитер', 'уютная защита', 180,
      { hp: 2, dodge: 0.04 }, drawVest, { a: '#ffd7a8', b: '#c9944a', c: '#fff' }),
    item('body', 'cape', 'Плащ героини', 'развевается на бегу', 420,
      { hp: 3, dodge: 0.10, speed: -0.05 }, drawCape, { a: '#ff6f8f', b: '#c23a66', c: '#fff' }),
    item('body', 'starcape', 'Звёздный плащ', 'соткан из ночного неба', 0,
      { hp: 4, dodge: 0.14 }, drawCape, { a: '#6a55c9', b: '#42338a', c: '#ffdf5e' }, 8),

    item('boots', 'socks', 'Носочки', 'мягко и не скользко', 50,
      { speed: 0.05 }, drawSlippers, { a: '#fff0f5', b: '#d98eae', c: '#ff9fc4' }),
    item('boots', 'sneakers', 'Кроссовки', 'для быстрых лапок', 150,
      { speed: 0.10 }, drawSneakers, { a: '#ff9fc4', b: '#d45d8e', c: '#fff' }),
    item('boots', 'skates', 'Коньки', 'скользит как по льду', 350,
      { speed: 0.18, dodge: 0.04 }, drawSkates, { a: '#ffffff', b: '#5ea9cf', c: '#9ed8f5' }),
    item('boots', 'springs', 'Пружинки', 'прыг — и уже далеко', 0,
      { speed: 0.26, dodge: 0.08 }, drawSprings, { a: '#ffe6ef', b: '#d45d8e', c: '#ff9fc4' }, 7),

    item('helmet', 'cap', 'Кепочка с ушками', 'модно и удобно', 250,
      { hp: 2, speed: 0.04 }, drawCap, { a: '#ffb4d2', b: '#d45d8e', c: '#fff0f5' }),

    item('body', 'jacket', 'Пуховичок', 'лёгкий и тёплый', 280,
      { hp: 2, dodge: 0.07 }, drawVest, { a: '#c9a6ff', b: '#6a55c9', c: '#fff' }),

    item('boots', 'valenki', 'Валеночки', 'в них тепло и мягко', 240,
      { speed: 0.14 }, drawSandals, { a: '#e3e9f0', b: '#8a97a6', c: '#ffd7f0' }),

    item('gloves', 'work', 'Митенки-невидимки', 'тонкие, но крепкие', 550,
      { damage: 0.10, atkSpeed: 0.05, hp: 1 }, drawMitten, { a: '#e7e2ff', b: '#6a55c9', c: '#fff' }),
    item('gloves', 'bolt', 'Лапки-молнии', 'удары сыплются градом', 0,
      { atkSpeed: 0.22, damage: 0.10, crit: 0.05 }, drawBoltGlove, { a: '#ffd7f0', b: '#d45d9e' }, 13),

    item('gloves', 'mittens', 'Варежки', 'связаны с любовью', 300,
      { atkSpeed: 0.08 }, drawMitten, { a: '#ffd7f0', b: '#d45d9e', c: '#fff' }),
    item('gloves', 'battle', 'Боевые лапки', 'удар становится злее', 0,
      { damage: 0.15, atkSpeed: 0.10 }, drawBattleGlove, { a: '#ff8fb4', b: '#c23a66', c: '#fff0f5' }, 10),
    item('gloves', 'champ', 'Лапки чемпионки', 'иногда бьют вдвое сильнее', 0,
      { damage: 0.25, atkSpeed: 0.15, crit: 0.15 }, drawChampGlove, { a: '#ffd7f0', b: '#d45d9e' }, 18),

    /* --- самые-самые: по три новые вещи в каждый слот --- */
    item('helmet', 'ears', 'Шлем с ушками', 'лучший шлем за конфеты', 520,
      { hp: 3, dodge: 0.07, speed: 0.03 }, drawKnightHelm, { a: '#ffd7f0', b: '#a8508a', c: '#c9a6ff' }),
    item('helmet', 'candycrown', 'Леденцовая тиара', 'сладкая, но крепкая', 0,
      { hp: 4, dodge: 0.10 }, drawCrown, { a: '#c9f0ff', b: '#4e93b5', c: '#ff9fc4' }, 8),
    item('helmet', 'starcrown', 'Звёздная тиара', 'новая легенда лавки', 0,
      { hp: 5, dodge: 0.12 }, drawStarCrown, { a: '#ffd7f0', b: '#a8508a', c: '#fff6b0' }, 10),

    item('body', 'dress', 'Бальное платье', 'лучшая защита за конфеты', 580,
      { hp: 3, dodge: 0.12 }, drawCape, { a: '#c9a6ff', b: '#6a55c9', c: '#ffd7f0' }),
    item('body', 'candyarmor', 'Зефирная броня', 'мягкая, а удары отскакивают', 0,
      { hp: 4, dodge: 0.16 }, drawPlate, { a: '#fff0f5', b: '#d45d8e' }, 10),
    item('body', 'wings', 'Крылья феи', 'от них удары пролетают мимо', 0,
      { hp: 5, dodge: 0.18 }, drawWings, { a: '#ffe6f7', b: '#c23a9e', c: '#c9a6ff' }, 12),

    item('boots', 'ballet', 'Балетки', 'лучшие ножки за конфеты', 480,
      { speed: 0.20, dodge: 0.05 }, drawSneakers, { a: '#ffb3d1', b: '#a8508a', c: '#fff0f5' }),
    item('boots', 'rockets', 'Облачные пружинки', 'быстрее ветра', 0,
      { speed: 0.28, dodge: 0.09 }, drawSprings, { a: '#e7e2ff', b: '#6a55c9', c: '#ffdf5e' }, 9),
    item('boots', 'wingboots', 'Крылатые сапожки', 'бегут, не касаясь земли', 0,
      { speed: 0.32, dodge: 0.10 }, drawWingBoots, { a: '#ff9fc4', b: '#a8508a', c: '#fff6b0' }, 11),

    item('gloves', 'iron', 'Когтистые лапки', 'лучшие перчатки за конфеты', 750,
      { damage: 0.14, atkSpeed: 0.08, hp: 1 }, drawBattleGlove, { a: '#e3e9f0', b: '#6a55c9', c: '#ff9fc4' }),
    item('gloves', 'candyfist', 'Сахарные лапки', 'сладкий, но мощный удар', 0,
      { damage: 0.27, atkSpeed: 0.17, crit: 0.16 }, drawChampGlove, { a: '#ffb3d1', b: '#a8284f' }, 20),
    item('gloves', 'crystal', 'Хрустальные лапки', 'сильнее не бывает', 0,
      { damage: 0.30, atkSpeed: 0.18, crit: 0.18 }, drawCrystalGlove, { a: '#f0e6ff', b: '#6a55c9', c: '#b8f0ff' }, 22)
  ];

  var MAX_LEVEL = 5;
  var LEVEL_BOOST = 0.15;          // +15% к характеристикам за уровень
  var HP_ONLY_DODGE = 0.01;        // +1% уклонения за уровень вещам «только сердечки»

  var Equipment = {
    slots: SLOTS,
    lists: { omnom: OMNOM, cat: CAT },
    MAX_LEVEL: MAX_LEVEL,

    /** Характеристики вещи с учётом прокачки. */
    stats: function (it, level) {
      var k = 1 + LEVEL_BOOST * (level || 0);
      var out = {}, onlyHp = true;
      for (var key in it.stats) {
        var v = it.stats[key];
        if (key !== 'hp' && v > 0) onlyHp = false;
        if (v <= 0) out[key] = v;                       // штраф не растёт
        else if (key === 'hp') out[key] = Math.round(v * k);
        else out[key] = v * k;
      }
      // Сердечки округляются и растут не каждый уровень — такие вещи
      // за каждый уровень получают ещё немного уклонения
      if (onlyHp && level) out.dodge = HP_ONLY_DODGE * level;
      return out;
    },

    /**
     * Сколько стоит следующий уровень (в конфетах) — как у оружия:
     * секретные вещи качать дороже, сундук дома делает дешевле.
     */
    upgradeCost: function (it, level) {
      var base = it.dust ? (it.dust * 45) : Math.max(15, Math.round(it.price * 0.3));
      var off = window.Home ? Home.upgradeDiscount() : 1;
      return Math.round(base * (level + 1) * off);
    },

    get: function (hero, id) {
      var list = Equipment.lists[hero] || OMNOM;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    /** Вещи одного слота — по возрастанию цены, секретные в конце. */
    bySlot: function (hero, slot) {
      return (Equipment.lists[hero] || OMNOM)
        .filter(function (it) { return it.slot === slot; })
        .sort(function (a, b) {
          if (!!a.dust !== !!b.dust) return a.dust ? 1 : -1;
          return a.dust ? (a.dust - b.dust) : (a.price - b.price);
        });
    },

    /** Короткое описание характеристик для карточки. */
    statLines: function (it, level) {
      var s = Equipment.stats(it, level), out = [];
      if (s.hp) out.push('+' + s.hp + ' ♥');
      if (s.dodge) out.push('уклонение +' + Math.round(s.dodge * 100) + '%');
      if (s.speed) out.push('бег ' + (s.speed > 0 ? '+' : '') + Math.round(s.speed * 100) + '%');
      if (s.atkSpeed) out.push('удары +' + Math.round(s.atkSpeed * 100) + '%');
      if (s.damage) out.push('урон +' + Math.round(s.damage * 100) + '%');
      if (s.crit) out.push('крит ' + Math.round(s.crit * 100) + '%');
      if (s.magnet) out.push('магнит +' + Math.round(s.magnet * 100) + '%');
      return out;
    },

    /**
     * Что даст следующий уровень: строки «уклонение 5% → 5.8%» — только
     * для характеристик, которые на самом деле изменятся.
     */
    gainLines: function (it, level) {
      var a = Equipment.stats(it, level), b = Equipment.stats(it, level + 1), out = [];
      function pct(v) { return (v > 0 ? '+' : '') + Math.round(v * 1000) / 10 + '%'; }
      function line(key, label, fmt) {
        var from = a[key] || 0, to = b[key] || 0;
        if (to && fmt(from) !== fmt(to)) out.push(label + ' ' + fmt(from) + ' → ' + fmt(to));
      }
      line('hp', '♥', function (v) { return '+' + v; });
      line('dodge', 'уклонение', pct);
      line('speed', 'бег', pct);
      line('atkSpeed', 'удары', pct);
      line('damage', 'урон', pct);
      line('crit', 'крит', pct);
      line('magnet', 'магнит', pct);
      return out;
    },

    /** Надеть на героя всё, что выбрано в лавке (вызывается из Upgrades.recalc). */
    apply: function (p) {
      var worn = Shop.equipment[p.hero] || {};
      for (var i = 0; i < SLOTS.length; i++) {
        var id = worn[SLOTS[i].id];
        if (!id) continue;
        var it = Equipment.get(p.hero, id);
        if (!it) continue;
        var s = Equipment.stats(it, Shop.gearLevel(p.hero, id));
        if (s.hp) p.maxHp += s.hp;
        if (s.dodge) p.dodge += s.dodge;
        if (s.speed) p.speed *= 1 + s.speed;
        if (s.atkSpeed) p.atkSpeed *= 1 + s.atkSpeed;
        if (s.damage) p.damageMul *= 1 + s.damage;
        if (s.crit) p.crit += s.crit;
        if (s.magnet) p.magnet *= 1 + s.magnet;
      }
    },

    /** Значок вещи для карточки в лавке. */
    drawIcon: function (c, it, x, y, scale) {
      c.save();
      c.translate(x, y);
      c.scale(scale, scale);
      c.lineJoin = 'round';
      it.draw(c);
      c.restore();
    }
  };

  window.Equipment = Equipment;
})();

