// Renders a layout + colors as a standalone SVG string.
(function (root) {
  'use strict';
  const KC = (root.KC = root.KC || {});
  const { shade } = KC.color;
  const { outline } = KC.layouts;

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
      for (const [x, y] of outline(key)) {
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

  // L-shaped Enter. A stroke of the fill color with round joins rounds the corners,
  // so every edge is pulled in by `rad` first. `inset` is { l, t, r, b } in px.
  function lShape(x, y, w, h, notch, inset, rad, fill) {
    const { l, t, r, b } = inset;
    const pts = [
      [x + l + rad, y + t + rad],
      [x + w - r - rad, y + t + rad],
      [x + w - r - rad, y + h - b - rad],
      [x + notch + l + rad, y + h - b - rad],
      [x + notch + l + rad, y + U - b - rad],
      [x + l + rad, y + U - b - rad],
    ];
    return (
      `<polygon points="${pts.map((p) => p.map((v) => +v.toFixed(2)).join(',')).join(' ')}" ` +
      `fill="${fill}" stroke="${fill}" stroke-width="${rad * 2}" stroke-linejoin="round"/>`
    );
  }

  // colorsFor(key) -> { cap, legend }. With `interactive`, keys are focusable buttons
  // (used while painting so keys can be reached with Tab and painted with Enter/Space).
  function renderKeyboard(layout, caseColor, colorsFor, { interactive = false } = {}) {
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
      const iso = key.shape === 'iso';
      // Keys with a second rectangle (KLE x2/w2...) draw both sides first, then both tops,
      // so the overlapping tops merge into one face.
      const boxes = [[x, y, w, h], ...(key.sub ? [[px(key.x + key.sub.x), px(key.y + key.sub.y), key.sub.w * U, key.sub.h * U]] : [])];
      const body = iso
        ? lShape(x, y, w, h, 0.25 * U, { l: 2, t: 2, r: 2, b: 2 }, 5, shade(cap, -14)) +
          lShape(x, y, w, h, 0.25 * U, { l: 7, t: 4, r: 7, b: 11 }, 4, cap)
        : boxes.map(([bx, by, bw, bh]) => `<rect x="${bx + 2}" y="${by + 2}" width="${bw - 4}" height="${bh - 4}" rx="7" fill="${shade(cap, -14)}"/>`).join('') +
          boxes.map(([bx, by, bw, bh]) => `<rect x="${bx + 7}" y="${by + 4}" width="${bw - 14}" height="${bh - 15}" rx="5" fill="${cap}"/>`).join('');
      const legendY = y + ((iso ? U : h) - 11) / 2 + 4;
      const a11y = interactive ? ` tabindex="0" role="button" aria-label="${esc(key.l)} キーを塗る"` : '';
      parts.push(
        `<g class="key" data-id="${key.id}"${transform}${a11y}>` +
          body +
          `<text x="${x + w / 2}" y="${legendY}" fill="${legend}" font-size="${fontSize(key.l)}" ` +
          `font-family="${esc(FONT)}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${esc(key.l)}</text>` +
          `</g>`
      );
    }

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ` +
      `role="${interactive ? 'group' : 'img'}" aria-label="${esc(layout.name)} キーボードのプレビュー">${parts.join('')}</svg>`
    );
  }

  KC.renderKeyboard = renderKeyboard;
})(typeof self !== 'undefined' ? self : this);
