/* ============================================================================
 * js/online.js — игра вдвоём по сети, каждый со своего телефона.
 *
 * Игра только вдвоём, каждый со своего устройства:
 *   • первый нажимает «Играть вдвоём» → «Создать комнату», выбирает героя
 *     и отправляет второму код или ссылку;
 *   • второй открывает ссылку (или вводит код) — ему достаётся второй герой;
 *   • когда связь есть, любой из двоих выбирает мир и предлагает начать,
 *     второй отвечает «Да» или «Нет» — забег стартует, только если согласны оба;
 *   • если связь рвётся, игра останавливается и оба возвращаются в ту же
 *     комнату: как только напарник подключится снова, можно продолжать.
 *
 * Как это работает внутри:
 *   Слизней, урон, конфеты и волны считает ОДИН телефон — тот, кто создал
 *   комнату («хозяин»). Он 20 раз в секунду отправляет гостю картинку мира.
 *   Своего героя гость ведёт сам, прямо у себя: управление отзывается
 *   мгновенно, а хозяину уходят только координаты героя и его удары.
 *   Картинка мира и управление летят по «быстрому» каналу, который не ждёт
 *   потерянных посылок, — поэтому у гостя игра идёт так же плавно, как у хозяина.
 *
 *   Прогресс у двоих общий: конфеты, пыль, оружие, домик и пройденные миры —
 *   одно сохранение на двоих. Его ведёт хозяин и отправляет гостю, а гость
 *   хранит копию в своём браузере. Покупки гостя выполняются у хозяина.
 *   При встрече берётся более свежее сохранение, а если вы играете вместе
 *   впервые — то, где пройдено больше.
 * ========================================================================== */
(function () {
  'use strict';

  var SNAP_HZ = 20;          // сколько раз в секунду хозяин шлёт картинку мира
  var INPUT_HZ = 30;         // как часто гость шлёт, где его герой
  var SAVE_EVERY = 4;        // раз в сколько секунд хозяин сохраняет забег
  var SAVE_SEND_GAP = 8000;  // во время забега сохранение уезжает гостю не чаще (мс)
  var SHOP_HOLD_MAX = 60;    // сколько секунд перерыв ждёт того, кто в лавке

  var Online = {
    active: false,          // идёт ли сетевая игра
    role: 'off',            // 'host' | 'guest'
    myHero: 'omnom',        // за кого играю я
    mateHero: 'cat',        // за кого играет напарник
    ready: false,           // напарник на связи
    mateInShop: false,      // напарник заглянул в лавку посреди забега
    lastError: '',

    // Герой напарника (у хозяина): где стоит, куда смотрит, сколько ударов ждёт
    remoteInput: { px: null, py: null, vx: 0, vy: 0, f: 1, ax: 0, ay: 0, atk: 0, atkAge: 0 },

    isHost: function () { return Online.active && Online.role === 'host'; },
    isGuest: function () { return Online.active && Online.role === 'guest'; },

    /** Герой, которым управляет этот телефон. */
    localPlayer: function () {
      return Online.myHero === 'omnom' ? Players.p1 : Players.p2;
    },
    matePlayer: function () {
      return Online.myHero === 'omnom' ? Players.p2 : Players.p1;
    }
  };

  var snapTimer = 0, inputTimer = 0, saveTimer = 0;
  var notice = '';                  // что сказать в комнате (связь прервалась и т.п.)
  var ghosts = {};                  // слизни у гостя (по номеру)

  // Номера посылок: быстрый канал может перепутать порядок — старое не берём
  var snapSeq = 0, lastSnap = 0;    // картинка мира: у хозяина / у гостя
  var inputSeq = 0, lastInput = 0;  // герой гостя: у гостя / у хозяина
  var attackCount = 0;              // у гостя: сколько раз всего ударил
  var lastAttack = 0;               // у хозяина: сколько из них уже учтено
  var kick = { x: 0, y: 0 };        // у хозяина: толчок, который ждёт героя гостя
  var shopHold = 0;                 // сколько перерыв уже ждёт лавку

  // События для гостя (брызги, цифры урона) повторяются в нескольких кадрах
  // подряд: быстрый канал может потерять кадр. Гость узнаёт повтор по номеру.
  var FX_KEEP = 160;                // сколько мс событие ездит в кадрах (у хозяина)
  var fxSeq = 0, lastFx = 0;        // номер события: у хозяина / последний сыгранный у гостя
  var fxRecent = [];                // у хозяина: недавние события { at, e }

  // Попадания гостя: он сам решает, по кому попал, и шлёт список хозяину,
  // пока тот не подтвердит (поле ha в картинке мира)
  var PREDICT_WAIT = 600;           // сколько мс гость верит своему удару без хозяина
  var hitSeq = 0;                   // у гостя: номер последнего попадания
  var sentHit = 0;                  // у гостя: номер последнего отправленного попадания
  var lastHit = 0;                  // у хозяина: сколько попаданий уже учтено
  var pendingHits = [];             // у гостя: ещё не подтверждённые попадания
  var predKills = {};               // у гостя: слизни, чью гибель он уже показал сам

  /* ========================================================================
   * Комната
   * ====================================================================== */
  Online.createRoom = function () {
    Online.active = true;
    Online.role = 'host';
    Online.ready = false;
    Online.myHero = Online.myHero || 'omnom';
    Online.mateHero = other(Online.myHero);
    Net.host();
    render();
  };

  Online.joinRoom = function (code) {
    Online.active = true;
    Online.role = 'guest';
    Online.ready = false;
    Net.join(code);
    render();
  };

  Online.leave = function () {
    if (Net.isOpen()) Net.send({ t: 'bye' });
    Net.close();
    Online.active = false;
    Online.role = 'off';
    Online.ready = false;
    Online.mateInShop = false;
    ghosts = {};
    dropAsk();
    render();
  };

  /**
   * Вернуться в комнату — из забега, итогов или паузы.
   * tellMate — позвать туда и напарника.
   */
  Online.backToRoom = function (tellMate) {
    if (tellMate && Net.isOpen()) Net.send({ t: 'room' });
    if (window.Shop) Shop.save();
    flushSave();
    Game.endless = false;
    Game.finalWin = false;
    Game.defeatTimer = 0;
    Game.mapTimer = 0;
    Game.bannerData = null;
    Players.list = [];
    Online.mateInShop = false;
    if (window.Touch) Touch.reset();
    Online.open();
  };

  /** Новый забег: забываем всё, что осталось от прошлого (вызывает Game.startGame). */
  Online.resetRun = function () {
    var ri = Online.remoteInput;
    ri.px = ri.py = null;
    ri.vx = ri.vy = 0;
    ri.atk = 0;
    ri.atkAge = 0;
    kick.x = kick.y = 0;
    ghosts = {};
    // Номера событий и попаданий не сбрасываем: посылки прошлого забега,
    // ещё летящие по сети, не должны сбить счёт нового
    fxQueue = [];
    fxRecent = [];
    pendingHits = [];
    predKills = {};
    shopHold = 0;
    Online.mateInShop = false;
    dropAsk();
  };

  /**
   * Связь с напарником пропала. Играть можно только вдвоём, поэтому забег
   * останавливается, а комната открывается снова с тем же кодом: напарник
   * вернётся — и можно продолжать. Прогресс к этому моменту уже сохранён.
   */
  function lost() {
    if (!Online.active) return;
    var code = Net.code;
    var inGame = ['playing', 'paused', 'levelup', 'result', 'map', 'shop'].indexOf(Game.state) >= 0;
    Online.ready = false;
    dropAsk();
    if (inGame) {
      Online.backToRoom(false);
      notice = 'Связь с напарником прервалась — игра остановлена. Ждём, пока он вернётся.';
    }
    setTimeout(function () {
      if (!Online.active || !code) return;
      if (Online.isHost()) Net.host(code);
      else Net.join(code);
      render();
    }, 300);
  }

  /** Хозяин меняет, за кого играет. */
  Online.pickHero = function (hero) {
    if (Online.role !== 'host') return;
    Online.myHero = hero;
    Online.mateHero = other(hero);
    if (Net.isOpen()) Net.send({ t: 'hello', hero: Online.mateHero });
    render();
  };

  function other(h) { return h === 'omnom' ? 'cat' : 'omnom'; }

  /* ========================================================================
   * Приём сообщений
   * ====================================================================== */
  function onMessage(m) {
    if (!m || !m.t) return;

    switch (m.t) {
      case 'hello':                     // хозяин сказал гостю, за кого тот играет
        Online.myHero = m.hero;
        Online.mateHero = other(m.hero);
        render();
        break;

      case 'sync':                      // гость показал своё сохранение
        if (Online.isHost()) mergeSave(m.d);
        break;

      case 'save':                      // общее сохранение от хозяина
        if (Online.isGuest() && m.d) {
          Shop.applyShared(m.d);
          refreshScreens();
        }
        break;

      case 'act':                       // гость что-то купил, надел или съел
        if (Online.isHost()) runAction(m);
        break;

      case 'i':                         // где сейчас герой гостя
        if (Online.isHost()) takeInput(m);
        break;

      case 's':                         // картинка мира
        applySnapshot(m);
        break;

      case 'cmd':
        onCommand(m);
        break;

      case 'cards':                     // гостю предлагают карточку прокачки
        showGuestCards(m.ids);
        break;

      case 'card':                      // гость выбрал карточку
        if (Online.isHost()) Upgrades.netPick(Online.matePlayer(), m.i);
        break;

      case 'cardok':                    // хозяин уже выбрал свою карточку
        if (Online.isGuest()) Upgrades.mateChose();
        break;

      case 'shop':                      // напарник зашёл в лавку или вышел из неё
        Online.mateInShop = !!m.on;
        break;

      case 'ask':                       // напарник предлагает начать забег
        onAsk(m);
        break;

      case 'askyes':                    // напарник согласился (старт делает хозяин)
        if (ask && ask.mine && Online.isHost()) beginStart(ask);
        break;

      case 'askno':
        if (ask && ask.mine) {
          ask = null;
          showInfo('Напарник пока не готов', 'Можно предложить ещё раз чуть позже.');
        }
        break;

      case 'askcancel':
        if (ask && !ask.mine) dropAsk();
        break;

      case 'pause':                     // пауза общая на двоих
        if (window.UI) UI.pause(true);
        break;

      case 'resume':
        if (window.UI) UI.resume(true);
        break;

      case 'room':                      // напарник вернулся в комнату — и мы туда же
        Online.backToRoom(false);
        break;

      case 'bye':                       // напарник сам вышел из комнаты
        if (Online.isGuest()) {
          Online.leave();
          notice = 'Хозяин закрыл комнату. Можно создать свою или войти в другую.';
          Online.open();
        } else {
          lost();                       // хозяин ждёт нового гостя в той же комнате
        }
        break;
    }
  }

  function onCommand(m) {
    switch (m.c) {
      case 'start':
        Game.endless = !!m.endless;
        if (window.Endless) Endless.active = !!m.endless;
        Game.startGame('net', m.world);
        break;
      case 'result':                    // итоги забега — те же, что у хозяина
        if (m.stats) Game.stats = m.stats;
        Enemies.wave = m.wave | 0;
        if (m.ws) Enemies.state = m.ws;
        Game.endless = !!m.endless;
        if (window.UI) UI.showResult(m.kind);
        break;
      case 'cleared':
        Game.banner('Мир пройден! ♥', 'можно выбрать следующий', 3);
        break;
      case 'cardsDone':                 // оба выбрали карточки — игра идёт дальше
        Upgrades.netDone();
        break;
      case 'room':                      // забег окончен — ждём в комнате
        Online.backToRoom(false);
        break;
      case 'banner':
        Game.banner(m.a, m.b, m.life || 2.2);
        break;
    }
  }

  /* ========================================================================
   * Старт забега: один предлагает, второй подтверждает
   *
   * Предложить может любой. Второму показывается «Вы готовы? Да / Нет».
   * Сам забег всегда запускает хозяин (он считает игру) — либо сразу, нажав
   * «Да», либо получив «Да» от гостя. Если оба предложили одновременно,
   * это тоже согласие: берётся выбор хозяина.
   * ====================================================================== */
  var ask = null;             // { mine: предложил я, world, endless }
  var askMode = '';           // что сейчас показывает окно: 'wait' | 'ask' | 'info'

  /** Предложить напарнику начать: { world } или { endless: true }. */
  Online.requestStart = function (opts) {
    if (!Online.active || !Net.isOpen()) { Online.open(); return; }
    if (ask) return;
    ask = { mine: true, world: (opts && opts.world) | 0 || 1, endless: !!(opts && opts.endless) };
    Net.send({ t: 'ask', w: ask.world, en: ask.endless ? 1 : 0 });
    if (window.Sound) Sound.play('click');
    showAsk();
  };

  function onAsk(m) {
    if (ask && ask.mine) {
      if (Online.isHost()) beginStart(ask);   // встречные предложения — оба готовы
      return;
    }
    ask = { mine: false, world: m.w | 0 || 1, endless: !!m.en };
    if (window.Sound) Sound.play('levelup');
    showAsk();
  }

  function beginStart(o) {
    dropAsk();
    if (!Net.isOpen()) return;
    if (o.endless && window.Endless) {
      Endless.start('net');
    } else {
      Game.endless = false;
      Game.startGame('net', o.world);
    }
  }

  function whatStarts(o) {
    if (o.endless) return 'Бесконечная волна';
    var w = Config.world(o.world);
    return 'Мир ' + w.num + ' · ' + w.name;
  }

  function askEl(id) { return document.getElementById(id); }

  function showAsk() {
    var box = askEl('net-ask');
    if (!box || !ask) return;
    if (ask.mine) {
      askMode = 'wait';
      askEl('net-ask-title').textContent = 'Ждём напарника…';
      askEl('net-ask-text').textContent = 'Вы предложили: ' + whatStarts(ask) +
        '. Игра начнётся, как только напарник подтвердит.';
      askEl('net-ask-yes').hidden = true;
      askEl('net-ask-no').textContent = 'Отменить';
    } else {
      askMode = 'ask';
      askEl('net-ask-title').textContent = 'Игрок хочет начать игру';
      askEl('net-ask-text').textContent = whatStarts(ask) + '. Вы готовы?';
      askEl('net-ask-yes').hidden = false;
      askEl('net-ask-no').textContent = 'Нет';
    }
    box.hidden = false;
  }

  function showInfo(title, text) {
    var box = askEl('net-ask');
    if (!box) return;
    askMode = 'info';
    askEl('net-ask-title').textContent = title;
    askEl('net-ask-text').textContent = text;
    askEl('net-ask-yes').hidden = true;
    askEl('net-ask-no').textContent = 'Хорошо';
    box.hidden = false;
  }

  function dropAsk() {
    ask = null;
    askMode = '';
    var box = askEl('net-ask');
    if (box) box.hidden = true;
    var no = askEl('net-ask-no');
    if (no) no.hidden = false;
  }

  function onAskYes() {
    if (askMode !== 'ask' || !ask) return;
    if (!Net.isOpen()) { dropAsk(); return; }
    if (Online.isHost()) beginStart(ask);
    else {
      Net.send({ t: 'askyes' });
      askMode = 'info';
      askEl('net-ask-title').textContent = 'Начинаем!';
      askEl('net-ask-text').textContent = 'Секундочку…';
      askEl('net-ask-yes').hidden = true;
      askEl('net-ask-no').hidden = true;
    }
  }

  function onAskNo() {
    if (askMode === 'wait' && ask) Net.send({ t: 'askcancel' });
    else if (askMode === 'ask' && ask) Net.send({ t: 'askno' });
    dropAsk();
  }

  /* ========================================================================
   * Общий прогресс на двоих
   *
   * Сохранение одно, и ведёт его хозяин. Каждое изменение (Shop.save) получает
   * новый номер версии и уезжает гостю, а гость кладёт копию в память своего
   * браузера. Покупки гостя у него на месте не выполняются: они уходят
   * хозяину, и тот присылает обновлённое сохранение обратно.
   *
   * Во время забега конфеты меняются постоянно, а кошельки и так приезжают
   * с картинкой мира, — поэтому целиком сохранение уходит не чаще раза
   * в несколько секунд. Иначе оба телефона то и дело подвисали на записи.
   * ====================================================================== */
  var synced = false;        // хозяин уже сверил сохранения с гостем
  var savePending = false;   // есть изменения, которые гость ещё не получил
  var lastSaveSent = 0;

  /** Насколько далеко продвинулось сохранение — нужно при первой встрече. */
  function progressScore(d) {
    if (!d) return -1;
    var s = 0, k;
    var cleared = (d.progress && d.progress.cleared) || {};
    for (k in cleared) if (cleared[k]) s += 100000;
    s += ((d.progress && d.progress.maxWorld) || 1) * 10000;
    ['omnom', 'cat'].forEach(function (h) {
      s += (d.coins && d.coins[h]) | 0;
      s += ((d.dust && d.dust[h]) | 0) * 100;
      s += ((d.owned && d.owned[h] && d.owned[h].length) | 0) * 300;
      s += ((d.gear && d.gear[h] && d.gear[h].length) | 0) * 300;
      s += ((d.costumes && d.costumes[h] && d.costumes[h].length) | 0) * 300;
    });
    var built = (d.home && d.home.built) || {};
    for (k in built) if (built[k]) s += 300;
    return s;
  }

  /** Хозяин получил сохранение гостя и решает, какое из двух станет общим. */
  function mergeSave(theirs) {
    var mine = Shop.toData();
    var a = mine.sync || {};
    var b = (theirs && theirs.sync) || {};
    var takeTheirs;
    if (a.id && a.id === b.id) {
      takeTheirs = (b.rev | 0) > (a.rev | 0);                   // одна история — берём свежее
    } else {
      takeTheirs = progressScore(theirs) > progressScore(mine);  // впервые вместе — где больше пройдено
    }
    if (takeTheirs) Shop.fromData(theirs);
    Net.note(takeTheirs ? 'общий прогресс — с устройства напарника' : 'общий прогресс — с этого устройства');

    // Номер версии больше обоих: это сохранение теперь самое свежее у двоих
    Shop.sync.id = (takeTheirs ? b.id : a.id) || Shop.sync.id;
    Shop.sync.rev = Math.max(a.rev | 0, b.rev | 0);
    synced = true;
    Shop.forceSave();                // запишет и отправит гостю
    refreshScreens();
  }

  function inRun() {
    return Game.state === 'playing' || Game.state === 'paused' || Game.state === 'levelup';
  }

  /** Хозяин отправляет общее сохранение гостю (вызывается из Shop.save). */
  function sendSave(force) {
    if (!Online.isHost() || !synced || !Net.isOpen()) return;
    if (force !== true && inRun() && Date.now() - lastSaveSent < SAVE_SEND_GAP) {
      savePending = true;
      return;
    }
    savePending = false;
    lastSaveSent = Date.now();
    Net.send({ t: 'save', d: Shop.toData() });
  }

  /** Отправить отложенное сохранение, если оно есть. */
  function flushSave(force) {
    if (savePending) sendSave(force);
  }

  /** Открытый экран показывает свежие цифры. */
  function shown(id) {
    var el = document.getElementById('screen-' + id);
    return !!(el && el.classList.contains('active'));
  }

  function refreshScreens() {
    if (shown('shop') && Shop.render) Shop.render();
    if (shown('home') && window.Home) Home.render();
    if (shown('map') && window.WorldMap) WorldMap.render();
    if (shown('net')) render();
  }

  /** Что гость может сделать с общим сохранением — выполняет это хозяин. */
  var ACTIONS = {
    Shop: ['buy', 'upgrade', 'equip', 'buyPerk', 'buyGear', 'upgradeGear', 'wearGear', 'resetAll'],
    Home: ['eat', 'build', 'sleep'],
    Wardrobe: ['buy', 'wear']
  };
  var realActions = {};

  function runAction(m) {
    var obj = window[m.o];
    var fn = realActions[m.o + '.' + m.f];
    if (!obj || !fn || !ACTIONS[m.o] || ACTIONS[m.o].indexOf(m.f) < 0) return;
    fn.apply(obj, Array.isArray(m.a) ? m.a : []);
    // Гость ждёт результат своей покупки прямо сейчас — не откладываем
    flushSave(true);
    refreshScreens();
  }

  /** У гостя покупки не выполняются на месте, а уходят хозяину. */
  function wrapActions() {
    Object.keys(ACTIONS).forEach(function (o) {
      var obj = window[o];
      if (!obj) return;
      ACTIONS[o].forEach(function (f) {
        var orig = obj[f];
        if (typeof orig !== 'function') return;
        realActions[o + '.' + f] = orig;
        obj[f] = function () {
          if (Online.isGuest()) {
            if (!Net.isOpen()) return false;       // без хозяина общий прогресс не меняем
            Net.send({ t: 'act', o: o, f: f, a: Array.prototype.slice.call(arguments) });
            return true;
          }
          return orig.apply(obj, arguments);
        };
      });
    });
  }

  /* ========================================================================
   * Лавка посреди забега — у каждого своя
   *
   * Заглянуть в лавку в перерыве между волнами может любой, и у второго
   * экран при этом не меняется. Перерыв короткий, поэтому, пока кто-то
   * в лавке, следующая волна ждёт (но не дольше минуты).
   * ====================================================================== */
  Online.tellShop = function (on) {
    if (Online.active && Net.isOpen()) Net.send({ t: 'shop', on: on ? 1 : 0 });
  };

  /** Кто-то из двоих в лавке? */
  Online.someoneInShop = function () {
    return !!(Online.active && ((window.Shop && Shop.inGame) || Online.mateInShop));
  };

  /** Держать ли перерыв (вызывает enemies.js у хозяина). */
  Online.holdBreak = function (dt) {
    if (!Online.someoneInShop()) { shopHold = 0; return false; }
    shopHold += dt;
    return shopHold < SHOP_HOLD_MAX;
  };

  /* ========================================================================
   * Хозяин: герой гостя и отправка картинки мира
   * ====================================================================== */
  var fxQueue = [];

  /**
   * Короткое событие для гостя: брызги, звук, надпись.
   * more — дополнительные поля (номер слизня i, крит c и т.п.).
   */
  Online.fx = function (kind, x, y, extra, more) {
    if (!Online.isHost() || fxQueue.length > 80) return;
    var e = { k: kind, x: Math.round(x), y: Math.round(y), n: ++fxSeq };
    if (extra) e.v = extra;
    if (more) for (var key in more) e[key] = more[key];
    fxQueue.push(e);
  };

  /** Героя гостя толкнули — толчок уедет на его телефон. */
  Online.kickMate = function (dx, dy, force) {
    if (!Online.isHost()) return;
    var d = Math.hypot(dx, dy) || 1;
    kick.x += dx / d * force;
    kick.y += dy / d * force;
  };

  /** Гость ударил (вызывает players.js). */
  Online.noteAttack = function () { attackCount++; };

  function takeInput(m) {
    if ((m.q | 0) <= lastInput) return;          // устаревшая посылка
    lastInput = m.q | 0;
    var ri = Online.remoteInput;
    ri.px = m.x; ri.py = m.y;
    ri.vx = m.vx || 0; ri.vy = m.vy || 0;
    ri.f = m.f || ri.f;
    ri.ax = m.ax || 0; ri.ay = m.ay || 0;
    var an = m.an | 0;
    if (an > lastAttack) {
      // Даже если посылка с ударом потерялась, следующая несёт общий счёт
      ri.atk = Math.min(2, ri.atk + (an - lastAttack));
      lastAttack = an;
    }
    if (m.h) applyHits(m.h);
  }

  /**
   * Попадания гостя. Гость уже показал их у себя — хозяин применяет урон.
   * Урон считается здесь по номеру удара в комбо, от гостя берётся только
   * «кого задел» и «был ли крит».
   */
  function applyHits(list) {
    var p = Online.matePlayer();
    if (!Array.isArray(list) || !p || p.downed) return;
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      var n = h.n | 0;
      if (n <= lastHit) continue;                // уже учтено (посылки повторяются)
      lastHit = n;

      var e = enemyById(h.i | 0);
      if (!e || e.dead || e.spawnIn > 0) continue;
      var step = Players.combo[h.k | 0] || Players.combo[0];
      // Слизень должен быть хотя бы примерно в досягаемости героя гостя
      var reach = p.swingRadius * step.radiusK + e.r + 90;
      if (Math.hypot(e.x - p.x, e.y - p.y) > reach) continue;

      var crit = !!h.c && p.crit > 0;
      var dmg = Math.round(step.damage * (p.damageMul || 1) * (crit ? 2 : 1) * 10) / 10;
      var knock = step.knockback * (p.knockMul || 1) * (crit ? 1.4 : 1);
      if (Enemies.hurt(e, dmg, p.x, p.y, knock)) Combat.hitFeedback(p, e, dmg, crit, step.spin);
    }
  }

  function enemyById(id) {
    for (var i = 0; i < Enemies.list.length; i++) {
      if (Enemies.list[i].netId === id) return Enemies.list[i];
    }
    return null;
  }

  function sendSnapshot() {
    if (!Net.isOpen()) return;

    var ps = Players.list.map(function (p) {
      var o = {
        h: p.hero,
        x: Math.round(p.x), y: Math.round(p.y),
        vx: Math.round(p.vx || 0), vy: Math.round(p.vy || 0),
        hp: p.hp, mh: p.maxHp,
        f: p.facing,
        w: +p.walk.toFixed(2),
        d: p.downed ? 1 : 0,
        iv: +(p.invul || 0).toFixed(2),
        rv: +(p.reviveProgress || 0).toFixed(2),
        hf: +(p.hurtFlash || 0).toFixed(2),
        sl: +(p.slowTimer || 0).toFixed(2),
        cs: p.costume || 'base',
        wp: p.weaponId, wl: p.weaponLevel || 0,
        ax: +(p.aimX || 0).toFixed(2), ay: +(p.aimY || 0).toFixed(2),
        // Прогресс взмаха (0…1) и его длительность — гость доигрывает взмах сам
        sw: p.swing && p.swing.time ? {
          t: +Math.max(0, Math.min(1, 1 - (p.attackTimer || 0) / p.swing.time)).toFixed(2),
          tm: +p.swing.time.toFixed(3),
          a: +p.swing.aim.toFixed(2),
          f: +p.swing.from.toFixed(2), o: +p.swing.to.toFixed(2),
          r: Math.round(p.swing.radius), s: p.swing.spin ? 1 : 0
        } : null
      };
      if (p.isRemote) {
        // Своего героя гость двигает сам — ему нужны скорость, размах и толчки
        o.sp = Math.round(p.speed);
        o.as = +(p.atkSpeed || 1).toFixed(3);
        o.sr = Math.round(p.swingRadius);
        // Сила удара — чтобы цифры урона у гостя совпадали с хозяйскими
        o.dm = +(p.damageMul || 1).toFixed(3);
        o.cr = +(p.crit || 0).toFixed(3);
        if (kick.x || kick.y) {
          o.kx = Math.round(kick.x); o.ky = Math.round(kick.y);
          kick.x = kick.y = 0;
        }
      }
      return o;
    });

    var es = Enemies.list.map(function (e) {
      var o = {
        i: e.netId,
        ty: e.type,
        x: Math.round(e.x), y: Math.round(e.y),
        hp: Math.max(0, Math.round(e.hp * 10) / 10), mh: e.maxHp,
        r: Math.round(e.r),
        f: +(e.flash || 0).toFixed(2),
        sp: +(e.spawnIn || 0).toFixed(2),
        sq: +(e.squash || 1).toFixed(2),
        vx: Math.round(e.vx || 0)
      };
      if (e.shield) o.sh = e.shield;
      if (e.ghostPhase != null) o.gp = +e.ghostPhase.toFixed(2);
      if (e.isBoss) {
        o.b = 1;
        o.ph = e.phase || 1;
        o.ac = e.action || '';
        o.tg = +(e.telegraph || 0).toFixed(2);
        o.tx = Math.round(e.targetX || 0);
        o.ty = Math.round(e.targetY || 0);
        o.sa = +(e.spinAngle || 0).toFixed(2);
        o.ax = +(e.aimX || 0).toFixed(2);
        o.ay = +(e.aimY || 0).toFixed(2);
        o.nm = e.name;
      }
      return o;
    });

    var ground = Combat.netState();
    var bd = Game.bannerData;

    var msg = {
      t: 's',
      q: ++snapSeq,
      p: ps,
      e: es,
      d: ground.drops,
      b: ground.shots,
      pd: ground.puddles,
      wv: { w: Enemies.wave, s: Enemies.state, k: Enemies.killed, n: Enemies.total, wt: Enemies.waveTotal },
      wd: Game.world,
      // Надпись хранится в поле text (см. Game.banner). Раньше здесь читалось
      // несуществующее title — и у гостя вверху было написано «undefined».
      bn: bd ? { a: bd.text, b: bd.sub, l: +bd.life.toFixed(2), m: +(bd.max || bd.life).toFixed(2) } : null
    };
    if (Game.mod.wind) msg.wn = [Math.round(Game.wind.x), Math.round(Game.wind.y)];
    // Событие едет в нескольких кадрах подряд — потеря одного кадра не страшна
    var now = Date.now();
    for (var fi = 0; fi < fxQueue.length; fi++) fxRecent.push({ at: now, e: fxQueue[fi] });
    fxQueue = [];
    while (fxRecent.length && (now - fxRecent[0].at > FX_KEEP || fxRecent.length > 120)) fxRecent.shift();
    if (fxRecent.length) msg.fx = fxRecent.map(function (r) { return r.e; });
    msg.ha = lastHit;                // сколько попаданий гостя уже учтено
    // Кошельки — чтобы у напарника цифры внизу экрана менялись вживую
    msg.cn = [Shop.coins.omnom, Shop.coins.cat, Shop.dust.omnom, Shop.dust.cat];

    Net.sendFast(msg);
  }

  /* ========================================================================
   * Гость: приём картинки мира
   * ====================================================================== */
  function applySnapshot(m) {
    if (!Online.isGuest() || !Players.list.length) return;
    if ((m.q | 0) <= lastSnap) return;           // пришла позже более свежей
    lastSnap = m.q | 0;
    var me = Online.localPlayer();

    // Герои
    m.p.forEach(function (s) {
      var p = s.h === 'omnom' ? Players.p1 : Players.p2;
      if (!p) return;
      p.hp = s.hp; p.maxHp = s.mh;
      p.downed = !!s.d;
      p.invul = s.iv;
      p.reviveProgress = s.rv;
      p.hurtFlash = s.hf;
      p.slowTimer = s.sl;
      if (p.weaponId !== s.wp || p.weaponLevel !== s.wl) {
        Weapons.equip(p, s.wp, s.wl);
      }
      p.costume = s.cs;

      if (p === me) {
        // Свой герой: двигаем сами, от хозяина берём только то, что он решает
        if (s.sp) {
          p.speed = s.sp; p.atkSpeed = s.as; p.swingRadius = s.sr;
          p.damageMul = s.dm || 1; p.crit = s.cr || 0;
        }
        if (s.kx || s.ky) Players.push(p, s.kx, s.ky, Math.hypot(s.kx, s.ky));
        if (p.downed) {
          // В обмороке герой лежит там, где его видит хозяин
          p.netX = s.x; p.netY = s.y;
          p.swing = null; p.attackTimer = 0;
        } else {
          p.netX = p.netY = null;
        }
        return;
      }

      p.netX = s.x; p.netY = s.y;
      p.facing = s.f;
      p.walk = s.w;
      p.aimX = s.ax; p.aimY = s.ay;
      p.vx = s.vx || 0;
      p.vy = s.vy || 0;
      // Рисование берёт прогресс взмаха из attackTimer / swing.time
      if (s.sw) {
        var tm = s.sw.tm || 0.25;
        p.swing = {
          aim: s.sw.a, from: s.sw.f, to: s.sw.o,
          radius: s.sw.r, spin: !!s.sw.s, hit: [], time: tm
        };
        p.attackTimer = (1 - s.sw.t) * tm;
      } else {
        p.swing = null;
        p.attackTimer = 0;
      }
    });

    // Хозяин учёл попадания гостя — больше их не повторяем
    if (m.ha != null) {
      pendingHits = pendingHits.filter(function (h) { return h.n > m.ha; });
    }

    // Слизни
    var seen = {};
    var now = Date.now();
    var list = [];
    m.e.forEach(function (s) {
      seen[s.i] = 1;
      var e = ghosts[s.i];
      if (!e) {
        e = ghosts[s.i] = {
          netId: s.i, type: s.ty, def: Enemies.types[s.ty] || Enemies.types.normal,
          x: s.x, y: s.y, wobble: Math.random() * 6.28, squash: 1,
          vx: 0, vy: 0, kx: 0, ky: 0, walkVx: 0, walkVy: 0
        };
      }
      if (e.predDead) {
        // Гость уже показал, как слизень лопнул, — ждём, пока хозяин подтвердит
        if (now - e.predDead < PREDICT_WAIT) return;
        // Не подтвердил (щит, лечение) — слизень снова в игре
        e.predDead = 0;
        delete predKills[s.i];
        Enemies.unbury(e);
      }
      e.netX = s.x; e.netY = s.y;
      e.maxHp = s.mh; e.r = s.r;
      // Свой удар гость уже показал: пока хозяин его не учёл, здоровье не «отрастает»
      e.hp = s.hp;
      if (e.predAt && now - e.predAt < PREDICT_WAIT) e.hp = Math.min(e.hp, e.predHp);
      e.flash = Math.max(s.f, e.flash || 0);
      e.squash = Math.min(s.sq, e.squash || 1);
      e.spawnIn = s.sp; e.vx = s.vx;
      e.shield = s.sh || 0; e.maxShield = s.sh || 0;
      e.ghostPhase = s.gp;
      e.isBoss = !!s.b;
      if (s.b) {
        if (!e.bossDef) e.bossDef = Boss.forWorld(Game.world);
        e.name = s.nm;
        e.phase = s.ph; e.action = s.ac || null; e.telegraph = s.tg;
        e.targetX = s.tx; e.targetY = s.ty; e.spinAngle = s.sa;
        e.aimX = s.ax; e.aimY = s.ay;
      }
      list.push(e);
    });
    Enemies.list = list;
    for (var id in ghosts) {
      if (seen[id]) continue;
      // Слизня больше нет — он лопается на месте, а не пропадает
      if (!ghosts[id].predDead) Enemies.bury(ghosts[id]);
      delete ghosts[id];
    }

    // Конфеты, снаряды, лужи
    Combat.setNetState(m.d, m.b, m.pd);

    // Волны и надписи
    Enemies.wave = m.wv.w;
    Enemies.state = m.wv.s;
    Enemies.killed = m.wv.k;
    Enemies.total = m.wv.n;
    Enemies.waveTotal = m.wv.wt;
    if (m.wd !== Game.world) Game.applyWorld(m.wd);
    if (m.wn) { Game.wind.x = m.wn[0]; Game.wind.y = m.wn[1]; }
    else { Game.wind.x = 0; Game.wind.y = 0; }

    if (m.bn) {
      var b = Game.bannerData;
      if (b && b.text === m.bn.a && b.sub === m.bn.b) {
        // Та же надпись — время жизни ведём сами, иначе она мигает с каждым кадром
        if (Math.abs(b.life - m.bn.l) > 0.3) b.life = m.bn.l;
        b.max = m.bn.m || b.max;
      } else {
        Game.bannerData = { text: m.bn.a, sub: m.bn.b || '', life: m.bn.l, max: m.bn.m || m.bn.l };
      }
    } else {
      Game.bannerData = null;
    }

    if (m.fx) {
      m.fx.forEach(function (e) {
        if ((e.n | 0) <= lastFx) return;           // уже сыграно из прошлого кадра
        lastFx = e.n | 0;
        playFx(e);
      });
    }

    if (m.cn) {
      Shop.coins.omnom = m.cn[0]; Shop.coins.cat = m.cn[1];
      Shop.dust.omnom = m.cn[2]; Shop.dust.cat = m.cn[3];
    }
  }

  /** Маленькие радости: брызги и звуки — гость делает их у себя. */
  function playFx(e) {
    switch (e.k) {
      case 'hit':
        Combat.particles(e.x, e.y, '#ffffff', 6, { speed: 120 });
        if (window.Sound) Sound.play('hit');
        break;
      case 'dmg': {
        var color = e.c ? '#ffd24a' : (e.w ? '#ffe6f3' : '#fff2a8');
        var g = e.i && ghosts[e.i];
        // Цифра — над слизнем там, где его видно у гостя
        if (g) Combat.floatText(g.x + (Math.random() * 16 - 8), g.y - g.r * 1.8, e.v, color);
        else Combat.floatText(e.x, e.y, e.v, color);
        break;
      }
      case 'kill':
        if (e.i && predKills[e.i]) {               // гость уже показал это сам
          delete predKills[e.i];
          break;
        }
        Combat.particles(e.x, e.y, e.v || '#8fd14f', 12, { speed: 150, size: 5 });
        if (window.Sound) Sound.play('pop');
        break;
      case 'boom':
        Combat.particles(e.x, e.y, '#ffb46b', 22, { speed: 240, size: 6 });
        Combat.shake(8);
        if (window.Sound) Sound.play('boom');
        break;
      case 'hurt':
        Combat.particles(e.x, e.y, '#ff7aa2', 8, { speed: 120 });
        Combat.shake(5);
        if (window.Sound) Sound.play('hurt');
        break;
      case 'candy':
        Combat.floatText(e.x, e.y, '+' + (e.v || 1), '#ffca4a');
        if (window.Sound) Sound.play('candy');
        break;
      case 'dust':
        Combat.particles(e.x, e.y, '#ffdf5e', 18, { speed: 150, star: true });
        if (window.Sound) Sound.play('dust');
        break;
      case 'text':
        Combat.floatText(e.x, e.y, e.v, '#fff2a8');
        break;
    }
  }

  /** Плавное движение между присланными кадрами. */
  function smooth(dt) {
    var k = Math.min(1, dt * 14);
    var me = Online.localPlayer();
    for (var i = 0; i < Players.list.length; i++) {
      var p = Players.list[i];
      if (p.netX == null) continue;
      p.x += (p.netX - p.x) * k;
      p.y += (p.netY - p.y) * k;
      if (p === me) continue;
      // Взмах и шаги напарника доигрываем между кадрами
      if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - dt);
      if (Math.hypot(p.vx, p.vy) > 20) p.walk += dt * 9;
    }
    for (var j = 0; j < Enemies.list.length; j++) {
      var e = Enemies.list[j];
      if (e.netX == null) continue;
      e.x += (e.netX - e.x) * k;
      e.y += (e.netY - e.y) * k;
      e.wobble += dt * 4;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
      e.squash += (1 - e.squash) * Math.min(1, dt * 9);   // форма возвращается после удара
    }
    Enemies.updateDying(dt);
  }

  /**
   * Гость сам решает, по кому попал его меч: удар виден сразу — вспышка,
   * цифра, а добивающий удар сразу лопает слизня. Хозяину уходит список
   * попаданий, урон применяет он.
   */
  function guestHits(p) {
    if (!p || !p.swing || p.downed) return;
    var s = p.swing;
    var hits = Combat.sweepTargets(p);
    for (var i = 0; i < hits.length; i++) {
      var e = hits[i];
      if (!e.netId) continue;
      var r = Combat.rollHit(p, s.damage);
      pendingHits.push({ n: ++hitSeq, i: e.netId, k: s.index | 0, c: r.crit ? 1 : 0 });

      // Щит и призрачность решает хозяин — он и пришлёт «щит!» / «сквозь!»
      var ghostly = e.def.ghost && (0.5 + Math.sin((e.ghostPhase || 0) * 1.1) * 0.5) < 0.45;
      if (e.shield > 0 || ghostly) { e.flash = 0.12; continue; }

      e.flash = 0.14;
      e.squash = 0.72;
      e.hp -= r.dmg;
      e.predHp = e.hp;
      e.predAt = Date.now();
      Combat.hitFeedback(p, e, r.dmg, r.crit, s.spin);
      // Лечащиеся слизни могут «отрасти» у хозяина — с ними не торопимся
      if (!e.isBoss && e.hp <= (e.def.regen ? -0.3 : 0)) predictKill(e);
    }
    // Если хозяин долго молчит, очередь не растёт бесконечно
    if (pendingHits.length > 40) pendingHits.splice(0, pendingHits.length - 40);
  }

  /** Гость показывает гибель слизня сразу, не дожидаясь хозяина. */
  function predictKill(e) {
    var k = Enemies.list.indexOf(e);
    if (k >= 0) Enemies.list.splice(k, 1);
    e.predDead = Date.now();
    predKills[e.netId] = 1;
    Enemies.bury(e);
    playFx({ k: 'kill', x: e.x, y: e.y - e.r * 0.6, v: e.def.body });
  }

  /* ========================================================================
   * Каждый кадр (вызывается, пока идёт забег)
   * ====================================================================== */
  Online.update = function (dt) {
    if (!Online.active) return;

    if (Online.isHost()) {
      // Остаток таймера не выбрасываем: на медленном телефоне (30 кадров)
      // иначе картинка мира уходила бы 15 раз в секунду вместо 20
      snapTimer -= dt;
      if (snapTimer <= 0 && Game.state === 'playing') {
        snapTimer = Math.max(0, snapTimer + 1 / SNAP_HZ);
        sendSnapshot();
      }
      // Собранные конфеты сохраняем по ходу забега: если связь оборвётся,
      // ничего не пропадёт
      saveTimer -= dt;
      if (saveTimer <= 0) {
        saveTimer = SAVE_EVERY;
        Shop.save();
        flushSave();
      }
      return;
    }

    // Гость: ведём своего героя, сообщаем хозяину, где он, и сглаживаем мир
    if (Game.state === 'playing') {
      var me = Online.localPlayer();
      Players.updateLocal(me, dt);
      guestHits(me);

      inputTimer -= dt;
      // Свежее попадание уходит хозяину сразу, не дожидаясь очередной посылки
      var fresh = pendingHits.length && pendingHits[pendingHits.length - 1].n > sentHit;
      if ((inputTimer <= 0 || fresh) && me) {
        inputTimer = Math.max(0, inputTimer + 1 / INPUT_HZ);
        var inp = {
          t: 'i', q: ++inputSeq,
          x: Math.round(me.x), y: Math.round(me.y),
          vx: Math.round(me.vx), vy: Math.round(me.vy),
          f: me.facing,
          ax: +(me.aimX || 0).toFixed(2), ay: +(me.aimY || 0).toFixed(2),
          an: attackCount
        };
        if (pendingHits.length) {
          inp.h = pendingHits;
          sentHit = pendingHits[pendingHits.length - 1].n;
        }
        Net.sendFast(inp);
      }
      smooth(dt);
      Combat.updateVisualsOnly(dt);
      if (Game.bannerData) {
        Game.bannerData.life -= dt;
        if (Game.bannerData.life <= 0) Game.bannerData = null;
      }
      if (Game.shakeAmount > 0) Game.shakeAmount = Math.max(0, Game.shakeAmount - dt * 26);
    }
  };

  /** Хозяин объявляет о важном событии. */
  Online.command = function (c, extra) {
    if (!Online.isHost() || !Net.isOpen()) return;
    // Перед итогами и возвратом в комнату гость получает свежее сохранение
    if (c === 'result' || c === 'room') flushSave(true);
    var msg = { t: 'cmd', c: c };
    if (extra) for (var k in extra) msg[k] = extra[k];
    Net.send(msg);
  };

  /* ========================================================================
   * Карточка прокачки: каждый выбирает на своём телефоне,
   * игра продолжается, когда выбрали оба
   * ====================================================================== */
  Online.offerCards = function (ids) {
    if (!Online.isHost() || !Net.isOpen()) return;
    Net.send({ t: 'cards', ids: ids });
  };

  /** Хозяин выбрал свою карточку — пусть гость знает, что ждут только его. */
  Online.tellCardPicked = function () {
    if (Online.isHost() && Net.isOpen()) Net.send({ t: 'cardok' });
  };

  function showGuestCards(ids) {
    if (!Online.isGuest()) return;
    Upgrades.showNetChoice(ids, function (index) {
      Net.send({ t: 'card', i: index });
    });
  }

  /* ========================================================================
   * Экран комнаты
   * ====================================================================== */
  Online.open = function () {
    Game.state = 'net';
    Game.showScreen('net');
    document.getElementById('topbar').hidden = true;
    flushSave(true);
    render();
  };

  Online.close = function () {
    Online.leave();
    Game.toMenu();
  };

  function render() {
    var box = document.getElementById('net-body');
    if (!box) return;

    var st = Net.state;
    var title = document.getElementById('net-title');
    var hint = document.getElementById('net-hint');

    // Ещё ничего не выбрали
    if (!Online.active) {
      title.textContent = 'Игра вдвоём · v' + Game.VERSION;
      hint.textContent = notice ||
        'Один создаёт комнату и выбирает героя, второй входит по коду или по ссылке. ' +
        'Конфеты, покупки и пройденные миры у вас общие.';
      box.innerHTML = '';

      box.appendChild(bigButton('Создать комнату', 'выберете героя и позовёте напарника', 'green', function () {
        notice = '';
        Online.createRoom();
      }));

      var join = document.createElement('div');
      join.className = 'net-join';
      join.innerHTML =
        '<input id="net-code" class="net-input" maxlength="4" placeholder="КОД" autocomplete="off">';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-pink';
      btn.innerHTML = '<span class="btn-title">Войти</span>';
      btn.addEventListener('click', function () {
        var v = (document.getElementById('net-code').value || '').trim().toUpperCase();
        if (v.length >= 3) { notice = ''; Online.joinRoom(v); }
      });
      join.appendChild(btn);
      box.appendChild(join);

      box.appendChild(checkButton());

      var fromUrl = Net.codeFromUrl();
      if (fromUrl) {
        setTimeout(function () {
          var f = document.getElementById('net-code');
          if (f) f.value = fromUrl;
        }, 0);
      }
      return;
    }

    // Комната есть
    box.innerHTML = '';

    if (Online.role === 'host') {
      title.textContent = 'Комната ' + Net.code;
      var code = document.createElement('div');
      code.className = 'net-code-big';
      code.textContent = Net.code;
      box.appendChild(code);

      var link = document.createElement('button');
      link.type = 'button';
      link.className = 'btn-small net-link';
      link.textContent = '🔗 Скопировать ссылку';
      link.addEventListener('click', function () {
        var url = Net.inviteLink();
        if (navigator.clipboard) navigator.clipboard.writeText(url).catch(function () {});
        link.textContent = 'Ссылка скопирована ✓';
        setTimeout(function () { link.textContent = '🔗 Скопировать ссылку'; }, 1800);
      });
      box.appendChild(link);

      // Выбор героя
      var pick = document.createElement('div');
      pick.className = 'net-heroes';
      [['omnom', 'Ам Ням'], ['cat', 'Кошечка']].forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'net-hero' + (Online.myHero === pair[0] ? ' is-active' : '') + ' tab-' + pair[0];
        b.innerHTML = '<img src="' + Assets.sprites[pair[0] + '_base'].src + '" alt="">' +
          '<span>' + pair[1] + '</span>';
        b.addEventListener('click', function () { Online.pickHero(pair[0]); });
        pick.appendChild(b);
      });
      box.appendChild(label('Я играю за:'));
      box.appendChild(pick);

      if (st !== 'open') {
        hint.textContent = notice || ('Отправьте второму игроку ссылку или код. ' +
          'Браузер можно спокойно свернуть — комната не пропадёт.');
        box.appendChild(statusLine());
      }

    } else {
      title.textContent = 'Комната ' + (Net.code || '');

      if (st === 'open') {
        var who = document.createElement('div');
        who.className = 'net-youare';
        who.innerHTML = '<img src="' + Assets.sprites[Online.myHero + '_base'].src + '" alt="">' +
          '<span>вы играете за: <b>' + (Online.myHero === 'omnom' ? 'Ам Няма' : 'кошечку') + '</b></span>';
        box.appendChild(who);
      } else {
        hint.textContent = notice || ('Соединяемся с хозяином комнаты. Если он свернул браузер — ' +
          'попросите его вернуться в игру, мы дозвонимся сами.');
        box.appendChild(statusLine());
      }
    }

    // Когда оба на связи: начать может любой, второй подтвердит
    if (st === 'open') {
      hint.textContent = 'Напарник на связи! Выберите мир и предложите начать — второй игрок подтвердит.';
      var start = document.createElement('div');
      start.className = 'net-row';
      start.appendChild(bigButton('Выбрать мир', 'начнём, когда оба готовы', 'green', function () {
        WorldMap.open('net');
      }));
      start.appendChild(bigButton('♾ Бесконечная волна',
        Shop.best.endless ? 'рекорд: ' + Shop.best.endless + ' волн' : 'сколько продержитесь?',
        'violet', function () { Online.requestStart({ endless: true }); }));
      box.appendChild(start);

      box.appendChild(sharedLine());
      var extra = document.createElement('div');
      extra.className = 'net-row';
      extra.appendChild(smallButton('🗡 Лавка мечей', function () { Shop.open('room'); }));
      extra.appendChild(smallButton('🏠 Домик', function () { if (window.Home) Home.open('room'); }));
      box.appendChild(extra);
    }

    box.appendChild(smallButton('Выйти из комнаты', function () { Online.leave(); Online.open(); }));
  }

  /** Строчка про общий прогресс: миры и кошельки — одни на двоих. */
  function sharedLine() {
    var done = 0;
    for (var k in Shop.progress.cleared) if (Shop.progress.cleared[k]) done++;
    var d = document.createElement('div');
    d.className = 'net-sync';
    d.textContent = 'Общий прогресс: миров пройдено ' + done + ' из ' + Config.count +
      ' · Ам Ням 🍬 ' + Shop.coins.omnom + ' ✦ ' + Shop.dust.omnom +
      ' · Кошечка 🍬 ' + Shop.coins.cat + ' ✦ ' + Shop.dust.cat;
    return d;
  }

  function smallButton(text, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-small';
    b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  }

  /**
   * «Проверка связи» — три быстрые проверки, чтобы сразу понять,
   * где затык: сайт, браузер или сервер знакомств.
   */
  function checkButton() {
    var wrap = document.createElement('div');
    wrap.className = 'net-check';

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-small';
    b.textContent = '🩺 Проверка связи';

    var out = document.createElement('div');
    out.className = 'net-check-out';
    out.hidden = true;

    b.addEventListener('click', function () {
      out.hidden = false;
      out.innerHTML = '<div class="net-check-row">проверяем…</div>';
      b.disabled = true;
      Net.diagnose(function (rows) {
        b.disabled = false;
        out.innerHTML = '';
        rows.forEach(function (r) {
          var d = document.createElement('div');
          d.className = 'net-check-row ' + (r.ok ? 'is-ok' : 'is-bad');
          d.textContent = (r.ok ? '✓ ' : '✗ ') + r.text;
          out.appendChild(d);
        });
        var v = document.createElement('div');
        v.className = 'net-check-row';
        v.textContent = 'версия игры: ' + Game.VERSION;
        out.appendChild(v);
      });
    });

    wrap.appendChild(b);
    wrap.appendChild(out);
    return wrap;
  }

  /** Живая строка «что сейчас происходит» и кнопка «Попробовать снова». */
  function statusLine() {
    var wrap = document.createElement('div');
    wrap.className = 'net-status';

    var dot = document.createElement('i');
    dot.className = 'net-dot' + (Net.error ? ' is-bad' : '');
    wrap.appendChild(dot);

    var txt = document.createElement('span');
    txt.textContent = Net.error || Net.detail || statusText(Net.state);
    wrap.appendChild(txt);

    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn-small net-retry';
    again.textContent = 'Попробовать снова';
    again.addEventListener('click', function () { Net.retry(); render(); });
    wrap.appendChild(again);

    var box = document.createElement('div');
    box.className = 'net-wrap';
    box.appendChild(wrap);

    // Журнал связи: по нему сразу видно, на каком шаге всё встало
    if (Net.log && Net.log.length) {
      var jour = document.createElement('div');
      jour.className = 'net-journal';
      Net.log.slice(-7).forEach(function (line) {
        var d = document.createElement('div');
        d.textContent = line;
        jour.appendChild(d);
      });
      box.appendChild(jour);
    }

    return box;
  }

  function statusText(st) {
    if (Net.error) return Net.error;
    if (st === 'signal') return 'связываемся с сервером…';
    if (st === 'waiting') return 'ждём второго игрока…';
    if (st === 'connecting') return 'соединяемся…';
    if (st === 'open') return 'связь есть!';
    return 'готовимся…';
  }

  function label(text) {
    var d = document.createElement('div');
    d.className = 'net-label';
    d.textContent = text;
    return d;
  }

  function bigButton(title, sub, color, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-' + (color || 'pink');
    b.innerHTML = '<span class="btn-title">' + title + '</span>' +
      (sub ? '<span class="btn-sub">' + sub + '</span>' : '');
    b.addEventListener('click', fn);
    return b;
  }

  Online.render = render;

  /* ========================================================================
   * Запуск
   * ====================================================================== */
  Online.init = function () {
    Net.onMessage = onMessage;

    Net.onStatus = function () { render(); };

    // Общий прогресс: изменения хозяина уезжают гостю, покупки гостя — хозяину
    Shop.onChange = function () { sendSave(false); };
    wrapActions();

    Net.onOpen = function () {
      Online.ready = true;
      synced = false;
      savePending = false;
      notice = '';
      // Новое соединение — счёт посылок у обоих начинается заново
      lastSnap = 0;
      inputSeq = 0;
      lastInput = 0;
      attackCount = 0;
      lastAttack = 0;
      fxSeq = 0; lastFx = 0;
      fxQueue = []; fxRecent = [];
      hitSeq = 0; lastHit = 0; sentHit = 0;
      pendingHits = [];
      predKills = {};
      Online.mateInShop = false;
      if (Online.isHost()) {
        Net.send({ t: 'hello', hero: Online.mateHero });
      } else {
        // Гость показывает хозяину своё сохранение — хозяин решит, какое станет общим
        Net.send({ t: 'sync', d: Shop.toData() });
      }
      if (window.Sound) Sound.play('revive');
      render();
    };

    // Напарник пропал — забег встаёт, комната ждёт его с тем же кодом
    Net.onClose = function () { lost(); };

    var yes = document.getElementById('net-ask-yes');
    if (yes) yes.addEventListener('click', onAskYes);
    var no = document.getElementById('net-ask-no');
    if (no) no.addEventListener('click', onAskNo);

    var open = document.getElementById('btn-online');
    if (open) open.addEventListener('click', function () {
      if (window.Sound) Sound.play('click');
      if (Game.goFullscreen) Game.goFullscreen();
      Online.open();
    });

    var back = document.getElementById('net-back');
    if (back) back.addEventListener('click', function () { Online.close(); });

    // Пришли по ссылке с кодом — сразу открываем комнату и входим:
    // второму игроку не нужно ничего вводить руками
    var fromLink = Net.codeFromUrl();
    if (fromLink) {
      setTimeout(function () {
        if (Game.state !== 'menu') return;
        Online.open();
        Online.joinRoom(fromLink);
      }, 500);
    }
  };

  window.Online = Online;
})();
