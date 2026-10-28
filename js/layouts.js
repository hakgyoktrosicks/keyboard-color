// Keyboard layouts commonly used in custom / DIY keyboards.
// Coordinates are in key units (1u = one standard keycap), similar to keyboard-layout-editor.
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

  // Row tokens: 'Q' (1u key), k(label, width, {h, g}), { gap: n } horizontal gap,
  // { dy: n } extra vertical space before the row (must come first).
  function fromRows(rows) {
    const keys = [];
    let y = 0;
    for (const row of rows) {
      let x = 0;
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
        keys.push(makeKey(key, x, y));
        x += key.w || 1;
      }
      y += 1;
    }
    return keys;
  }

  // Column-staggered split keyboard with 6 columns per half. `right` rows are in
  // reading order; thumbs/inner keys give the left label `l` and its mirrored partner `r`.
  function split({ stagger, left, right, inner, thumbs, offset }) {
    const keys = [];
    const mirror = (x, w) => offset + 6 - x - w;
    left.forEach((row, r) => row.forEach((l, c) => keys.push(makeKey({ l }, c, r + stagger[c], 0))));
    right.forEach((row, r) =>
      row.forEach((l, j) => {
        const c = 5 - j;
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

  const rows60 = [
    ['Esc', ...NUM_ROW.slice(1), k('Bksp', 2)],
    [k('Tab', 1.5), ...Q_ROW, k('\\', 1.5)],
    [k('Caps', 1.75), ...A_ROW, k('Enter', 2.25)],
    [k('Shift', 2.25), ...Z_ROW, k('Shift', 2.75)],
    BOTTOM_60,
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

  const SPLIT_STAGGER = [0.375, 0.375, 0.125, 0, 0.125, 0.25];

  const corne = split({
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

  const lily58 = split({
    stagger: SPLIT_STAGGER,
    offset: 9,
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
    inner: { x: 6, y: 2.75, l: '[', r: ']' },
    thumbs: [
      { x: 2.5, y: 4.5, l: 'Alt', r: 'Gui' },
      { x: 3.5, y: 4.5, l: 'Gui', r: 'Bksp' },
      { x: 4.5, y: 4.5, l: 'Lower', r: 'Raise' },
      { x: 5.5, y: 4.5, h: 1.5, l: 'Space', r: 'Enter' },
    ],
  });

  const planck = fromRows([
    ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Bksp'],
    ['Esc', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
    ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Enter'],
    ['Ctrl', 'Fn', 'Alt', 'Gui', 'Lower', k('Space', 2), 'Raise', '←', '↓', '↑', '→'],
  ]);

  function finalize(def) {
    const keys = def.keys.map((key, i) => ({ ...key, id: String(i) }));
    const width = Math.max(...keys.map((key) => key.x + key.w));
    const height = Math.max(...keys.map((key) => key.y + key.h));
    return { ...def, keys, width, height };
  }

  const list = [
    { id: '60', name: '60%', tag: '定番', desc: '最も規格化されたコンパクト配列。ケースやキーキャップの選択肢が最も豊富。', keys: fromRows(rows60) },
    { id: '65', name: '65%', tag: '人気', desc: '60%に矢印キーとナビ列を足した定番。実用性とコンパクトさのバランス型。', keys: fromRows(rows65) },
    { id: '75', name: '75%', tag: '人気', desc: '65%にFキー列を加えて詰めた配列。近年人気が伸びている。', keys: fromRows(rows75) },
    { id: 'tkl', name: 'TKL（80%）', tag: '', desc: 'テンキーレス。Fキーとナビゲーションブロックをフルで残す。', keys: fromRows(rowsTkl) },
    { id: '100', name: 'フルサイズ（100%）', tag: '', desc: 'テンキー付きの標準配列。自作界隈では少数派。', keys: fromRows(rowsFull) },
    { id: 'corne', name: 'Corne（crkbd）', tag: '分割', desc: '3×6＋親指3キーの分割・カラムスタッガード。42キー、数字列なし。', keys: corne },
    { id: 'lily58', name: 'Lily58', tag: '分割', desc: '6×4＋親指4キーの分割・カラムスタッガード。数字列ありの入門向け。', keys: lily58 },
    { id: 'planck', name: 'Planck（40%）', tag: '格子', desc: '4×12のオーソリニア（格子）配列。レイヤー前提の極小構成。', keys: planck },
  ].map(finalize);

  const byId = Object.fromEntries(list.map((l) => [l.id, l]));

  return { list, byId, inferGroup };
});
