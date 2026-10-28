// Enforces the naming / rights rules documented in CLAUDE.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { list } = require('../js/layouts.js');
const presets = require('../js/palettes.js');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const claudeMd = read('CLAUDE.md');
const readme = read('README.md');

// First-column cells of the markdown tables in the rights register.
function registerKeys() {
  const register = claudeMd.slice(claudeMd.indexOf('## 名称・権利台帳'));
  return new Set(
    register
      .split('\n')
      .filter((line) => line.startsWith('| ') && !line.startsWith('| ---'))
      .map((line) => line.split('|')[1].trim().replace(/`/g, ''))
  );
}

// "Corne（crkbd）" -> "Corne", "HHKB系" -> "HHKB"
const coreName = (example) => example.split('（')[0].replace(/系$/, '').trim();

test('every layout example is recorded in the rights register', () => {
  const keys = registerKeys();
  for (const layout of list.filter((l) => l.example)) {
    assert.ok(keys.has(layout.example), `${layout.id}: add "${layout.example}" to the register in CLAUDE.md`);
  }
});

test('every preset is recorded in the rights register', () => {
  const keys = registerKeys();
  for (const p of presets) assert.ok(keys.has(p.id), `add preset "${p.id}" to the register in CLAUDE.md`);
});

test('layout display names stay generic', () => {
  for (const layout of list.filter((l) => l.example)) {
    assert.ok(!layout.name.includes(coreName(layout.example)), `${layout.id}: move "${coreName(layout.example)}" out of name into example`);
  }
});

test('preset credits are complete and listed in README', () => {
  for (const p of presets.filter((x) => x.credit)) {
    for (const field of ['name', 'copyright', 'license', 'url']) assert.ok(p.credit[field], `${p.id}.credit.${field}`);
    assert.ok(readme.includes(p.credit.copyright), `${p.id}: add "${p.credit.copyright}" to README credits`);
  }
});

test('disclaimer is present in the app and README', () => {
  assert.ok(read('index.html').includes('非公式'));
  assert.ok(readme.includes('## クレジット・表記について'));
});
