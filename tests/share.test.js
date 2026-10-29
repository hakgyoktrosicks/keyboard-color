const test = require('node:test');
const assert = require('node:assert/strict');
const { encode, decode, PREFIX, MAX_BYTES } = require('../js/share.js');

const sample = {
  l: 'kle',
  c: { case: '#222222', alpha: { cap: '#eeeeee', legend: '#111111' } },
  o: { 3: '#ff0000' },
  k: { n: 'フルサイズ（JIS）', k: [['半/全', 0, 0, 1, 1, 'm', 0, 0]] },
};

test('round-trips data, including non-Latin-1 text', async () => {
  const hash = await encode(sample);
  assert.ok(hash.startsWith(PREFIX));
  assert.deepEqual(await decode(hash), sample);
});

test('output is URL-safe (no + / = that chat apps mangle)', async () => {
  for (let i = 0; i < 20; i++) {
    const hash = await encode({ ...sample, n: i, pad: 'x'.repeat(i * 7) });
    assert.match(hash.slice(PREFIX.length), /^[A-Za-z0-9_-]+$/);
  }
});

test('compresses repetitive layout data substantially', async () => {
  const keys = Array.from({ length: 100 }, (_, i) => [`K${i % 10}`, i % 15, Math.floor(i / 15), 1, 1, 'a', 0, 0]);
  const data = { ...sample, k: { n: 'big', k: keys } };
  const legacy = Buffer.from(JSON.stringify(data)).toString('base64');
  const hash = await encode(data);
  assert.ok(hash.length < legacy.length * 0.4, `${hash.length} vs ${legacy.length}`);
});

test('old uncompressed URLs (plain Base64 JSON) still decode', async () => {
  const old = Buffer.from(JSON.stringify({ l: '65', a: true })).toString('base64');
  assert.ok(old.startsWith('ey'), 'old URLs start with "ey", so they never collide with the "z." prefix');
  assert.deepEqual(await decode(old), { l: '65', a: true });
});

test('a crafted URL that expands beyond the limit is rejected', async () => {
  // About 2 MB of zeros compresses to a few KB.
  const zeros = new Uint8Array(MAX_BYTES * 2);
  const compressed = new Uint8Array(await new Response(new Blob([zeros]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const hash = PREFIX + Buffer.from(compressed).toString('base64url');
  await assert.rejects(decode(hash), /too large/);
});

test('malformed input throws', async () => {
  await assert.rejects(decode(`${PREFIX}not-deflate-data`));
  await assert.rejects(decode('!!!'));
  await assert.rejects(decode(Buffer.from('not json').toString('base64')));
});
