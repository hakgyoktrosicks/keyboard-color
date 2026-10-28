const test = require('node:test');
const assert = require('node:assert/strict');
const { createHistory } = require('../js/history.js');

test('undo and redo walk back and forth through snapshots', () => {
  const h = createHistory();
  assert.equal(h.canUndo(), false);
  h.checkpoint('A', null, 0); // state was A, becomes B
  h.checkpoint('B', null, 1000); // state was B, becomes C
  assert.equal(h.undo('C'), 'B');
  assert.equal(h.undo('B'), 'A');
  assert.equal(h.undo('A'), null);
  assert.equal(h.redo('A'), 'B');
  assert.equal(h.redo('B'), 'C');
  assert.equal(h.redo('C'), null);
});

test('a new change after undo clears the redo stack', () => {
  const h = createHistory();
  h.checkpoint('A', null, 0);
  assert.equal(h.undo('B'), 'A');
  h.checkpoint('A', null, 100);
  assert.equal(h.canRedo(), false);
});

test('rapid changes of the same kind coalesce into one step', () => {
  const h = createHistory({ coalesceMs: 600 });
  h.checkpoint('A', 'tune:alpha:cap', 0);
  h.checkpoint('A1', 'tune:alpha:cap', 100);
  h.checkpoint('A2', 'tune:alpha:cap', 650); // still within 600ms of the previous one
  assert.equal(h.undo('A3'), 'A');
  assert.equal(h.canUndo(), false);
});

test('different kinds or long pauses make separate steps', () => {
  const h = createHistory({ coalesceMs: 600 });
  h.checkpoint('A', 'base', 0);
  h.checkpoint('B', 'tune:mod:cap', 100);
  h.checkpoint('C', 'tune:mod:cap', 2000);
  h.checkpoint('D', null, 2100);
  h.checkpoint('E', null, 2150); // null kind never coalesces
  const seen = [];
  let cur = 'F';
  for (let s; (s = h.undo(cur)); cur = s) seen.push(s);
  assert.deepEqual(seen, ['E', 'D', 'C', 'B', 'A']);
});

test('history is capped at the limit', () => {
  const h = createHistory({ limit: 3 });
  for (let i = 0; i < 5; i++) h.checkpoint(i, null, i * 1000);
  const seen = [];
  let cur = 5;
  for (let s; (s = h.undo(cur)) !== null; cur = s) seen.push(s);
  assert.deepEqual(seen, [4, 3, 2]);
});
