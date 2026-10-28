const test = require('node:test');
const assert = require('node:assert/strict');
const color = require('../js/color.js');

test('hex <-> hsl round trip', () => {
  for (const hex of ['#000000', '#ffffff', '#ff0000', '#5e81ac', '#165e83', '#eb6101']) {
    assert.equal(color.hslToHex(color.hexToHsl(hex)), hex);
  }
});

test('accepts 3-digit hex and rejects garbage', () => {
  assert.deepEqual(color.hexToRgb('#fff'), { r: 255, g: 255, b: 255 });
  assert.equal(color.isHex('#12345g'), false);
  assert.throws(() => color.hexToRgb('red'));
});

test('contrast ratio matches WCAG reference values', () => {
  assert.equal(color.contrastRatio('#000000', '#ffffff').toFixed(1), '21.0');
  assert.equal(color.contrastRatio('#777777', '#ffffff').toFixed(2), '4.48');
  assert.equal(color.wcagLevel(4.5), 'AA');
  assert.equal(color.wcagLevel(2.9), 'NG');
});

test('auto legend always reaches at least AA Large contrast', () => {
  for (let h = 0; h < 360; h += 15) {
    for (const s of [0, 50, 100]) {
      for (let l = 0; l <= 100; l += 10) {
        const cap = color.hslToHex({ h, s, l });
        assert.ok(color.contrastRatio(cap, color.autoLegend(cap)) >= 3, cap);
      }
    }
  }
});

test('complementary palette puts the accent opposite the base hue', () => {
  const p = color.generatePalette('#3366cc', 'complementary', 'light');
  const baseHue = color.hexToHsl('#3366cc').h;
  const accentHue = color.hexToHsl(p.accent).h;
  const diff = Math.abs(color.normalizeHue(accentHue - baseHue) - 180);
  assert.ok(diff < 3, `hue difference off by ${diff}`);
});

test('every harmony x tone combination yields valid colors', () => {
  for (const h of Object.keys(color.HARMONIES)) {
    for (const t of Object.keys(color.TONES)) {
      const p = color.generatePalette('#5e81ac', h, t);
      for (const role of ['case', 'alpha', 'mod', 'accent']) assert.ok(color.isHex(p[role]), `${h}/${t}/${role}`);
    }
  }
});
