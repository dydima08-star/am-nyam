/* ============================================================================
 * js/net.js — связь двух телефонов.
 *
 * Как это устроено простыми словами:
 *
 *   1. Первый игрок создаёт комнату — игра придумывает короткий код (например
 *      «К7ТМ») и говорит серверу-знакомств: «я тут, меня зовут так-то».
 *   2. Второй вводит этот код (или открывает ссылку с ним) — сервер передаёт
 *      двум телефонам «адреса» друг друга.
 *   3. Дальше телефоны соединяются НАПРЯМУЮ (WebRTC), и игра идёт между ними.
 *
 * Главное, чему тут уделено внимание, — живучесть:
 *
 *   • Телефон замораживает свёрнутую страницу, и связь с сервером рвётся.
 *     Поэтому мы переподключаемся сами: по таймеру, при возвращении в игру
 *     и при появлении интернета. Комната переживает сворачивание браузера —
 *     хозяин может спокойно уйти в мессенджер, скинуть ссылку и вернуться.
 *   • Гость не ждёт молча: он повторяет приглашение каждые несколько секунд,
 *     пока хозяин не ответит, и показывает, на каком шаге дело.
 *   • Если прямое соединение не собирается (разные мобильные сети), в запасе
 *     есть общедоступные перевалочные серверы TURN.
 *
 * Сервер-знакомств — бесплатный общедоступный PeerJS. Никакой библиотеки он не
 * требует: это обычный WebSocket, который просто пересылает сообщения, поэтому
 * весь код здесь свой и внешних файлов не нужно.
 *
 * Для проверки на одном устройстве есть второй способ связи — BroadcastChannel
 * (две вкладки одного браузера). Включается, если в адресе есть ?net=local.
 *
 * Наружу отдаётся простой объект Net:
 *   Net.host() / Net.join(code)       — создать комнату / войти в неё
 *   Net.send(obj)                     — отправить сообщение напарнику
 *   Net.sendFast(obj)                 — то же, но без гарантии (для кадров игры)
 *   Net.onMessage = function (obj) {} — получить сообщение
 *   Net.retry() / Net.close()         — попробовать снова / разойтись
 * ========================================================================== */
(function () {
  'use strict';

  // Сервер-знакомств. По умолчанию — бесплатный общедоступный PeerJS.
  // Свой можно подставить прямо в адресе:
  //   index.html?broker=wss://мой-сервер/peerjs%3Fkey=peerjs
  var BROKER = (function () {
    var m = /[?&]broker=([^&]+)/.exec(window.location.search || '');
    return m ? decodeURIComponent(m[1]) : 'wss://0.peerjs.com/peerjs?key=peerjs';
  })();

  var PREFIX = 'amnyam';          // общий «позывной», чтобы не пересечься с чужими
  var CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // без похожих 0/O и 1/I

  var OFFER_EVERY = 3000;         // как часто гость повторяет приглашение
  var RECONNECT_MIN = 800;        // через сколько пробовать связь снова
  var RECONNECT_MAX = 6000;

  // STUN подсказывают телефону его внешний адрес, TURN — запасной путь,
  // если напрямую пробиться не вышло (разные мобильные сети, строгий NAT).
  var ICE = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      {
        urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'],
        username: 'openrelayproject', credential: 'openrelayproject'
      }
    ]
  };

  var Net = {
    log: [],            // короткий журнал: что произошло со связью
    role: 'off',        // 'off' | 'host' | 'guest'
    state: 'idle',      // 'idle' | 'signal' | 'waiting' | 'connecting' | 'open' | 'error'
    code: '',
    error: '',
    detail: '',         // что происходит прямо сейчас — видно в комнате
    kind: 'webrtc',     // 'webrtc' | 'local'

    onMessage: null,
    onOpen: null,
    onClose: null,
    onStatus: null,

    isOpen: function () { return Net.state === 'open'; },

    /** Короткий код комнаты из четырёх знаков. */
    makeCode: function () {
      var s = '';
      for (var i = 0; i < 4; i++) s += CODE_ABC[(Math.random() * CODE_ABC.length) | 0];
      return s;
    },

    /** Код комнаты из ссылки (?room=КОД), если он там есть. */
    codeFromUrl: function () {
      var m = /[?&]room=([A-Za-z0-9]{3,8})/.exec(window.location.search || '');
      return m ? m[1].toUpperCase() : '';
    },

    /** Ссылка-приглашение для второго игрока. */
    inviteLink: function () {
      var base = window.location.href.split('#')[0].split('?')[0];
      return base + '?room=' + Net.code;
    },

    supported: function () {
      return typeof RTCPeerConnection !== 'undefined' || typeof BroadcastChannel !== 'undefined';
    }
  };

  /* ------------------------------------------------------------------------
   * Общее
   * ---------------------------------------------------------------------- */
  function status(state, text, detail) {
    Net.state = state;
    Net.error = text || '';
    if (detail != null) Net.detail = detail;
    if (Net.onStatus) Net.onStatus(state, Net.error);
  }

  function say(detail) {
    Net.detail = detail;
    if (Net.onStatus) Net.onStatus(Net.state, Net.error);
  }

  /** Записать событие в журнал — он виден в комнате и помогает найти затык. */
  function log(text) {
    var d = new Date();
    var t = ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
    Net.log.push(t + '  ' + text);
    if (Net.log.length > 12) Net.log.shift();
    if (Net.onStatus) Net.onStatus(Net.state, Net.error);
  }
  Net.note = log;

  function deliver(raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (Net.onMessage) Net.onMessage(msg);
  }

  /* ========================================================================
   * Способ 1: WebRTC + сервер-знакомств
   * ====================================================================== */
  var ws = null;          // связь с сервером-знакомств
  var pc = null;          // само соединение между телефонами
  var dc = null;          // канал, по которому летят сообщения игры
  // Второй, «быстрый» канал — для картинки мира и управления. Он не ждёт
  // потерявшиеся посылки: следующая всё равно свежее. В надёжном канале одна
  // потеря задерживает все сообщения за ней — у гостя из-за этого игра дёргалась.
  var fast = null;
  var beat = null;        // «я ещё тут» для сервера
  var reconnectTimer = null;
  var offerTimer = null;
  var attempts = 0;       // сколько раз подряд не вышло связаться
  var myId = '';          // мой позывной
  var mateId = '';        // позывной напарника
  var myCandidates = [];  // свои «адреса» — шлём их заново при каждой попытке
  var pending = [];       // чужие «адреса», пришедшие раньше времени

  function hostId() { return PREFIX + '-' + Net.code; }
  function guestId() { return PREFIX + '-' + Net.code + '-g'; }

  var pokeTimer = null;

  function wsSend(obj) {
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; }
    return false;
  }

  // Сервер PeerJS строго проверяет сообщения: без полей настоящей библиотеки
  // (type, connectionId, …) он молча закрывает соединение. Поэтому каждое
  // сообщение дополняем этими полями.
  var CONN_ID = 'dc_' + Math.random().toString(36).slice(2, 12);

  function peerPayload(extra) {
    var p = { type: 'data', connectionId: CONN_ID, browser: 'chrome' };
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) p[k] = extra[k];
    return p;
  }

  // «Стук» тоже должен выглядеть как настоящий адрес, иначе сервер его не пропустит
  var POKE_CANDIDATE = {
    candidate: 'candidate:1 1 udp 2122260223 192.168.1.5 54321 typ host generation 0',
    sdpMid: '0', sdpMLineIndex: 0
  };

  function relay(type, payload) {
    if (!mateId) return;
    wsSend({ type: type, dst: mateId, payload: peerPayload(payload) });
  }

  /* ----- связь с сервером-знакомств: открываем и держим ------------------- */
  function openSignal() {
    if (Net.role === 'off') return;
    clearTimeout(reconnectTimer);

    // Старое соединение (если осталось) закрываем молча
    if (ws) {
      try { ws.onclose = ws.onerror = ws.onmessage = null; ws.close(); } catch (e) { /* ничего */ }
      ws = null;
    }

    var token = Math.random().toString(36).slice(2, 10);
    var url = BROKER + '&id=' + encodeURIComponent(myId) + '&token=' + token + '&version=1.5.4';

    if (Net.state !== 'open') {
      status(Net.state === 'idle' ? 'signal' : Net.state, '',
        attempts ? 'восстанавливаем связь с сервером…' : 'подключаемся к серверу…');
    }

    try { ws = new WebSocket(url); } catch (e) {
      retryLater();
      return;
    }

    ws.onopen = function () {
      clearInterval(beat);
      beat = setInterval(function () { wsSend({ type: 'HEARTBEAT' }); }, 5000);
    };

    ws.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }

      try { handleSignal(m); } catch (err) {
        log('сбой: ' + (err && err.message ? err.message : err));
      }
    };

    ws.onerror = function () { /* разберёмся в onclose */ };

    ws.onclose = function () {
      clearInterval(beat);
      ws = null;
      if (Net.role === 'off') return;
      log('связь с сервером закрылась');
      if (Net.state !== 'open') retryLater();
    };
  }

  function handleSignal(m) {
    {
      switch (m.type) {
        case 'OPEN':
          attempts = 0;
          log('сервер принял, я ' + myId);
          onSignalReady();
          break;

        case 'ID-TAKEN':
          // Обычно это наш же прошлый вход, который сервер ещё не забыл
          log('имя занято: ' + myId);
          if (Net.role === 'guest') {
            // Вдруг в комнату уже заходил кто-то ещё — берём другое имя
            myId = guestId() + Math.random().toString(36).slice(2, 5);
          }
          say('имя занято прошлым входом, пробуем снова…');
          retryLater();
          break;

        case 'EXPIRE':
          // Того, кому мы писали, сейчас нет на связи. Не сдаёмся: он вернётся.
          log('сервер: «' + (m.src || 'напарник') + '» не на связи');
          if (Net.role === 'guest' && Net.state !== 'open') {
            say('хозяин комнаты пока не отвечает, продолжаем звать…');
          }
          break;

        case 'OFFER':
          mateId = m.src;
          log('пришло приглашение от ' + m.src);
          onOffer(m.payload);
          break;

        case 'ANSWER':
          log('пришёл ответ хозяина');
          onAnswer(m.payload);
          break;

        case 'CANDIDATE':
          // Хозяин может просто «постучаться» — тогда гость зовёт его заново
          if (m.payload && m.payload.poke) {
            if (Net.role === 'guest' && Net.state !== 'open') {
              log('хозяин на связи — шлём приглашение');
              mateId = m.src;
              sendOffer();
            }
            break;
          }
          var cand = m.payload && m.payload.candidate;
          if (!cand) break;
          if (pc && pc.remoteDescription) pc.addIceCandidate(cand).catch(function () {});
          else pending.push(cand);
          break;

        case 'LEAVE':
          if (Net.state !== 'open') say('напарник вышел');
          break;
      }
    }
  }

  function retryLater() {
    if (Net.role === 'off') return;
    attempts++;
    var wait = Math.min(RECONNECT_MAX, RECONNECT_MIN * Math.pow(1.6, Math.min(attempts, 6)));
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(openSignal, wait);
  }

  /** Сервер нас принял. */
  function onSignalReady() {
    if (Net.role === 'host') {
      status('waiting', '', 'комната открыта — ждём второго игрока');
      // Не только ждём, но и сами стучимся: вдруг приглашение гостя потерялось
      clearInterval(pokeTimer);
      pokeTimer = setInterval(function () {
        if (Net.state === 'open') { clearInterval(pokeTimer); return; }
        wsSend({ type: 'CANDIDATE', dst: guestId(), payload: peerPayload({ candidate: POKE_CANDIDATE, poke: 1 }) });
      }, 3000);
    } else {
      mateId = hostId();
      status('connecting', '', 'зовём хозяина комнаты…');
      log('зовём хозяина: ' + mateId);
      startOffer();
    }
  }

  /* ----- гость: зовём хозяина и повторяем, пока не ответит ---------------- */
  function startOffer() {
    makePeer();
    bindChannel(pc.createDataChannel('game', { ordered: true }));
    bindFast(pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 }));

    pc.createOffer()
      .then(function (offer) { return pc.setLocalDescription(offer); })
      .then(function () {
        sendOffer();
        clearInterval(offerTimer);
        offerTimer = setInterval(sendOffer, OFFER_EVERY);
      })
      .catch(function () { say('браузер не смог начать соединение'); });
  }

  function sendOffer() {
    if (Net.state === 'open') { clearInterval(offerTimer); return; }
    if (!pc || !pc.localDescription) return;
    var offer = peerPayload({
      sdp: pc.localDescription, label: CONN_ID, reliable: true, serialization: 'json'
    });
    if (!wsSend({ type: 'OFFER', dst: mateId, payload: offer })) {
      log('приглашение не ушло — нет связи с сервером');
      return;
    }
    log('отправили приглашение (' + myCandidates.length + ' адресов)');
    // Заодно повторяем свои «адреса» — вдруг хозяин только что вернулся
    for (var i = 0; i < myCandidates.length; i++) {
      relay('CANDIDATE', { candidate: myCandidates[i] });
    }
  }

  /* ----- соединение между телефонами ------------------------------------- */
  function makePeer() {
    closePeer();
    myCandidates = [];
    pending = [];
    pc = new RTCPeerConnection(ICE);

    pc.onicecandidate = function (e) {
      // Пустой «конец списка» сервер считает ошибкой и рвёт связь — не шлём его
      if (!e.candidate || !e.candidate.candidate) return;
      myCandidates.push(e.candidate);
      relay('CANDIDATE', { candidate: e.candidate });
    };

    pc.oniceconnectionstatechange = function () {
      if (!pc || Net.state === 'open') return;
      log('поиск пути: ' + pc.iceConnectionState);
      if (pc.iceConnectionState === 'checking') say('ищем короткий путь между телефонами…');
    };

    pc.onconnectionstatechange = function () {
      if (!pc) return;
      if (pc.connectionState === 'failed') {
        if (Net.role === 'guest') {
          say('прямая дорожка не нашлась, пробуем другую…');
          startOffer();                 // пробуем заново, уже через TURN
        } else {
          say('напарник не смог достучаться, ждём следующую попытку');
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        if (Net.state === 'open') {
          status('idle', '', 'связь с напарником прервалась');
          if (Net.onClose) Net.onClose();
        }
      }
    };
  }

  function closePeer() {
    try { if (dc) { dc.onopen = dc.onmessage = dc.onclose = null; dc.close(); } } catch (e) { /* ничего */ }
    try { if (fast) { fast.onmessage = null; fast.close(); } } catch (e) { /* ничего */ }
    try { if (pc) { pc.onicecandidate = pc.onconnectionstatechange = null; pc.close(); } } catch (e) { /* ничего */ }
    dc = null;
    fast = null;
    pc = null;
  }

  function bindChannel(channel) {
    dc = channel;
    dc.onopen = function () {
      clearInterval(offerTimer);
      clearInterval(pokeTimer);
      attempts = 0;
      log('соединились напрямую!');
      status('open', '', 'играем!');
      if (Net.onOpen) Net.onOpen();
      // Сервер-знакомств больше не нужен, но связь с ним не рвём:
      // пригодится, если соединение придётся собирать заново.
    };
    dc.onmessage = function (ev) { deliver(ev.data); };
    dc.onclose = function () {
      if (Net.state === 'open') {
        status('idle', '', 'напарник отключился');
        if (Net.onClose) Net.onClose();
      }
    };
  }

  function bindFast(channel) {
    fast = channel;
    fast.onmessage = function (ev) { deliver(ev.data); };
  }

  function flushCandidates() {
    while (pending.length) {
      var cand = pending.shift();
      if (pc) pc.addIceCandidate(cand).catch(function () {});
    }
  }

  /** Хозяину пришло приглашение от гостя. */
  function onOffer(payload) {
    if (!payload || !payload.sdp) return;
    if (Net.state === 'open') return;          // уже играем — второе не нужно

    // Гость повторяет одно и то же приглашение, пока не получит ответ.
    // Уже начатое соединение не ломаем — просто ещё раз отправляем ответ.
    if (pc && pc.remoteDescription && pc.localDescription &&
        pc.remoteDescription.sdp === payload.sdp.sdp) {
      relay('ANSWER', { sdp: pc.localDescription });
      return;
    }

    status('connecting', '', 'второй игрок нашёлся, соединяемся…');
    log('отвечаем напарнику');
    makePeer();
    pc.ondatachannel = function (e) {
      if (e.channel.label === 'fast') bindFast(e.channel);
      else bindChannel(e.channel);
    };

    pc.setRemoteDescription(payload.sdp)
      .then(function () {
        flushCandidates();
        return pc.createAnswer();
      })
      .then(function (answer) {
        return pc.setLocalDescription(answer).then(function () {
          relay('ANSWER', { sdp: pc.localDescription });
        });
      })
      .catch(function () { say('не получилось принять напарника, ждём новой попытки'); });
  }

  /** Гость получил ответ хозяина. */
  function onAnswer(payload) {
    if (!payload || !payload.sdp || !pc) return;
    if (pc.signalingState === 'stable') return;    // ответ на старое приглашение
    say('хозяин ответил, соединяемся…');
    pc.setRemoteDescription(payload.sdp)
      .then(flushCandidates)
      .catch(function () { /* попробуем со следующим приглашением */ });
  }

  /* ----- телефон вернулся из «сна» --------------------------------------- */
  function wakeUp() {
    if (Net.role === 'off' || Net.kind === 'local') return;
    if (Net.state === 'open') return;
    if (!ws || ws.readyState > 1) {
      attempts = 0;
      openSignal();
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) wakeUp();
    });
    window.addEventListener('online', wakeUp);
    window.addEventListener('focus', wakeUp);
    window.addEventListener('pageshow', wakeUp);
  }

  /* ========================================================================
   * Способ 2: две вкладки одного браузера (для проверки без интернета)
   * ====================================================================== */
  var bc = null;

  function localStart(role) {
    bc = new BroadcastChannel('am-nyam-' + Net.code);
    Net.kind = 'local';
    status(role === 'host' ? 'waiting' : 'connecting', '', 'проверочный режим: две вкладки');

    bc.onmessage = function (ev) {
      var d = ev.data;
      if (!d || d.from === role) return;
      if (d.hi) {
        if (role === 'host') bc.postMessage({ from: role, hi: 1 });
        if (Net.state !== 'open') {
          status('open', '', 'играем!');
          if (Net.onOpen) Net.onOpen();
        }
        return;
      }
      if (d.msg != null) deliver(d.msg);
    };

    if (role === 'guest') bc.postMessage({ from: role, hi: 1 });
    else setTimeout(function () { bc.postMessage({ from: role, hi: 1 }); }, 200);
  }

  function useLocal() {
    return /[?&]net=local/.test(window.location.search || '') &&
      typeof BroadcastChannel !== 'undefined';
  }

  /* ========================================================================
   * Открытый интерфейс
   * ====================================================================== */

  /** Создать комнату. Код появится в Net.code. */
  Net.host = function (code) {
    Net.close();
    Net.role = 'host';
    Net.code = (code || Net.makeCode()).toUpperCase();
    mateId = '';
    attempts = 0;

    if (useLocal()) { localStart('host'); return Net.code; }

    Net.kind = 'webrtc';
    myId = hostId();
    openSignal();
    return Net.code;
  };

  /** Войти в комнату по коду. */
  Net.join = function (code) {
    Net.close();
    Net.role = 'guest';
    Net.code = (code || '').toUpperCase();
    if (!Net.code) { status('error', 'нужен код комнаты'); return; }
    mateId = '';
    attempts = 0;

    if (useLocal()) { localStart('guest'); return; }

    Net.kind = 'webrtc';
    myId = guestId();          // предсказуемое имя — хозяин может позвать сам
    openSignal();
  };

  /** Попробовать ещё раз, не выходя из комнаты. */
  Net.retry = function () {
    if (Net.role === 'off' || Net.kind === 'local') return;
    attempts = 0;
    closePeer();
    clearInterval(offerTimer);
    openSignal();
  };

  /** Отправить сообщение напарнику. */
  Net.send = function (obj) {
    var raw = JSON.stringify(obj);
    if (bc) { bc.postMessage({ from: Net.role, msg: raw }); return true; }
    if (dc && dc.readyState === 'open') {
      try { dc.send(raw); return true; } catch (e) { return false; }
    }
    return false;
  };

  /**
   * Отправить то, что устаревает за долю секунды (картинка мира, управление).
   * Может потеряться — зато никогда не задерживает остальные сообщения.
   */
  Net.sendFast = function (obj) {
    if (bc || !fast || fast.readyState !== 'open') return Net.send(obj);
    try { fast.send(JSON.stringify(obj)); return true; } catch (e) { return Net.send(obj); }
  };

  /* ------------------------------------------------------------------------
   * Проверка связи — чтобы было видно, что именно не работает
   * ---------------------------------------------------------------------- */
  /**
   * Прогоняет три проверки и отдаёт список строчек {ok, text}:
   *   1. открыт ли сайт по https (иначе браузер не даст соединяться);
   *   2. умеет ли браузер прямые соединения;
   *   3. отвечает ли сервер-знакомств.
   */
  Net.diagnose = function (done) {
    var out = [];
    var https = window.location.protocol === 'https:' ||
      /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
    out.push({ ok: https, text: https ? 'сайт открыт по https' : 'сайт открыт НЕ по https — связь работать не будет' });

    var rtc = typeof RTCPeerConnection !== 'undefined';
    out.push({ ok: rtc, text: rtc ? 'браузер умеет прямые соединения' : 'браузер не умеет прямые соединения' });

    if (!https || !rtc) { done(out); return; }

    var probe = null, finished = false;
    var started = Date.now();
    var id = PREFIX + '-test-' + Math.random().toString(36).slice(2, 8);
    var url = BROKER + '&id=' + encodeURIComponent(id) +
      '&token=' + Math.random().toString(36).slice(2, 10) + '&version=1.5.4';

    function finish(ok, text) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { if (probe) { probe.onclose = null; probe.close(); } } catch (e) { /* ничего */ }
      out.push({ ok: ok, text: text });
      done(out);
    }

    var timer = setTimeout(function () {
      finish(false, 'сервер знакомств не ответил за 10 секунд');
    }, 10000);

    try { probe = new WebSocket(url); } catch (e) {
      finish(false, 'браузер не смог открыть соединение с сервером');
      return;
    }

    probe.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'OPEN') finish(true, 'сервер знакомств отвечает (' + (Date.now() - started) + ' мс)');
    };
    probe.onerror = function () { finish(false, 'сервер знакомств недоступен из этой сети'); };
    probe.onclose = function () { finish(false, 'сервер знакомств закрыл соединение'); };
  };

  /** Разойтись и всё закрыть. */
  Net.close = function () {
    clearInterval(beat);
    clearInterval(offerTimer);
    clearInterval(pokeTimer);
    clearTimeout(reconnectTimer);
    closePeer();
    try { if (ws) { ws.onclose = null; ws.close(); } } catch (e) { /* ничего */ }
    try { if (bc) bc.close(); } catch (e) { /* ничего */ }
    ws = null;
    bc = null;
    pending = [];
    myCandidates = [];
    mateId = '';
    myId = '';
    attempts = 0;
    Net.role = 'off';
    Net.code = '';
    Net.state = 'idle';
    Net.error = '';
    Net.detail = '';
    Net.log = [];
  };

  window.Net = Net;
})();

