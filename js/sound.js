/* ============================================================================
 * js/sound.js — звуки игры.
 *
 * Никаких звуковых файлов: всё синтезируется прямо в браузере (Web Audio).
 * Поэтому игра остаётся лёгкой, работает из одного файла и с file://.
 *
 * Каждый звук — это короткая нотка или щелчок с плавным затуханием:
 *   • blip   — чистый тон (клики, подбор конфет);
 *   • sweep  — тон, съезжающий вверх или вниз (удар, прыжок, победа);
 *   • noise  — шорох (удар по слизню, взрыв);
 *   • chord  — несколько нот сразу (награда, победа над боссом).
 *
 * Звук включается только после первого касания или нажатия клавиши —
 * так требуют браузеры. Кнопка 🔊 в шапке выключает и включает его,
 * выбор запоминается.
 * ========================================================================== */
(function () {
  'use strict';

  var KEY = 'am-nyam-sound';
  var ctx = null;
  var master = null;
  var noiseBuffer = null;
  var ready = false;

  var Sound = {
    on: true,
    volume: 0.5,

    /** Создать звуковую машинку (вызывается при первом действии игрока). */
    wake: function () {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = Sound.volume;
        master.connect(ctx.destination);

        // Кусочек шороха — из него делаются удары и взрывы
        var len = Math.floor(ctx.sampleRate * 0.4);
        noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = noiseBuffer.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        ready = true;
      } catch (e) { ready = false; }
    },

    toggle: function () {
      Sound.on = !Sound.on;
      try { localStorage.setItem(KEY, Sound.on ? '1' : '0'); } catch (e) { /* ладно */ }
      if (master) master.gain.value = Sound.on ? Sound.volume : 0;
      Sound.refreshButton();
      if (Sound.on) Sound.play('click');
      return Sound.on;
    },

    refreshButton: function () {
      var btns = document.querySelectorAll('.btn-sound');
      for (var i = 0; i < btns.length; i++) {
        btns[i].textContent = Sound.on ? '🔊' : '🔇';
        btns[i].title = Sound.on ? 'Выключить звук' : 'Включить звук';
      }
    },

    init: function () {
      try { Sound.on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* ладно */ }

      // Браузер разрешает звук только после действия игрока
      var wake = function () { Sound.wake(); };
      window.addEventListener('pointerdown', wake, { once: false });
      window.addEventListener('keydown', wake, { once: false });

      var btns = document.querySelectorAll('.btn-sound');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          e.stopPropagation();
          Sound.wake();
          Sound.toggle();
        });
      }
      Sound.refreshButton();
    },

    /* --------------------------------------------------------------------
     * Кирпичики
     * ------------------------------------------------------------------ */
    tone: function (freq, dur, opts) {
      if (!Sound.on || !ready) return;
      opts = opts || {};
      var t0 = ctx.currentTime + (opts.delay || 0);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);

      var vol = (opts.volume == null ? 0.25 : opts.volume);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.3));
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },

    noise: function (dur, opts) {
      if (!Sound.on || !ready) return;
      opts = opts || {};
      var t0 = ctx.currentTime + (opts.delay || 0);
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      var filter = ctx.createBiquadFilter();
      filter.type = opts.filter || 'bandpass';
      filter.frequency.setValueAtTime(opts.freq || 900, t0);
      if (opts.to) filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.to), t0 + dur);
      filter.Q.value = opts.q || 1.2;

      var gain = ctx.createGain();
      var vol = (opts.volume == null ? 0.2 : opts.volume);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    },

    chord: function (freqs, dur, opts) {
      opts = opts || {};
      for (var i = 0; i < freqs.length; i++) {
        Sound.tone(freqs[i], dur, {
          type: opts.type || 'triangle',
          volume: (opts.volume == null ? 0.16 : opts.volume),
          delay: (opts.delay || 0) + i * (opts.spread == null ? 0.07 : opts.spread)
        });
      }
    },

    /* --------------------------------------------------------------------
     * Готовые звуки игры
     * ------------------------------------------------------------------ */
    play: function (name, arg) {
      if (!Sound.on) return;
      if (!ready) Sound.wake();
      if (!ready) return;
      var f = BANK[name];
      if (f) f(arg);
    }
  };

  var BANK = {
    // --- бой ---
    swing: function () {                     // взмах мечом
      Sound.noise(0.12, { freq: 1700, to: 700, volume: 0.1, q: 0.8 });
    },
    hit: function (combo) {                  // попали по слизню
      var base = 320 + (combo || 0) * 60;
      Sound.tone(base, 0.1, { type: 'square', to: base * 0.6, volume: 0.14 });
      Sound.noise(0.09, { freq: 1200, to: 400, volume: 0.16 });
    },
    crit: function () {
      Sound.tone(760, 0.16, { type: 'square', to: 420, volume: 0.18 });
      Sound.noise(0.14, { freq: 2200, to: 500, volume: 0.18 });
    },
    pop: function () {                       // слизень лопнул
      Sound.tone(520, 0.14, { type: 'triangle', to: 180, volume: 0.14 });
      Sound.noise(0.12, { freq: 700, to: 220, volume: 0.12 });
    },
    boom: function () {                      // взрыв бомбочки
      Sound.noise(0.35, { freq: 500, to: 90, volume: 0.3, filter: 'lowpass', q: 0.7 });
      Sound.tone(120, 0.3, { type: 'sine', to: 50, volume: 0.2 });
    },
    dash: function () {                      // рывок
      Sound.noise(0.16, { freq: 600, to: 2400, volume: 0.12, q: 0.7 });
    },
    heavy: function () {                     // заряженный удар или выпад
      Sound.noise(0.2, { freq: 900, to: 300, volume: 0.18, q: 0.8 });
      Sound.tone(220, 0.18, { type: 'triangle', to: 110, volume: 0.16 });
    },
    charged: function () {                   // заряд набран
      Sound.tone(880, 0.12, { type: 'triangle', to: 1320, volume: 0.12 });
    },
    streak: function () {                    // отметка серии
      Sound.chord([784, 988], 0.2, { spread: 0.05, volume: 0.11 });
    },
    superready: function () {                // шкала суперприёма полная
      Sound.chord([523, 784, 1047], 0.4, { spread: 0.08, volume: 0.13 });
    },
    super: function () {                     // суперприём!
      Sound.tone(180, 0.5, { type: 'sawtooth', to: 520, volume: 0.14 });
      Sound.chord([659, 880, 1175], 0.5, { spread: 0.06, volume: 0.13, delay: 0.1 });
    },
    star: function () {                      // упала звезда звездопада
      Sound.tone(1200, 0.12, { type: 'sine', to: 500, volume: 0.1 });
      Sound.noise(0.1, { freq: 1500, to: 400, volume: 0.1 });
    },
    shot: function () {                      // слизень плюнул
      Sound.tone(300, 0.14, { type: 'sawtooth', to: 160, volume: 0.08 });
    },
    hurt: function () {                      // герою попало
      Sound.tone(300, 0.22, { type: 'sawtooth', to: 120, volume: 0.2 });
    },
    dodge: function () {
      Sound.tone(900, 0.1, { type: 'sine', to: 1500, volume: 0.1 });
    },
    down: function () {                      // герой упал
      Sound.tone(420, 0.5, { type: 'triangle', to: 90, volume: 0.22 });
    },
    revive: function () {                    // подняли напарника
      Sound.chord([523, 659, 784], 0.35, { spread: 0.06, volume: 0.14 });
    },

    // --- добыча ---
    candy: function () {
      Sound.tone(880 + Math.random() * 140, 0.07, { type: 'sine', volume: 0.09 });
    },
    heart: function () {
      Sound.chord([659, 880], 0.22, { spread: 0.05, volume: 0.13 });
    },
    dust: function () {                      // звёздная пыль
      Sound.chord([784, 1047, 1319, 1568], 0.5, { spread: 0.06, volume: 0.13 });
    },

    // --- события ---
    wave: function () {
      Sound.chord([392, 523], 0.3, { spread: 0.08, volume: 0.12 });
    },
    boss: function () {                      // появился босс
      Sound.tone(160, 0.7, { type: 'sawtooth', to: 90, volume: 0.2 });
      Sound.chord([196, 233, 294], 0.6, { spread: 0.09, volume: 0.12, delay: 0.15 });
    },
    bossdown: function () {
      Sound.chord([523, 659, 784, 1047], 0.8, { spread: 0.1, volume: 0.16 });
      Sound.noise(0.5, { freq: 900, to: 160, volume: 0.18 });
    },
    win: function () {
      Sound.chord([523, 659, 784, 1047, 1319], 0.9, { spread: 0.11, volume: 0.15 });
    },
    lose: function () {
      Sound.tone(392, 0.35, { type: 'triangle', to: 330, volume: 0.18 });
      Sound.tone(330, 0.35, { type: 'triangle', to: 262, volume: 0.18, delay: 0.28 });
      Sound.tone(262, 0.6, { type: 'triangle', to: 160, volume: 0.18, delay: 0.56 });
    },
    levelup: function () {
      Sound.chord([659, 880, 1109], 0.45, { spread: 0.07, volume: 0.15 });
    },

    // --- меню и домик ---
    click: function () { Sound.tone(660, 0.06, { type: 'sine', volume: 0.1 }); },
    buy: function () { Sound.chord([523, 784], 0.25, { spread: 0.06, volume: 0.14 }); },
    dress: function () { Sound.chord([587, 880], 0.3, { spread: 0.07, volume: 0.13 }); },
    eat: function () {
      Sound.tone(240, 0.12, { type: 'triangle', to: 380, volume: 0.14 });
      Sound.tone(300, 0.12, { type: 'triangle', to: 460, volume: 0.12, delay: 0.12 });
    },
    sleep: function () {
      Sound.tone(330, 0.6, { type: 'sine', to: 220, volume: 0.13 });
      Sound.tone(262, 0.7, { type: 'sine', to: 180, volume: 0.11, delay: 0.3 });
    },
    step: function () {
      Sound.noise(0.05, { freq: 420, volume: 0.05, filter: 'lowpass' });
    }
  };

  Sound.bank = BANK;
  window.Sound = Sound;
})();

