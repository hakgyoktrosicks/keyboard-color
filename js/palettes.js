// Curated palettes based on well-known design color schemes.
// Roles: case (housing), alpha (letters/numbers), mod (modifiers), accent (Esc/Enter).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KC = Object.assign(root.KC || {}, { presets: api });
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return [
    {
      id: 'nord',
      name: 'Nord',
      desc: '北極圏をイメージした寒色系のUIパレット。',
      colors: { case: '#3b4252', alpha: '#eceff4', mod: '#4c566a', accent: '#88c0d0' },
    },
    {
      id: 'solarized-light',
      name: 'Solarized Light',
      desc: '色相と明度を精密に設計した定番パレットのライト版。',
      colors: { case: '#eee8d5', alpha: '#fdf6e3', mod: '#93a1a1', accent: '#cb4b16' },
    },
    {
      id: 'solarized-dark',
      name: 'Solarized Dark',
      desc: 'Solarized のダーク版。深い青緑に黄色の差し色。',
      colors: { case: '#002b36', alpha: '#073642', mod: '#586e75', accent: '#b58900' },
    },
    {
      id: 'dracula',
      name: 'Dracula',
      desc: '暗い紫灰にネオンピンクを効かせたダークテーマ。',
      colors: { case: '#282a36', alpha: '#44475a', mod: '#6272a4', accent: '#ff79c6' },
    },
    {
      id: 'retro',
      name: 'レトロベージュ',
      desc: '80年代PCのベージュ筐体を思わせるクリーム×グレー×赤。',
      colors: { case: '#d6cfbd', alpha: '#ede7d7', mod: '#9e9a90', accent: '#c8463d' },
    },
    {
      id: 'wa',
      name: '和色',
      desc: '日本の伝統色。墨・生成り色・藍色・朱色。',
      colors: { case: '#595857', alpha: '#fbfaf5', mod: '#165e83', accent: '#eb6101' },
    },
    {
      id: 'bauhaus',
      name: 'バウハウス',
      desc: '黒・白と三原色（赤・青）による幾何学的な配色。',
      colors: { case: '#1a1a1a', alpha: '#f2efe6', mod: '#21409a', accent: '#be1e2d' },
    },
    {
      id: 'mono',
      name: 'モノトーン＋差し色',
      desc: '白黒のみで構成し、1点だけ鮮やかなオレンジを差す。',
      colors: { case: '#e5e5e5', alpha: '#ffffff', mod: '#2b2b2b', accent: '#ff5a1f' },
    },
    {
      id: 'pastel',
      name: 'パステル',
      desc: '高明度・低彩度のラベンダーとピンク。',
      colors: { case: '#f3eef8', alpha: '#fdfbff', mod: '#c9b6e4', accent: '#f4a6b7' },
    },
    {
      id: 'earth',
      name: 'アーストーン',
      desc: 'オリーブ・砂・テラコッタの自然由来の色。',
      colors: { case: '#6b705c', alpha: '#ddbea9', mod: '#a5a58d', accent: '#cb997e' },
    },
  ];
});
