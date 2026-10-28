// Keyboard layouts commonly used in custom / DIY keyboards.
// Coordinates are in key units (1u = one standard keycap), similar to keyboard-layout-editor.
// A key may be rotated by `rot` degrees around (rx, ry).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KC = Object.assign(root.KC || {}, { layouts: api });
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ACCENT_LABELS = new Set(['Esc', 'Enter']);
  const ALPHA_RE = /^[A-Z0-9`\-=[\]\\;',./*+]$/;

  function inferGroup(label) {
    if (ACCENT_LABELS.has(label)) return 'accent';
    if (ALPHA_RE.test(label)) return 'alpha';
    return 'mod';
  }

  function k(l, w = 1, extra = {}) {
    return { l, w, ...extra };
  }

  function makeKey(t, x, y, part = 0) {
    return { l: t.l, x, y, w: t.w || 1, h: t.h || 1, g: t.g || inferGroup(t.l), part };
  }

  // Four corners of a key in layout units, with rotation applied.
  function corners(key) {
    const pts = [
      [key.x, key.y],
      [key.x + key.w, key.y],
      [key.x + key.w, key.y + key.h],
      [key.x, key.y + key.h],
    ];
    if (!key.rot) return pts;
    const a = (key.rot * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return pts.map(([x, y]) => {
      const dx = x - key.rx;
      const dy = y - key.ry;
      return [key.rx + dx * cos - dy * sin, key.ry + dx * sin + dy * cos];
    });
  }

  // Row tokens: 'Q' (1u key), k(label, width, {h, g}), { gap: n } horizontal gap,
  // { dy: n } extra vertical space before the row (must come first).
  function fromRows(rows, { x0 = 0, part = 0 } = {}) {
    const keys = [];
    let y = 0;
    for (const row of rows) {
      let x = x0;
      for (const t of row) {
        if (typeof t === 'object' && 'dy' in t) {
          y += t.dy;
          continue;
        }
        if (typeof t === 'object' && 'gap' in t) {
          x += t.gap;
          continue;
        }
        const key = typeof t === 'string' ? { l: t } : t;
        keys.push(makeKey(key, x, y, part));
        x += key.w || 1;
      }
      y += 1;
    }
    return keys;
  }

  function rotate(keys, rot, rx, ry) {
    return keys.map((key) => ({ ...key, rot, rx, ry }));
  }

  // Column-staggered split keyboard. `right` rows are in reading order; thumbs and
  // inner keys give the left label `l` and the label `r` of its mirrored partner.
  function split({ cols = 6, stagger, left, right, inner, thumbs, offset }) {
    const keys = [];
    const mirror = (x, w) => offset + cols - x - w;
    left.forEach((row, r) => row.forEach((l, c) => keys.push(makeKey({ l }, c, r + stagger[c], 0))));
    right.forEach((row, r) =>
      row.forEach((l, j) => {
        const c = cols - 1 - j;
        keys.push(makeKey({ l }, mirror(c, 1), r + stagger[c], 1));
      })
    );
    for (const t of [...(inner ? [inner] : []), ...thumbs]) {
      const w = t.w || 1;
      keys.push(makeKey({ l: t.l, w, h: t.h }, t.x, t.y, 0));
      keys.push(makeKey({ l: t.r, w, h: t.h }, mirror(t.x, w), t.y, 1));
    }
    return keys;
  }

  const F = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `F${from + i}`);
  const NUM_ROW = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  const Q_ROW = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'];
  const A_ROW = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"];
  const Z_ROW = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'];
  const BOTTOM_60 = [k('Ctrl', 1.25), k('Win', 1.25), k('Alt', 1.25), k('Space', 6.25), k('Alt', 1.25), k('Win', 1.25), k('Menu', 1.25), k('Ctrl', 1.25)];
  const BOTTOM_65 = [k('Ctrl', 1.25), k('Win', 1.25), k('Alt', 1.25), k('Space', 6.25), 'Alt', 'Fn', 'Ctrl', '←', '↓', '→'];

  const rows40 = [
    [k('Tab', 1.25), ...Q_ROW.slice(0, 10), k('Bksp', 1.5)],
    [k('Esc', 1.5), ...A_ROW.slice(0, 9), k('Enter', 2.25)],
    [k('Shift', 1.75), ...Z_ROW, k('Shift', 1)],
    [k('Ctrl', 1.25), k('Win', 1.25), k('Alt', 1.25), k('Space', 2.25), k('Fn', 1.25), k('Space', 2.75), k('Alt', 1.25), k('Ctrl', 1.5)],
  ];

  const rows60 = [
    ['Esc', ...NUM_ROW.slice(1), k('Bksp', 2)],
    [k('Tab', 1.5), ...Q_ROW, k('\\', 1.5)],
    [k('Caps', 1.75), ...A_ROW, k('Enter', 2.25)],
    [k('Shift', 2.25), ...Z_ROW, k('Shift', 2.75)],
    BOTTOM_60,
  ];

  const rows60Wkl = [
    ['Esc', ...NUM_ROW.slice(1), '\\', '`'],
    [k('Tab', 1.5), ...Q_ROW, k('Bksp', 1.5)],
    [k('Ctrl', 1.75), ...A_ROW, k('Enter', 2.25)],
    [k('Shift', 2.25), ...Z_ROW, k('Shift', 1.75), 'Fn'],
    [k('Ctrl', 1.5), { gap: 1 }, k('Alt', 1.5), k('Space', 7), k('Alt', 1.5), { gap: 1 }, k('Ctrl', 1.5)],
  ];

  const rows65 = [
    ['Esc', ...NUM_ROW.slice(1), k('Bksp', 2), 'Home'],
    [k('Tab', 1.5), ...Q_ROW, k('\\', 1.5), 'PgUp'],
    [k('Caps', 1.75), ...A_ROW, k('Enter', 2.25), 'PgDn'],
    [k('Shift', 2.25), ...Z_ROW, k('Shift', 1.75), '↑', 'End'],
    BOTTOM_65,
  ];

  const rows75 = [
    ['Esc', ...F(1, 12), 'PrtSc', 'Ins', 'Del'],
    [{ dy: 0.25 }, ...NUM_ROW, k('Bksp', 2), 'Home'],
    ...rows65.slice(1),
  ];

  const rowsTkl = [
    ['Esc', { gap: 1 }, ...F(1, 4), { gap: 0.5 }, ...F(5, 8), { gap: 0.5 }, ...F(9, 12), { gap: 0.25 }, 'PrtSc', 'ScrLk', 'Pause'],
    [{ dy: 0.25 }, ...NUM_ROW, k('Bksp', 2), { gap: 0.25 }, 'Ins', 'Home', 'PgUp'],
    [k('Tab', 1.5), ...Q_ROW, k('\\', 1.5), { gap: 0.25 }, 'Del', 'End', 'PgDn'],
    [k('Caps', 1.75), ...A_ROW, k('Enter', 2.25)],
    [k('Shift', 2.25), ...Z_ROW, k('Shift', 2.75), { gap: 1.25 }, '↑'],
    [...BOTTOM_60, { gap: 0.25 }, '←', '↓', '→'],
  ];

  const numpad = [
    [],
    [{ gap: 0.25 }, 'Num', '/', '*', '-'],
    [{ gap: 0.25 }, '7', '8', '9', k('+', 1, { h: 2 })],
    [{ gap: 3.5 }, '4', '5', '6'],
    [{ gap: 1.25 }, '1', '2', '3', k('Enter', 1, { h: 2 })],
    [{ gap: 0.25 }, k('0', 2), '.'],
  ];
  const rowsFull = rowsTkl.map((row, i) => [...row, ...numpad[i]]);

  const rows96 = [
    ['Esc', ...F(1, 12), 'PrtSc', 'Ins', 'Del', 'Home', 'End', 'PgUp'],
    [{ dy: 0.25 }, ...NUM_ROW, k('Bksp', 2), 'Num', '/', '*', '-'],
    [k('Tab', 1.5), ...Q_ROW, k('\\', 1.5), '7', '8', '9', k('+', 1, { h: 2 })],
    [k('Caps', 1.75), ...A_ROW, k('Enter', 2.25), '4', '5', '6'],
    [k('Shift', 2.25), ...Z_ROW, k('Shift', 1.75), '↑', '1', '2', '3', k('Enter', 1, { h: 2 })],
    [...BOTTOM_65, '0', '.'],
  ];

  // Ergonomic "Alice-style" layout: two row-staggered clusters angled ±10°.
  const ALICE_ANGLE = 10;
  const aliceLeft = fromRows([
    ['Esc', '1', '2', '3', '4', '5', '6'],
    [k('Tab', 1.5), 'Q', 'W', 'E', 'R', 'T'],
    [k('Caps', 1.75), 'A', 'S', 'D', 'F', 'G'],
    [k('Shift', 2.25), 'Z', 'X', 'C', 'V', 'B'],
    [k('Ctrl', 1.5), { gap: 1 }, k('Alt', 1.5), k('Space', 2.75)],
  ]);
  const ALICE_OFFSET = 8.5;
  const aliceRight = fromRows(
    [
      [{ gap: 0.5 }, '7', '8', '9', '0', '-', '=', k('Bksp', 2)],
      ['Y', 'U', 'I', 'O', 'P', '[', ']', k('\\', 1.5)],
      [{ gap: 0.25 }, 'H', 'J', 'K', 'L', ';', "'", k('Enter', 2.25)],
      [{ gap: 0.75 }, 'N', 'M', ',', '.', '/', k('Shift', 1.75), 'Fn'],
      [k('Space', 2.75), k('Alt', 1.5), { gap: 2.75 }, k('Ctrl', 1.5)],
    ],
    { x0: ALICE_OFFSET }
  );
  const alice = [
    ...rotate(aliceLeft, -ALICE_ANGLE, 7, 2.5),
    ...rotate(aliceRight, ALICE_ANGLE, ALICE_OFFSET + 0.5, 2.5),
  ];

  const SPLIT_STAGGER = [0.375, 0.375, 0.125, 0, 0.125, 0.25];
  const SPLIT_ROWS_4 = {
    left: [
      ['Esc', '1', '2', '3', '4', '5'],
      ['Tab', 'Q', 'W', 'E', 'R', 'T'],
      ['Ctrl', 'A', 'S', 'D', 'F', 'G'],
      ['Shift', 'Z', 'X', 'C', 'V', 'B'],
    ],
    right: [
      ['6', '7', '8', '9', '0', '`'],
      ['Y', 'U', 'I', 'O', 'P', '-'],
      ['H', 'J', 'K', 'L', ';', "'"],
      ['N', 'M', ',', '.', '/', 'Shift'],
    ],
  };

  const split34 = split({
    cols: 5,
    stagger: [0.375, 0.125, 0, 0.125, 0.25],
    offset: 7.5,
    left: [
      ['Q', 'W', 'E', 'R', 'T'],
      ['A', 'S', 'D', 'F', 'G'],
      ['Z', 'X', 'C', 'V', 'B'],
    ],
    right: [
      ['Y', 'U', 'I', 'O', 'P'],
      ['H', 'J', 'K', 'L', ';'],
      ['N', 'M', ',', '.', '/'],
    ],
    thumbs: [
      { x: 3.5, y: 3.5, l: 'Lower', r: 'Raise' },
      { x: 4.5, y: 3.5, l: 'Space', r: 'Enter' },
    ],
  });

  const split42 = split({
    stagger: SPLIT_STAGGER,
    offset: 8.5,
    left: [
      ['Tab', 'Q', 'W', 'E', 'R', 'T'],
      ['Ctrl', 'A', 'S', 'D', 'F', 'G'],
      ['Shift', 'Z', 'X', 'C', 'V', 'B'],
    ],
    right: [
      ['Y', 'U', 'I', 'O', 'P', 'Bksp'],
      ['H', 'J', 'K', 'L', ';', "'"],
      ['N', 'M', ',', '.', '/', 'Esc'],
    ],
    thumbs: [
      { x: 3.5, y: 3.5, l: 'Gui', r: 'Alt' },
      { x: 4.5, y: 3.5, l: 'Lower', r: 'Raise' },
      { x: 5.5, y: 3.5, h: 1.5, l: 'Space', r: 'Enter' },
    ],
  });

  const split58 = split({
    stagger: SPLIT_STAGGER,
    offset: 9,
    ...SPLIT_ROWS_4,
    inner: { x: 6, y: 2.75, l: '[', r: ']' },
    thumbs: [
      { x: 2.5, y: 4.5, l: 'Alt', r: 'Gui' },
      { x: 3.5, y: 4.5, l: 'Gui', r: 'Bksp' },
      { x: 4.5, y: 4.5, l: 'Lower', r: 'Raise' },
      { x: 5.5, y: 4.5, h: 1.5, l: 'Space', r: 'Enter' },
    ],
  });

  const split60 = split({
    stagger: SPLIT_STAGGER,
    offset: 9,
    ...SPLIT_ROWS_4,
    inner: { x: 6, y: 2.75, l: 'Mute', r: 'Play' },
    thumbs: [
      { x: 1.5, y: 4.5, l: 'Gui', r: 'Gui' },
      { x: 2.5, y: 4.5, l: 'Alt', r: 'Alt' },
      { x: 3.5, y: 4.5, l: 'Ctrl', r: 'Ctrl' },
      { x: 4.5, y: 4.5, l: 'Lower', r: 'Raise' },
      { x: 5.5, y: 4.5, h: 1.5, l: 'Space', r: 'Enter' },
    ],
  });

  const ORTHO_ROWS = [
    ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Bksp'],
    ['Esc', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
    ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Enter'],
    ['Ctrl', 'Fn', 'Alt', 'Gui', 'Lower', k('Space', 2), 'Raise', '←', '↓', '↑', '→'],
  ];
  const ortho4x12 = fromRows(ORTHO_ROWS);
  const ortho5x12 = fromRows([
    ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Bksp'],
    [...ORTHO_ROWS[0].slice(0, 11), 'Del'],
    ['Ctrl', ...ORTHO_ROWS[1].slice(1)],
    ...ORTHO_ROWS.slice(2),
  ]);

  // Split ortholinear: each 12-label row is cut into two 6-column halves with no stagger.
  const SPLIT_ORTHO_BOTTOM = ['Ctrl', 'Fn', 'Alt', 'Gui', 'Lower', 'Space', 'Space', 'Raise', '←', '↓', '↑', '→'];
  function splitOrtho(rows) {
    return split({
      stagger: [0, 0, 0, 0, 0, 0],
      offset: 7,
      left: rows.map((row) => row.slice(0, 6)),
      right: rows.map((row) => row.slice(6)),
      thumbs: [],
    });
  }
  const splitOrtho4x6 = splitOrtho([...ORTHO_ROWS.slice(0, 3), SPLIT_ORTHO_BOTTOM]);
  const splitOrtho5x6 = splitOrtho([
    ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Bksp'],
    [...ORTHO_ROWS[0].slice(0, 11), 'Del'],
    ['Ctrl', ...ORTHO_ROWS[1].slice(1)],
    ORTHO_ROWS[2],
    SPLIT_ORTHO_BOTTOM,
  ]);

  // Shift rotated layouts back into positive space and compute their bounds.
  function finalize(def) {
    let keys = def.keys.map((key, i) => ({ ...key, id: String(i) }));
    const pts = keys.flatMap(corners);
    const minX = Math.min(0, ...pts.map((p) => p[0]));
    const minY = Math.min(0, ...pts.map((p) => p[1]));
    if (minX < 0 || minY < 0) {
      keys = keys.map((key) => ({
        ...key,
        x: key.x - minX,
        y: key.y - minY,
        ...(key.rot ? { rx: key.rx - minX, ry: key.ry - minY } : {}),
      }));
    }
    const all = keys.flatMap(corners);
    const round = (v) => Math.round(v * 1e6) / 1e6;
    const width = round(Math.max(...all.map((p) => p[0])));
    const height = round(Math.max(...all.map((p) => p[1])));
    return { ...def, keys, width, height };
  }

  const CATEGORIES = [
    { id: 'row', name: 'ロウスタッガード' },
    { id: 'ergo', name: 'エルゴノミクス' },
    { id: 'split', name: '分割' },
    { id: 'ortho', name: 'オーソリニア（格子）' },
  ];

  const list = [
    { id: '40', cat: 'row', name: '40%', desc: '数字列とFキーを省いた最小クラスの配列。数字や記号はレイヤーで入力する。', keys: fromRows(rows40) },
    { id: '60', cat: 'row', name: '60%', tag: '定番', desc: '最も規格化されたコンパクト配列。ケースやキーキャップの選択肢が最も豊富。', keys: fromRows(rows60) },
    { id: '60wkl', cat: 'row', name: '60% 分割BS・WKL', example: 'HHKB系', desc: 'Backspaceを分割し、Winキーを省いて両脇を空けた配列。HHKBと同系統。', keys: fromRows(rows60Wkl) },
    { id: '65', cat: 'row', name: '65%', tag: '人気', desc: '60%に矢印キーとナビ列を足した定番。実用性とコンパクトさのバランス型。', keys: fromRows(rows65) },
    { id: '75', cat: 'row', name: '75%', tag: '人気', desc: '65%にFキー列を加えて詰めた配列。近年人気が伸びている。', keys: fromRows(rows75) },
    { id: 'tkl', cat: 'row', name: 'TKL（80%）', desc: 'テンキーレス。Fキーとナビゲーションブロックをフルで残す。', keys: fromRows(rowsTkl) },
    { id: '96', cat: 'row', name: '96%', example: '1800系', desc: 'テンキー付きのまま隙間を詰めたコンパクトフル配列。', keys: fromRows(rows96) },
    { id: '100', cat: 'row', name: 'フルサイズ（100%）', desc: 'テンキー付きの標準配列。自作界隈では少数派。', keys: fromRows(rowsFull) },
    { id: 'alice', cat: 'ergo', name: 'エルゴ 65%', example: 'Alice系', desc: '左右のキー群を±10°ずつ傾けた一体型エルゴ配列。Bキーは左側。', keys: alice },
    { id: 'split34', cat: 'split', name: '分割 3×5＋親指2', example: 'Ferris Sweep系', desc: '34キーの極小分割。ホームポジションから指をほぼ動かさない構成。', keys: split34 },
    { id: 'split42', cat: 'split', name: '分割 3×6＋親指3', example: 'Corne（crkbd）', tag: '人気', desc: '42キーのカラムスタッガード分割。数字列なし。', keys: split42 },
    { id: 'split58', cat: 'split', name: '分割 6×4＋親指4', example: 'Lily58', desc: '数字列ありのカラムスタッガード分割。入門向けとしてよく勧められる。', keys: split58 },
    { id: 'split60', cat: 'split', name: '分割 6×4＋親指5', example: 'Sofle', desc: '6×4＋親指5キー。内側にはロータリーエンコーダーを置くことが多い。', keys: split60 },
    { id: 'ortho4x12', cat: 'ortho', name: 'オーソリニア 4×12', example: 'Planck', desc: 'キーが格子状に並ぶ40%配列。レイヤー前提の極小構成。', keys: ortho4x12 },
    { id: 'ortho5x12', cat: 'ortho', name: 'オーソリニア 5×12', example: 'Preonic', desc: '4×12に数字列を加えた格子配列。', keys: ortho5x12 },
    { id: 'splitortho4x6', cat: 'ortho', name: '分割オーソリニア 4×6×2', example: "Let's Split系", desc: '4×12の格子配列を左右に分割したもの。肩幅に合わせて離して置ける。', keys: splitOrtho4x6 },
    { id: 'splitortho5x6', cat: 'ortho', name: '分割オーソリニア 5×6×2', example: 'Nyquist系', desc: '5×12の格子配列を左右に分割したもの。数字列あり。', keys: splitOrtho5x6 },
  ].map(finalize);

  const byId = Object.fromEntries(list.map((l) => [l.id, l]));

  // Layout ids used before the split/ortho layouts were renamed (kept for old share URLs).
  const ALIASES = { corne: 'split42', lily58: 'split58', planck: 'ortho4x12' };
  const resolveId = (id) => (byId[id] ? id : ALIASES[id] && byId[ALIASES[id]] ? ALIASES[id] : null);

  return { list, byId, CATEGORIES, corners, inferGroup, resolveId };
});
