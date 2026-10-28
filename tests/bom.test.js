const test = require('node:test');
const assert = require('node:assert/strict');
const { list, byId } = require('../js/layouts.js');
const { computeBom, bomText, sizeLabel } = require('../js/bom.js');

const byGroup = (key) => ({ cap: { alpha: '#ffffff', mod: '#888888', accent: '#ff0000' }[key.g], legend: '#000000' });

test('size labels', () => {
  assert.equal(sizeLabel({ w: 1, h: 1 }), '1u');
  assert.equal(sizeLabel({ w: 6.25, h: 1 }), '6.25u');
  assert.equal(sizeLabel({ w: 1, h: 2 }), '2u（縦）');
  assert.equal(sizeLabel({ w: 1.5, h: 2, shape: 'iso' }), 'L字Enter');
});

test('bom totals add up to the key count for every layout', () => {
  for (const layout of list) {
    const bom = computeBom(layout.keys, byGroup);
    assert.equal(bom.reduce((n, g) => n + g.total, 0), layout.keys.length, layout.id);
    for (const g of bom) assert.equal(g.sizes.reduce((n, s) => n + s.count, 0), g.total, layout.id);
  }
});

test('60% ANSI breakdown matches a hand count', () => {
  const bom = computeBom(byId['60'].keys, byGroup);
  const get = (cap) => bom.find((g) => g.cap === cap);
  // Alphas: number row 12 + Q row 13 (incl. 1.5u \) + A row 11 + Z row 10 = 46.
  assert.deepEqual(get('#ffffff').sizes, [
    { size: '1u', count: 45 },
    { size: '1.5u', count: 1 },
  ]);
  // Accents: Esc (1u) and Enter (2.25u).
  assert.deepEqual(get('#ff0000').sizes, [
    { size: '1u', count: 1 },
    { size: '2.25u', count: 1 },
  ]);
  assert.equal(get('#888888').total, 61 - 46 - 2);
  assert.deepEqual(bom.map((g) => g.cap), ['#ffffff', '#888888', '#ff0000']);
});

test('per-key overrides form their own group', () => {
  const keys = byId['60'].keys;
  const bom = computeBom(keys, (key) => (key.id === '1' ? { cap: '#00ff00', legend: '#000000' } : byGroup(key)));
  assert.equal(bom.find((g) => g.cap === '#00ff00').total, 1);
  assert.equal(bom.find((g) => g.cap === '#ffffff').total, 45);
});

test('text export lists every group', () => {
  const bom = computeBom(byId['60-jis'].keys, byGroup);
  const text = bomText(bom, '60%（JIS）');
  assert.match(text, /^60%（JIS）（全64キー）/);
  assert.match(text, /L字Enter×1/);
  assert.equal(text.split('\n').length, bom.length + 1);
});
