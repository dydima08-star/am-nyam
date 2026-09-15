/* ============================================================================
 * js/shop.js — лавка мечей, кошельки и прокачка оружия.
 *
 * Две валюты:
 *   • конфеты — у Ам Няма и кошечки СВОИ. Конфета достаётся тому, кто её
 *     подобрал, и тратит он её только на своё оружие;
 *   • звёздная пыль — редкость, падает с врагов примерно раз в сотню слизней.
 *     Тоже у каждого своя: пылинка достаётся тому, кто её поднял, и за неё
 *     он покупает своё секретное оружие.
 *
 * Прокачка: любое оружие можно улучшить до +5 за конфеты. Каждый уровень —
 * больше урона, выше скорость ударов и чуть шире размах.
 *
 * Всё это сохраняется в памяти браузера, поэтому закрыть игру и вернуться
 * можно без потерь. На телефоне тоже работает.
 * ========================================================================== */
(function () {
  'use strict';

  var SAVE_KEY = 'am-nyam-save-1';

  var Shop = {
    coins: { omnom: 0, cat: 0 },                  // конфеты у каждого свои
    dust: { omnom: 0, cat: 0 },                   // звёздная пыль — тоже у каждого своя
    owned: { omnom: ['wood'], cat: ['toy'] },     // что куплено
    levels: { omnom: {}, cat: {} },               // прокачка оружия: id → уровень
    perks: { omnom: {}, cat: {} },                // постоянные улучшения: id → уровень
    gear: { omnom: [], cat: [] },                 // купленная экипировка
    equipment: { omnom: {}, cat: {} },            // надетое: слот → id вещи
    gearLevels: { omnom: {}, cat: {} },           // прокачка экипировки: id → уровень
    section: 'weapons',                           // какая вкладка открыта
    progress: { maxWorld: 1, cleared: {} },       // какие миры открыты и пройдены
    best: { endless: 0, worlds: 0 },              // рекорды: волн без остановки, миров подряд
    equipped: { omnom: 'wood', cat: 'toy' },      // что в лапке
    costumes: { omnom: [], cat: [] },             // купленные наряды (js/wardrobe.js)
    worn: { omnom: 'base', cat: 'base' },         // что надето
    sync: { id: '', rev: 0 },                     // чьё это общее сохранение и какой он версии
    tab: 'omnom',
    openedFrom: 'menu'
  };

  /* ------------------------------------------------------------------------
   * Сохранение
   * ---------------------------------------------------------------------- */
  Shop.load = function () {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) Shop.fromData(JSON.parse(raw));
    } catch (e) {
      console.warn('[shop] сохранение не прочиталось:', e);
    }
    lastSaved = content();
  };

  /** Разложить сохранение по местам — из памяти браузера или от хозяина комнаты. */
  Shop.fromData = function (d) {
    if (!d) return;
    {
      if (d.coins) Shop.coins = { omnom: d.coins.omnom | 0, cat: d.coins.cat | 0 };
      // Старое сохранение хранило общую пыль числом — делим её пополам
      if (typeof d.dust === 'number') {
        Shop.dust = { omnom: Math.ceil(d.dust / 2), cat: Math.floor(d.dust / 2) };
      } else if (d.dust) {
        Shop.dust = { omnom: d.dust.omnom | 0, cat: d.dust.cat | 0 };
      }
      if (d.owned) Shop.owned = {
        omnom: d.owned.omnom || ['wood'],
        cat: d.owned.cat || ['toy']
      };
      if (d.levels) Shop.levels = { omnom: d.levels.omnom || {}, cat: d.levels.cat || {} };
      if (d.perks) Shop.perks = { omnom: d.perks.omnom || {}, cat: d.perks.cat || {} };
      if (d.gear) Shop.gear = { omnom: d.gear.omnom || [], cat: d.gear.cat || [] };
      if (d.equipment) Shop.equipment = { omnom: d.equipment.omnom || {}, cat: d.equipment.cat || {} };
      if (d.gearLevels) Shop.gearLevels = { omnom: d.gearLevels.omnom || {}, cat: d.gearLevels.cat || {} };
      if (d.best) Shop.best = { endless: d.best.endless | 0, worlds: d.best.worlds | 0 };
      if (d.progress) Shop.progress = {
        maxWorld: d.progress.maxWorld || 1,
        cleared: d.progress.cleared || {}
      };
      if (d.home && window.Home) Home.fromSave(d.home);
      if (d.costumes) Shop.costumes = { omnom: d.costumes.omnom || [], cat: d.costumes.cat || [] };
      if (d.worn) Shop.worn = { omnom: d.worn.omnom || 'base', cat: d.worn.cat || 'base' };
      if (d.equipped) Shop.equipped = {
        omnom: d.equipped.omnom || 'wood',
        cat: d.equipped.cat || 'toy'
      };
    }
    Shop.sync = { id: (d.sync && d.sync.id) || '', rev: (d.sync && d.sync.rev) | 0 };
  };

  /** Короткий звоночек покупки. */
  function ding() { if (window.Sound) Sound.play('buy'); }

  /** Всё сохранение одним объектом. */
  Shop.toData = function () {
    return {
      coins: Shop.coins, dust: Shop.dust, owned: Shop.owned,
      levels: Shop.levels, perks: Shop.perks, equipped: Shop.equipped,
      gear: Shop.gear, equipment: Shop.equipment, gearLevels: Shop.gearLevels,
      progress: Shop.progress,
      home: window.Home ? Home.toSave() : null,
      costumes: Shop.costumes, worn: Shop.worn,
      best: Shop.best,
      sync: Shop.sync
    };
  };

  var lastSaved = '';      // что записали в последний раз (без номера версии)

  function content() {
    var d = Shop.toData();
    delete d.sync;
    return JSON.stringify(d);
  }

  function write() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(Shop.toData()));
    } catch (e) { /* приватный режим — играем без сохранения */ }
  }

  /**
   * Сохранить прогресс. Он общий на двоих: у хозяина комнаты каждое изменение
   * получает следующий номер версии и сразу уходит напарнику (Shop.onChange,
   * js/online.js). Гость хранит копию и номер не меняет. Если ничего не
   * поменялось — ничего не делаем.
   */
  Shop.save = function () {
    var now = content();
    if (now === lastSaved) return;
    lastSaved = now;
    if (!(window.Online && Online.isGuest())) {
      if (!Shop.sync.id) Shop.sync.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      Shop.sync.rev++;
    }
    write();
    if (Shop.onChange) Shop.onChange();
  };

  /** Записать и разослать заново, даже если ничего не поменялось. */
  Shop.forceSave = function () {
    lastSaved = '';
    Shop.save();
  };

  /** Принять общее сохранение от хозяина комнаты. */
  Shop.applyShared = function (d) {
    Shop.fromData(d);
    lastSaved = content();
    write();
  };

  /* ------------------------------------------------------------------------
   * Курс обмена: одна звёздная пылинка заменяет сотню конфет.
   * Всё, что стоит дороже 150 конфет, можно взять и за пыль — на кнопке
   * показывается вторая цена.
   * ---------------------------------------------------------------------- */
  var DUST_RATE = 100;
  var DUST_FROM = 150;

  /** Цена в пыли для вещи, у которой цена в конфетах. */
  Shop.dustPrice = function (candyCost) {
    return Math.max(1, Math.round(candyCost / DUST_RATE));
  };

  /** Можно ли эту цену оплатить пылью. */
  Shop.canPayDust = function (candyCost) {
    return candyCost >= DUST_FROM;
  };

  /**
   * Списать цену. mode: 'candy' или 'dust'. Возвращает true, если хватило.
   */
  Shop.pay = function (hero, candyCost, mode) {
    if (mode === 'dust') {
      var d = Shop.dustPrice(candyCost);
      if (Shop.dust[hero] < d) return false;
      Shop.dust[hero] -= d;
      return true;
    }
    if (Shop.coins[hero] < candyCost) return false;
    Shop.coins[hero] -= candyCost;
    return true;
  };

  /* ------------------------------------------------------------------------
   * Кошельки
   * ---------------------------------------------------------------------- */
  /**
   * Положить конфеты в кошелёк. Домик (коврик и копилка) добавляет свою долю:
   * дробная часть превращается в шанс лишней конфеты, поэтому иногда падает +2.
   * Возвращает, сколько на самом деле положили.
   */
  Shop.addCoin = function (hero, n) {
    n = n || 1;
    var bonus = (window.Home ? Home.candyBonus() : 0) +
                (window.Wardrobe ? Wardrobe.candyBonus(hero) : 0);
    if (bonus > 0) {
      var exact = n * (1 + bonus);
      n = Math.floor(exact);
      if (Math.random() < exact - n) n++;
    }
    // Сохранение общее на двоих — конфеты обоих героев лежат в нём
    Shop.coins[hero] = (Shop.coins[hero] || 0) + n;
    return n;
  };

  Shop.addDust = function (hero, n) {
    Shop.dust[hero] = (Shop.dust[hero] || 0) + (n || 1);
  };

  Shop.isOwned = function (hero, id) {
    return Shop.owned[hero].indexOf(id) >= 0;
  };

  Shop.levelOf = function (hero, id) {
    return (Shop.levels[hero] && Shop.levels[hero][id]) || 0;
  };

  /** Уровень постоянного улучшения. */
  Shop.perkLevel = function (hero, id) {
    return (Shop.perks[hero] && Shop.perks[hero][id]) || 0;
  };

  /** Купить следующий уровень постоянного улучшения. */
  Shop.buyPerk = function (hero, id, mode) {
    var perk = Upgrades.perkById(id);
    if (!perk) return false;
    var level = Shop.perkLevel(hero, id);
    var cost = Upgrades.nextCost(perk, level);
    if (!cost) return false;

    if (cost.dust) {
      if (Shop.dust[hero] < cost.dust) return false;
      Shop.dust[hero] -= cost.dust;
    } else {
      if (!Shop.pay(hero, cost.candy, mode)) return false;
    }

    Shop.perks[hero][id] = level + 1;
    ding();
    // Если партия идёт — улучшение начинает действовать сразу
    for (var i = 0; i < Players.list.length; i++) {
      if (Players.list[i].hero === hero) Upgrades.recalc(Players.list[i]);
    }
    Shop.save();
    return true;
  };

  /* ------------------------------------------------------------------------
   * Покупка, прокачка, надевание
   * ---------------------------------------------------------------------- */
  Shop.buy = function (hero, id, mode) {
    var w = Weapons.get(hero, id);
    if (Shop.isOwned(hero, id)) return false;

    if (w.secret) {
      if (Shop.dust[hero] < w.dust) return false;
      Shop.dust[hero] -= w.dust;
    } else {
      if (!Shop.pay(hero, w.price, mode)) return false;
    }

    Shop.owned[hero].push(id);
    Shop.equip(hero, id);
    Shop.save();
    ding();
    return true;
  };

  /** Прокачать оружие на уровень (за конфеты того же героя). */
  Shop.upgrade = function (hero, id, mode) {
    if (!Shop.isOwned(hero, id)) return false;
    var w = Weapons.get(hero, id);
    var level = Shop.levelOf(hero, id);
    if (level >= Weapons.MAX_LEVEL) return false;

    var cost = Weapons.upgradeCost(w, level);
    if (!Shop.pay(hero, cost, mode)) return false;
    Shop.levels[hero][id] = level + 1;
    refreshEquipped(hero);
    Shop.save();
    ding();
    return true;
  };

  Shop.equip = function (hero, id) {
    if (!Shop.isOwned(hero, id)) return false;
    Shop.equipped[hero] = id;
    refreshEquipped(hero);
    Shop.save();
    if (window.Sound) Sound.play('click');
    render();
    return true;
  };

  /** Обновить оружие у героя прямо на арене (если партия идёт). */
  function refreshEquipped(hero) {
    var id = Shop.equipped[hero];
    for (var i = 0; i < Players.list.length; i++) {
      if (Players.list[i].hero === hero) {
        Weapons.equip(Players.list[i], id, Shop.levelOf(hero, id));
      }
    }
  }

  /* ------------------------------------------------------------------------
   * Экипировка (покупка, прокачка до +5, надевание)
   * ---------------------------------------------------------------------- */
  Shop.hasGear = function (hero, id) {
    return Shop.gear[hero].indexOf(id) >= 0;
  };

  Shop.buyGear = function (hero, id, mode) {
    var it = Equipment.get(hero, id);
    if (!it || Shop.hasGear(hero, id)) return false;

    if (it.dust) {
      if (Shop.dust[hero] < it.dust) return false;
      Shop.dust[hero] -= it.dust;
    } else {
      if (!Shop.pay(hero, it.price, mode)) return false;
    }

    Shop.gear[hero].push(id);
    Shop.wearGear(hero, id);
    Shop.save();
    ding();
    return true;
  };

  Shop.gearLevel = function (hero, id) {
    return (Shop.gearLevels[hero] && Shop.gearLevels[hero][id]) || 0;
  };

  /** Прокачать вещь на уровень (за конфеты или пыль того же героя). */
  Shop.upgradeGear = function (hero, id, mode) {
    var it = Equipment.get(hero, id);
    if (!it || !Shop.hasGear(hero, id)) return false;
    var level = Shop.gearLevel(hero, id);
    if (level >= Equipment.MAX_LEVEL) return false;

    if (!Shop.pay(hero, Equipment.upgradeCost(it, level), mode)) return false;
    Shop.gearLevels[hero][id] = level + 1;

    for (var i = 0; i < Players.list.length; i++) {
      if (Players.list[i].hero === hero) Upgrades.recalc(Players.list[i]);
    }
    Shop.save();
    ding();
    return true;
  };

  /** Надеть вещь (в её слот) или снять, если она уже надета. */
  Shop.wearGear = function (hero, id) {
    var it = Equipment.get(hero, id);
    if (!it || !Shop.hasGear(hero, id)) return false;

    if (Shop.equipment[hero][it.slot] === id) delete Shop.equipment[hero][it.slot];
    else Shop.equipment[hero][it.slot] = id;

    for (var i = 0; i < Players.list.length; i++) {
      if (Players.list[i].hero === hero) Upgrades.recalc(Players.list[i]);
    }
    Shop.save();
    return true;
  };

  /* ------------------------------------------------------------------------
   * Полный сброс прогресса (кнопка «Начать заново» в лавке).
   * Нажимается только после подтверждения — случайно не сотрёшь.
   * ---------------------------------------------------------------------- */
  Shop.resetAll = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* приватный режим */ }

    Shop.coins = { omnom: 0, cat: 0 };
    Shop.dust = { omnom: 0, cat: 0 };
    Shop.owned = { omnom: ['wood'], cat: ['toy'] };
    Shop.levels = { omnom: {}, cat: {} };
    Shop.perks = { omnom: {}, cat: {} };
    Shop.gear = { omnom: [], cat: [] };
    Shop.equipment = { omnom: {}, cat: {} };
    Shop.gearLevels = { omnom: {}, cat: {} };
    Shop.progress = { maxWorld: 1, cleared: {} };
    Shop.equipped = { omnom: 'wood', cat: 'toy' };
    Shop.costumes = { omnom: [], cat: [] };
    Shop.worn = { omnom: 'base', cat: 'base' };
    Shop.best = { endless: 0, worlds: 0 };
    Shop.tab = 'omnom';
    if (window.Home) Home.reset();      // домик тоже пустеет
    Shop.save();

    // Текущая партия тоже сбрасывается: выходим в меню, волны начнутся заново
    Shop.openedFrom = 'menu';
    Game.toMenu();
    render();
  };

  /* ------------------------------------------------------------------------
   * Экран магазина
   * ---------------------------------------------------------------------- */
  Shop.inGame = false;        // вдвоём: этот игрок заглянул в лавку посреди забега

  Shop.open = function (from) {
    Shop.openedFrom = from || 'menu';
    if (from === 'game' && window.Online && Online.active) {
      // Вдвоём лавка у каждого своя: игра не встаёт, у напарника ничего не меняется,
      // а мой герой просто стоит, пока я выбираю
      Shop.inGame = true;
      Online.tellShop(true);
    } else if (Game.state === 'playing') {
      Game.state = 'shop';
    }
    render();
    Game.showScreen('shop');
    document.getElementById('topbar').hidden = true;
  };

  /** Выйти из лавки посреди забега (сообщаем напарнику — волна больше не ждёт). */
  Shop.leaveGame = function () {
    if (!Shop.inGame) return;
    Shop.inGame = false;
    if (window.Online) Online.tellShop(false);
  };

  Shop.close = function () {
    if (Shop.openedFrom === 'game') {
      Shop.leaveGame();
      if (Game.state === 'shop' || Game.state === 'playing') {
        Game.state = 'playing';
        Game.showScreen(null);
        document.getElementById('topbar').hidden = false;
      }
    } else if (window.Online && Online.active) {
      Online.open();                     // лавку открывали из комнаты
    } else {
      Game.toMenu();
    }
    Shop.save();
  };

  function render() {
    var tabs = document.getElementById('shop-tabs');
    var items = document.getElementById('shop-items');
    if (!tabs || !items) return;

    // Вкладки героев: свои конфеты + общая звёздная пыль
    tabs.innerHTML = '';
    [['omnom', 'Ам Ням'], ['cat', 'Кошечка']].forEach(function (pair) {
      var hero = pair[0];
      var b = document.createElement('button');
      b.className = 'shop-tab' + (Shop.tab === hero ? ' is-active' : '') + ' tab-' + hero;
      b.type = 'button';
      b.innerHTML = '<img src="' + Assets.sprites[hero + '_base'].src + '" alt="">' +
        '<span class="tab-name">' + pair[1] + '</span>' +
        '<span class="tab-coins">🍬 ' + Shop.coins[hero] + '</span>' +
        '<span class="tab-dust">✦ ' + Shop.dust[hero] + '</span>';
      b.addEventListener('click', function () { Shop.tab = hero; render(); });
      tabs.appendChild(b);
    });
    // Переключатель «Оружие / Улучшения»
    var switcher = document.getElementById('shop-sections');
    if (switcher) {
      switcher.innerHTML = '';
      [['weapons', '🗡 Оружие'], ['gear', '🛡 Экипировка'], ['perks', '⭐ Улучшения']].forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'shop-section' + (Shop.section === pair[0] ? ' is-active' : '');
        b.textContent = pair[1];
        b.addEventListener('click', function () { Shop.section = pair[0]; render(); });
        switcher.appendChild(b);
      });
    }

    var hero = Shop.tab;
    items.innerHTML = '';
    items.classList.remove('is-perks');
    items.classList.remove('is-gear');

    if (Shop.section === 'perks') { renderPerks(hero, items); return; }
    if (Shop.section === 'gear') { renderGear(hero, items); return; }

    // Карточки оружия
    var list = Weapons.lists[hero];

    list.forEach(function (w) {
      var owned = Shop.isOwned(hero, w.id);
      var level = Shop.levelOf(hero, w.id);
      var equipped = Shop.equipped[hero] === w.id;
      var st = Weapons.stats(w, level);

      var card = document.createElement('div');
      card.className = 'shop-card' +
        (equipped ? ' is-equipped' : '') +
        (w.secret ? ' is-secret' : '') +
        (owned ? '' : ' is-locked');

      var cv = document.createElement('canvas');
      cv.className = 'shop-pic';
      cv.width = 260; cv.height = 150;
      card.appendChild(cv);

      var info = document.createElement('div');
      info.className = 'shop-info';
      info.innerHTML =
        '<b class="shop-name">' + w.name +
          (level ? ' <i class="lvl">+' + level + '</i>' : '') + '</b>' +
        '<span class="shop-desc">' + w.desc + '</span>' +
        '<span class="shop-stats">' +
          statChip('урон', st.damage) +
          statChip('скор.', st.speed) +
          statChip('размах', st.reach) +
          (w.knock ? statChip('толчок', w.knock) : '') +
        '</span>';
      card.appendChild(info);

      // Главная кнопка: цена всегда написана цифрой
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-buy';
      if (equipped) {
        btn.textContent = 'В лапке ✓';
        btn.disabled = true;
        btn.classList.add('is-on');
      } else if (owned) {
        btn.textContent = 'Взять';
        btn.addEventListener('click', function () { Shop.equip(hero, w.id); });
      } else {
        var enough = w.secret ? (Shop.dust[hero] >= w.dust) : (Shop.coins[hero] >= w.price);
        btn.innerHTML = w.secret
          ? 'Купить · <b>✦ ' + w.dust + '</b>'
          : 'Купить · <b>🍬 ' + w.price + '</b>';
        if (enough) {
          btn.addEventListener('click', function () {
            if (Shop.buy(hero, w.id, 'candy')) { render(); }
          });
        } else {
          btn.disabled = true;
          btn.classList.add('is-poor');
        }
      }
      card.appendChild(btn);

      // Дорогое оружие можно взять и за звёздную пыль
      if (!owned && !w.secret) {
        addDustButton(card, hero, w.price, function () {
          if (Shop.buy(hero, w.id, 'dust')) render();
        });
      }

      // Кнопка прокачки — тоже с ценой
      var up = document.createElement('button');
      up.type = 'button';
      up.className = 'shop-up';
      if (!owned) {
        up.textContent = 'прокачка после покупки';
        up.disabled = true;
      } else if (level >= Weapons.MAX_LEVEL) {
        up.textContent = 'максимум +' + Weapons.MAX_LEVEL;
        up.disabled = true;
        up.classList.add('is-max');
      } else {
        var next = Weapons.stats(w, level + 1);
        card.appendChild(gainBox(level + 1, [
          ['урон', st.damage, next.damage],
          ['скор.', st.speed, next.speed],
          ['размах', st.reach, next.reach]
        ].map(function (r) {
          return r[0] + ' ×' + mul(r[1]) + ' → ×' + mul(r[2]);
        })));
        var cost = Weapons.upgradeCost(w, level);
        up.innerHTML = '+' + (level + 1) + ' · <b>🍬 ' + cost + '</b>';
        if (Shop.coins[hero] >= cost) {
          up.addEventListener('click', function () {
            if (Shop.upgrade(hero, w.id, 'candy')) { render(); }
          });
        } else {
          up.disabled = true;
          up.classList.add('is-poor');
        }
      }
      card.appendChild(up);

      if (owned && level < Weapons.MAX_LEVEL) {
        addDustButton(card, hero, Weapons.upgradeCost(w, level), function () {
          if (Shop.upgrade(hero, w.id, 'dust')) render();
        });
      }

      items.appendChild(card);

      // Картинка рисуется тем же кодом, что и оружие в бою
      var c = cv.getContext('2d');
      c.clearRect(0, 0, cv.width, cv.height);
      Weapons.drawIcon(c, w, cv.width / 2, cv.height / 2, 2.1);
    });
  }
  Shop.render = render;

  /* ------------------------------------------------------------------------
   * Постоянные улучшения: дорого, но навсегда
   * ---------------------------------------------------------------------- */
  function renderPerks(hero, items) {
    items.classList.add('is-perks');

    Upgrades.perks.forEach(function (perk) {
      var level = Shop.perkLevel(hero, perk.id);
      var max = Upgrades.maxLevel(perk);
      var cost = Upgrades.nextCost(perk, level);

      var card = document.createElement('div');
      card.className = 'perk-card' + (perk.dust ? ' is-secret' : '') + (level ? ' has-level' : '');

      // Точки уровней
      var pips = '';
      for (var i = 0; i < max; i++) {
        pips += '<i class="pip' + (i < level ? ' on' : '') + '"></i>';
      }

      card.innerHTML =
        '<span class="perk-icon">' + perk.icon + '</span>' +
        '<b class="perk-name">' + perk.name + '</b>' +
        '<span class="perk-desc">' + perk.desc + '</span>' +
        '<span class="perk-pips">' + pips + '</span>';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-buy';
      if (!cost) {
        btn.textContent = 'максимум';
        btn.disabled = true;
        btn.classList.add('is-on');
      } else {
        var enough = cost.dust ? (Shop.dust[hero] >= cost.dust) : (Shop.coins[hero] >= cost.candy);
        btn.innerHTML = (level ? 'Уровень ' + (level + 1) : 'Купить') + ' · <b>' +
          (cost.dust ? '✦ ' + cost.dust : '🍬 ' + cost.candy) + '</b>';
        if (enough) {
          btn.addEventListener('click', function () {
            if (Shop.buyPerk(hero, perk.id, 'candy')) render();
          });
        } else {
          btn.disabled = true;
          btn.classList.add('is-poor');
        }
      }
      card.appendChild(btn);

      if (cost && cost.candy) {
        addDustButton(card, hero, cost.candy, function () {
          if (Shop.buyPerk(hero, perk.id, 'dust')) render();
        });
      }

      items.appendChild(card);
    });
  }

  /**
   * Маленькая вторая кнопка «или ✦ N» — для всего, что стоит дорого.
   * Появляется, только если пыли у героя хватает.
   */
  function addDustButton(card, hero, candyCost, onPay) {
    if (!Shop.canPayDust(candyCost)) return;
    var need = Shop.dustPrice(candyCost);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'shop-dust-pay';
    b.innerHTML = 'или <b>✦ ' + need + '</b>';
    if (Shop.dust[hero] >= need) {
      b.addEventListener('click', onPay);
    } else {
      b.disabled = true;
      b.classList.add('is-poor');
    }
    card.appendChild(b);
  }

  /* ------------------------------------------------------------------------
   * Экипировка: шлем, тело, ноги, перчатки
   * ---------------------------------------------------------------------- */
  function renderGear(hero, items) {
    items.classList.add('is-gear');

    Equipment.slots.forEach(function (slot) {
      var head = document.createElement('div');
      head.className = 'gear-slot-title';
      var wornId = Shop.equipment[hero][slot.id];
      var worn = wornId ? Equipment.get(hero, wornId) : null;
      head.innerHTML = '<b>' + slot.name + '</b><span>' +
        (worn ? 'надето: ' + worn.name : 'ничего не надето') + '</span>';
      items.appendChild(head);

      var row = document.createElement('div');
      row.className = 'gear-row';

      Equipment.bySlot(hero, slot.id).forEach(function (it) {
        var owned = Shop.hasGear(hero, it.id);
        var on = Shop.equipment[hero][slot.id] === it.id;
        var level = Shop.gearLevel(hero, it.id);

        var card = document.createElement('div');
        card.className = 'gear-card' + (it.dust ? ' is-secret' : '') + (on ? ' is-equipped' : '');

        var cv = document.createElement('canvas');
        cv.className = 'gear-pic';
        cv.width = 180; cv.height = 130;
        card.appendChild(cv);

        var lines = Equipment.statLines(it, level).map(function (t) {
          return '<i class="chip up">' + t + '</i>';
        }).join('');
        var info = document.createElement('div');
        info.className = 'shop-info';
        info.innerHTML = '<b class="shop-name">' + it.name +
            (level ? ' <i class="lvl">+' + level + '</i>' : '') + '</b>' +
          '<span class="shop-desc">' + it.desc + '</span>' +
          '<span class="shop-stats">' + lines + '</span>';
        card.appendChild(info);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shop-buy';
        if (on) {
          btn.textContent = 'Надето ✓';
          btn.classList.add('is-on');
          btn.addEventListener('click', function () { Shop.wearGear(hero, it.id); render(); });
        } else if (owned) {
          btn.textContent = 'Надеть';
          btn.addEventListener('click', function () { Shop.wearGear(hero, it.id); render(); });
        } else if (it.dust) {
          btn.innerHTML = 'Купить · <b>✦ ' + it.dust + '</b>';
          if (Shop.dust[hero] >= it.dust) {
            btn.addEventListener('click', function () { if (Shop.buyGear(hero, it.id)) render(); });
          } else { btn.disabled = true; btn.classList.add('is-poor'); }
        } else {
          btn.innerHTML = 'Купить · <b>🍬 ' + it.price + '</b>';
          if (Shop.coins[hero] >= it.price) {
            btn.addEventListener('click', function () { if (Shop.buyGear(hero, it.id, 'candy')) render(); });
          } else { btn.disabled = true; btn.classList.add('is-poor'); }
        }
        card.appendChild(btn);

        if (!owned && !it.dust) {
          addDustButton(card, hero, it.price, function () {
            if (Shop.buyGear(hero, it.id, 'dust')) render();
          });
        }

        // Прокачка — только для купленных вещей
        if (owned) {
          var up = document.createElement('button');
          up.type = 'button';
          up.className = 'shop-up';
          if (level >= Equipment.MAX_LEVEL) {
            up.textContent = 'максимум +' + Equipment.MAX_LEVEL;
            up.disabled = true;
            up.classList.add('is-max');
          } else {
            card.appendChild(gainBox(level + 1, Equipment.gainLines(it, level)));
            var cost = Equipment.upgradeCost(it, level);
            up.innerHTML = '+' + (level + 1) + ' · <b>🍬 ' + cost + '</b>';
            if (Shop.coins[hero] >= cost) {
              up.addEventListener('click', function () {
                if (Shop.upgradeGear(hero, it.id, 'candy')) render();
              });
            } else {
              up.disabled = true;
              up.classList.add('is-poor');
            }
          }
          card.appendChild(up);

          if (level < Equipment.MAX_LEVEL) {
            addDustButton(card, hero, Equipment.upgradeCost(it, level), function () {
              if (Shop.upgradeGear(hero, it.id, 'dust')) render();
            });
          }
        }

        row.appendChild(card);

        var c = cv.getContext('2d');
        c.clearRect(0, 0, cv.width, cv.height);
        Equipment.drawIcon(c, it, cv.width / 2, cv.height / 2, 1.7);
      });

      items.appendChild(row);
    });
  }

  /** Множитель коротко: 2.70 → «2.7», 1.00 → «1». */
  function mul(value) {
    return value.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
  }

  function statChip(label, value) {
    var cls = value > 1.001 ? 'up' : (value < 0.999 ? 'down' : '');
    return '<i class="chip ' + cls + '">' + label + ' ×' + mul(value) + '</i>';
  }

  /** Табличка над кнопкой прокачки: что именно улучшится и на сколько. */
  function gainBox(nextLevel, lines) {
    var box = document.createElement('div');
    box.className = 'shop-gain';
    box.innerHTML = '<b>на +' + nextLevel + ':</b> ' + (lines.length
      ? lines.map(function (t) { return '<span>' + t + '</span>'; }).join('')
      : '<span class="is-none">на этом уровне без изменений</span>');
    return box;
  }

  /* ------------------------------------------------------------------------
   * Кнопки
   * ---------------------------------------------------------------------- */
  Shop.init = function () {
    Shop.load();

    var open = document.getElementById('btn-shop');
    if (open) open.addEventListener('click', function () { Shop.open('menu'); });

    var openGame = document.getElementById('btn-shop-game');
    if (openGame) openGame.addEventListener('click', function () { Shop.open('game'); });

    var close = document.getElementById('shop-close');
    if (close) close.addEventListener('click', Shop.close);

    // Кнопка «Начать заново» → сначала предупреждение
    var box = document.getElementById('reset-confirm');
    var reset = document.getElementById('btn-reset');
    if (reset && box) reset.addEventListener('click', function () { box.hidden = false; });

    var no = document.getElementById('reset-no');
    if (no) no.addEventListener('click', function () { box.hidden = true; });

    var yes = document.getElementById('reset-yes');
    if (yes) yes.addEventListener('click', function () {
      box.hidden = true;
      Shop.resetAll();
    });
  };

  window.Shop = Shop;
})();

