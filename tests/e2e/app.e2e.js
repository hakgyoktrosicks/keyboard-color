// Browser tests for the UI. Run with `npm run test:e2e` (needs Playwright + Chromium).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, shareState, keyFill, bomTotal, pressedLayout, inputValue, keyIds } = require('./helpers.js');

let env;
before(async () => {
  env = await setup();
});
after(async () => {
  await env.close();
});

const accentCap = (page) => inputValue(page, '[data-role="accent"][data-part="cap"]');
const alphaCap = (page) => inputValue(page, '[data-role="alpha"][data-part="cap"]');

test('loads cleanly and the breakdown matches the key count', async () => {
  const page = await env.page();
  assert.equal(await pressedLayout(page), '65');
  assert.equal(await bomTotal(page), await page.locator('#preview .key').count());
  assert.deepEqual(page.errors, []);
});

test('no horizontal scroll on a phone-sized screen', async () => {
  const page = await env.page({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.deepEqual(page.errors, []);
});

test('layout and ANSI/JIS selection', async () => {
  const page = await env.page();
  await page.click('.layout-btn[data-id="75"]');
  await page.click('#std-toggle [data-std="jis"]');
  assert.equal((await shareState(page)).l, '75-jis');
  await page.click('.layout-btn[data-id="tkl"]');
  assert.equal((await shareState(page)).l, 'tkl-jis', 'the JIS preference carries over');
  await page.click('.layout-btn[data-id="split42"]');
  assert.equal(await page.$eval('#std-toggle button', (b) => b.disabled), true);
  assert.deepEqual(page.errors, []);
});

test('undo / redo with buttons and shortcuts; picker drags are one step', async () => {
  const page = await env.page();
  const before = await alphaCap(page);
  await page.click('#tab-preset');
  await page.click('.preset[data-id="dracula"]');
  const dracula = await alphaCap(page);
  await page.click('#btn-undo');
  await page.click('#btn-undo');
  assert.equal(await alphaCap(page), before);
  await page.keyboard.press('Control+Shift+Z');
  await page.keyboard.press('Control+Shift+Z');
  assert.equal(await alphaCap(page), dracula);

  await page.evaluate(() => {
    const el = document.querySelector('[data-role="mod"][data-part="cap"]');
    for (const v of ['#111111', '#222222', '#333333']) {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.keyboard.press('Control+z');
  assert.notEqual(await inputValue(page, '[data-role="mod"][data-part="cap"]'), '#111111');
  assert.deepEqual(page.errors, []);
});

test('moving keys to the accent group follows palette changes and can be undone', async () => {
  const page = await env.page();
  const arrows = await keyIds(page, '65', ['←', '↓', '↑', '→']);
  assert.equal(arrows.length, 4);
  const ratioBefore = await page.$eval('#ratio', (x) => x.textContent);

  await page.selectOption('#key-tool', 'accent');
  for (const id of arrows) await page.click(`#preview .key[data-id="${id}"]`);
  for (const id of arrows) assert.equal(await keyFill(page, id), await accentCap(page));
  assert.notEqual(await page.$eval('#ratio', (x) => x.textContent), ratioBefore);

  // The moved keys follow the accent color of a different palette.
  await page.click('#tab-preset');
  await page.click('.preset[data-id="wa"]');
  for (const id of arrows) assert.equal(await keyFill(page, id), await accentCap(page));
  assert.deepEqual(Object.keys((await shareState(page)).gr).sort(), [...arrows].sort());

  // Same action again returns a key to its own group; keyboard works too.
  await page.$eval(`#preview .key[data-id="${arrows[0]}"]`, (el) => el.focus());
  await page.keyboard.press('Enter');
  assert.notEqual(await keyFill(page, arrows[0]), await accentCap(page));
  assert.equal(await page.evaluate(() => document.activeElement.dataset.id), arrows[0]);

  await page.click('#btn-undo');
  assert.equal(await keyFill(page, arrows[0]), await accentCap(page));
  await page.click('#btn-clear');
  assert.deepEqual((await shareState(page)).gr, {});
  assert.deepEqual(page.errors, []);
});

test('painting a key adds its own keycap group', async () => {
  const page = await env.page();
  const groupsBefore = await page.locator('#bom li').count();
  await page.selectOption('#key-tool', 'paint');
  assert.equal(await page.isVisible('#paint-row'), true);
  await page.fill('#paint', '#00ff00');
  await page.click('#preview .key[data-id="5"]');
  assert.equal(await keyFill(page, '5'), '#00ff00');
  assert.equal(await page.locator('#bom li').count(), groupsBefore + 1);
  await page.click('#preview .key[data-id="5"]');
  assert.notEqual(await keyFill(page, '5'), '#00ff00', 'painting again with the same color removes it');
  assert.deepEqual(page.errors, []);
});

test('share URL restores layout, palette source, paint and groups', async () => {
  const page = await env.page();
  await page.click('.layout-btn[data-id="60"]');
  await page.click('#tab-preset');
  await page.click('.preset[data-id="nord"]');
  await page.selectOption('#key-tool', 'accent');
  await page.click('#preview .key[data-id="1"]');
  await page.selectOption('#key-tool', 'paint');
  await page.fill('#paint', '#123456');
  await page.click('#preview .key[data-id="2"]');
  const hash = (await shareState(page)) && (await page.evaluate(() => location.hash.slice(1)));

  const other = await env.page({ hash });
  assert.equal(await pressedLayout(other), '60');
  assert.equal(await other.$eval('.preset[aria-pressed="true"]', (x) => x.dataset.id), 'nord');
  assert.equal(await keyFill(other, '1'), await accentCap(other));
  assert.equal(await keyFill(other, '2'), '#123456');
  assert.deepEqual(other.errors, []);
});

test('tampered share URLs fall back to the default layout', async () => {
  const bad = Buffer.from(JSON.stringify({ l: 'kle', k: { k: [['A', 'x', 0, 1, 1, 'a', 0, 0]] }, c: {} })).toString('base64');
  const page = await env.page({ hash: bad });
  assert.equal(await pressedLayout(page), '65');
  const badGroups = Buffer.from(
    JSON.stringify({
      l: '60',
      c: { case: '#000000', alpha: { cap: '#ffffff', legend: '#000000' }, mod: { cap: '#888888', legend: '#000000' }, accent: { cap: '#ff0000', legend: '#000000' } },
      gr: { 1: 'accent', 999: 'accent', 2: 'evil', x: 'accent' },
    })
  ).toString('base64');
  const page2 = await env.page({ hash: badGroups });
  assert.deepEqual((await shareState(page2)).gr, { 1: 'accent' });
  assert.deepEqual([...page.errors, ...page2.errors], []);
});

test('saved designs survive a reload, reopen, delete, and corrupt storage', async () => {
  const ctx = await env.newContext();
  const page = await env.page({}, ctx);
  await page.click('#tab-preset');
  await page.click('.preset[data-id="bauhaus"]');
  const saved = await alphaCap(page);
  await page.click('#btn-save');

  const page2 = await env.page({}, ctx);
  assert.equal(await page2.locator('#saved li[data-id]').count(), 1);
  await page2.click('#saved li[data-id] button[data-action="open"]');
  assert.equal(await alphaCap(page2), saved);
  assert.equal(await page2.$eval('#btn-undo', (b) => b.disabled), false, 'opening is undoable');
  await page2.click('#saved li[data-id] button[data-action="delete"]');
  assert.equal(await page2.locator('#saved li[data-id]').count(), 0);

  await page2.evaluate(() => localStorage.setItem('keyboard-color:saved', '{not json'));
  await page2.reload();
  assert.equal(await page2.locator('#saved li[data-id]').count(), 0);
  assert.deepEqual([...page.errors, ...page2.errors], []);
});

test('KLE import: raw data, errors, split boards, undo', async () => {
  const page = await env.page();
  await page.click('.kle-import summary');
  await page.fill('#kle-text', '["A","B"],\n[{x:0.5,w:2},"C"]');
  await page.click('#btn-kle');
  assert.equal(await pressedLayout(page), 'kle');
  assert.equal(await page.locator('#preview .key').count(), 3);
  assert.equal(await bomTotal(page), 3);

  await page.fill('#kle-text', '[["A",{"r":10},"B"]]');
  await page.click('#btn-kle');
  assert.match(await page.$eval('#kle-error', (x) => x.textContent), /行の先頭/);

  await page.fill('#kle-text', '[{"name":"Split <x>"},["Q","W",{"x":3},"O","P"],[{"r":15,"rx":1,"ry":1},"T"]]');
  await page.click('#btn-kle');
  assert.equal(await page.$$eval('#preview svg > rect', (xs) => xs.length), 2, 'one case per half');
  assert.match(await page.$eval('.layout-btn[data-id="kle"]', (x) => x.textContent), /Split <x>/);

  await page.click('#btn-undo');
  assert.equal(await page.locator('#preview .key').count(), 3);
  assert.deepEqual(page.errors, []);
});

test('colour vision simulation changes the preview only', async () => {
  const page = await env.page();
  const bom = await page.$eval('#bom', (x) => x.textContent);
  const fill = await keyFill(page, '0');
  await page.selectOption('#cvd', 'deuteranopia');
  assert.notEqual(await keyFill(page, '0'), fill);
  assert.equal(await page.$eval('#bom', (x) => x.textContent), bom);
  assert.equal(await page.$eval('#btn-undo', (b) => b.disabled), true, 'not an undoable change');
  assert.deepEqual(page.errors, []);
});

test('KLE export: Raw data re-imports to the same layout and colours; JSON downloads', async () => {
  const page = await env.page();
  await page.click('.layout-btn[data-id="60"]');
  await page.click('#std-toggle [data-std="jis"]');
  await page.selectOption('#key-tool', 'accent');
  await page.click('#preview .key[data-id="1"]');
  await page.selectOption('#key-tool', 'paint');
  await page.fill('#paint', '#00aa55');
  await page.click('#preview .key[data-id="2"]');
  const keyCount = await page.locator('#preview .key').count();
  // The keycap's top face is the last shape drawn (an L-shaped Enter is 2 polygons in our
  // layouts but 4 rects after a KLE round trip).
  const topFaces = () =>
    page.$$eval('#preview .key', (keys) => keys.map((k) => [k.textContent, [...k.querySelectorAll('rect, polygon')].pop().getAttribute('fill')]));
  const fills = await topFaces();

  await page.click('.kle-import summary');
  await page.click('#btn-kle-raw');
  const raw = await page.$eval('#kle-out', (x) => x.value);
  assert.match(raw, /"name":"60%（JIS）"/);

  await page.fill('#kle-text', raw);
  await page.check('#kle-colors');
  await page.click('#btn-kle');
  assert.equal(await pressedLayout(page), 'kle');
  assert.equal(await page.locator('#preview .key').count(), keyCount);
  const reimported = await topFaces();
  assert.deepEqual(reimported.sort(), fills.sort(), 'same legends and keycap colours');
  assert.equal(await page.$$eval('.bom-sizes', (xs) => xs.some((x) => x.textContent.includes('L字Enter'))), true);

  // Regression: Japanese names / legends used to break the share URL (btoa is Latin-1 only).
  const shared = await env.page({ hash: await page.evaluate(() => location.hash.slice(1)) });
  assert.equal(await pressedLayout(shared), 'kle');
  assert.equal(await shared.locator('#preview .key').count(), keyCount);
  assert.match(await shared.$eval('.layout-btn[data-id="kle"]', (x) => x.textContent), /60%（JIS）/);
  assert.deepEqual(shared.errors, []);

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-kle-json')]);
  const fs = require('node:fs');
  const json = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.ok(Array.isArray(json) && json.length > 1);
  assert.equal(json[0].notes, 'Keyboard Color Lab で作成');
  assert.deepEqual(page.errors, []);
});
