// Renders a layout + colors as a standalone SVG string.
(function (root) {
  'use strict';
  const KC = (root.KC = root.KC || {});
  const { shade } = KC.color;
  const { corners } = KC.layouts;

  const U = 56; // px per key unit
  const PAD = 0.4; // case padding in key units
  const FONT = "system-ui, -apple-system, 'Segoe UI', 'Hiragino Sans', sans-serif";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  function partBoxes(keys) {
    const boxes = new Map();
    for (const key of keys) {
      const b = boxes.get(key.part) || { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
      for (const [x, y] of corners(key)) {
        b.x1 = Math.min(b.x1, x);
        b.y1 = Math.min(b.y1, y);
        b.x2 = Math.max(b.x2, x);
        b.y2 = Math.max(b.y2, y);
      }
      boxes.set(key.part, b);
    }
    return [...boxes.values()];
  }

  function fontSize(label) {
    if (label.length === 1) return 17;
    if (label.length <= 3) return 13;
    return 11;
  }

  // colorsFor(key) -> { cap, legend }
  function renderKeyboard(layout, caseColor, colorsFor) {
    const width = (layout.width + PAD * 2) * U;
    const height = (layout.height + PAD * 2) * U;
    const px = (v) => +((v + PAD) * U).toFixed(2);
    const parts = [];

    for (const b of partBoxes(layout.keys)) {
      const x = px(b.x1 - PAD);
      const y = px(b.y1 - PAD);
      const w = (b.x2 - b.x1 + PAD * 2) * U;
      const h = (b.y2 - b.y1 + PAD * 2) * U;
      parts.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${caseColor}" stroke="${shade(caseColor, -12)}" stroke-width="2"/>`
      );
    }

    for (const key of layout.keys) {
      const { cap, legend } = colorsFor(key);
      const x = px(key.x);
      const y = px(key.y);
      const w = key.w * U;
      const h = key.h * U;
      const transform = key.rot ? ` transform="rotate(${key.rot} ${px(key.rx)} ${px(key.ry)})"` : '';
      parts.push(
        `<g class="key" data-id="${key.id}"${transform}>` +
          `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="7" fill="${shade(cap, -14)}"/>` +
          `<rect x="${x + 7}" y="${y + 4}" width="${w - 14}" height="${h - 15}" rx="5" fill="${cap}"/>` +
          `<text x="${x + w / 2}" y="${y + (h - 11) / 2 + 4}" fill="${legend}" font-size="${fontSize(key.l)}" ` +
          `font-family="${esc(FONT)}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${esc(key.l)}</text>` +
          `</g>`
      );
    }

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ` +
      `role="img" aria-label="${esc(layout.name)} キーボードのプレビュー">${parts.join('')}</svg>`
    );
  }

  KC.renderKeyboard = renderKeyboard;
})(typeof self !== 'undefined' ? self : this);
