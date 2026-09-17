/* ============================================================================
 * js/worldmap.js — карта двадцати четырёх миров.
 *
 * После выбора режима («Один игрок» или «Двое») открывается карта: шесть краёв
 * по четыре мира. Пройденные отмечены звёздочкой, следующий открывается после
 * победы, остальные закрыты на замок. Любой пройденный мир можно переиграть —
 * так удобнее копить конфеты на лавку.
 *
 * Пройденные миры сохраняются в памяти браузера вместе с остальным прогрессом.
 * ========================================================================== */
(function () {
  'use strict';

  var WorldMap = {
    mode: 'solo',        // с каким режимом пришли на карту

    /** Открыть карту. */
    open: function (mode) {
      if (mode) WorldMap.mode = mode;
      Game.state = 'map';
      render();
      Game.showScreen('map');
      document.getElementById('topbar').hidden = true;
    },

    /** Доступен ли мир (или пройден предыдущий — так новые миры откроются и у старых сохранений). */
    isOpen: function (num) {
      return num <= Shop.progress.maxWorld || WorldMap.isCleared(num - 1);
    },

    isCleared: function (num) {
      return !!Shop.progress.cleared[num];
    },

    /** Отметить мир пройденным и открыть следующий. */
    markCleared: function (num) {
      Shop.progress.cleared[num] = true;
      // Старое сохранение могло застрять на прежнем последнем мире — догоняем
      for (var k = Shop.progress.maxWorld; k < Config.count && Shop.progress.cleared[k]; k++) {
        Shop.progress.maxWorld = k + 1;
      }
      if (num + 1 > Shop.progress.maxWorld && num < Config.count) {
        Shop.progress.maxWorld = num + 1;
      }
      Shop.save();
    },

    render: function () { render(); }
  };

  /* ------------------------------------------------------------------------
   * Отрисовка карты
   * ---------------------------------------------------------------------- */
  function render() {
    var box = document.getElementById('map-regions');
    if (!box) return;
    box.innerHTML = '';

    Config.regions.forEach(function (region, ri) {
      var row = document.createElement('div');
      row.className = 'map-region region-' + region.id;

      var title = document.createElement('div');
      title.className = 'map-region-title';
      title.innerHTML = '<b>' + region.name + '</b><span>' + region.hint + '</span>';
      row.appendChild(title);

      var line = document.createElement('div');
      line.className = 'map-line';

      for (var i = 0; i < 4; i++) {
        var world = Config.worlds[ri * 4 + i];
        line.appendChild(makeNode(world));
      }
      row.appendChild(line);
      box.appendChild(row);
    });

    // Подпись снизу: сколько миров пройдено
    var done = 0;
    for (var k in Shop.progress.cleared) if (Shop.progress.cleared[k]) done++;
    var info = document.getElementById('map-progress');
    if (info) info.textContent = 'Пройдено миров: ' + done + ' из ' + Config.count;
  }

  function makeNode(world) {
    var num = world.num;
    var open = WorldMap.isOpen(num);
    var cleared = WorldMap.isCleared(num);

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'map-node' + (open ? '' : ' is-locked') + (cleared ? ' is-cleared' : '') +
      (open && !cleared ? ' is-next' : '');
    b.style.background = 'linear-gradient(180deg, ' + world.sky + ' 0%, ' + world.ground + ' 100%)';

    b.innerHTML =
      '<span class="node-num">' + num + '</span>' +
      '<span class="node-name">' + world.name + '</span>' +
      (cleared ? '<span class="node-star">★</span>' : '') +
      (open ? '' : '<span class="node-lock">🔒</span>');

    if (open) {
      b.addEventListener('click', function () {
        Game.endless = false;                 // с карты всегда обычный забег
        if (window.Sound) Sound.play('click');
        // Вдвоём забег начинается, только когда напарник скажет «да»
        if (window.Online && Online.active) Online.requestStart({ world: num });
        else Game.startGame(WorldMap.mode, num);
      });
    } else {
      b.disabled = true;
    }
    return b;
  }

  WorldMap.init = function () {
    var back = document.getElementById('map-back');
    if (back) back.addEventListener('click', function () {
      if (window.Online && Online.active) Online.open();   // карта открыта из комнаты
      else Game.toMenu();
    });

    // С карты можно заглянуть домой — поспать и поужинать перед миром
    var home = document.getElementById('map-home');
    if (home) home.addEventListener('click', function () {
      if (window.Home) Home.open('after');
    });
  };

  window.WorldMap = WorldMap;
})();

