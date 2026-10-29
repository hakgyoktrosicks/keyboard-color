const test = require('node:test');
const assert = require('node:assert/strict');
const { parseKle, pack, unpack, KleError } = require('../js/kle.js');
const { buildLayout, rects } = require('../js/layouts.js');
const { sizeLabel } = require('../js/bom.js');

const pos = (k) => [k.l, k.x, k.y, k.w, k.h];

test('strict JSON with metadata, multi-legend keys and widths', () => {
  const { name, keys } = parseKle('[{"name":"Test board"},["Esc","!\\n1","@\\n2"],[{"w":1.5},"Tab","Q"]]');
  assert.equal(name, 'Test board');
  assert.equal(parseKle('[{"name":"  Split <v2> & co "},["A"]]').name, 'Split <v2> & co');
  assert.deepEqual(keys.map(pos), [
    ['Esc', 0, 0, 1, 1],
    ['1', 1, 0, 1, 1],
    ['2', 2, 0, 1, 1],
    ['Tab', 0, 1, 1.5, 1],
    ['Q', 1.5, 1, 1, 1],
  ]);
  assert.deepEqual(keys.map((k) => k.g), ['accent', 'alpha', 'alpha', 'mod', 'alpha']);
});

test('raw data: no outer brackets, bare keys, single quotes, trailing commas', () => {
  const { keys } = parseKle(`["A",'B',],\n[{x:0.5,w:2},"C"]`);
  assert.deepEqual(keys.map(pos), [
    ['A', 0, 0, 1, 1],
    ['B', 1, 0, 1, 1],
    ['C', 0.5, 1, 2, 1],
  ]);
});

test('a single row on its own', () => {
  assert.deepEqual(parseKle('["A","B"]').keys.map(pos), [
    ['A', 0, 0, 1, 1],
    ['B', 1, 0, 1, 1],
  ]);
});

test('rx / ry move the cursor to the rotation origin, rotation persists across rows', () => {
  // rx=2, ry=3 -> cursor (2, 3); y:-1 -> 2; x:0.5 -> 2.5. Next row: y 3, x back to rx (2).
  const { keys } = parseKle('[[{"r":15,"rx":2,"ry":3,"y":-1,"x":0.5},"T"],["U"]]');
  assert.deepEqual(keys.map((k) => [k.l, k.x, k.y, k.rot, k.rx, k.ry]), [
    ['T', 2.5, 2, 15, 2, 3],
    ['U', 2, 3, 15, 2, 3],
  ]);
  // rx alone keeps ry (0); a later ry alone keeps rx.
  const b = parseKle('[[{"rx":1},"A"],[{"ry":2},"B"]]').keys;
  assert.deepEqual(b.map((k) => [k.l, k.x, k.y]), [
    ['A', 1, 0],
    ['B', 1, 2],
  ]);
});

test('ISO Enter second rectangle is kept and recognised', () => {
  const [enter] = parseKle('[[{"x":0.25,"w":1.25,"h":2,"w2":1.5,"h2":1,"x2":-0.25},"Enter"]]').keys;
  assert.deepEqual(pos(enter), ['Enter', 0.25, 0, 1.25, 2]);
  assert.deepEqual(enter.sub, { x: -0.25, y: 0, w: 1.5, h: 1 });
  assert.deepEqual(rects(enter).map((r) => [r.x, r.y, r.w, r.h]), [
    [0.25, 0, 1.25, 2],
    [0, 0, 1.5, 1],
  ]);
  assert.equal(sizeLabel(enter), 'L字Enter');
  assert.equal(enter.g, 'accent');
});

test('decals and ghost keys are skipped but still take up space; ghost is sticky', () => {
  assert.deepEqual(parseKle('[[{"d":true},"note","A"]]').keys.map(pos), [['A', 1, 0, 1, 1]]);
  assert.deepEqual(parseKle('[[{"g":true},"G1","G2",{"g":false},"A"]]').keys.map(pos), [['A', 2, 0, 1, 1]]);
});

test('labels: base legend chosen, HTML stripped, entities decoded, letters upper-cased', () => {
  const keys = parseKle(`[["<i class='kb kb-x'></i>Fn","q","&lt;\\n,","~\\n\`","Tab &amp; more","Return"]]`).keys;
  assert.deepEqual(keys.map((k) => k.l), ['Fn', 'Q', ',', '`', 'Tab & more', 'Return']);
  // Shifted + base legends must still count as alphas, not modifiers.
  assert.deepEqual(keys.map((k) => k.g), ['mod', 'alpha', 'alpha', 'alpha', 'mod', 'accent']);
});

test('key colours are read when valid', () => {
  // Colours are sticky like in KLE; a non-hex colour (e.g. a CSS name) is dropped, not kept.
  const keys = parseKle('[[{"c":"#FF0000"},"A","B",{"c":"red"},"C"]]').keys;
  assert.deepEqual(keys.map((k) => k.c), ['#ff0000', '#ff0000', undefined]);
});

test('invalid input is rejected with a readable error', () => {
  for (const bad of ['', 'not json at all', '[["A",{"r":10},"B"]]', '[["A"],{"name":"late"}]', '[[{"w":-1},"A"]]', '[[{"x":"1"},"A"]]']) {
    assert.throws(() => parseKle(bad), KleError, bad);
  }
  const tooMany = JSON.stringify([Array.from({ length: 501 }, () => 'A')]);
  assert.throws(() => parseKle(tooMany), KleError);
});

test('pack / unpack round-trips and rejects tampered data', () => {
  const parsed = parseKle('[{"name":"N"},[{"r":10,"rx":1,"ry":1},"A",{"x":0.25,"w":1.25,"h":2,"w2":1.5,"h2":1,"x2":-0.25},"Enter"]]');
  const imported = { name: parsed.name, keys: parsed.keys.map(({ c, ...k }) => k) };
  assert.deepEqual(unpack(JSON.parse(JSON.stringify(pack(imported)))), imported);
  const good = pack(imported);
  const tamper = (fn) => {
    const copy = JSON.parse(JSON.stringify(good));
    fn(copy);
    return copy;
  };
  for (const bad of [
    null,
    { k: [] },
    tamper((d) => (d.k[0][1] = '1')),
    tamper((d) => (d.k[0][5] = 'z')),
    tamper((d) => (d.k[0][0] = 'x'.repeat(11))),
    tamper((d) => (d.k[0][3] = 0)),
    tamper((d) => (d.k[1][7] = [0, 0, -1, 1])),
  ]) {
    assert.throws(() => unpack(bad), KleError);
  }
});

test('imported layouts are moved to the origin and split into cases', () => {
  // Two 1u keys at x=5 and x=6, then a gap of 2u, then one more key.
  const { keys } = parseKle('[[{"x":5},"A","B",{"x":2},"C"]]');
  const layout = buildLayout({ id: 'kle', name: 'x', keys });
  assert.deepEqual(layout.keys.map((k) => [k.l, k.x, k.part]), [
    ['A', 0, 0],
    ['B', 1, 0],
    ['C', 4, 1],
  ]);
  assert.equal(layout.width, 5);
  assert.equal(layout.height, 1);
});
