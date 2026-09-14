/* ============================================================================
 * js/wardrobe.js — гардероб: костюмы героев.
 *
 * Гардероб стоит дома (вкладка «Гардероб» в домике). У каждого героя свой
 * набор нарядов: обычный вид бесплатно, остальные покупаются за конфеты или
 * за звёздную пыль. Костюм — это не только внешность: у каждого свой бонус,
 * который действует всегда, пока наряд надет.
 *
 * Картинки нарядов лежат в js/assets.js (те самые, что вы прислали), поэтому
 * здесь только цены, бонусы и правила примерки.
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

      { id: 'wizard', name: 'Волшебник', dust: 4,
        about: 'шляпа со звёздами и посох',
        good: 'волшебная искра в придачу к мечу, урон ×1.08',
        apply: function (p) { p.wand += 1; p.damageMul *= 1.08; } }
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

      { id: 'wizard', name: 'Волшебница', dust: 4,
        about: 'звёздная мантия и колпак',
        good: 'волшебная искра в придачу к мечу, урон ×1.08',
        apply: function (p) { p.wand += 1; p.damageMul *= 1.08; } }
    ]
  };

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

