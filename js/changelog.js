// User-facing change history shown at the bottom of the page. Newest entry first; see CLAUDE.md.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KC = Object.assign(root.KC || {}, { changelog: api });
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return [
    {
      date: '2026-10-28',
      title: '更新履歴を追加',
      items: ['ページ下部に更新履歴を表示するようにしました。'],
    },
    {
      date: '2026-10-28',
      title: '分割オーソリニア配列を追加',
      items: ['「分割オーソリニア 4×6×2」「分割オーソリニア 5×6×2」を追加しました（全17種類）。'],
    },
    {
      date: '2026-10-28',
      title: 'クレジット表記を整理',
      items: ['参考にした配色のクレジットを、プリセットのデータから自動で表示するようにしました。'],
    },
    {
      date: '2026-10-28',
      title: 'レイアウトを15種類に拡充',
      items: [
        '40%、60% 分割BS・WKL、96%、エルゴ 65%、分割 3×5＋親指2、分割 6×4＋親指5、オーソリニア 5×12 を追加しました。',
        'レイアウトを分類ごとに並べ、表示名を汎用的な呼び方に変更しました。代表的なキーボード名は「例」として表示します。',
        '「クレジット・表記について」を追加しました。',
      ],
    },
    {
      date: '2026-10-28',
      title: '公開',
      items: [
        '8種類のレイアウトで配色をシミュレーションできるようになりました。',
        '配色ルールからの自動生成、プリセット、色の微調整、個別ペイント、共有URL、PNG保存に対応しました。',
      ],
    },
  ];
});
