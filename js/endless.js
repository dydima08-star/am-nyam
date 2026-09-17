/* ============================================================================
 * js/endless.js — бесконечная волна.
 *
 * Отдельный режим для тех, кто прошёл миры и хочет проверить, насколько
 * далеко получится зайти. Волны идут одна за другой и никогда не кончаются:
 *
 *   • каждые три волны герои переезжают в следующий мир — меняется и картинка,
 *     и особенность арены (лёд, песок, темнота, ветер);
 *   • слизни становятся крепче с каждой волной, а после последнего мира
 *     прибавка продолжается уже без ограничений;
 *   • боссов нет: только волны, пока герои держатся;
 *   • за каждые пять волн дают карточку прокачки, так что забег получается
 *     долгим и с развитием;
 *   • рекорд (сколько волн выдержали) сохраняется вместе с прогрессом.
 *
 * Конфеты и звёздная пыль падают как обычно, поэтому режим ещё и хороший
 * способ подкопить на лавку.
 * ========================================================================== */
(function () {
  'use strict';

  var Endless = {
    active: false,
    list: [],            // собранные волны (растёт по ходу)

    /** Запустить бесконечную волну. */
    start: function (mode) {
      Endless.active = true;
      Endless.list = [];
      Game.endless = true;
      Endless.push(1);                       // первая волна
      Game.startGame(mode, 1);               // дальше всё как в обычной игре
      Game.banner('Бесконечная волна', Shop.best.endless
        ? 'рекорд: ' + Shop.best.endless + ' волн — побьём?'
        : 'сколько продержитесь?', 3);
    },

    /** В каком мире идёт волна n (каждые три волны — следующий мир). */
    worldFor: function (n) {
      return Math.min(Config.count, 1 + Math.floor((n - 1) / 3));
    },

    /** Насколько крепче слизни на волне n. */
    hpMul: function () {
      var n = Math.max(1, Enemies.wave);
      return 1 + n * 0.035;
    },

    /** Сколько конфет приносит слизень на волне n (чуть больше со временем). */
    candyMul: function () {
      var n = Math.max(1, Enemies.wave);
      return 1 + n * 0.02;
    },

    /**
     * Собрать волну номер n и добавить её в список.
     * Чем дальше, тем больше слизней и тем злее их набор.
     */
    push: function (n) {
      var worldNum = Endless.worldFor(n);
      var world = Config.world(worldNum);
      var pool = world.pool.slice();
      var size = Math.round(9 + n * 1.7);
      var groups = [];
      var left = size;

      // Самые новые виды встречаются чаще — так волна не превращается
      // в толпу одинаковых слизней
      var weights = pool.map(function (t, i) { return 1 + i * 0.5; });
      var total = weights.reduce(function (a, b) { return a + b; }, 0);

      for (var i = 0; i < pool.length && left > 0; i++) {
        var count = (i === pool.length - 1)
          ? left
          : Math.max(1, Math.round(size * weights[i] / total));
        count = Math.min(count, left);
        if (count > 0) groups.push({ type: pool[i], count: count });
        left -= count;
      }

      Endless.list.push({
        pause: n === 1 ? 2 : 3,
        spawnEvery: Math.max(0.28, 1.0 - n * 0.03),
        maxAlive: Math.min(26, 6 + Math.floor(n * 0.8)),
        groups: groups
      });
    },

    /**
     * Волна зачищена: готовим следующую и, если пора, переезжаем в новый мир.
     * Вызывается из js/enemies.js.
     */
    nextWave: function () {
      var n = Enemies.wave + 1;
      Endless.push(n);

      // Каждые пять волн — карточка прокачки
      if (n % 5 === 0) Enemies.offerAt.push(0);

      var worldNum = Endless.worldFor(n);
      if (worldNum !== Game.world) {
        Game.applyWorld(worldNum);
        var w = Config.world(worldNum);
        Game.banner('Новый край: ' + w.name, w.region.hint, 3);
        if (window.Sound) Sound.play('wave');
      }
    },

    /** Конец режима (герои пали) — записываем рекорд. */
    finish: function () {
      Endless.active = false;
    }
  };

  window.Endless = Endless;
})();

