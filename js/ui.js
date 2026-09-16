/* ============================================================================
 * js/ui.js — то, что видно поверх игры: HUD, пауза и экран итогов.
 *
 *   • HUD      — полоска волны вверху арены: какая волна и сколько слизней
 *                осталось; в бесконечном режиме — номер волны и рекорд;
 *   • Пауза    — Esc или кнопка ⏸: игра замирает, можно выдохнуть,
 *                заглянуть в лавку или выйти в меню;
 *   • Итоги    — после поражения (и после бесконечной волны) показываем,
 *                сколько продержались, кого победили и сколько собрали.
 *
 * Всё рисование HUD идёт на канвасе, а пауза и итоги — обычные экраны DOM,
 * как меню и лавка.
 * ========================================================================== */
(function () {
  'use strict';

  var UI = {
    lastRun: null,        // чем закончился прошлый забег (для кнопки «ещё раз»)

    /* ----------------------------------------------------------------------
     * Пауза
     * -------------------------------------------------------------------- */
    canPause: function () {
      return Game.state === 'playing';
    },

    /** fromMate === true — паузу поставил напарник (сообщение по сети). */
    pause: function (fromMate) {
      if (!UI.canPause()) return;
      // Вдвоём пауза общая: игра встаёт у обоих
      if (fromMate !== true && window.Online && Online.active && Net.isOpen()) Net.send({ t: 'pause' });
      Game.state = 'paused';
      render(fromMate === true);
      Game.showScreen('pause');
      document.getElementById('topbar').hidden = true;
      if (window.Sound) Sound.play('click');
    },

    resume: function (fromMate) {
      if (Game.state !== 'paused') return;
      if (fromMate !== true && window.Online && Online.active && Net.isOpen()) Net.send({ t: 'resume' });
      Game.state = 'playing';
      Game.showScreen(null);
      document.getElementById('topbar').hidden = false;
      if (window.Sound) Sound.play('click');
    },

    toggle: function () {
      if (Game.state === 'paused') UI.resume();
      else UI.pause();
    },

    /* ----------------------------------------------------------------------
     * Итоги забега
     * -------------------------------------------------------------------- */
    /**
     * kind: 'defeat' — герои устали; 'endless' — бесконечная волна кончилась;
     *       'final'  — пройден двадцатый мир.
     */
    showResult: function (kind) {
      var s = Game.stats;
      // Итоги у напарника те же, что у хозяина: считал забег он
      if (window.Online && Online.isHost()) {
        Online.command('result', {
          kind: kind, stats: s, wave: Enemies.wave, ws: Enemies.state, endless: !!Game.endless
        });
      }
      UI.lastRun = { mode: Game.mode, world: Game.world, endless: !!Game.endless };

      var titles = {
        defeat: ['Герои устали…', 'ничего страшного — отдохнём и попробуем снова'],
        endless: ['Бесконечная волна окончена', 'вы держались очень долго!'],
        final: ['Все двадцать миров пройдены! ♥', 'Король конфет побеждён — вы лучшие']
      };
      var t = titles[kind] || titles.defeat;

      document.getElementById('result-title').textContent = t[0];
      document.getElementById('result-sub').textContent = t[1];
      document.getElementById('screen-result').classList.toggle('is-good', kind !== 'defeat');

      // Рекорд бесконечного режима
      var recordLine = '';
      if (Game.endless) {
        var reached = Enemies.wave;
        if (reached > Shop.best.endless) {
          Shop.best.endless = reached;
          recordLine = 'новый рекорд!';
          Shop.save();
        } else {
          recordLine = 'рекорд: ' + Shop.best.endless;
        }
      }

      var rows = [
        ['⏱', 'продержались', formatTime(s.time)],
        ['🌊', Game.endless ? ('волна' + (recordLine ? ' · ' + recordLine : '')) : 'волн пройдено',
          String(Game.endless ? Enemies.wave : Math.max(0, Enemies.wave - (Enemies.state === 'done' ? 0 : 1)))],
        ['💥', 'побеждено слизней', String(s.kills)],
        ['🔥', 'лучшая серия ударов', String(s.bestStreak || 0)],
        ['🍬', 'конфет собрано', String(s.candyTotal)],
        ['✦', 'звёздной пыли', String(s.dust)],
        ['💔', 'пропущено ударов', String(s.damage)]
      ];

      var box = document.getElementById('result-stats');
      box.innerHTML = '';
      rows.forEach(function (r) {
        var d = document.createElement('div');
        d.className = 'result-row';
        d.innerHTML = '<i class="result-ico">' + r[0] + '</i>' +
          '<span class="result-label">' + r[1] + '</span>' +
          '<b class="result-value">' + r[2] + '</b>';
        box.appendChild(d);
      });

      // В сетевой игре «Ещё раз» может нажать любой — второй подтвердит
      var inRoom = !!(window.Online && Online.active);
      var netHint = document.getElementById('result-net');
      if (netHint) netHint.hidden = !inRoom;
      var homeBtn = document.getElementById('result-home');
      if (homeBtn) homeBtn.hidden = inRoom;          // домой — из комнаты
      var menuBtn = document.getElementById('result-menu');
      if (menuBtn) menuBtn.textContent = inRoom ? 'В комнату' : 'В меню';

      Game.state = 'result';
      Game.showScreen('result');
      document.getElementById('topbar').hidden = true;
    },

    again: function () {
      var r = UI.lastRun;
      if (!r) { Game.toMenu(); return; }
      if (window.Online && Online.active) {
        Online.requestStart(r.endless ? { endless: true } : { world: r.world });
        return;
      }
      if (r.endless && window.Endless) Endless.start(r.mode);
      else Game.startGame(r.mode, r.world);
    },

    /* ----------------------------------------------------------------------
     * HUD на канвасе
     * -------------------------------------------------------------------- */
    drawHud: function (c) {
      if (Game.state !== 'playing' && Game.state !== 'paused') return;
      var W = Game.W;

      // Уголки героев: шкала суперприёма, серия и рывок
      for (var hi = 0; hi < Players.list.length; hi++) drawHeroPanel(c, Players.list[hi]);

      // Полоска волны: сколько слизней этой волны уже побеждено
      var label, done = 0, total = 0;
      if (Enemies.state === 'boss') {
        return;                       // во время босса вверху и так его полоса
      } else if (Game.endless) {
        label = 'Волна ' + Enemies.wave +
          (Shop.best.endless ? '  ·  рекорд ' + Shop.best.endless : '');
        total = Enemies.waveTotal || 1;
        done = total - Enemies.queue.length - Enemies.list.length;
      } else {
        label = 'Волна ' + Math.max(1, Enemies.wave) + ' из ' + Config.world(Game.world).waves.length;
        total = Enemies.waveTotal || 1;
        done = total - Enemies.queue.length - Enemies.list.length;
      }
      var k = Math.max(0, Math.min(1, total ? done / total : 0));

      // Ниже верхней панели, выше арены — там пусто
      var bw = 260, bh = 9;
      var x = W / 2 - bw / 2, y = 84;

      c.save();
      c.globalAlpha = 0.92;
      c.font = '900 14px Nunito, "Segoe UI", sans-serif';
      c.textAlign = 'center';
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(255, 250, 244, 0.85)';
      c.strokeText(label, W / 2, y - 8);
      c.fillStyle = '#5b3b3f';
      c.fillText(label, W / 2, y - 8);

      Game.roundRect(c, x, y, bw, bh, bh / 2);
      c.fillStyle = 'rgba(91, 59, 63, 0.28)';
      c.fill();
      Game.roundRect(c, x, y, Math.max(bh, bw * k), bh, bh / 2);
      c.fillStyle = '#8fd14f';
      c.fill();
      c.restore();
    },

    /* ----------------------------------------------------------------------
     * Кнопки
     * -------------------------------------------------------------------- */
    init: function () {
      on('pause-resume', UI.resume);
      on('pause-shop', function () {
        Game.state = 'playing';        // чтобы лавка вернулась в игру
        Shop.open('game');
      });
      on('pause-menu', function () { Game.toMenu(); });
      on('btn-pause', UI.toggle);

      on('result-again', UI.again);
      on('result-home', function () {
        if (window.Home) Home.open('menu');
        else Game.toMenu();
      });
      on('result-menu', function () { Game.toMenu(); });
    }
  };

  /**
   * Панелька героя в верхнем углу (Ам Ням слева, кошечка справа):
   * шкала суперприёма, сколько раз он ещё остался, серия и готов ли рывок.
   */
  function drawHeroPanel(c, p) {
    var left = p.hero === 'omnom';
    var w = 196, h = 50;
    // Во время босса наверху его полоса здоровья — опускаемся под неё
    var x = left ? 14 : Game.W - 14 - w, y = (window.Boss && Boss.current()) ? 104 : 58;
    var touch = window.Touch && Touch.active;
    var mine = !(window.Online && Online.active) || !p.isRemote;

    var ready = Players.superReady(p);
    var spent = p.superUsed >= p.superCharges;
    var k = spent ? 0 : Math.min(1, p.superMeter || 0);

    c.save();
    c.globalAlpha = 0.9;
    c.fillStyle = 'rgba(255, 250, 244, 0.88)';
    Game.roundRect(c, x, y, w, h, 14);
    c.fill();
    c.globalAlpha = 1;

    // Строка 1: имя и подсказка
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.font = '900 12px Nunito, "Segoe UI", sans-serif';
    c.fillStyle = p.color;
    c.fillText(p.name, x + 10, y + 12);

    var left2 = spent ? 'суперприём был' :
      (ready ? (mine && !touch ? '★ готов! жми Q' : '★ готов!') :
        '★ суперприём' + (p.superCharges > 1 ? ' ×' + (p.superCharges - p.superUsed) : ''));
    c.textAlign = 'right';
    c.font = '800 11px Nunito, "Segoe UI", sans-serif';
    c.fillStyle = ready ? '#d08a00' : '#8a6a6e';
    c.fillText(left2, x + w - 10, y + 12);

    // Строка 2: шкала суперприёма
    var bx = x + 10, by = y + 22, bw = w - 20, bh = 9;
    Game.roundRect(c, bx, by, bw, bh, bh / 2);
    c.fillStyle = 'rgba(91, 59, 63, 0.2)';
    c.fill();
    if (k > 0) {
      Game.roundRect(c, bx, by, Math.max(bh, bw * k), bh, bh / 2);
      c.fillStyle = ready ? (Math.sin(Game.time * 8) > 0 ? '#ffcf3e' : '#ffe58a') : '#c9a6ff';
      c.fill();
    }

    // Строка 3: серия и рывок
    c.font = '800 11px Nunito, "Segoe UI", sans-serif';
    c.textAlign = 'left';
    c.fillStyle = p.streak >= 10 ? '#e0762a' : '#8a6a6e';
    c.fillText('серия ' + (p.streak || 0), x + 10, y + 41);

    // Перезарядку рывка знает только тот, кто им управляет
    if (!mine) { c.restore(); return; }
    c.textAlign = 'right';
    var dashReady = !(p.dashCd > 0);
    c.fillStyle = dashReady ? '#4e8a2a' : '#b0a0a3';
    c.fillText(dashReady ? '» рывок готов' : '» рывок ' + p.dashCd.toFixed(1) + 'с', x + w - 10, y + 41);
    c.restore();
  }

  function on(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function render(fromMate) {
    var el = document.getElementById('pause-where');
    if (!el) return;
    el.textContent = (Game.endless
      ? 'Бесконечная волна · волна ' + Enemies.wave
      : 'Мир ' + Game.world + ' · ' + Config.world(Game.world).name) +
      (fromMate ? ' · паузу поставил напарник' : '');
    // Вдвоём лавка — в комнате, а «В меню» ведёт обоих в комнату
    var inRoom = !!(window.Online && Online.active);
    var shopBtn = document.getElementById('pause-shop');
    if (shopBtn) shopBtn.hidden = inRoom;
    var menuBtn = document.getElementById('pause-menu');
    if (menuBtn) menuBtn.textContent = inRoom ? 'В комнату' : 'В меню';
  }

  /* ----------------------------------------------------------------------
   * Главный экран: сколько у героя урона, защиты и сердечек и откуда они
   * -------------------------------------------------------------------- */
  var SOURCE = {
    weapon: 'оружие', level: 'прокачка', gear: 'вещи', perks: 'улучшения',
    card: 'карточка', costume: 'наряд', home: 'домик'
  };

  function round1(v) { return String(Math.round(v * 10) / 10); }
  function pct(v) { return Math.round(v * 100) + '%'; }

  function statRow(icon, title, baseWord, stat, fmt, names) {
    var html = '<div class="stat-row">' +
      '<span class="stat-name">' + icon + ' ' + title + '</span>' +
      '<span class="stat-parts">' +
      '<span class="stat-base">' + baseWord + ' ' + fmt(stat.base) + '</span>';
    stat.parts.forEach(function (part) {
      var hint = '';
      if (part.id === 'weapon') hint = names.weapon;
      else if (part.id === 'level') hint = names.weapon + ' +' + names.level;
      else if (part.id === 'costume') hint = names.costume;
      html += '<span class="stat-add' + (part.add < 0 ? ' is-minus' : '') + '"' +
        (hint ? ' title="' + hint + '"' : '') + '>' +
        (part.add < 0 ? '−' : '+') + fmt(Math.abs(part.add)) + ' ' + SOURCE[part.id] + '</span>';
    });
    if (!stat.parts.length) html += '<span class="stat-none">бонусов нет</span>';
    return html + '</span><span class="stat-total">итого ' + fmt(stat.total) + '</span></div>';
  }

  UI.renderMenuStats = function () {
    if (!window.Upgrades || !window.Shop) return;
    ['omnom', 'cat'].forEach(function (hero) {
      var box = document.getElementById('stats-' + hero);
      if (!box) return;
      var s = Upgrades.sheet(hero);
      box.innerHTML =
        statRow('⚔', 'Урон', 'обычный', s.damage, round1, s.names) +
        statRow('🛡', 'Защита', 'обычная', s.dodge, pct, s.names) +
        statRow('♥', 'Сердечки', 'обычно', s.hp, String, s.names);
    });
  };

  UI.formatTime = formatTime;
  window.UI = UI;
})();

