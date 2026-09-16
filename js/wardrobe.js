/* ============================================================================
 * js/wardrobe.js — гардероб: костюмы героев.
 *
 * Гардероб стоит дома (вкладка «Гардероб» в домике). У каждого героя свой
 * набор нарядов: обычный вид бесплатно, остальные покупаются за конфеты или
 * за звёздную пыль. Костюм — это не только внешность: у каждого свой бонус,
 * который действует всегда, пока наряд надет.
 *
 * Картинки первых нарядов лежат в js/assets.js (те самые, что вы прислали).
 * Остальные — «надстройки»: обычный облик героя плюс шапка, корона или
 * крылышки, нарисованные здесь же (см. DERIVED под списком нарядов).
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * Наряды. costume — имя костюма в js/assets.js (omnom_knight и т.д.)
   * ---------------------------------------------------------------------- */
  var SETS = {
    omnom: [
      { id: 'base', name: 'Ам Ням', price: 0,
        about: 'как есть — зелёный и голодный',
        good: 'без бонуса, зато всегда с собой' },

      { id: 'knight', name: 'Рыцарь', price: 350,
        about: 'шлем, щит и храброе сердце',
        good: '+2 сердечка, уклонение +5%, бег чуть медленнее',
        apply: function (p) { p.maxHp += 2; p.dodge += 0.05; p.speed *= 0.96; } },

      { id: 'chef', name: 'Повар', price: 500,
        about: 'колпак, половник и запах ужина',
        good: '+1 сердечко и на 15% больше конфет',
        apply: function (p) { p.maxHp += 1; } },

      { id: 'winter', name: 'Зимний', price: 600,
        about: 'вязаная шапка с помпоном',
        good: 'холод не берёт совсем, бег +6%',
        apply: function (p) { p.noSlow = true; p.speed *= 1.06; } },

      { id: 'pirate', name: 'Пират', price: 700,
        about: 'бандана в горошек и хитрый прищур',
        good: 'конфеты слетаются издалека, шанс крита +6%',
        apply: function (p) { p.magnet *= 1.5; p.crit += 0.06; } },

      { id: 'wizard', name: 'Волшебник', dust: 4,
        about: 'шляпа со звёздами и посох',
        good: 'волшебная искра в придачу к мечу, урон ×1.08',
        apply: function (p) { p.wand += 1; p.damageMul *= 1.08; } },

      { id: 'king', name: 'Король', dust: 6,
        about: 'золотая корона с камушками',
        good: '+1 сердечко, урон ×1.1, суперприём сильнее на 20%',
        apply: function (p) { p.maxHp += 1; p.damageMul *= 1.1; p.superMul *= 1.2; } }
    ],

    cat: [
      { id: 'base', name: 'Кошечка', price: 0,
        about: 'белая шёрстка и розовые щёчки',
        good: 'без бонуса, зато всегда с собой' },

      { id: 'knight', name: 'Рыцарка', price: 350,
        about: 'доспех по кошачьей мерке',
        good: '+2 сердечка, уклонение +5%, бег чуть медленнее',
        apply: function (p) { p.maxHp += 2; p.dodge += 0.05; p.speed *= 0.96; } },

      { id: 'winter', name: 'Зимний наряд', price: 500,
        about: 'шубка, шарфик и тёплые сапожки',
        good: 'холод не берёт совсем, бег +8%',
        apply: function (p) { p.noSlow = true; p.speed *= 1.08; p.dodge += 0.03; } },

      { id: 'chef', name: 'Повариха', price: 500,
        about: 'высокий колпак и фартук с сердечком',
        good: '+1 сердечко и на 15% больше конфет',
        apply: function (p) { p.maxHp += 1; } },

      { id: 'princess', name: 'Принцесса', price: 700,
        about: 'диадема и розовый бантик',
        good: 'уклонение +8%, суперприём копится на 25% быстрее',
        apply: function (p) { p.dodge += 0.08; p.superFill *= 1.25; } },

      { id: 'wizard', name: 'Волшебница', dust: 4,
        about: 'звёздная мантия и колпак',
        good: 'волшебная искра в придачу к мечу, урон ×1.08',
        apply: function (p) { p.wand += 1; p.damageMul *= 1.08; } },

      { id: 'fairy', name: 'Цветочная фея', dust: 6,
        about: 'венок из цветов и прозрачные крылышки',
        good: '+1 сердечко, бег +6%, конфеты слетаются издалека',
        apply: function (p) { p.maxHp += 1; p.speed *= 1.06; p.magnet *= 1.4; } }
    ]
  };

  /* ------------------------------------------------------------------------
   * Наряды-надстройки: рисуются поверх обычного облика героя (js/assets.js
   * склеивает их в готовый спрайт после загрузки картинок).
   * Координаты — в пикселях исходной картинки: Ам Ням 183×183, макушка
   * около y≈20; кошечка 161×189, макушка около y≈8.
   * ---------------------------------------------------------------------- */
  var INK = '#4a2e2a';          // контур, как у присланных картинок

  function outline(c, fill, w) {
    c.fillStyle = fill; c.fill();
    c.lineWidth = w || 4; c.strokeStyle = INK; c.stroke();
  }

  function dot(c, x, y, r, color) {
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = color; c.fill();
  }

  function star(c, x, y, r, color) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr = i % 2 ? r * 0.45 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
    c.fillStyle = color; c.fill();
  }

  function heart(c, x, y, s, color) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath();
    c.moveTo(0, 4);
    c.bezierCurveTo(-7, -3, -5, -9, 0, -6);
    c.bezierCurveTo(5, -9, 7, -3, 0, 4);
    c.closePath();
    c.fillStyle = color; c.fill();
    c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
    c.restore();
  }

  function flower(c, x, y, r, petal) {
    for (var i = 0; i < 5; i++) {
      var a = i * Math.PI * 2 / 5 - Math.PI / 2;
      c.beginPath();
      c.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, 0, Math.PI * 2);
      c.fillStyle = petal; c.fill();
      c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    }
    dot(c, x, y, r * 0.38, '#ffd23c');
  }

  var DERIVED = {
    // Ам Ням: вязаная шапка с помпоном
    omnom_winter: { from: 'omnom_base', title: 'Зимний', padTop: 44,
      front: function (c) {
        c.beginPath();                                   // купол шапки
        c.moveTo(50, 36);
        c.bezierCurveTo(48, -16, 144, -16, 144, 32);
        c.closePath();
        c.save(); c.clip();
        c.fillStyle = '#6fb8ff'; c.fillRect(30, -30, 130, 70);
        c.fillStyle = '#ffffff'; c.fillRect(30, 4, 130, 7);   // полоски вязки
        c.fillStyle = '#ff8fb4'; c.fillRect(30, -10, 130, 6);
        c.restore();
        c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
        c.beginPath();                                   // отворот
        c.moveTo(44, 30);
        c.quadraticCurveTo(96, 12, 150, 28);
        c.lineTo(150, 42);
        c.quadraticCurveTo(96, 26, 44, 46);
        c.closePath();
        outline(c, '#ffffff');
        c.beginPath(); c.arc(96, -22, 13, 0, Math.PI * 2);    // помпон
        outline(c, '#ffffff');
        dot(c, 92, -26, 4, '#dfefff');
      } },

    // Ам Ням: пиратская бандана в горошек
    omnom_pirate: { from: 'omnom_base', title: 'Пират', padTop: 18,
      front: function (c) {
        c.beginPath();                                   // хвостики узелка
        c.moveTo(52, 34); c.lineTo(20, 24); c.lineTo(28, 46); c.closePath();
        outline(c, '#d9344f');
        c.beginPath();
        c.moveTo(54, 40); c.lineTo(30, 64); c.lineTo(48, 64); c.closePath();
        outline(c, '#d9344f');
        c.beginPath();
        c.moveTo(48, 40);
        c.bezierCurveTo(52, -16, 140, -16, 146, 30);
        c.quadraticCurveTo(96, 16, 48, 40);
        c.closePath();
        outline(c, '#e8475f');
        [[70, 16], [92, 4], [116, 8], [132, 22], [84, 24], [108, 20]].forEach(function (d) {
          dot(c, d[0], d[1], 3.6, '#ffffff');
        });
        c.beginPath(); c.arc(52, 38, 7, 0, Math.PI * 2);      // узелок
        outline(c, '#d9344f', 3);
      } },

    // Ам Ням: корона
    omnom_king: { from: 'omnom_base', title: 'Король', padTop: 30,
      front: function (c) {
        c.beginPath();
        c.moveTo(60, 28);
        c.lineTo(56, -8); c.lineTo(74, 8); c.lineTo(84, -22);
        c.lineTo(96, 4); c.lineTo(108, -22); c.lineTo(118, 8);
        c.lineTo(136, -8); c.lineTo(132, 28);
        c.quadraticCurveTo(96, 18, 60, 28);
        c.closePath();
        outline(c, '#ffd23c');
        c.beginPath();                                   // ободок
        c.moveTo(60, 28); c.quadraticCurveTo(96, 18, 132, 28);
        c.lineTo(133, 17); c.quadraticCurveTo(96, 7, 59, 17);
        c.closePath();
        outline(c, '#f2b100', 3);
        dot(c, 96, 14, 5, '#e8475f');
        dot(c, 76, 17, 4, '#6fb8ff');
        dot(c, 116, 17, 4, '#6fb8ff');
        [[56, -8], [84, -22], [108, -22], [136, -8]].forEach(function (d) {
          c.beginPath(); c.arc(d[0], d[1], 4.5, 0, Math.PI * 2);
          outline(c, '#ffffff', 2);
        });
        star(c, 72, 0, 4, '#fff6c2');
      } },

    // Кошечка: поварской колпак и фартук
    cat_chef: { from: 'cat_base', title: 'Повариха', padTop: 56,
      front: function (c) {
        c.beginPath();                                   // пышный верх
        c.moveTo(77, -16);
        c.arc(58, -16, 19, 0, Math.PI * 2);
        c.moveTo(125, -16);
        c.arc(106, -16, 19, 0, Math.PI * 2);
        c.moveTo(105, -30);
        c.arc(82, -30, 23, 0, Math.PI * 2);
        c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
        c.fillStyle = '#ffffff'; c.fill();
        c.fillRect(54, -16, 56, 26);
        c.beginPath();                                   // бока колпака
        c.moveTo(54, -12); c.lineTo(54, 10);
        c.moveTo(110, -12); c.lineTo(110, 10);
        c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
        c.beginPath();                                   // складки
        c.moveTo(72, 6); c.lineTo(70, -18);
        c.moveTo(92, 6); c.lineTo(94, -18);
        c.lineWidth = 2.5; c.strokeStyle = '#dccaca'; c.stroke();
        Game.roundRect(c, 48, 2, 68, 15, 6);             // ободок
        outline(c, '#ffffff');
        c.beginPath();                                   // фартук
        c.moveTo(58, 112); c.lineTo(106, 112);
        c.quadraticCurveTo(110, 146, 102, 164);
        c.lineTo(62, 164);
        c.quadraticCurveTo(54, 146, 58, 112);
        c.closePath();
        outline(c, '#ffe3ee', 3);
        heart(c, 82, 136, 1.4, '#ff6f9d');
      } },

    // Кошечка: диадема и бантик
    cat_princess: { from: 'cat_base', title: 'Принцесса', padTop: 26,
      front: function (c) {
        c.beginPath();
        c.moveTo(48, 20);
        c.lineTo(52, 0); c.lineTo(64, 10); c.lineTo(82, -20);
        c.lineTo(100, 10); c.lineTo(112, 0); c.lineTo(116, 20);
        c.quadraticCurveTo(82, 10, 48, 20);
        c.closePath();
        outline(c, '#ffd23c');
        heart(c, 82, 2, 1.5, '#ff6f9d');                 // сердечко-камень
        dot(c, 52, 0, 3.5, '#ffb4d2');
        dot(c, 112, 0, 3.5, '#ffb4d2');
        star(c, 30, -6, 6, '#ffdf5e');
        star(c, 138, 0, 5, '#ffdf5e');
        c.beginPath();                                   // бантик у уха
        c.moveTo(132, 46); c.lineTo(116, 36); c.lineTo(118, 58); c.closePath();
        outline(c, '#ff8fb4', 3);
        c.beginPath();
        c.moveTo(132, 46); c.lineTo(150, 38); c.lineTo(148, 58); c.closePath();
        outline(c, '#ff8fb4', 3);
        c.beginPath(); c.arc(132, 46, 4.5, 0, Math.PI * 2);
        outline(c, '#ff6f9d', 2);
      } },

    // Кошечка: венок и крылышки
    cat_fairy: { from: 'cat_base', title: 'Цветочная фея', padX: 34, padTop: 14,
      back: function (c) {
        [-1, 1].forEach(function (s) {
          c.save();
          c.globalAlpha = 0.88;
          c.beginPath();
          c.ellipse(82 + s * 72, 104, 36, 21, s * -0.6, 0, Math.PI * 2);
          outline(c, '#cdeeff', 3);
          c.beginPath();
          c.ellipse(82 + s * 62, 144, 25, 15, s * 0.5, 0, Math.PI * 2);
          outline(c, '#ffd6ec', 3);
          c.restore();
          dot(c, 82 + s * 78, 98, 4, '#ffffff');
        });
      },
      front: function (c) {
        c.beginPath();                                   // зелёная веточка
        c.moveTo(24, 36); c.quadraticCurveTo(82, -14, 142, 30);
        c.lineWidth = 5; c.strokeStyle = '#5fae4a'; c.stroke();
        [[40, 20, -0.9], [66, 6, -0.4], [98, 6, 0.4], [124, 18, 0.9]].forEach(function (l) {
          c.save(); c.translate(l[0], l[1]); c.rotate(l[2]);
          c.beginPath(); c.ellipse(0, -7, 4, 8, 0, 0, Math.PI * 2);
          c.fillStyle = '#7ccf5e'; c.fill();
          c.restore();
        });
        flower(c, 28, 32, 11, '#ffb4d2');
        flower(c, 52, 11, 12, '#fff3a6');
        flower(c, 82, 3, 14, '#ff8fb4');
        flower(c, 112, 11, 12, '#c9a6ff');
        flower(c, 138, 28, 11, '#fff3a6');
      } }
  };
  Object.keys(DERIVED).forEach(function (name) { Assets.derive(name, DERIVED[name]); });

  var Wardrobe = {
    sets: SETS,

    /** Наряды героя. */
    listFor: function (hero) { return SETS[hero] || SETS.omnom; },

    get: function (hero, id) {
      var list = Wardrobe.listFor(hero);
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return list[0];
    },

    owned: function (hero, id) {
      return id === 'base' || Shop.costumes[hero].indexOf(id) >= 0;
    },

    wornId: function (hero) { return Shop.worn[hero] || 'base'; },

    /** Купить наряд. mode: 'candy' | 'dust'. */
    buy: function (hero, id, mode) {
      var it = Wardrobe.get(hero, id);
      if (!it || Wardrobe.owned(hero, id)) return false;
      var ok = it.dust
        ? (Shop.dust[hero] >= it.dust && (Shop.dust[hero] -= it.dust, true))
        : Shop.pay(hero, it.price, mode);
      if (!ok) return false;
      Shop.costumes[hero].push(id);
      Shop.worn[hero] = id;            // сразу надеваем обновку
      Shop.save();
      return true;
    },

    wear: function (hero, id) {
      if (!Wardrobe.owned(hero, id)) return false;
      Shop.worn[hero] = id;
      Shop.save();
      return true;
    },

    /** Сколько лишних конфет приносит наряд (поварской колпак). */
    candyBonus: function (hero) {
      return Wardrobe.wornId(hero) === 'chef' ? 0.15 : 0;
    },

    /** Надеть наряд на героя и применить его бонус (из Upgrades.recalc). */
    apply: function (p) {
      var it = Wardrobe.get(p.hero, Wardrobe.wornId(p.hero));
      p.costume = it.id;
      p.costumeName = it.name;
      if (it.apply) it.apply(p);
    },

    /** Нарисовать наряд для карточки: спрайт целиком. */
    drawIcon: function (c, hero, id, x, y, h) {
      var name = Assets.spriteName(hero, id);
      var sp = Assets.sprites[name];
      var img = Assets.images[name];
      if (!sp || !img) return;
      var k = h / sp.h;
      c.drawImage(img, x - sp.w * k / 2, y - sp.h * k, sp.w * k, sp.h * k);
    }
  };

  window.Wardrobe = Wardrobe;
})();

