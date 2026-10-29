const test = require('node:test');
const assert = require('node:assert/strict');
const { serialize, toJson, toRawData, parseKle } = require('../js/kle.js');
const { list, byId, outline } = require('../js/layouts.js');
const { sizeLabel } = require('../js/bom.js');

const PALETTE = { alpha: '#eeeeee', mod: '#555555', accent: '#ff3300' };
const colorsFor = (key) => ({ cap: PALETTE[key.g], legend: key.g === 'mod' ? '#ffffff' : '#111111' });

// Shape-independent description of a key: legend, size class and the bounding box of its
// outline (rotation included). An L-shaped Enter is split into rectangles differently in
// our model and in KLE, so rectangles are not compared directly.
function signature(key) {
  const pts = outline(key);
  const r = (v) => Math.round(v * 1000) / 1000;
  return [
    key.l,
    sizeLabel(key),
    r(Math.min(...pts.map((p) => p[0]))),
    r(Math.min(...pts.map((p) => p[1]))),
    r(Math.max(...pts.map((p) => p[0]))),
    r(Math.max(...pts.map((p) => p[1]))),
  ].join('|');
}

test('every built-in layout survives export and re-import', () => {
  for (const layout of list) {
    const rows = serialize(layout, { name: layout.name, caseColor: '#222222', colorsFor });
    for (const text of [toJson(rows), toRawData(rows)]) {
      const parsed = parseKle(text);
      assert.equal(parsed.name, layout.name, layout.id);
      assert.deepEqual(parsed.keys.map(signature).sort(), layout.keys.map(signature).sort(), layout.id);
    }
  }
});

test('key colours are exported as sticky c / t and come back on import', () => {
  const layout = byId['65'];
  const rows = serialize(layout, { colorsFor });
  const parsed = parseKle(toJson(rows));
  const byLabelPos = new Map(parsed.keys.map((k) => [`${k.l}|${k.x}|${k.y}`, k.c]));
  for (const key of layout.keys) assert.equal(byLabelPos.get(`${key.l}|${key.x}|${key.y}`), colorsFor(key).cap, key.l);
  // Sticky: the colour is written only when it changes, not on every key.
  const cProps = rows.slice(1).flat().filter((v) => typeof v === 'object' && v.c);
  assert.ok(cProps.length < layout.keys.length / 2, `${cProps.length} colour changes`);
  const tProps = rows.slice(1).flat().filter((v) => typeof v === 'object' && v.t);
  assert.ok(tProps.length >= 2, 'legend colours are written');
});

test('metadata carries the name and case colour; legends are HTML-escaped', () => {
  const layout = { keys: [{ l: '<', x: 0, y: 0, w: 1, h: 1, g: 'alpha' }, { l: 'A&B', x: 1, y: 0, w: 1, h: 1, g: 'mod' }] };
  const rows = serialize(layout, { name: 'Test', caseColor: '#123456', colorsFor });
  assert.deepEqual(rows[0], { backcolor: '#123456', name: 'Test', notes: 'Keyboard Color Lab で作成' });
  assert.deepEqual(rows[1].filter((v) => typeof v === 'string'), ['&lt;', 'A&amp;B']);
  assert.deepEqual(parseKle(toJson(rows)).keys.map((k) => k.l), ['<', 'A&B']);
});

test('JIS L-shaped Enter is written in the standard KLE ISO Enter form', () => {
  const rows = serialize(byId['60-jis'], { colorsFor });
  const row = rows.find((r) => Array.isArray(r) && r.includes('Enter'));
  const props = row[row.indexOf('Enter') - 1];
  assert.deepEqual({ x: props.x, w: props.w, h: props.h, x2: props.x2, w2: props.w2, h2: props.h2 }, { x: 0.25, w: 1.25, h: 2, x2: -0.25, w2: 1.5, h2: 1 });
});

test('rotation clusters are written once per row and re-imported exactly', () => {
  const rows = serialize(byId.alice, { colorsFor });
  const firstKeys = rows.slice(1).map((r) => r.find((v) => typeof v === 'object') || {});
  assert.ok(firstKeys.some((p) => p.r === -10) && firstKeys.some((p) => p.r === 10));
  for (const r of rows.slice(1)) {
    r.forEach((v, i) => {
      if (i > 0 && typeof v === 'object') assert.ok(v.r === undefined && v.rx === undefined && v.ry === undefined);
    });
  }
});
