/* ============================================================================
 * js/upgrades.js — прокачка героев. Её две разновидности:
 *
 * 1) КАРТОЧКА ЗАБЕГА. Ровно один раз за партию, примерно на середине волн,
 *    игра замирает и каждому герою предлагают три случайные карточки на выбор.
 *    Взятое действует до конца партии и на выходе пропадает.
 *
 * 2) ПОСТОЯННЫЕ УЛУЧШЕНИЯ («Улучшения» в лавке). Покупаются за конфеты героя
 *    (волшебная палочка — за звёздную пыль), стоят дорого и остаются навсегда.
 *
 * Все множители складываются так: сначала оружие, потом постоянные улучшения,
 * потом карточка забега — этим занимается Upgrades.recalc.
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * Постоянные улучшения. Цены нарочно высокие: это прокачка навсегда.
   * За полный забег герой приносит примерно 50–60 конфет.
   * ---------------------------------------------------------------------- */
  var PERKS = [
    {
      id: 'power', name: 'Сила удара', icon: '💪',
      desc: '+8% урона за уровень',
      prices: [120, 200, 320, 480, 700],
      apply: function (p, l) { p.damageMul *= 1 + 0.08 * l; }
    },
    {
      id: 'tempo', name: 'Темп ударов', icon: '⚡',
      desc: '+6% скорости ударов за уровень',
      prices: [110, 180, 290, 440, 640],
      apply: function (p, l) { p.atkSpeed *= 1 + 0.06 * l; }
    },
    {
      id: 'boots', name: 'Быстрые лапки', icon: '👟',
      desc: '+5% скорости бега за уровень',
      prices: [90, 150, 240, 360, 520],
      apply: function (p, l) { p.speed *= 1 + 0.05 * l; }
    },
    {
      id: 'heart', name: 'Крепкое сердце', icon: '❤',
      desc: '+1 сердечко за уровень',
      prices: [150, 260, 420, 650],
      apply: function (p, l) { p.maxHp += l; }
    },
    {
      id: 'reach', name: 'Размах', icon: '🌀',
      desc: '+5% радиуса взмаха за уровень',
      prices: [100, 170, 280, 430],
      apply: function (p, l) { p.swingRadius *= 1 + 0.05 * l; }
    },
    {
      // Суперприём сам по себе — один раз за забег. Прокачка делает его сильнее,
      // шкалу быстрее, а на 2-м и 4-м уровне даёт ещё по разу за забег
      id: 'super', name: 'Суперприём', icon: '🌟',
      desc: 'сильнее и быстрее шкала; на 2 и 4 ур. +1 раз за забег',
      prices: [160, 280, 450, 700],
      apply: function (p, l) {
        p.superMul *= 1 + 0.2 * l;
        p.superFill *= 1 + 0.15 * l;
        p.superCharges += (l >= 2 ? 1 : 0) + (l >= 4 ? 1 : 0);
      }
    },
    {
      id: 'wand', name: 'Волшебная палочка', icon: '✦',
      desc: 'удар ещё и стреляет звёздочкой',
      dust: [6, 10, 16],          // за звёздную пыль, а не за конфеты
      apply: function (p, l) { p.wand = Math.max(p.wand, l); }
    }
  ];

  /* ------------------------------------------------------------------------
   * Карточки забега — сильнее постоянных, но живут одну партию
   * ---------------------------------------------------------------------- */
  var CARDS = [
    { id: 'rage', name: 'Боевой задор', icon: '💥', desc: '+30% урона до конца забега',
      apply: function (p) { p.damageMul *= 1.3; } },
    { id: 'swift', name: 'Ветер в лапках', icon: '💨', desc: '+20% скорости бега',
      apply: function (p) { p.speed *= 1.2; } },
    { id: 'heart', name: 'Второе дыхание', icon: '❤', desc: '+2 сердечка и полное лечение',
      apply: function (p) { p.maxHp += 2; p.healFull = true; } },
    { id: 'tempo', name: 'Быстрые взмахи', icon: '⚡', desc: '+25% скорости ударов',
      apply: function (p) { p.atkSpeed *= 1.25; } },
    { id: 'reach', name: 'Широкий размах', icon: '🌀', desc: '+20% радиуса взмаха',
      apply: function (p) { p.swingRadius *= 1.2; } },
    { id: 'wand', name: 'Волшебная палочка', icon: '✦', desc: 'удар ещё и стреляет звёздочкой',
      apply: function (p) { p.wand = Math.max(1, p.wand + 1); } },
    { id: 'magnet', name: 'Сладкий магнит', icon: '🍬', desc: 'конфеты слетаются издалека',
      apply: function (p) { p.magnet *= 1.9; } },
    { id: 'knock', name: 'Тяжёлая лапка', icon: '🔨', desc: '+60% отбрасывания',
      apply: function (p) { p.knockMul *= 1.6; } }
  ];

  var Upgrades = {
    perks: PERKS,
    cards: CARDS,

    offersLeft: 1,       // сколько раз ещё предложат карточку в этом забеге
    queue: [],           // кому ещё выбирать (в режиме «Двое» — по очереди)
    choices: [],         // три карточки, которые сейчас на экране

    /** Новый забег: карточки забега забываются. */
    resetRun: function () {
      // Полка с книжками дома даёт вторую карточку за забег
      Upgrades.offersLeft = window.Home ? Home.offers() : 1;
      Upgrades.queue = [];
      Upgrades.choices = [];
      Upgrades.netOffer = null;       // карточки напарника (у хозяина)
      Upgrades.guestChoice = null;    // свои карточки (у гостя)
    },

    perkById: function (id) {
      for (var i = 0; i < PERKS.length; i++) if (PERKS[i].id === id) return PERKS[i];
      return null;
    },

    cardById: function (id) {
      for (var i = 0; i < CARDS.length; i++) if (CARDS[i].id === id) return CARDS[i];
      return null;
    },

    /** Сколько уровней у постоянного улучшения. */
    maxLevel: function (perk) {
      return (perk.prices || perk.dust).length;
    },

    /** Цена следующего уровня (и в чём она — в конфетах или в пыли). */
    nextCost: function (perk, level) {
      if (level >= Upgrades.maxLevel(perk)) return null;
      return perk.dust
        ? { dust: perk.dust[level] }
        : { candy: perk.prices[level] };
    },

    /* ----------------------------------------------------------------------
     * Пересчёт характеристик героя: оружие → постоянные улучшения → карточка
     * -------------------------------------------------------------------- */
    recalc: function (p) {
      var hero = p.hero;
      var base = Players.BASE;

      // Базовое состояние
      p.speed = base.speed;
      p.maxHp = base.maxHp;
      p.baseSwingRadius = base.swingRadius;
      p.magnet = 1;
      p.wand = 0;
      p.dodge = 0;
      p.crit = 0;
      p.healFull = false;
      p.noSlow = false;
      p.superMul = 1;        // суперприём: сила, скорость шкалы и сколько раз за забег
      p.superFill = 1;
      p.superCharges = 1;

      // 1) оружие из лавки
      Weapons.equip(p, Shop.equipped[hero], Shop.levelOf(hero, Shop.equipped[hero]));

      // 2) надетая экипировка
      Equipment.apply(p);

      // 3) постоянные улучшения
      for (var i = 0; i < PERKS.length; i++) {
        var lvl = Shop.perkLevel(hero, PERKS[i].id);
        if (lvl > 0) PERKS[i].apply(p, lvl);
      }

      // 4) карточка, взятая в этом забеге
      for (var j = 0; j < p.runCards.length; j++) {
        var card = Upgrades.cardById(p.runCards[j]);
        if (card) card.apply(p);
      }

      // 5) наряд из гардероба — он же решает, каким спрайтом рисовать героя
      if (window.Wardrobe) Wardrobe.apply(p);

      // 6) домашнее: ужин, крепкий сон и уют (js/home.js)
      if (window.Home) Home.applyRun(p);

      if (p.healFull) { p.hp = p.maxHp; p.healFull = false; }
      p.hp = Math.min(p.hp, p.maxHp);
    },

    /* ----------------------------------------------------------------------
     * Предложить карточку (вызывается из enemies.js на середине забега)
     * -------------------------------------------------------------------- */
    offer: function () {
      if (Upgrades.offersLeft <= 0 || Game.state !== 'playing') return;
      Upgrades.offersLeft--;

      // ИИ выбирает сам, живые игроки — по очереди,
      // а напарнику по сети карточки уезжают на его телефон
      var net = !!(window.Online && Online.isHost());
      Upgrades.queue = [];
      Upgrades.netOffer = null;
      for (var i = 0; i < Players.list.length; i++) {
        var p = Players.list[i];
        if (p.isAI) { aiPick(p); continue; }
        if (p.isRemote && net) {
          var three = pickThree();
          Upgrades.netOffer = { player: p, cards: three, picked: false };
          Online.offerCards(three.map(function (c) { return c.id; }));
          continue;
        }
        Upgrades.queue.push(p);
      }

      if (window.Sound) Sound.play('levelup');
      if (!Upgrades.queue.length && !Upgrades.netOffer) return;   // все под ИИ — экран не нужен

      // Вдвоём игра стоит у обоих, пока карточки не выберут оба
      Game.state = 'levelup';
      if (Upgrades.queue.length) showNext();
      else {
        renderCards(Players.p1, [], null);
        setWait('Ожидание второго игрока…');
        Game.showScreen('levelup');
        document.getElementById('topbar').hidden = true;
      }
    },

    /** Взять карточку (по номеру из показанных). */
    pick: function (index) {
      if (Game.state !== 'levelup') return;
      var p = Upgrades.queue[0];
      var card = Upgrades.choices[index];
      if (!p || !card) return;

      applyCard(p, card);

      Upgrades.queue.shift();
      if (Upgrades.queue.length) { showNext(); return; }

      var offer = Upgrades.netOffer;
      if (offer) {
        Online.tellCardPicked();
        if (!offer.picked) {
          markPicked(index);
          setWait('Ожидание второго игрока…');
          return;
        }
      }
      resume();
    }
  };

  /** Карточка начинает действовать. */
  function applyCard(p, card) {
    p.runCards.push(card.id);
    Upgrades.recalc(p);
    Combat.floatText(p.x, p.y - 90, card.name + '!', p.color);
    Combat.particles(p.x, p.y - 40, p.color, 18, { speed: 150, star: true });
  }

  /** Все выбрали — игра идёт дальше (у хозяина или без сети). */
  function resume() {
    var wasNet = !!Upgrades.netOffer;
    Upgrades.netOffer = null;
    setWait('');
    Game.state = 'playing';
    Game.showScreen(null);
    document.getElementById('topbar').hidden = false;
    if (wasNet && window.Online) Online.command('cardsDone');
  }

  /* ------------------------------------------------------------------------
   * Сетевая игра: карточку напарника выбирает он сам, на своём телефоне.
   * Игра продолжается, только когда выбор сделали оба, — кто выбрал первым,
   * видит «Ожидание второго игрока…».
   * ---------------------------------------------------------------------- */

  /** Хозяину пришёл выбор напарника. */
  Upgrades.netPick = function (p, index) {
    var offer = Upgrades.netOffer;
    if (!offer || offer.player !== p || offer.picked) return;
    offer.picked = true;
    applyCard(p, offer.cards[index] || offer.cards[0]);

    if (Game.state === 'levelup' && !Upgrades.queue.length) resume();
    else setWait('Напарник уже выбрал ✓ — теперь ваша очередь');
  };

  /** Гостю показали три карточки — он выбирает и отвечает хозяину. */
  Upgrades.showNetChoice = function (ids, done) {
    var cards = ids.map(function (id) { return Upgrades.cardById(id); }).filter(Boolean);
    if (!cards.length) return;

    var p = (window.Online && Online.localPlayer()) || Players.p1;
    Upgrades.guestChoice = { cards: cards, done: done, picked: false };
    Game.state = 'levelup';            // пока выбираем, свой герой стоит — как у хозяина

    renderCards(p, cards, function (i) { Upgrades.guestPick(i); });
    setWait('');
    Game.showScreen('levelup');
    document.getElementById('topbar').hidden = true;
    if (window.Sound) Sound.play('levelup');
  };

  /** Гость выбрал карточку. */
  Upgrades.guestPick = function (i) {
    var g = Upgrades.guestChoice;
    if (!g || g.picked || !g.cards[i]) return;
    g.picked = true;
    g.done(i);
    markPicked(i);
    setWait('Ожидание второго игрока…');
  };

  /** Гостю: хозяин свою карточку уже выбрал. */
  Upgrades.mateChose = function () {
    var g = Upgrades.guestChoice;
    if (g && !g.picked) setWait('Напарник уже выбрал ✓ — теперь ваша очередь');
  };

  /** Гостю: выбрали оба — игра идёт дальше. */
  Upgrades.netDone = function () {
    Upgrades.guestChoice = null;
    setWait('');
    if (Game.state !== 'levelup') return;
    Game.state = 'playing';
    Game.showScreen(null);
    document.getElementById('topbar').hidden = false;
  };

  /** Строка под карточками: кого ждём. */
  function setWait(text) {
    var el = document.getElementById('levelup-wait');
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
  }

  /** Отметить выбранную карточку, остальные погасить. */
  function markPicked(index) {
    var list = document.getElementById('levelup-cards');
    if (!list) return;
    list.classList.add('is-done');
    if (list.children[index]) list.children[index].classList.add('is-picked');
  }

  /** ИИ берёт случайную карточку из трёх. */
  function aiPick(p) {
    var three = pickThree();
    var card = three[(Math.random() * three.length) | 0];
    p.runCards.push(card.id);
    Upgrades.recalc(p);
    Combat.floatText(p.x, p.y - 90, card.name + '!', p.color);
  }

  /** Три разные случайные карточки. */
  function pickThree() {
    var pool = CARDS.slice();
    var out = [];
    for (var i = 0; i < 3 && pool.length; i++) {
      out.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    }
    return out;
  }

  /* ------------------------------------------------------------------------
   * Экран выбора
   * ---------------------------------------------------------------------- */
  function showNext() {
    var p = Upgrades.queue[0];
    Upgrades.choices = pickThree();
    renderCards(p, Upgrades.choices, function (i) { Upgrades.pick(i); });
    setWait(Upgrades.netOffer && Upgrades.netOffer.picked ? 'Напарник уже выбрал ✓ — теперь ваша очередь' : '');
    Game.showScreen('levelup');
    document.getElementById('topbar').hidden = true;
  }

  /** Три карточки на экране; onPick(i) — что делать при нажатии. */
  function renderCards(p, cards, onPick) {
    var who = document.getElementById('levelup-who');
    var list = document.getElementById('levelup-cards');
    if (!who || !list) return;

    who.innerHTML = '<img src="' + Assets.sprites[p.hero + '_base'].src + '" alt="">' +
      '<span><b>' + p.name + '</b>, выбери награду</span>';

    list.innerHTML = '';
    list.classList.remove('is-done');
    cards.forEach(function (card, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl-card lvl-' + p.hero;
      b.innerHTML =
        '<i class="lvl-num">' + (i + 1) + '</i>' +
        '<span class="lvl-icon">' + card.icon + '</span>' +
        '<b class="lvl-name">' + card.name + '</b>' +
        '<span class="lvl-desc">' + card.desc + '</span>';
      b.addEventListener('click', function () { onPick(i); });
      list.appendChild(b);
    });
  }

  /** Клавиши 1/2/3 на экране выбора. */
  Upgrades.handleKeys = function () {
    if (Game.state !== 'levelup') return;
    var pick = Upgrades.guestChoice ? Upgrades.guestPick : Upgrades.pick;
    if (Game.pressed.Digit1 || Game.pressed.Numpad1) pick(0);
    else if (Game.pressed.Digit2 || Game.pressed.Numpad2) pick(1);
    else if (Game.pressed.Digit3 || Game.pressed.Numpad3) pick(2);
  };

  window.Upgrades = Upgrades;
})();

