// Color utilities: conversions, WCAG contrast, and harmony-based palette generation.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KC = Object.assign(root.KC || {}, { color: api });
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function normalizeHue(h) {
    return ((h % 360) + 360) % 360;
  }

  function isHex(value) {
    return typeof value === 'string' && HEX_RE.test(value);
  }

  function hexToRgb(hex) {
    const m = HEX_RE.exec(hex);
    if (!m) throw new Error(`Invalid hex color: ${hex}`);
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  }

  function rgbToHsl({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = normalizeHue(h * 60);
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function hslToRgb({ h, s, l }) {
    h = normalizeHue(h);
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 };
  }

  const hexToHsl = (hex) => rgbToHsl(hexToRgb(hex));
  const hslToHex = (hsl) => rgbToHex(hslToRgb(hsl));

  // sRGB <-> linear-light channel values (0-1).
  function toLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function fromLinear(v) {
    v = clamp(v, 0, 1);
    return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  }

  // WCAG 2.x relative luminance.
  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  function contrastRatio(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function wcagLevel(ratio) {
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    if (ratio >= 3) return 'AA Large';
    return 'NG';
  }

  function shade(hex, deltaL) {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, l: clamp(hsl.l + deltaL, 0, 100) });
  }

  // Pick a dark or light legend tinted toward the keycap hue, whichever reads better.
  function autoLegend(cap) {
    const { h, s } = hexToHsl(cap);
    const dark = hslToHex({ h, s: Math.min(s, 35), l: 14 });
    const light = hslToHex({ h, s: Math.min(s, 25), l: 96 });
    return contrastRatio(cap, dark) >= contrastRatio(cap, light) ? dark : light;
  }

  // Hue offsets (degrees) from the base color for each keyboard role.
  const HARMONIES = {
    monochromatic: {
      label: 'モノクロマティック',
      desc: '1つの色相を明度・彩度の差だけで展開。最も落ち着いた統一感。',
      hues: { alpha: 0, mod: 0, accent: 0 },
    },
    analogous: {
      label: '類似色（アナロガス）',
      desc: '色相環で隣り合う色（±30°）。穏やかで調和的。',
      hues: { alpha: 0, mod: 30, accent: -30 },
    },
    complementary: {
      label: '補色（コンプリメンタリー）',
      desc: '色相環の反対側（180°）をアクセントに。最もメリハリが強い。',
      hues: { alpha: 0, mod: 0, accent: 180 },
    },
    split: {
      label: '分裂補色（スプリットコンプリメンタリー）',
      desc: '補色の両隣（150° / 210°）。補色より柔らかく扱いやすい。',
      hues: { alpha: 0, mod: 150, accent: 210 },
    },
    triadic: {
      label: 'トライアド',
      desc: '色相環を3等分（120°）。賑やかで遊び心のある配色。',
      hues: { alpha: 0, mod: 120, accent: 240 },
    },
    tetradic: {
      label: 'テトラード（スクエア）',
      desc: '色相環を4等分（90°）。ケースにも4色目の色相を割り当てる。',
      hues: { alpha: 0, mod: 180, accent: 90, case: 270 },
    },
  };

  // Per role: [saturation factor relative to the base color, lightness].
  const TONES = {
    light: { label: 'ライト', case: [0.2, 86], alpha: [0.25, 95], mod: [0.55, 68], accent: [1, 55] },
    pastel: { label: 'パステル', case: [0.35, 92], alpha: [0.5, 88], mod: [0.55, 76], accent: [0.75, 70] },
    vivid: { label: 'ビビッド', case: [0.15, 18], alpha: [0.9, 58], mod: [0.85, 38], accent: [1, 52] },
    dark: { label: 'ダーク', case: [0.15, 10], alpha: [0.3, 22], mod: [0.3, 34], accent: [0.95, 62] },
  };

  // Colour vision deficiency simulation. Dichromat matrices (severity 1.0) from
  // Machado, Oliveira & Fernandes (2009), as published in the colour-science dataset
  // CVD_MATRICES_MACHADO2010; applied to linear-light RGB.
  const CVD = {
    protanopia: {
      label: '1型2色覚（P型）',
      matrix: [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998],
      ],
    },
    deuteranopia: {
      label: '2型2色覚（D型）',
      matrix: [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.01182, 0.04294, 0.968881],
      ],
    },
    tritanopia: {
      label: '3型2色覚（T型）',
      matrix: [
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.3039],
      ],
    },
    achromatopsia: { label: '1色覚（明暗のみ）', matrix: null },
  };

  function simulateCvd(hex, type) {
    const cvd = CVD[type];
    if (!cvd) return hex;
    const { r, g, b } = hexToRgb(hex);
    const lin = [toLinear(r), toLinear(g), toLinear(b)];
    if (!cvd.matrix) {
      const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
      return rgbToHex({ r: fromLinear(y), g: fromLinear(y), b: fromLinear(y) });
    }
    const [mr, mg, mb] = cvd.matrix.map((row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]);
    return rgbToHex({ r: fromLinear(mr), g: fromLinear(mg), b: fromLinear(mb) });
  }

  const ROLES = ['case', 'alpha', 'mod', 'accent'];

  function generatePalette(base, harmonyKey, toneKey) {
    const harmony = HARMONIES[harmonyKey];
    const tone = TONES[toneKey];
    if (!harmony) throw new Error(`Unknown harmony: ${harmonyKey}`);
    if (!tone) throw new Error(`Unknown tone: ${toneKey}`);
    const { h, s } = hexToHsl(base);
    const out = {};
    for (const role of ROLES) {
      const [sf, l] = tone[role];
      const offset = harmony.hues[role] || 0;
      out[role] = hslToHex({ h: h + offset, s: clamp(s * sf, 0, 100), l });
    }
    return out;
  }

  return {
    clamp,
    normalizeHue,
    isHex,
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb,
    hexToHsl,
    hslToHex,
    luminance,
    contrastRatio,
    wcagLevel,
    shade,
    autoLegend,
    HARMONIES,
    TONES,
    generatePalette,
    CVD,
    simulateCvd,
  };
});
