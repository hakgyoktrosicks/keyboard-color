// Keycap bill of materials: how many keycaps of each color and size a colorway needs.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KC = Object.assign(root.KC || {}, { bom: api });
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const L_ENTER = 'L字Enter';

  function fmt(n) {
    return `${+n.toFixed(2)}u`;
  }

  function sizeLabel(key) {
    if (key.shape === 'iso') return L_ENTER;
    if (key.h > 1) return `${fmt(key.h)}（縦）`;
    return fmt(key.w);
  }

  // Plain widths first (narrowest first), then vertical keys, then the L-shaped Enter.
  function sizeRank(label) {
    if (label === L_ENTER) return [2, 0];
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
