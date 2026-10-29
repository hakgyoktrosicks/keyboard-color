// Keycap bill of materials: how many keycaps of each color and size a colorway needs.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KC = Object.assign(root.KC || {}, { bom: api });
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const L_ENTER = 'L字Enter';
  const SPECIAL = '特殊形状';

  function fmt(n) {
    return `${+n.toFixed(2)}u`;
  }

  function isIsoEnter(key) {
    if (key.shape === 'iso') return true;
    // KLE's ISO Enter: a 1.25u x 2u key with a 1.5u x 1u top rectangle shifted 0.25u left.
    const s = key.sub;
    return Boolean(s) && key.w === 1.25 && key.h === 2 && s.x === -0.25 && s.y === 0 && s.w === 1.5 && s.h === 1;
  }

  function sizeLabel(key) {
    if (isIsoEnter(key)) return L_ENTER;
    if (key.sub) return `${SPECIAL}（${fmt(key.w)}×${fmt(key.h)}）`;
    if (key.h > 1 && key.w > 1) return `${fmt(key.w)}×${fmt(key.h)}`;
    if (key.h > 1) return `${fmt(key.h)}（縦）`;
    return fmt(key.w);
  }

  // Plain widths first (narrowest first), then vertical keys, then the L-shaped Enter.
  function sizeRank(label) {
    if (label === L_ENTER) return [2, 0];
    if (label.startsWith(SPECIAL) || label.includes('×')) return [3, 0];
    if (label.endsWith('（縦）')) return [1, parseFloat(label)];
    return [0, parseFloat(label)];
  }

  function bySize(a, b) {
    const [ga, va] = sizeRank(a.size);
    const [gb, vb] = sizeRank(b.size);
    return ga - gb || va - vb;
  }

  // colorsFor(key) -> { cap, legend }. Keycaps are grouped by cap + legend color.
  function computeBom(keys, colorsFor) {
    const groups = new Map();
    for (const key of keys) {
      const { cap, legend } = colorsFor(key);
      const id = `${cap}|${legend}`;
      const group = groups.get(id) || { cap, legend, total: 0, sizes: new Map() };
      const size = sizeLabel(key);
      group.total++;
      group.sizes.set(size, (group.sizes.get(size) || 0) + 1);
      groups.set(id, group);
    }
    return [...groups.values()]
      .map((g) => ({
        cap: g.cap,
        legend: g.legend,
        total: g.total,
        sizes: [...g.sizes].map(([size, count]) => ({ size, count })).sort(bySize),
      }))
      .sort((a, b) => b.total - a.total);
  }

  function bomText(bom, title) {
    const lines = bom.map(
      (g) => `${g.cap}（刻印 ${g.legend}） 計${g.total}個: ${g.sizes.map((s) => `${s.size}×${s.count}`).join(', ')}`
    );
    const total = bom.reduce((n, g) => n + g.total, 0);
    return [`${title}（全${total}キー）`, ...lines].join('\n');
  }

  return { computeBom, bomText, sizeLabel };
});
