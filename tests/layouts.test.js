const test = require('node:test');
const assert = require('node:assert/strict');
const { list, byId } = require('../js/layouts.js');
const presets = require('../js/palettes.js');
const { isHex } = require('../js/color.js');

const EPS = 1e-9;
const overlaps = (a, b) =>
  a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

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

test('standard layouts have the expected width and key count', () => {
  const expected = {
    60: [15, 61],
    65: [16, 68],
    75: [16, 84],
    tkl: [18.25, 87],
    100: [22.5, 104],
    corne: [null, 42],
    lily58: [null, 58],
    planck: [12, 47],
  };
  for (const [id, [width, count]] of Object.entries(expected)) {
    if (width !== null) assert.equal(byId[id].width, width, `${id} width`);
    assert.equal(byId[id].keys.length, count, `${id} key count`);
  }
});

test('every key belongs to a known color group', () => {
  for (const layout of list) {
    for (const key of layout.keys) assert.ok(['alpha', 'mod', 'accent'].includes(key.g), `${layout.id}: ${key.l}`);
  }
});

test('presets are well formed', () => {
  const ids = new Set();
  for (const p of presets) {
    assert.ok(!ids.has(p.id), `duplicate preset ${p.id}`);
    ids.add(p.id);
    for (const role of ['case', 'alpha', 'mod', 'accent']) assert.ok(isHex(p.colors[role]), `${p.id}.${role}`);
  }
});
