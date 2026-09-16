/* ============================================================================
 * js/home.js — домик Ам Няма и белой кошечки.
 *
 * Между мирами герои возвращаются домой. Дома можно:
 *   • поспать — один раз за пройденный мир, даёт лишние сердечки на забег;
 *   • поужинать — блюдо за конфеты даёт бонус на следующий забег;
 *   • обустроить домик — постоянные вещи, которые помогают всегда.
 *
 * Комната рисуется прямо на канвасе, и купленные вещи в ней ВИДНО: появляется
 * печка, кроватка, полка с книжками, люстра. Чем дальше играешь — тем уютнее
 * домик. Кнопки — обычный DOM поверх картинки, как в лавке.
 *
 * Всё хранится вместе с остальным прогрессом (js/shop.js), поле "home".
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * Ужин: блюдо действует один забег (с тёплой печкой — два).
   * ---------------------------------------------------------------------- */
  var DISHES = [
    {
      id: 'soup', name: 'Конфетный супчик', short: 'супчик', price: 45,
      about: 'тёплый, сладкий, придаёт сил',
      buff: { hp: 2 },
      draw: drawSoup
    },
    {
      id: 'pie', name: 'Ягодный пирог', short: 'пирог', price: 75,
      about: 'после него лапки сами машут мечом',
      buff: { damage: 1.25 },
      draw: drawPie
    },
    {
      id: 'pancakes', name: 'Медовые блинчики', short: 'блинчики', price: 95,
      about: 'бегается легко, удары сыплются чаще',
      buff: { speed: 1.18, atkSpeed: 1.15 },
      draw: drawPancakes
    },
    {
      id: 'cookie', name: 'Звёздное печенье', short: 'печенье', dust: 2,
      about: 'понемногу всего и сладкий магнит впридачу',
      buff: { hp: 1, damage: 1.15, speed: 1.08, atkSpeed: 1.08, magnet: 0.5 },
      draw: drawCookie
    }
  ];

  /* ------------------------------------------------------------------------
   * Обустройство домика: вещи общие на двоих, платит выбранный герой.
   * ---------------------------------------------------------------------- */
  var ITEMS = [
    { id: 'mat', name: 'Коврик у входа', price: 80,
      about: 'на нём приятно вытирать лапки', good: 'конфет падает на 8% больше', draw: drawMat },

    { id: 'plant', name: 'Цветок в горшке', price: 120,
      about: 'тянется к солнышку во все стороны', good: 'размах взмаха +5%', draw: drawPlant },

    { id: 'window', name: 'Окно на луг', price: 160,
      about: 'солнышко и свежий воздух', good: 'оба бегают на 4% быстрее', draw: drawWindow },

    { id: 'table', name: 'Кухонный столик', price: 200,
      about: 'готовить куда удобнее', good: 'ужин дешевле на четверть', draw: drawTable },

    { id: 'piggy', name: 'Копилка-свинка', price: 240,
      about: 'копит сама, пока вас нет', good: 'ещё +12% конфет', draw: drawPiggy },

    { id: 'armchair', name: 'Уютное кресло', price: 260,
      about: 'посидел — и снова полон сил', good: '+1 сердечко обоим', draw: drawArmchair },

    { id: 'stove', name: 'Тёплая печка', price: 280,
      about: 'еда не остывает до утра', good: 'ужин держится два забега', draw: drawStove },

    { id: 'mirror', name: 'Зеркальце', price: 300,
      about: 'перед ним репетируют хитрые удары', good: 'шанс крита +5%', draw: drawMirror },

    { id: 'bed', name: 'Мягкая кроватка', price: 320,
      about: 'с подушкой-облачком', good: 'сон даёт +2 сердечка вместо одного', draw: drawBed },

    { id: 'gramophone', name: 'Патефон', price: 380,
      about: 'под весёлую музыку бьётся бодрее', good: 'урон +6%', draw: drawGramophone },

    { id: 'shelf', name: 'Полка с книжками', price: 420,
      about: 'сказки про храбрых слизнеборцев', good: 'карточку в забеге предлагают дважды', draw: drawShelf },

    { id: 'aquarium', name: 'Аквариум с рыбками', price: 480,
      about: 'смотришь на рыбок — и копишь задор', good: 'суперприём копится на 15% быстрее', draw: drawAquarium },

    { id: 'candyjar', name: 'Банка конфет', price: 550,
      about: 'конфеты сами знают дорогу домой', good: 'конфеты слетаются на 30% дальше', draw: drawCandyJar },

    { id: 'clock', name: 'Часы с кукушкой', dust: 3,
      about: 'кукушка подгоняет', good: 'удары быстрее на 5%', draw: drawClock },

    { id: 'chest', name: 'Сундук с мечами', dust: 4,
      about: 'точильный камень внутри', good: 'прокачка оружия дешевле на 20%', draw: drawChest },

    { id: 'lamp', name: 'Люстра-звёздочка', dust: 5,
      about: 'кусочек звёздного неба дома', good: 'звёздная пыль падает в полтора раза чаще', draw: drawLamp },

    { id: 'telescope', name: 'Телескоп', dust: 6,
      about: 'видно, куда падают звёздочки', good: 'звёздная пыль падает ещё на 30% чаще', draw: drawTelescope },

    { id: 'trophy', name: 'Кубок героев', dust: 8,
      about: 'за всех побеждённых боссов', good: 'суперприём сильнее на 20%', draw: drawTrophy }
  ];

  var Home = {
    dishes: DISHES,
    items: ITEMS,

    tab: 'omnom',          // чей кошелёк открыт
    section: 'dinner',     // 'dinner' | 'build' | 'wardrobe'
    openedFrom: 'menu',

    data: {
      built: {},                            // id вещи → true
      dinner: { omnom: null, cat: null },   // { id, runs } — сколько забегов осталось
      restReady: false                      // можно ли поспать (даётся за пройденный мир)
    },

    // Что действует прямо сейчас, в этом забеге (считается в beginRun)
    runBuff: { omnom: null, cat: null },
    rested: false,

    /* ---------------------------------------------------------------- */
    has: function (id) { return !!Home.data.built[id]; },

    dishById: function (id) {
      for (var i = 0; i < DISHES.length; i++) if (DISHES[i].id === id) return DISHES[i];
      return null;
    },

    itemById: function (id) {
      for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
      return null;
    },

    /** Цена блюда с учётом кухонного столика. */
    dishPrice: function (d) {
      if (!d.price) return 0;
      return Home.has('table') ? Math.round(d.price * 0.75) : d.price;
    },

    /** Скидка на прокачку оружия от сундука с мечами. */
    upgradeDiscount: function () { return Home.has('chest') ? 0.8 : 1; },

    /** Насколько больше конфет приносит домик (коврик + копилка). */
    candyBonus: function () {
      return (Home.has('mat') ? 0.08 : 0) + (Home.has('piggy') ? 0.12 : 0);
    },

    /** Во сколько раз чаще падает звёздная пыль (люстра и телескоп). */
    dustMul: function () { return (Home.has('lamp') ? 1.5 : 1) * (Home.has('telescope') ? 1.3 : 1); },

    /** Сколько раз за забег предлагают карточку (полка с книжками). */
    offers: function () { return Home.has('shelf') ? 2 : 1; },

    /* ----------------------------------------------------------------------
     * Сохранение (вызывается из js/shop.js)
     * -------------------------------------------------------------------- */
    toSave: function () { return Home.data; },

    fromSave: function (d) {
      if (!d) return;
      Home.data = {
        built: d.built || {},
        dinner: {
          omnom: d.dinner ? d.dinner.omnom || null : null,
          cat: d.dinner ? d.dinner.cat || null : null
        },
        restReady: !!d.restReady
      };
    },

    reset: function () {
      Home.data = { built: {}, dinner: { omnom: null, cat: null }, restReady: false };
      Home.runBuff = { omnom: null, cat: null };
      Home.rested = false;
    },

    /* ----------------------------------------------------------------------
     * Забег: что из домашнего действует и сколько ещё продержится
     * -------------------------------------------------------------------- */
    beginRun: function () {
      Home.runBuff = { omnom: null, cat: null };
      ['omnom', 'cat'].forEach(function (hero) {
        var meal = Home.data.dinner[hero];
        if (!meal) return;
        var dish = Home.dishById(meal.id);
        if (!dish) { Home.data.dinner[hero] = null; return; }
        Home.runBuff[hero] = dish.buff;
        meal.runs--;                       // на один забег меньше
        if (meal.runs <= 0) Home.data.dinner[hero] = null;
      });
      // Выспались — бонус сгорает после этого забега
      Home.rested = Home.restedPending;
      Home.restedPending = false;
      Shop.save();
    },

    /** Домашние прибавки к характеристикам героя (вызывается из Upgrades.recalc). */
    applyRun: function (p) {
      var b = Home.runBuff[p.hero];
      if (b) {
        if (b.hp) p.maxHp += b.hp;
        if (b.damage) p.damageMul *= b.damage;
        if (b.speed) p.speed *= b.speed;
        if (b.atkSpeed) p.atkSpeed *= b.atkSpeed;
        if (b.magnet) p.magnet += b.magnet;
      }
      if (Home.rested) p.maxHp += Home.has('bed') ? 2 : 1;
      if (Home.has('window')) p.speed *= 1.04;
      if (Home.has('clock')) p.atkSpeed *= 1.05;
      if (Home.has('plant')) p.swingRadius *= 1.05;
      if (Home.has('armchair')) p.maxHp += 1;
      if (Home.has('mirror')) p.crit += 0.05;
      if (Home.has('gramophone')) p.damageMul *= 1.06;
      if (Home.has('aquarium')) p.superFill *= 1.15;
      if (Home.has('candyjar')) p.magnet *= 1.3;
      if (Home.has('trophy')) p.superMul *= 1.2;
    },

    /** Мир пройден — дома снова можно поспать. */
    allowRest: function () { Home.data.restReady = true; },

    /* ----------------------------------------------------------------------
     * Покупки
     * -------------------------------------------------------------------- */
    eat: function (hero, dishId, mode) {
      var d = Home.dishById(dishId);
      if (!d) return false;
      var ok = d.dust
        ? payDust(hero, d.dust)
        : Shop.pay(hero, Home.dishPrice(d), mode);
      if (!ok) return false;
      Home.data.dinner[hero] = { id: d.id, runs: Home.has('stove') ? 2 : 1 };
      Shop.save();
      return true;
    },

    build: function (hero, itemId, mode) {
      var it = Home.itemById(itemId);
      if (!it || Home.has(itemId)) return false;
      var ok = it.dust ? payDust(hero, it.dust) : Shop.pay(hero, it.price, mode);
      if (!ok) return false;
      Home.data.built[itemId] = true;
      Shop.save();
      return true;
    },

    sleep: function () {
      if (!Home.data.restReady) return false;
      Home.data.restReady = false;
      Home.restedPending = true;
      Shop.save();
      return true;
    },

    /* ----------------------------------------------------------------------
     * Экран
     * -------------------------------------------------------------------- */
    open: function (from) {
      Home.openedFrom = from || 'menu';
      Game.state = 'home';
      render();
      Game.showScreen('home');
      document.getElementById('topbar').hidden = true;
    },

    close: function () {
      Shop.save();
      if (window.Online && Online.active) Online.open();   // домой заходили из комнаты
      else Game.toMenu();
    },

    toMap: function () {
      Shop.save();
      WorldMap.open();
    },

    render: function () { render(); },

    init: function () {
      var next = document.getElementById('home-next');
      if (next) next.addEventListener('click', Home.toMap);

      var exit = document.getElementById('home-exit');
      if (exit) exit.addEventListener('click', Home.close);

      var sleepBtn = document.getElementById('home-sleep');
      if (sleepBtn) sleepBtn.addEventListener('click', function () {
        if (Home.sleep()) {
          Game.banner('Сладких снов ♥', 'в следующем забеге сердечек будет больше', 2.4);
          sleepAnim = 1.6;
          if (window.Sound) Sound.play('sleep');
        }
        render();
      });

      var menuBtn = document.getElementById('btn-home');
      if (menuBtn) menuBtn.addEventListener('click', function () { Home.open('menu'); });
    }
  };

  Home.restedPending = false;

  /** Списать пыль (у блюд и вещей, которые продаются только за неё). */
  function payDust(hero, n) {
    if (Shop.dust[hero] < n) return false;
    Shop.dust[hero] -= n;
    return true;
  }

  /* ========================================================================
   * DOM: панель с кнопками внизу экрана
   * ====================================================================== */
  function render() {
    var panel = document.getElementById('home-panel');
    if (!panel) return;

    // Верхняя строка: что действует прямо сейчас
    var status = document.getElementById('home-status');
    if (status) status.innerHTML = statusText();

    var sleepBtn = document.getElementById('home-sleep');
    if (sleepBtn) {
      sleepBtn.disabled = !Home.data.restReady;
      sleepBtn.textContent = Home.data.restReady ? '💤 Поспать' : '💤 Уже выспались';
    }

    var next = document.getElementById('home-next');
    // «На карту» — только после пройденного мира и только у хозяина комнаты
    if (next) next.hidden = (Home.openedFrom !== 'after') || !!(window.Online && Online.isGuest());
    var exitBtn = document.getElementById('home-exit');
    if (exitBtn) exitBtn.textContent = (window.Online && Online.active) ? 'В комнату' : 'В меню';

    // Вкладки разделов
    var tabs = document.getElementById('home-sections');
    if (tabs) {
      tabs.innerHTML = '';
      [['dinner', '🍲 Ужин'], ['build', '🏠 Обустройство'], ['wardrobe', '👗 Гардероб']].forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'shop-section' + (Home.section === pair[0] ? ' is-active' : '');
        b.textContent = pair[1];
        b.addEventListener('click', function () { Home.section = pair[0]; render(); });
        tabs.appendChild(b);
      });
    }

    // Вкладки героев — чей кошелёк тратим
    var who = document.getElementById('home-tabs');
    if (who) {
      who.innerHTML = '';
      [['omnom', 'Ам Ням'], ['cat', 'Кошечка']].forEach(function (pair) {
        var hero = pair[0];
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'shop-tab' + (Home.tab === hero ? ' is-active' : '') + ' tab-' + hero;
        b.innerHTML = '<img src="' + Assets.sprites[hero + '_base'].src + '" alt="">' +
          '<span class="tab-name">' + pair[1] + '</span>' +
          '<span class="tab-coins">🍬 ' + Shop.coins[hero] + '</span>' +
          '<span class="tab-dust">✦ ' + Shop.dust[hero] + '</span>';
        b.addEventListener('click', function () { Home.tab = hero; render(); });
        who.appendChild(b);
      });
    }

    panel.innerHTML = '';
    panel.className = 'home-panel is-' + Home.section;
    if (Home.section === 'dinner') renderDinner(panel);
    else if (Home.section === 'wardrobe') renderWardrobe(panel);
    else renderBuild(panel);
  }

  function statusText() {
    var out = [];
    ['omnom', 'cat'].forEach(function (hero) {
      var meal = Home.data.dinner[hero];
      if (!meal) return;
      var d = Home.dishById(meal.id);
      out.push('🍲 ' + (hero === 'omnom' ? 'Ам Ням' : 'Кошечка') + ': ' +
        (d.short || d.name) + ' ×' + meal.runs);
    });
    if (Home.restedPending) out.push('💤 выспались');
    return out.length ? out.join(' · ') : 'дома тихо и уютно';
  }

  /** Карточка с канвасной картинкой сверху. */
  function makeCard(drawFn, title, about, good) {
    var card = document.createElement('div');
    card.className = 'home-card';

    var cv = document.createElement('canvas');
    cv.width = 132; cv.height = 106;
    cv.className = 'home-pic';
    card.appendChild(cv);

    var h = document.createElement('b');
    h.className = 'home-name';
    h.textContent = title;
    card.appendChild(h);

    if (about) {
      var p = document.createElement('span');
      p.className = 'home-about';
      p.textContent = about;
      card.appendChild(p);
    }
    if (good) {
      var g = document.createElement('i');
      g.className = 'chip up home-good';
      g.textContent = good;
      card.appendChild(g);
    }

    var c = cv.getContext('2d');
    c.save();
    c.translate(cv.width / 2, cv.height / 2 + 6);
    c.scale(1.25, 1.25);
    c.lineJoin = 'round';
    drawFn(c);
    c.restore();
    return card;
  }

  /** Кнопка «или ✦ N», если цену можно заплатить пылью. */
  function addDustButton(card, hero, candyCost, onBuy) {
    if (!Shop.canPayDust(candyCost)) return;
    var need = Shop.dustPrice(candyCost);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'shop-dust-pay';
    b.innerHTML = 'или <b>✦ ' + need + '</b>';
    if (Shop.dust[hero] >= need) b.addEventListener('click', onBuy);
    else { b.disabled = true; b.classList.add('is-poor'); }
    card.appendChild(b);
  }

  function renderDinner(panel) {
    var hero = Home.tab;
    DISHES.forEach(function (d) {
      var buffText = buffLines(d.buff);
      var card = makeCard(d.draw, d.name, d.about, buffText);

      var meal = Home.data.dinner[hero];
      var eating = meal && meal.id === d.id;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-buy';

      if (eating) {
        btn.textContent = 'на столе · ещё ' + meal.runs;
        btn.disabled = true;
        btn.classList.add('is-owned');
      } else if (d.dust) {
        btn.textContent = '✦ ' + d.dust;
        if (Shop.dust[hero] >= d.dust) {
          btn.addEventListener('click', function () { if (Home.eat(hero, d.id, 'dust')) { eatAnim = 1.2; if (window.Sound) Sound.play('eat'); render(); } });
        } else { btn.disabled = true; btn.classList.add('is-poor'); }
      } else {
        var price = Home.dishPrice(d);
        btn.textContent = '🍬 ' + price;
        if (Shop.coins[hero] >= price) {
          btn.addEventListener('click', function () { if (Home.eat(hero, d.id, 'candy')) { eatAnim = 1.2; if (window.Sound) Sound.play('eat'); render(); } });
        } else { btn.disabled = true; btn.classList.add('is-poor'); }
      }
      card.appendChild(btn);

      if (!eating && !d.dust) {
        addDustButton(card, hero, Home.dishPrice(d), function () {
          if (Home.eat(hero, d.id, 'dust')) { eatAnim = 1.2; if (window.Sound) Sound.play('eat'); render(); }
        });
      }
      panel.appendChild(card);
    });
  }

  function buffLines(b) {
    var out = [];
    if (b.hp) out.push('+' + b.hp + ' ♥');
    if (b.damage) out.push('урон ×' + b.damage);
    if (b.speed) out.push('бег ×' + b.speed);
    if (b.atkSpeed) out.push('темп ×' + b.atkSpeed);
    if (b.magnet) out.push('магнит +' + b.magnet);
    return out.join(' · ');
  }

  function renderBuild(panel) {
    var hero = Home.tab;
    ITEMS.forEach(function (it) {
      var built = Home.has(it.id);
      var card = makeCard(it.draw, it.name, it.about, it.good);
      if (built) card.classList.add('is-built');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-buy';

      if (built) {
        btn.textContent = 'стоит дома ♥';
        btn.disabled = true;
        btn.classList.add('is-owned');
      } else if (it.dust) {
        btn.textContent = '✦ ' + it.dust;
        if (Shop.dust[hero] >= it.dust) {
          btn.addEventListener('click', function () { if (Home.build(hero, it.id, 'dust')) { buildAnim = 1.4; buy(); render(); } });
        } else { btn.disabled = true; btn.classList.add('is-poor'); }
      } else {
        btn.textContent = '🍬 ' + it.price;
        if (Shop.coins[hero] >= it.price) {
          btn.addEventListener('click', function () { if (Home.build(hero, it.id, 'candy')) { buildAnim = 1.4; buy(); render(); } });
        } else { btn.disabled = true; btn.classList.add('is-poor'); }
      }
      card.appendChild(btn);

      if (!built && !it.dust) {
        addDustButton(card, hero, it.price, function () {
          if (Home.build(hero, it.id, 'dust')) { buildAnim = 1.4; buy(); render(); }
        });
      }
      panel.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------------
   * Гардероб: наряды героя (js/wardrobe.js)
   * ---------------------------------------------------------------------- */
  function renderWardrobe(panel) {
    var hero = Home.tab;
    Wardrobe.listFor(hero).forEach(function (it) {
      var owned = Wardrobe.owned(hero, it.id);
      var worn = Wardrobe.wornId(hero) === it.id;

      var card = makeCard(function (c) {
        Wardrobe.drawIcon(c, hero, it.id, 0, 34, 74);
      }, it.name, it.about, it.good);
      if (worn) card.classList.add('is-built');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shop-buy';

      if (worn) {
        btn.textContent = 'надето ♥';
        btn.disabled = true;
        btn.classList.add('is-owned');
      } else if (owned) {
        btn.textContent = 'надеть';
        btn.classList.add('is-on');
        btn.addEventListener('click', function () {
          Wardrobe.wear(hero, it.id);
          dressAnim = 1.2;
          if (window.Sound) Sound.play('dress');
          render();
        });
      } else if (it.dust) {
        btn.textContent = '✦ ' + it.dust;
        if (Shop.dust[hero] >= it.dust) {
          btn.addEventListener('click', function () {
            if (Wardrobe.buy(hero, it.id, 'dust')) { dressAnim = 1.4; buy(); render(); }
          });
        } else { btn.disabled = true; btn.classList.add('is-poor'); }
      } else {
        btn.textContent = '🍬 ' + it.price;
        if (Shop.coins[hero] >= it.price) {
          btn.addEventListener('click', function () {
            if (Wardrobe.buy(hero, it.id, 'candy')) { dressAnim = 1.4; buy(); render(); }
          });
        } else { btn.disabled = true; btn.classList.add('is-poor'); }
      }
      card.appendChild(btn);

      if (!owned && !it.dust) {
        addDustButton(card, hero, it.price, function () {
          if (Wardrobe.buy(hero, it.id, 'dust')) { dressAnim = 1.4; buy(); render(); }
        });
      }
      panel.appendChild(card);
    });
  }

  function buy() { if (window.Sound) Sound.play('buy'); }

  /* ========================================================================
   * Комната на канвасе
   * ====================================================================== */
  // Комната подстраивается под панель с кнопками: вся обстановка и герои
  // всегда остаются ВЫШЕ неё, на каком бы экране игра ни открылась.
  var FLOOR = 150;      // где стена переходит в пол
  var BASE = 282;       // на этой линии стоят вещи и герои
  var eatAnim = 0, buildAnim = 0, sleepAnim = 0, dressAnim = 0;

  /** Докуда видно комнату: до верхнего края кнопок под ней. */
  function roomBottom() {
    var stage = document.getElementById('stage');
    var sec = document.getElementById('home-sections');
    if (!stage || !sec || !stage.offsetHeight) return 300;
    var y = (sec.offsetTop / stage.offsetHeight) * Game.H;
    return Math.max(160, Math.min(Game.H - 40, y));
  }

  Home.drawRoom = function (c) {
    var W = Game.W, H = Game.H;
    var t = Game.time;

    // Пересчитываем разметку комнаты под текущую высоту панели
    BASE = roomBottom() - 12;
    FLOOR = Math.max(64, BASE - 138);

    // Стена
    var wall = c.createLinearGradient(0, 0, 0, FLOOR);
    wall.addColorStop(0, '#ffeede');
    wall.addColorStop(1, '#ffe0cd');
    c.fillStyle = wall;
    c.fillRect(0, 0, W, FLOOR);

    // Обои в мелкую конфетку
    c.save();
    c.globalAlpha = 0.35;
    for (var wx = 30; wx < W; wx += 62) {
      for (var wy = 26; wy < FLOOR - 12; wy += 46) {
        var odd = ((wx / 62) | 0) % 2;
        c.fillStyle = odd ? '#ffc2dd' : '#ffd8a8';
        c.beginPath();
        c.arc(wx + odd * 18, wy, 4.5, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();

    // Плинтус и пол
    c.fillStyle = '#e8b98e';
    c.fillRect(0, FLOOR - 10, W, 14);
    var floor = c.createLinearGradient(0, FLOOR, 0, H);
    floor.addColorStop(0, '#d9a06a');
    floor.addColorStop(1, '#b97b45');
    c.fillStyle = floor;
    c.fillRect(0, FLOOR, W, H - FLOOR);

    // Доски пола — расходятся от середины, чтобы получилась глубина
    c.save();
    c.strokeStyle = 'rgba(120, 70, 30, 0.28)';
    c.lineWidth = 2;
    for (var i = -9; i <= 9; i++) {
      c.beginPath();
      c.moveTo(W / 2 + i * 42, FLOOR);
      c.lineTo(W / 2 + i * 128, H);
      c.stroke();
    }
    for (var k = 1; k < 6; k++) {
      var yy = FLOOR + k * k * 12;
      c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke();
    }
    c.restore();

    // Тёплый свет из окна (если окно куплено)
    if (Home.has('window')) {
      c.save();
      c.globalAlpha = 0.25;
      var g = c.createLinearGradient(700, FLOOR * 0.4, 520, BASE + 40);
      g.addColorStop(0, '#fff6c2');
      g.addColorStop(1, 'rgba(255,246,194,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(650, FLOOR * 0.78); c.lineTo(794, FLOOR * 0.78);
      c.lineTo(700, BASE + 40); c.lineTo(480, BASE + 40);
      c.closePath(); c.fill();
      c.restore();
    }

    // --- вещи на стене ---
    var wallY = FLOOR * 0.75;                 // повыше пола, пониже шапки
    if (Home.has('window')) atRoom(c, 722, wallY, 1.55, drawWindow);
    else atRoom(c, 722, wallY, 1.35, drawPicture);

    if (Home.has('shelf')) atRoom(c, 168, wallY, 1.35, drawShelf);
    if (Home.has('clock')) atRoom(c, 470, wallY * 0.85, 1.25, drawClock);
    if (Home.has('lamp')) atRoom(c, 566, wallY * 0.45 + Math.sin(t * 1.4) * 3, 1.5, drawLamp);
    if (Home.has('mirror')) atRoom(c, 292, wallY, 1.2, drawMirror);
    if (Home.has('trophy')) atRoom(c, 638, wallY, 1.1, drawTrophy);

    // --- вещи у стены: стоят дальше, поэтому их перекрывает всё, что ближе ---
    var backY = FLOOR + 34;                   // нижний край, у всех вещей низ на y=20
    if (Home.has('gramophone')) atRoom(c, 236, backY - 20 * 1.3, 1.3, drawGramophone);
    if (Home.has('aquarium')) atRoom(c, 362, backY - 20 * 1.35, 1.35, drawAquarium);
    if (Home.has('armchair')) atRoom(c, 582, backY - 20 * 1.5, 1.5, drawArmchair);
    if (Home.has('telescope')) atRoom(c, 904, backY - 20 * 1.4, 1.4, drawTelescope);

    // --- вещи на полу ---
    if (Home.has('mat')) atRoom(c, 448, BASE + 14, 2.3, drawMat);
    if (Home.has('stove')) atRoom(c, 84, BASE - 30, 1.8, drawStove);
    if (Home.has('table')) atRoom(c, 206, BASE - 16, 1.75, drawTable);
    if (Home.has('chest')) atRoom(c, 302, BASE - 6, 1.45, drawChest);
    if (Home.has('piggy')) atRoom(c, 610, BASE - 14, 1.5, drawPiggy);
    if (Home.has('bed')) atRoom(c, 828, BASE - 22, 2.1, drawBed);
    atRoom(c, 700, BASE - 44, 1.5, drawCloset);      // шкаф с нарядами стоит всегда
    if (Home.has('candyjar')) atRoom(c, 700, BASE - 104 - 20 * 1.1, 1.1, drawCandyJar);   // на шкафу
    if (Home.has('plant')) atRoom(c, 934, BASE - 20 * 1.4, 1.4, drawPlant);

    // Ужин на столике — видно, что приготовили
    ['omnom', 'cat'].forEach(function (hero, n) {
      var meal = Home.data.dinner[hero];
      if (!meal) return;
      var dish = Home.dishById(meal.id);
      if (dish) atRoom(c, 188 + n * 40, BASE - 56 + Math.sin(t * 2 + n) * 1.5, 0.85, dish.draw);
    });

    // --- герои ---
    drawHeroAt(c, 'omnom', 410, BASE, 1);
    drawHeroAt(c, 'cat', 498, BASE, -1);

    // Сердечки и звёздочки после покупки/ужина/сна
    ambient(c, t);
  };

  /** Нарисовать вещь в комнате с нужным масштабом. */
  function atRoom(c, x, y, s, fn) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.lineJoin = 'round';
    fn(c);
    c.restore();
  }

  /** Герой стоит дома и слегка покачивается. */
  function drawHeroAt(c, hero, x, y, facing) {
    var t = Game.time;
    var bob = Math.sin(t * 2 + (hero === 'cat' ? 1.2 : 0)) * 3;
    var sleeping = sleepAnim > 0;
    var costume = window.Wardrobe ? Wardrobe.wornId(hero) : 'base';

    Game.drawShadow(c, x, y + 2, 30);
    Game.drawSprite(c, Assets.spriteName(hero, costume), x, y + bob * 0.2, Assets.drawScale * 1.12, {
      flip: facing < 0,
      squashY: 1 + Math.sin(t * 2) * 0.02,
      rot: sleeping ? facing * 0.12 : 0
    });

    if (sleeping) {
      c.save();
      c.globalAlpha = Math.min(1, sleepAnim);
      c.fillStyle = '#8a6fb0';
      c.font = '900 20px Nunito, "Segoe UI", sans-serif';
      c.textAlign = 'center';
      c.fillText('zZ', x + facing * 26, y - 96 - (1.6 - sleepAnim) * 26);
      c.restore();
    }
  }

  /** Мелкие сердечки/звёздочки над домом после покупок. */
  function ambient(c, t) {
    var dt = 1 / 60;
    if (eatAnim > 0) eatAnim -= dt;
    if (buildAnim > 0) buildAnim -= dt;
    if (sleepAnim > 0) sleepAnim -= dt;
    if (dressAnim > 0) dressAnim -= dt;

    if (eatAnim > 0) puffs(c, 206, BASE - 66, '#ffb4d2', eatAnim, 1.2);
    if (buildAnim > 0) puffs(c, 470, FLOOR * 0.9, '#ffdf5e', buildAnim, 1.4);
    if (dressAnim > 0) {
      puffs(c, Home.tab === 'omnom' ? 410 : 498, BASE - 50, '#c9a6ff', dressAnim, 1.4);
    }
  }

  function puffs(c, x, y, color, life, full) {
    var k = 1 - life / full;
    c.save();
    c.globalAlpha = Math.max(0, life / full);
    c.fillStyle = color;
    for (var i = 0; i < 7; i++) {
      var a = i * 0.9;
      var r = 6 - i * 0.5;
      c.beginPath();
      c.arc(x + Math.cos(a) * (18 + k * 60), y - k * 70 + Math.sin(a) * 12, Math.max(1, r), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  /* ========================================================================
   * Картинки вещей и блюд. Все рисуются вокруг точки (0,0).
   * ====================================================================== */
  function box(c, x, y, w, h, r, fill, stroke) {
    Game.roundRect(c, x, y, w, h, r);
    c.fillStyle = fill; c.fill();
    if (stroke) { c.lineWidth = 3; c.strokeStyle = stroke; c.stroke(); }
  }

  function star5(c, x, y, r, color) {
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
    c.restore();
  }

  /* --- блюда --- */
  function drawSoup(c) {
    box(c, -22, -2, 44, 16, 7, '#fff4e2', '#c89a6a');       // тарелка
    c.beginPath();
    c.ellipse(0, -2, 21, 8, 0, Math.PI, 0);
    c.fillStyle = '#ffb0c8'; c.fill();
    c.beginPath(); c.ellipse(0, -2, 21, 8, 0, 0, Math.PI * 2);
    c.fillStyle = '#ff9fc4'; c.fill();
    c.strokeStyle = '#c46a92'; c.lineWidth = 2.5; c.stroke();
    star5(c, -6, -4, 3.5, '#fff3cf');
    star5(c, 7, -1, 3, '#fff3cf');
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; c.lineCap = 'round';
    for (var s = -1; s <= 1; s++) {
      c.beginPath();
      c.moveTo(s * 8, -12);
      c.quadraticCurveTo(s * 8 + 5, -20, s * 8, -27);
      c.stroke();
    }
  }

  function drawPie(c) {
    c.beginPath();
    c.moveTo(-24, 10); c.lineTo(24, 10);
    c.lineTo(18, -6); c.lineTo(-18, -6);
    c.closePath();
    c.fillStyle = '#e3b06a'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#a9762f'; c.stroke();
    box(c, -20, -14, 40, 10, 5, '#ffd8a8', '#a9762f');
    heart(c, -8, -12, 1.1, '#ff6f9f');
    heart(c, 8, -12, 1.1, '#ff6f9f');
    c.fillStyle = '#c23a66';
    c.beginPath(); c.arc(0, -14, 4, 0, Math.PI * 2); c.fill();
  }

  function drawPancakes(c) {
    box(c, -24, 8, 48, 8, 4, '#fff4e2', '#c89a6a');
    for (var i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(0, 4 - i * 8, 20 - i * 1.5, 6, 0, 0, Math.PI * 2);
      c.fillStyle = i % 2 ? '#f0c07a' : '#ffd79a';
      c.fill();
      c.lineWidth = 2.5; c.strokeStyle = '#b8830d'; c.stroke();
    }
    c.fillStyle = '#ffc93c';           // мёд стекает
    c.beginPath();
    c.moveTo(-14, -14);
    c.quadraticCurveTo(0, -22, 14, -14);
    c.quadraticCurveTo(10, -4, 6, -12);
    c.quadraticCurveTo(0, -2, -6, -12);
    c.quadraticCurveTo(-10, -4, -14, -14);
    c.closePath(); c.fill();
  }

  function drawCookie(c) {
    star5(c, 0, -4, 22, '#ffdf5e');
    c.lineWidth = 3; c.strokeStyle = '#c99a13';
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var rr = i % 2 ? 22 * 0.45 : 22;
      c.lineTo(Math.cos(a) * rr, -4 + Math.sin(a) * rr);
    }
    c.closePath(); c.stroke();
    c.fillStyle = '#8b5a2b';
    [[-6, -8], [5, -10], [0, 1], [8, -1]].forEach(function (p) {
      c.beginPath(); c.arc(p[0], p[1], 2.6, 0, Math.PI * 2); c.fill();
    });
  }

  /* --- вещи --- */
  function drawMat(c) {
    c.beginPath();
    c.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2);
    c.fillStyle = '#ff9fc4'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#d45d8e'; c.stroke();
    c.beginPath();
    c.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
    c.strokeStyle = '#fff0f6'; c.lineWidth = 3; c.stroke();
    heart(c, 0, 1, 1.1, '#ffffff');
  }

  function drawWindow(c) {
    box(c, -30, -26, 60, 52, 8, '#bfe9ff', '#8a6a4a');
    c.save();
    Game.roundRect(c, -30, -26, 60, 52, 8); c.clip();
    c.fillStyle = '#a8e6c4'; c.fillRect(-30, 6, 60, 20);      // лужок за окном
    c.fillStyle = '#ffe97a';
    c.beginPath(); c.arc(14, -12, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(-12, -8, 7, 0, Math.PI * 2);
    c.arc(-3, -8, 6, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.lineWidth = 4; c.strokeStyle = '#8a6a4a';
    c.beginPath(); c.moveTo(0, -26); c.lineTo(0, 26);
    c.moveTo(-30, 0); c.lineTo(30, 0); c.stroke();
    c.fillStyle = '#ffb4d2';                                   // занавески
    c.beginPath(); c.moveTo(-34, -30); c.quadraticCurveTo(-20, -4, -30, 22); c.lineTo(-38, -28); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(34, -30); c.quadraticCurveTo(20, -4, 30, 22); c.lineTo(38, -28); c.closePath(); c.fill();
  }

  function drawPicture(c) {
    box(c, -26, -20, 52, 40, 6, '#ffe6ef', '#c89a6a');
    heart(c, 0, 2, 2.2, '#ff8fb4');
    c.fillStyle = '#c89a6a';
    c.fillRect(-2, -30, 4, 10);
  }

  function drawTable(c) {
    box(c, -30, -8, 60, 10, 5, '#e8c08a', '#a9762f');
    c.fillStyle = '#c89a6a';
    c.fillRect(-24, 2, 7, 20);
    c.fillRect(17, 2, 7, 20);
    box(c, -14, -18, 28, 10, 4, '#ffffff', '#c89a6a');   // миска на столе
  }

  function drawPiggy(c) {
    c.beginPath();
    c.ellipse(0, 0, 24, 19, 0, 0, Math.PI * 2);
    c.fillStyle = '#ffb4d2'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#d45d8e'; c.stroke();
    c.beginPath(); c.ellipse(22, 2, 8, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#d45d8e';
    c.beginPath(); c.arc(24, 2, 2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(20, 2, 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffb4d2';
    for (var s = -1; s <= 1; s += 2) {
      c.beginPath();
      c.moveTo(s * 10, -16); c.lineTo(s * 4, -22); c.lineTo(s * 15, -21);
      c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = '#d45d8e'; c.stroke();
    }
    c.fillStyle = '#3a2b2e';
    c.beginPath(); c.arc(9, -5, 2.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c46a92';
    c.fillRect(-8, -19, 16, 4);                       // щель для монеток
    star5(c, -2, -28, 6, '#ffdf5e');
  }

  function drawStove(c) {
    box(c, -26, -30, 52, 58, 8, '#c9704a', '#7a3f26');
    box(c, -18, -14, 36, 28, 6, '#3b2210', '#7a3f26');
    c.fillStyle = '#ffb03a';                           // огонёк
    c.beginPath();
    c.moveTo(0, 12);
    c.quadraticCurveTo(-13, 2, -6, -6);
    c.quadraticCurveTo(-4, 2, 0, -10);
    c.quadraticCurveTo(4, 2, 6, -6);
    c.quadraticCurveTo(13, 2, 0, 12);
    c.closePath(); c.fill();
    c.fillStyle = '#ffe97a';
    c.beginPath();
    c.moveTo(0, 11); c.quadraticCurveTo(-6, 3, 0, -4); c.quadraticCurveTo(6, 3, 0, 11);
    c.closePath(); c.fill();
    box(c, -30, -38, 60, 10, 5, '#e8b98e', '#7a3f26');  // плита сверху
    c.fillStyle = '#8a6a4a';
    c.beginPath(); c.ellipse(-10, -42, 9, 4, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(11, -42, 9, 4, 0, 0, Math.PI * 2); c.fill();
  }

  function drawBed(c) {
    box(c, -40, -6, 80, 22, 7, '#c9a6ff', '#6a55c9');     // основание
    box(c, -44, -24, 22, 30, 8, '#b3a4ff', '#6a55c9');    // спинка
    box(c, 24, -14, 20, 22, 8, '#b3a4ff', '#6a55c9');
    box(c, -38, -16, 34, 14, 7, '#ffffff', '#cdd8ff');    // подушка
    box(c, -6, -12, 44, 12, 6, '#ffd7f0', '#d45d9e');     // одеяло
    heart(c, 16, -6, 1.2, '#ffffff');
    c.fillStyle = '#6a55c9';
    c.fillRect(-40, 16, 6, 10);
    c.fillRect(34, 16, 6, 10);
  }

  function drawShelf(c) {
    box(c, -34, 4, 68, 8, 4, '#c89a6a', '#8a6a4a');
    var cols = ['#ff9fc4', '#8fd6ff', '#ffdf5e', '#a8e6c4', '#c9a6ff'];
    for (var i = 0; i < 5; i++) {
      var hh = 20 + (i % 3) * 5;
      box(c, -30 + i * 12, 4 - hh, 9, hh, 2, cols[i], '#8a6a4a');
    }
    star5(c, 26, -8, 6, '#ffdf5e');
  }

  function drawClock(c) {
    c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2);
    c.fillStyle = '#fff4e2'; c.fill();
    c.lineWidth = 4; c.strokeStyle = '#a9762f'; c.stroke();
    c.strokeStyle = '#5b3b3f'; c.lineWidth = 3; c.lineCap = 'round';
    var t = Game.time;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t - 1.57) * 11, Math.sin(t - 1.57) * 11); c.stroke();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t * 0.2 - 1.57) * 7, Math.sin(t * 0.2 - 1.57) * 7); c.stroke();
    c.fillStyle = '#a9762f';
    c.beginPath();
    c.moveTo(-14, -20); c.lineTo(0, -34); c.lineTo(14, -20);
    c.closePath(); c.fill();
    c.fillStyle = '#8fd14f';                         // кукушка выглядывает
    c.beginPath(); c.arc(0, -24, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2b2e';
    c.beginPath(); c.arc(-2, -25, 1.6, 0, Math.PI * 2); c.fill();
  }

  function drawChest(c) {
    box(c, -28, -6, 56, 24, 5, '#a9762f', '#5b3b25');
    c.beginPath();
    c.moveTo(-28, -6);
    c.quadraticCurveTo(0, -32, 28, -6);
    c.closePath();
    c.fillStyle = '#c89a6a'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#5b3b25'; c.stroke();
    c.fillStyle = '#ffdf5e';
    c.fillRect(-5, -10, 10, 14);
    c.fillStyle = '#5b3b25';
    c.beginPath(); c.arc(0, -3, 2.4, 0, Math.PI * 2); c.fill();
    // рукоятки мечей торчат наружу
    c.strokeStyle = '#8a6a4a'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-14, -14); c.lineTo(-20, -28); c.stroke();
    c.beginPath(); c.moveTo(13, -14); c.lineTo(20, -30); c.stroke();
    c.strokeStyle = '#cdd8ff'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-23, -24); c.lineTo(-17, -27); c.stroke();
    c.beginPath(); c.moveTo(17, -26); c.lineTo(23, -29); c.stroke();
  }

  function drawCloset(c) {
    box(c, -26, -34, 52, 68, 6, '#c89a6a', '#8a6a4a');
    c.lineWidth = 3; c.strokeStyle = '#8a6a4a';
    c.beginPath(); c.moveTo(0, -34); c.lineTo(0, 34); c.stroke();
    c.fillStyle = '#ffdf5e';
    c.beginPath(); c.arc(-5, 0, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(5, 0, 3, 0, Math.PI * 2); c.fill();
    box(c, -30, -40, 60, 8, 4, '#e8b98e', '#8a6a4a');
    heart(c, -13, -18, 1.1, '#ff9fc4');
    star5(c, 13, -18, 5, '#8fd6ff');
  }

  function drawLamp(c) {
    c.strokeStyle = '#a9762f'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -40); c.lineTo(0, -14); c.stroke();
    star5(c, 0, 2, 20, '#ffdf5e');
    c.save();
    c.globalAlpha = 0.5;
    star5(c, 0, 2, 26, '#fff3b0');
    c.restore();
    star5(c, -22, -6, 5, '#ffffff');
    star5(c, 23, 4, 4, '#ffffff');
  }

  /* --- вещи второй очереди: у напольных низ на y=20 --- */
  function drawPlant(c) {
    [[-0.7, 26], [0, 32], [0.7, 26], [-0.35, 22], [0.35, 22]].forEach(function (l) {
      c.save(); c.rotate(l[0]);
      c.beginPath(); c.ellipse(0, -l[1] * 0.6, 6, l[1] * 0.55, 0, 0, Math.PI * 2);
      c.fillStyle = '#7ccf5e'; c.fill();
      c.lineWidth = 2.5; c.strokeStyle = '#3f8a35'; c.stroke();
      c.restore();
    });
    c.fillStyle = '#ff8fb4';                         // цветочек сверху
    for (var i = 0; i < 5; i++) {
      var a = i * Math.PI * 2 / 5;
      c.beginPath(); c.arc(Math.cos(a) * 5, -34 + Math.sin(a) * 5, 4.5, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#ffdf5e';
    c.beginPath(); c.arc(0, -34, 3.5, 0, Math.PI * 2); c.fill();
    c.beginPath();                                   // горшок
    c.moveTo(-16, 0); c.lineTo(16, 0); c.lineTo(11, 20); c.lineTo(-11, 20);
    c.closePath();
    c.fillStyle = '#e07a4f'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#8a4526'; c.stroke();
    box(c, -18, -4, 36, 8, 3, '#f09a6a', '#8a4526');
    heart(c, 0, 12, 0.8, '#ffe0cd');
  }

  function drawArmchair(c) {
    box(c, -26, -30, 52, 36, 12, '#ff9fc4', '#b84a78');   // спинка
    box(c, -24, -2, 48, 16, 6, '#ffb4d2', '#b84a78');     // сиденье
    box(c, -32, -12, 12, 28, 6, '#ff8fb4', '#b84a78');    // подлокотники
    box(c, 20, -12, 12, 28, 6, '#ff8fb4', '#b84a78');
    c.fillStyle = '#8a4526';
    c.fillRect(-26, 16, 5, 4);
    c.fillRect(21, 16, 5, 4);
    box(c, -10, -22, 20, 16, 6, '#fff4e2', '#d9a06a');    // подушечка
    heart(c, 0, -14, 0.9, '#ff6f9d');
  }

  function drawMirror(c) {
    c.beginPath(); c.ellipse(0, 0, 20, 27, 0, 0, Math.PI * 2);
    c.fillStyle = '#ffd23c'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#a9762f'; c.stroke();
    c.beginPath(); c.ellipse(0, 0, 14, 21, 0, 0, Math.PI * 2);
    c.fillStyle = '#d6f1ff'; c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-6, -10); c.lineTo(2, -16); c.stroke();
    c.beginPath(); c.moveTo(-6, -3); c.lineTo(6, -12); c.stroke();
    heart(c, 0, -30, 1.1, '#ff6f9d');
  }

  function drawGramophone(c) {
    var t = Game.time || 0;
    box(c, -20, 2, 40, 18, 4, '#c89a6a', '#7a4b26');      // ящик
    c.beginPath(); c.ellipse(0, 2, 17, 5, 0, 0, Math.PI * 2);   // пластинка
    c.fillStyle = '#3a2b2e'; c.fill();
    c.fillStyle = '#ff6f9d';
    c.beginPath(); c.ellipse(0, 2, 5, 2, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#a9762f'; c.lineWidth = 3; c.lineCap = 'round';   // трубка
    c.beginPath(); c.moveTo(12, 2); c.quadraticCurveTo(14, -12, 2, -16); c.stroke();
    c.beginPath();                                    // раструб
    c.moveTo(2, -12); c.lineTo(-10, -40); c.quadraticCurveTo(-26, -40, -30, -24);
    c.closePath();
    c.fillStyle = '#ffd23c'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#a9762f'; c.stroke();
    c.fillStyle = '#8a5ad0';                          // ноты улетают вверх
    for (var i = 0; i < 2; i++) {
      var k = (t * 0.5 + i * 0.5) % 1;
      c.save();
      c.globalAlpha = 1 - k;
      c.translate(-24 - k * 10 + i * 8, -40 - k * 22);
      c.beginPath(); c.ellipse(0, 0, 3.5, 2.6, -0.4, 0, Math.PI * 2); c.fill();
      c.fillRect(2.5, -11, 1.8, 11);
      c.restore();
    }
  }

  function drawAquarium(c) {
    var t = Game.time || 0;
    c.fillStyle = '#8a6a4a';                          // тумбочка
    c.fillRect(-22, 8, 6, 12);
    c.fillRect(16, 8, 6, 12);
    box(c, -28, 2, 56, 8, 3, '#c89a6a', '#8a6a4a');
    box(c, -26, -32, 52, 34, 6, 'rgba(143, 214, 255, 0.85)', '#5b8fb0');
    c.save();
    Game.roundRect(c, -26, -32, 52, 34, 6); c.clip();
    c.fillStyle = '#ffe0a8'; c.fillRect(-26, -4, 52, 8);          // песочек
    c.strokeStyle = '#5fae4a'; c.lineWidth = 3; c.lineCap = 'round';   // водоросли
    c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(-20 + Math.sin(t * 2) * 3, -12, -15, -22); c.stroke();
    c.beginPath(); c.moveTo(18, 0); c.quadraticCurveTo(14 + Math.sin(t * 2 + 1) * 3, -8, 19, -16); c.stroke();
    [['#ff9a3c', -20, 1], ['#ff6f9d', -10, -1]].forEach(function (f, i) {
      var x = Math.sin(t * 0.8 + i * 2) * 14;
      var dir = Math.cos(t * 0.8 + i * 2) >= 0 ? 1 : -1;
      c.save(); c.translate(x, f[1] + Math.sin(t * 2 + i) * 2); c.scale(dir, 1);
      c.beginPath(); c.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
      c.fillStyle = f[0]; c.fill();
      c.beginPath(); c.moveTo(-5, 0); c.lineTo(-10, -4); c.lineTo(-10, 4); c.closePath(); c.fill();
      c.fillStyle = '#3a2b2e';
      c.beginPath(); c.arc(3, -1, 1.2, 0, Math.PI * 2); c.fill();
      c.restore();
    });
    c.fillStyle = 'rgba(255,255,255,0.8)';            // пузырьки
    for (var b = 0; b < 3; b++) {
      var k = (t * 0.6 + b / 3) % 1;
      c.beginPath(); c.arc(8 + b * 3, -2 - k * 28, 1.8, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  function drawCandyJar(c) {
    box(c, -18, -18, 36, 38, 10, 'rgba(230, 246, 255, 0.9)', '#8fb4cc');   // стекло
    var cols = ['#ff6f9d', '#ffdf5e', '#8fd6ff', '#a8e6c4', '#c9a6ff', '#ff9a3c'];
    [[-9, 12], [0, 13], [9, 12], [-5, 5], [5, 5], [-10, -2], [1, -3], [10, -1]].forEach(function (p, i) {
      c.beginPath(); c.arc(p[0], p[1], 4.2, 0, Math.PI * 2);
      c.fillStyle = cols[i % cols.length]; c.fill();
    });
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-12, -10); c.lineTo(-12, 4); c.stroke();
    box(c, -14, -26, 28, 9, 4, '#ff8fb4', '#b84a78');    // крышка
    c.fillStyle = '#b84a78';
    c.beginPath(); c.arc(0, -28, 4, 0, Math.PI * 2); c.fill();
  }

  function drawTelescope(c) {
    c.strokeStyle = '#8a6a4a'; c.lineWidth = 4; c.lineCap = 'round';   // тренога
    c.beginPath();
    c.moveTo(0, -6); c.lineTo(-14, 20);
    c.moveTo(0, -6); c.lineTo(14, 20);
    c.moveTo(0, -6); c.lineTo(0, 20);
    c.stroke();
    c.save();
    c.translate(0, -8); c.rotate(-0.55);              // труба смотрит в небо
    box(c, -26, -7, 40, 14, 5, '#6a55c9', '#3f2f8a');
    box(c, 12, -9, 16, 18, 4, '#ffd23c', '#a9762f');
    box(c, -32, -4, 8, 8, 3, '#ffd23c', '#a9762f');
    c.restore();
    star5(c, 26, -36, 6, '#ffdf5e');
    star5(c, 12, -44, 3.5, '#ffffff');
  }

  function drawTrophy(c) {
    c.strokeStyle = '#c99a13'; c.lineWidth = 4;       // ручки
    c.beginPath(); c.arc(-18, -12, 7, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
    c.beginPath(); c.arc(18, -12, 7, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
    c.beginPath();                                    // чаша
    c.moveTo(-18, -22); c.lineTo(18, -22);
    c.quadraticCurveTo(18, 4, 0, 6);
    c.quadraticCurveTo(-18, 4, -18, -22);
    c.closePath();
    c.fillStyle = '#ffd23c'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#a9762f'; c.stroke();
    c.fillStyle = '#e0a800';
    c.fillRect(-3, 6, 6, 8);
    box(c, -14, 14, 28, 8, 3, '#c89a6a', '#7a4b26');   // подставка
    star5(c, 0, -10, 8, '#ffffff');
    star5(c, -22, -30, 4, '#fff3b0');
  }

  window.Home = Home;
})();

