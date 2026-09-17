/* ============================================================================
 * js/config.js — описание игры: двадцать четыре мира, их волны, награды и особенности.
 *
 * Миры собраны в шесть краёв по четыре мира. У каждого края свой вид, свои
 * цвета и своя особенность арены:
 *
 *   1–4   Сладкие луга      — спокойное начало, обычная арена
 *   5–8   Зимний край       — лёд: герои и слизни скользят
 *   9–12  Конфетный берег   — песок: все чуть медленнее
 *   13–16 Шоколадная страна — темнота: видно только вокруг героев
 *   17–20 Звёздная страна   — звёздный ветер: время от времени сдувает в сторону
 *   21–24 Облачное королевство — скользкие облака и ветер сразу
 *
 * Чем дальше мир, тем крепче слизни и тем больше конфет и звёздной пыли.
 * Волны собираются по шаблону: чем дальше, тем больше врагов и тем чаще
 * попадаются сложные виды.
 *
 * Здесь нарочно всё в одном файле: поменять баланс или добавить мир можно,
 * не трогая код боя.
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * Края
   * ---------------------------------------------------------------------- */
  var REGIONS = [
    {
      id: 'meadow', name: 'Сладкие луга', decor: 'meadow', modifier: null,
      hint: 'тёплый луг, где всё только начинается'
    },
    {
      id: 'winter', name: 'Зимний край', decor: 'winter', modifier: 'ice',
      hint: 'скользкий лёд — разогнаться легко, остановиться трудно'
    },
    {
      id: 'beach', name: 'Конфетный берег', decor: 'beach', modifier: 'sand',
      hint: 'песок и карамель под лапками — все бегают медленнее'
    },
    {
      id: 'choco', name: 'Шоколадная страна', decor: 'choco', modifier: 'dark',
      hint: 'темно: видно только вокруг героев'
    },
    {
      id: 'star', name: 'Звёздная страна', decor: 'star', modifier: 'wind',
      hint: 'звёздный ветер время от времени сдувает всех в сторону'
    },
    {
      // Последний край: особенности сразу двух — лёд и ветер
      id: 'cloud', name: 'Облачное королевство', decor: 'cloud', modifier: ['ice', 'wind'],
      windText: 'Облачный ветер!',
      hint: 'облака скользкие, а ветер так и норовит сдуть'
    }
  ];

  /* ------------------------------------------------------------------------
   * Названия и цвета миров. По четыре на край.
   * sky/ground — верх и низ фона, accent — цветочки и мелочи.
   * ---------------------------------------------------------------------- */
  var WORLDS = [
    // --- Сладкие луга ---
    { name: 'Сладкий луг', sky: '#d4f0b6', ground: '#b3e095', accent: ['#ffffff', '#ffc6dc', '#fff1a8', '#d9c8ff'] },
    { name: 'Клубничная поляна', sky: '#ffe0e6', ground: '#f7b7c4', accent: ['#ffffff', '#ff8fb4', '#ffd36e', '#ffe6ef'] },
    { name: 'Мятный холм', sky: '#d6f6ec', ground: '#a8e6d2', accent: ['#ffffff', '#8fe6c4', '#fff1a8', '#bff0ff'] },
    { name: 'Медовое поле', sky: '#fff0c2', ground: '#f3d78a', accent: ['#ffffff', '#ffc93c', '#ffe9a8', '#f0b45e'] },

    // --- Зимний край ---
    { name: 'Зимний парк', sky: '#e8f4ff', ground: '#cfe4f5', accent: ['#ffffff', '#bfe9ff', '#e6f3ff', '#d9c8ff'] },
    { name: 'Ледяное озеро', sky: '#dff0ff', ground: '#aed6ee', accent: ['#ffffff', '#9ed8f5', '#cdeeff', '#eaf6ff'] },
    { name: 'Снежный лес', sky: '#eef6f8', ground: '#c6dbe0', accent: ['#ffffff', '#a8cfd6', '#dff0f2', '#c9e8d6'] },
    { name: 'Морозная вершина', sky: '#e4ecff', ground: '#b9c8e8', accent: ['#ffffff', '#cdd8ff', '#e6ecff', '#a9bdf0'] },

    // --- Конфетный берег ---
    { name: 'Конфетный пляж', sky: '#fff3d6', ground: '#f5dfae', accent: ['#ffffff', '#ffc2dd', '#9fdcff', '#ffd36e'] },
    { name: 'Карамельная бухта', sky: '#ffe9d6', ground: '#f5c8a0', accent: ['#ffffff', '#ff9f70', '#ffd7a8', '#ffb3d1'] },
    { name: 'Зефирные дюны', sky: '#ffeef6', ground: '#f6d6e4', accent: ['#ffffff', '#ffc2dd', '#fff0fa', '#ffd7f0'] },
    { name: 'Кисельные берега', sky: '#e8f0ff', ground: '#c3d4f0', accent: ['#ffffff', '#9fb8f0', '#d9e6ff', '#c9a6ff'] },

    // --- Шоколадная страна ---
    { name: 'Шоколадная роща', sky: '#6b4a33', ground: '#4a3122', accent: ['#e3b06a', '#8b5a2b', '#c98b4b', '#fff0c2'] },
    { name: 'Пряничный городок', sky: '#7a5236', ground: '#573823', accent: ['#ffd96b', '#ffffff', '#e3b06a', '#ff9fc4'] },
    { name: 'Ореховая пещера', sky: '#55412f', ground: '#38291d', accent: ['#c98b4b', '#8b6a45', '#e3c08a', '#a9762f'] },
    { name: 'Какао-река', sky: '#5e3b2a', ground: '#3d251a', accent: ['#d9a86a', '#8b5a2b', '#ffe9a8', '#b5744a'] },

    // --- Звёздная страна ---
    { name: 'Звёздный сад', sky: '#3a2f66', ground: '#241d47', accent: ['#ffffff', '#ffdf5e', '#c9a6ff', '#8fd6ff'] },
    { name: 'Лунная терраса', sky: '#32407a', ground: '#1f2856', accent: ['#ffffff', '#cdd8ff', '#ffdf5e', '#a8b8ff'] },
    { name: 'Млечный путь', sky: '#4a2f6b', ground: '#2c1b45', accent: ['#ffffff', '#ffb3d1', '#c9a6ff', '#ffdf5e'] },
    { name: 'Замок Короля конфет', sky: '#5a2f52', ground: '#331a33', accent: ['#ffdf5e', '#ff8fd0', '#ffffff', '#c9a6ff'] },

    // --- Облачное королевство ---
    { name: 'Облачный городок', sky: '#bfe4ff', ground: '#e3f1ff', accent: ['#ffffff', '#ffd6ec', '#fff1a8', '#cfe0ff'] },
    { name: 'Радужный мост', sky: '#d9ccff', ground: '#ffe0f0', accent: ['#ff8f8f', '#ffd36e', '#8fe6c4', '#9fb8f0'] },
    { name: 'Грозовая туча', sky: '#7f89b0', ground: '#aab2d2', accent: ['#ffffff', '#ffe066', '#d9e0ff', '#c9d0f0'] },
    { name: 'Небесный трон', sky: '#ffd9a8', ground: '#ffc2dd', accent: ['#ffffff', '#ffdf5e', '#ff8fd0', '#c9a6ff'] }
  ];

  /* ------------------------------------------------------------------------
   * Кто впервые появляется в каждом мире. В первом — четвёрка из начала игры,
   * дальше в каждом мире прибавляется по одному новому виду, а старые остаются.
   * ---------------------------------------------------------------------- */
  var NEWCOMER = [
    null,        // мир 1 — обычные, шустрики, толстяки и плеваки
    'jumper',    // 2  прыгун
    'bomber',    // 3  бомбочка
    'splitter',  // 4  делюн
    'honey',     // 5  медовик
    'snowball',  // 6  снежок
    'icy',       // 7  ледышка
    'spike',     // 8  колючка
    'drift',     // 9  сугробик
    'crab',      // 10 крабик
    'jelly',     // 11 медуза
    'shell',     // 12 ракушка
    'octo',      // 13 осьминожек
    'ginger',    // 14 пряник
    'choco',     // 15 шоколадка
    'nut',       // 16 орешек
    'cocoa',     // 17 капелька какао
    'starlet',   // 18 звёздочка
    'comet',     // 19 кометка
    'moon',      // 20 лунный слизень
    'cloudlet',  // 21 облачко
    'rainbow',   // 22 радужка
    'thunder',   // 23 грозовичок
    'shade'      // 24 тень короля
  ];

  /** Все виды, которые водятся в этом мире (новый плюс все прежние). */
  function poolFor(index) {
    var pool = ['normal', 'fast'];
    if (index >= 1) pool.push('tank');
    if (index >= 2) pool.push('shooter');
    for (var i = 1; i <= index; i++) if (NEWCOMER[i]) pool.push(NEWCOMER[i]);
    return pool;
  }

  /* ------------------------------------------------------------------------
   * Из чего собираются волны.
   * Чем дальше мир, тем больше врагов и тем чаще сложные виды.
   * ---------------------------------------------------------------------- */
  function buildWaves(index) {
    var w = index + 1;                    // номер мира, 1…24
    var grow = index / 19;                // 0 в первом мире, 1 в двадцатом, дальше ещё больше
    var pool = poolFor(index);
    var fresh = NEWCOMER[index];          // новичок этого мира
    var waves = [];

    for (var i = 0; i < 3; i++) {
      var size = 9 + i * 2 + Math.round(grow * 10) + Math.round(i * grow * 3);
      var groups = [];
      var left = size;

      // Новичок мира — заметная часть волны, чтобы его точно увидели
      if (fresh) {
        var freshCount = Math.max(2, Math.round(size * (0.22 + i * 0.05)));
        groups.push({ type: fresh, count: freshCount });
        left -= freshCount;
      }

      // Остальных набираем из тех, кто уже водится, отдавая предпочтение новым
      var others = pool.filter(function (t) { return t !== fresh; });
      var weights = others.map(function (t, k) { return 1 + k * 0.35; });
      var total = weights.reduce(function (a, b) { return a + b; }, 0);

      for (var k = 0; k < others.length && left > 0; k++) {
        var count = (k === others.length - 1)
          ? left
          : Math.max(1, Math.round(size * weights[k] / total));
        count = Math.min(count, left);
        if (count > 0) groups.push({ type: others[k], count: count });
        left -= count;
      }

      waves.push({
        pause: i === 0 ? 2 : 3,
        spawnEvery: Math.max(0.35, 1.1 - grow * 0.5 - i * 0.08),
        maxAlive: 5 + i + Math.round(grow * 7),
        groups: groups
      });
    }
    return waves;
  }

  /* ------------------------------------------------------------------------
   * Сборка полного описания миров
   * ---------------------------------------------------------------------- */
  var list = WORLDS.map(function (w, i) {
    var region = REGIONS[Math.floor(i / 4)];
    var grow = i / 19;

    return {
      index: i,
      num: i + 1,
      name: w.name,
      region: region,
      sky: w.sky,
      ground: w.ground,
      accent: w.accent,
      decor: region.decor,
      modifier: region.modifier,
      dark: region.decor === 'choco' || region.decor === 'star',

      // Насколько крепче слизни и насколько богаче добыча
      enemyHp: 1 + i * 0.18,
      enemySpeed: 1 + i * 0.02,
      enemyDamage: 1 + Math.min(2, Math.floor(i / 7)),   // +1 урона каждые семь миров, но не больше +2
      candyMul: 1 + i * 0.12,
      dustMul: 1 + i * 0.10,

      // Награда за пройденный мир (каждому герою)
      clearCandy: 30 + i * 10,
      clearDust: i >= 4 ? 1 : 0,

      newcomer: NEWCOMER[i],           // кто впервые появляется в этом мире
      pool: poolFor(i),
      boss: 'boss' + (i + 1),          // босс в конце мира (js/boss.js)
      waves: buildWaves(i)
    };
  });

  var Config = {
    regions: REGIONS,
    worlds: list,

    /** Мир по номеру (1…24). */
    world: function (num) {
      return list[Math.max(0, Math.min(list.length - 1, (num || 1) - 1))];
    },

    count: list.length
  };

  window.Config = Config;
})();

