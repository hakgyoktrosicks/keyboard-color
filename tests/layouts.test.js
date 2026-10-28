const test = require('node:test');
const assert = require('node:assert/strict');
const { list, byId, CATEGORIES, corners, resolveId } = require('../js/layouts.js');
const presets = require('../js/palettes.js');
const { isHex } = require('../js/color.js');

const EPS = 1e-6;

// Separating axis test for two convex quads (rotated rectangles).
function overlaps(a, b) {
  const pa = corners(a);
  const pb = corners(b);
  for (const poly of [pa, pb]) {
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % 4];
      const nx = y1 - y2;
      const ny = x2 - x1;
      const proj = (pts) => pts.map(([x, y]) => x * nx + y * ny);
      const A = proj(pa);
      const B = proj(pb);
      if (Math.max(...A) <= Math.min(...B) + EPS || Math.max(...B) <= Math.min(...A) + EPS) return false;
    }
  }
  return true;
}

test('overlap check detects overlapping and rotated keys', () => {
  const base = { x: 0, y: 0, w: 1, h: 1 };
  assert.ok(overlaps(base, { x: 0.5, y: 0.5, w: 1, h: 1 }));
  assert.ok(!overlaps(base, { x: 1, y: 0, w: 1, h: 1 }));
  assert.ok(overlaps(base, { x: 1, y: 0, w: 1, h: 1, rot: -10, rx: 1, ry: 1 }));
});

test('no layout has overlapping keys', () => {
  for (const layout of list) {
    const { keys } = layout;
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        assert.ok(!overlaps(keys[i], keys[j]), `${layout.id}: ${keys[i].l} overlaps ${keys[j].l}`);
      }
    }
  }
});

test('layouts have the expected width and key count', () => {
  const expected = {
    40: [12.75, 43],
    60: [15, 61],
    '60wkl': [15, 60],
    65: [16, 68],
    75: [16, 84],
    tkl: [18.25, 87],
    96: [19, 100],
    100: [22.5, 104],
    alice: [null, 60],
    split34: [null, 34],
    split42: [null, 42],
    split58: [null, 58],
    split60: [null, 60],
    ortho4x12: [12, 47],
    ortho5x12: [12, 59],
    splitortho4x6: [13, 48],
    splitortho5x6: [13, 60],
  };
  assert.deepEqual(Object.keys(expected).sort(), list.map((l) => l.id).sort());
  for (const [id, [width, count]] of Object.entries(expected)) {
    if (width !== null) assert.equal(byId[id].width, width, `${id} width`);
    assert.equal(byId[id].keys.length, count, `${id} key count`);
  }
});

test('row-staggered layouts have rows of equal width', () => {
  for (const id of ['40', '60', '60wkl', '65']) {
    const rows = new Map();
    for (const key of byId[id].keys) if (key.h === 1) rows.set(key.y, Math.max(rows.get(key.y) || 0, key.x + key.w));
    for (const [y, end] of rows) assert.equal(end, byId[id].width, `${id} row y=${y}`);
  }
});

test('rotated layouts sit in positive space', () => {
  for (const layout of list) {
    for (const [x, y] of layout.keys.flatMap(corners)) assert.ok(x >= -EPS && y >= -EPS, layout.id);
  }
});

test('split layouts are mirror-symmetric in key count', () => {
  for (const id of ['split34', 'split42', 'split58', 'split60', 'splitortho4x6', 'splitortho5x6']) {
    const left = byId[id].keys.filter((k) => k.part === 0).length;
    const right = byId[id].keys.filter((k) => k.part === 1).length;
    assert.equal(left, right, id);
  }
});

test('every layout has a known category and every key a known group', () => {
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const layout of list) {
    assert.ok(cats.has(layout.cat), layout.id);
    for (const key of layout.keys) assert.ok(['alpha', 'mod', 'accent'].includes(key.g), `${layout.id}: ${key.l}`);
  }
});

test('old layout ids still resolve for existing share URLs', () => {
  assert.equal(resolveId('corne'), 'split42');
  assert.equal(resolveId('lily58'), 'split58');
  assert.equal(resolveId('planck'), 'ortho4x12');
  assert.equal(resolveId('65'), '65');
  assert.equal(resolveId('nope'), null);
});

test('presets are well formed', () => {
  const ids = new Set();
  for (const p of presets) {
    assert.ok(!ids.has(p.id), `duplicate preset ${p.id}`);
    ids.add(p.id);
    for (const role of ['case', 'alpha', 'mod', 'accent']) assert.ok(isHex(p.colors[role]), `${p.id}.${role}`);
  }
});
