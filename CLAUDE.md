# keyboard-color 開発ルール

自作キーボードの配色シミュレーター。GitHub Pages で公開中: https://hakgyoktrosicks.github.io/keyboard-color/

## 構成と開発

- ビルド不要の静的サイト（`index.html` / `css/` / `js/`）。外部ライブラリ・CDN は使わない。
- `js/*.js` は UMD 形式。ブラウザでは `window.KC` に登録し、Node（テスト）では `require` で読み込む。`index.html` を `file://` で直接開いても動くよう ES Modules は使わない。
- テスト: `npm test`（Node 組み込みテストランナー）。変更後は必ず実行する。
- UI を変えたら Playwright（環境に導入済み）で表示確認する: コンソールエラーがないこと、390px 幅で横スクロールが出ないこと。
- `main` へのマージで `.github/workflows/pages.yml` がテスト後に Pages へ自動デプロイする。公開対象は `index.html`・`css/`・`js/` のみ。

## レイアウト追加のルール

- `js/layouts.js` の `list` に追加し、`tests/layouts.test.js` の期待値（幅・キー数）を**手計算した値で**更新する。実装の出力をそのまま期待値にコピーしない。
- 既存レイアウトの `id` は共有 URL に含まれるため変更しない。変更する場合は `ALIASES` に旧 id を残す。
- 表示名（`name`）は汎用的な呼び方にする（例: `分割 3×6＋親指3`）。実在のキーボード名は `example` に入れ、「例: ○○」として添えるだけにする。

## 名称・権利関係のルール

調査の結論（2026-10 時点。法的助言ではない）:

- 色の値や「4×12 の格子」のような配列そのものは独占の対象になりにくい。注意が必要なのは**名称の使い方**。
- 種類を説明するために名称を挙げる（参照的な使用）のは低リスク。公式・提携に見える表現、ロゴの使用、アプリ名や見出しとしての使用は避ける。

守ること:

1. **固有名は参照にとどめる**: キーボード名・製品名・テーマ名は `example`、説明文、プリセット名でのみ使う。アプリ名やレイアウトの表示名には使わない。ロゴや商品画像は使わない。
2. **非公式表記を維持する**: フッターと README の「クレジット・表記について」を削除しない。
3. **他者のパレットを使う場合はライセンスを確認する**: ライセンスを確認してから採用し、`js/palettes.js` のプリセットに `credit`（name / copyright / license / url）を付ける。フッターのクレジットは `credit` から自動生成される。README のクレジット欄にも同じ著作権表示を書く。
4. **ライセンスが不明・非許諾のものは使わない**: 確認できないパレットは色を流用せず、汎用的な名前の独自配色にする（例: 市販キーキャップセットの配色名は使わない）。
5. **新しい固有名を加えたら下の台帳に記録する**: 確認状況は「確認済（一次）」「確認済（二次情報）」「未確認」「未調査」で書き、推測で埋めない。

`tests/rights.test.js` が次を検証する: 全レイアウトの `example` と全プリセットの `id` が台帳にあること、`credit` の著作権表示が README にあること、レイアウトの表示名に `example` の固有名が入っていないこと。

## 名称・権利台帳

### レイアウトの参照名（`example`）

| 参照名 | 対象 | 権利・ライセンス | 確認状況 | 出典 |
| --- | --- | --- | --- | --- |
| HHKB系 | PFU の Happy Hacking Keyboard の配列系統 | 商標の登録状況は未確認 | 未調査 | — |
| 1800系 | コミュニティでの配列の通称 | 特定の権利者は確認できていない | 未調査 | — |
| Alice系 | TGR Alice に由来する配列の通称 | — | 未調査 | — |
| Ferris Sweep系 | オープンソースの分割キーボード | — | 未調査 | — |
| Corne（crkbd） | foostan のオープンソース分割キーボード | MIT, Copyright (c) 2018 foostan | 確認済（二次情報） | [splitkb attribution](https://docs.splitkb.com/hc/en-us/articles/360011125859-Lily58-KB-License) |
| Lily58 | Naoki Katahira のオープンソース分割キーボード | MIT, Copyright (c) 2018 Naoki Katahira | 確認済（二次情報） | [Deskthority](https://deskthority.net/wiki/Lily58), [splitkb](https://docs.splitkb.com/hc/en-us/articles/360011125859-Lily58-KB-License) |
| Sofle | オープンソースの分割キーボード | — | 未調査 | — |
| Planck | OLKB が販売する 4×12 キーボード | ハードウェアのライセンスは見つからず（ファームウェアの QMK は GPL-2.0） | 未確認 | [QMK keyboards/planck](https://github.com/qmk/qmk_firmware/tree/master/keyboards/planck) |
| Preonic | OLKB が販売する 5×12 キーボード | — | 未調査 | — |

### プリセット（`id`）

| id | 由来 | 権利・ライセンス | 確認状況 | 出典 |
| --- | --- | --- | --- | --- |
| `nord` | Nord パレット | MIT, Copyright (c) 2016-present Sven Greb (Arctic Ice Studio) | 確認済（二次情報） | [nordtheme/nord](https://github.com/nordtheme/nord) |
| `solarized-light` | Solarized | MIT, Copyright (c) 2011 Ethan Schoonover | 確認済（二次情報） | [Wikipedia](https://en.wikipedia.org/wiki/Solarized), [altercation/solarized](https://github.com/altercation/solarized) |
| `solarized-dark` | Solarized | 同上 | 確認済（二次情報） | 同上 |
| `dracula` | Dracula テーマ | MIT（著作権者表記は要確認） | 未確認 | [dracula/dracula-theme](https://github.com/dracula/dracula-theme) |
| `retro` | 独自配色（一般的な「ベージュ筐体」のイメージ） | 該当なし | — | — |
| `wa` | 独自配色（日本の伝統色名を参照） | 該当なし | — | — |
| `bauhaus` | 独自配色（美術様式を参照） | 該当なし | — | — |
| `mono` | 独自配色 | 該当なし | — | — |
| `pastel` | 独自配色 | 該当なし | — | — |
| `earth` | 独自配色 | 該当なし | — | — |
