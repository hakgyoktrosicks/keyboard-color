# keyboard-color 開発ルール

自作キーボードの配色シミュレーター。GitHub Pages で公開中: https://hakgyoktrosicks.github.io/keyboard-color/

## 構成と開発

- ビルド不要の静的サイト（`index.html` / `css/` / `js/`）。外部ライブラリ・CDN は使わない。
- `js/*.js` は UMD 形式。ブラウザでは `window.KC` に登録し、Node（テスト）では `require` で読み込む。`index.html` を `file://` で直接開いても動くよう ES Modules は使わない。
- テスト: `npm test`（単体テスト）と `npm run test:e2e`（Playwright によるブラウザテスト。`tests/e2e/`）。変更後は両方実行する。
- UI の機能を追加・変更したら、`tests/e2e/app.e2e.js` にその操作のテストを足す。その場限りの確認スクリプトで済ませない。テストを足したら、機能をわざと壊して失敗することも確かめる。
- CI: `.github/workflows/ci.yml` が PR ごとに単体テストとブラウザテストを実行する。`pages.yml` は同じワークフローを呼び出し、両方が通ったときだけデプロイする。CI の Playwright は `ci.yml` で `playwright@1.63.0` に固定している（ローカル環境の版に合わせる）。
- `main` へのマージで `.github/workflows/pages.yml` がテスト後に Pages へ自動デプロイする。公開対象は `index.html`・`css/`・`js/` のみ。
- **キーごとの設定**: `state.groups[layoutId][keyId]` はキーのグループ付け替え（配色に追従）、`state.overrides` は色の固定（追従しない）。色の計算は必ず `groupOf(key)` を通す。
- **元に戻す**: 状態を変える操作は、変更の**前**に `checkpoint(kind)` を呼ぶ。連続して発火する入力（色ピッカーのドラッグなど）は同じ `kind` を渡して1手にまとめる。表示だけの設定（ペイントモード、色覚シミュレーション）は履歴に入れない。
- **共有 URL**: ハッシュは「UTF-8 の JSON を Base64」にしたもの（`encodeState()` / `decodeState()`）。`btoa()` に文字列を直接渡さない（日本語で例外になる）。
- **保存**: 保存データは localStorage の `keyboard-color:saved`。読み込み時は共有URLと同じ `applyShared()` で検証し、壊れたデータでもページが動くようにする。
- **KLE 読み込み**: `js/kle.js` は独自実装。KLE エディタ（ijprest/keyboard-layout-editor）のコードは「All rights reserved」で寛容なライセンスではないため**複製しない**（形式の解釈は MIT の kle-serial と、エディタの挙動に合わせる）。`rx` / `ry` を指定するとカーソルが回転中心へ戻る点はエディタに合わせている（2019 年版 kle-serial とは異なる）。共有 URL・保存データの `k` は `unpack()` で検証してから使う。テストの KLE データは自作し、KLE のサンプルを複製しない。書き出し（`serialize()`）は `parseKle()` の厳密な逆として実装し、`tests/kle-export.test.js` が全レイアウトで「書き出し→読み込み」の一致を確かめる。読み込み側の規則を変えたら書き出し側も合わせる。
- **更新履歴**: 利用者に見える変更（機能・レイアウト・プリセット・表記の追加や変更）は、`js/changelog.js` の先頭に `{ date, title, items }` を追記してから PR を出す。日付はマージ予定日（JST）、文章は利用者向けの日本語で書く。内部だけの変更（テスト・ドキュメント・CI）は載せない。ページ下部には新しい順に3件を表示し、残りは折りたたむ。

## レイアウト追加のルール

- `js/layouts.js` の `list` に追加し、`tests/layouts.test.js` の期待値（幅・キー数）を**手計算した値で**更新する。実装の出力をそのまま期待値にコピーしない。
- 既存レイアウトの `id` は共有 URL に含まれるため変更しない。変更する場合は `ALIASES` に旧 id を残す。
- 表示名（`name`）は汎用的な呼び方にする（例: `分割 3×6＋親指3`）。実在のキーボード名は `example` に入れ、「例: ○○」として添えるだけにする。
- JIS 版はロウスタッガード配列にだけ用意する。行データを `JIS_ROWS` に追加すると `<id>-jis` が自動生成され、`jis` / `variantOf` で相互に紐付く。UI の一覧には基本版だけを出し、ANSI / JIS は切り替えで選ぶ。
- L字 Enter は `shape: 'iso'`（上段 1.5u、下段は左を 0.25u 詰めた 1.25u）。重なり判定やサイズ集計は `rects()` を使い、外接矩形で判定しない。

## 名称・権利関係のルール

調査の結論（2026-10 時点。法的助言ではない）:

- 色の値や「4×12 の格子」のような配列そのものは独占の対象になりにくい。注意が必要なのは**名称の使い方**。
- 種類を説明するために名称を挙げる（参照的な使用）のは低リスク。公式・提携に見える表現、ロゴの使用、アプリ名や見出しとしての使用は避ける。

守ること:

1. **固有名は参照にとどめる**: キーボード名・製品名・テーマ名は `example`、説明文、プリセット名でのみ使う。アプリ名やレイアウトの表示名には使わない。ロゴや商品画像は使わない。
2. **非公式表記を維持する**: フッターと README の「クレジット・表記について」を削除しない。
3. **他者のパレットを使う場合はライセンスを確認する**: ライセンスを確認してから採用し、`js/palettes.js` のプリセットに `credit`（name / copyright / license / url）を付ける。フッターのクレジットは `credit` から自動生成される。README のクレジット欄にも同じ著作権表示を書く。
4. **ライセンスが不明・非許諾のものは使わない**: 確認できないパレットは色を流用せず、汎用的な名前の独自配色にする（例: 市販キーキャップセットの配色名は使わない）。
5. **新しい固有名を加えたら下の台帳に記録する**: 確認状況は「確認済（一次）」「確認済（二次情報）」「未確認」「未調査」で書き、推測で埋めない。`credit` の著作権表示はライセンスファイルの記載をそのまま写す（推測で補わない）。

`tests/rights.test.js` が次を検証する: 全レイアウトの `example` と全プリセットの `id` が台帳にあること、`credit` の著作権表示が README にあること、レイアウトの表示名に `example` の固有名が入っていないこと。

## 名称・権利台帳

確認状況の「一次」は、権利者自身のリポジトリのライセンスファイルや README を直接読んで確かめたもの。最終確認: 2026-10-29（JST）。

### レイアウトの参照名（`example`）

| 参照名 | 対象 | 権利・ライセンス | 確認状況 | 出典 |
| --- | --- | --- | --- | --- |
| HHKB系 | PFU の Happy Hacking Keyboard の配列系統 | 「Happy Hacking」「HHK」「HHKB」等は株式会社PFUの日本における登録商標（PFU のプレスリリースの記載）。参照的な使用にとどめる | 確認済（二次情報：プレスリリースの転載で確認。PFU 公式サイトはこの環境から接続不可） | [PFUプレスリリース転載（琉球新報）](https://ryukyushimpo.jp/prtimes/entry-5207389.html) |
| 1800系 | Cherry G80-1800 に似た配列・形状を指すコミュニティの通称 | 製品の型番に由来する通称。特定の権利主張は見つからず | 確認済（二次情報） | [Deskthority: 1800](https://deskthority.net/wiki/1800) |
| Alice系 | TGR Alice（Yuk Tsi 設計、2018年）に由来する配列の通称。派生の Arisu は MIT とされる | TGR Alice の設計ファイルのライセンスは見つからず | 確認済（二次情報） | [Deskthority: Alice layout](https://deskthority.net/wiki/Alice_layout) |
| Ferris Sweep系 | David Barr（davidphilipbarr）設計の 34 キー分割 | ハードウェア: Solderpad Hardware License v2.1 | 確認済（一次） | [davidphilipbarr/Sweep](https://github.com/davidphilipbarr/Sweep) |
| Corne（crkbd） | foostan のオープンソース分割キーボード | MIT, Copyright (c) 2023 foostan（`LICENSE_MIT`）と CC BY 4.0（`LICENSE_CC`）の2ファイル。どちらが何に適用されるかは README に記載なし | 確認済（一次） | [foostan/crkbd](https://github.com/foostan/crkbd) |
| Lily58 | Naoki Katahira のオープンソース分割キーボード | MIT, Copyright (c) 2018 Naoki Katahira | 確認済（一次） | [kata0510/Lily58](https://github.com/kata0510/Lily58) |
| Sofle | Josef Adamcik のオープンソース分割キーボード | MIT, Copyright (c) 2019 Josef Adamcik | 確認済（一次） | [josefadamcik/SofleKeyboard](https://github.com/josefadamcik/SofleKeyboard) |
| Planck | OLKB が販売する 4×12 キーボード | OLKB の設計ファイル（`planck/`）は CC BY-SA 4.0。出典を明記すれば共同購入も可と記載 | 確認済（一次） | [olkb/olkb_parts](https://github.com/olkb/olkb_parts), [QMK readme](https://github.com/qmk/qmk_firmware/tree/master/keyboards/planck) |
| Preonic | OLKB が販売する 5×12 キーボード | OLKB の設計ファイル（`preonic/`）は CC BY-SA 4.0 | 確認済（一次） | [olkb/olkb_parts](https://github.com/olkb/olkb_parts), [QMK readme](https://github.com/qmk/qmk_firmware/tree/master/keyboards/preonic) |
| Let's Split系 | Wootpatoot 設計の 4×6×2 分割オーソリニア（Keebio Levinson も同系統） | 原設計のライセンスは見つからず（QMK は設計ファイルの置き場を qmk.fm と案内）。QMK が案内するソケット版フォークは MIT, Copyright (c) 2017 Max Hernandez。原設計者との関係は未確認 | 未確認 | [QMK readme](https://github.com/qmk/qmk_firmware/tree/master/keyboards/lets_split), [dumle29/let-s-Split-v2](https://github.com/dumle29/let-s-Split-v2) |
| Nyquist系 | Keebio が製造・販売する 5×12 分割オーソリニア | Keebio の市販品。公開された設計ファイル・ライセンスは見つからず | 確認済（一次：QMK の readme で製品情報を確認） | [QMK readme](https://github.com/qmk/qmk_firmware/tree/master/keyboards/keebio/nyquist) |

### 研究・データの参照

| 参照名 | 対象 | 権利・ライセンス | 確認状況 | 出典 |
| --- | --- | --- | --- | --- |
| keyboard-layout-editor（KLE） | 読み込みに対応したレイアウト形式。リンクと説明文で名前を参照 | エディタ: Copyright (C) 2013-2018 Ian Prest、All rights reserved（寛容なライセンスではない）。ただし作者は利用者のレイアウト（入力）と出力について所有権を主張せず、自由に使ってよいと明記。kle-serial: MIT, Copyright (c) 2013-2019 Ian Prest | 確認済（一次） | [ijprest/keyboard-layout-editor](https://github.com/ijprest/keyboard-layout-editor), [ijprest/kle-serial](https://github.com/ijprest/kle-serial) |
| Machado 2009 | 色覚シミュレーションの変換行列（重症度1.0の1型・2型・3型） | 論文の数値。照合に使った colour-science のデータセットは BSD-3-Clause | 確認済（二次情報：colour-science 0.4.6 のデータセットで数値を照合。論文のサイトはこの環境から接続不可） | [colour-science](https://github.com/colour-science/colour) |

### プリセット（`id`）

| id | 由来 | 権利・ライセンス | 確認状況 | 出典 |
| --- | --- | --- | --- | --- |
| `nord` | Nord パレット | MIT, Copyright (c) 2016-present Sven Greb | 確認済（一次） | [nordtheme/nord](https://github.com/nordtheme/nord) |
| `solarized-light` | Solarized | MIT, Copyright (c) 2011 Ethan Schoonover | 確認済（一次） | [altercation/solarized](https://github.com/altercation/solarized) |
| `solarized-dark` | Solarized | 同上 | 確認済（一次） | 同上 |
| `dracula` | Dracula テーマ | MIT, Copyright (c) 2023 Dracula Theme | 確認済（一次） | [dracula/dracula-theme](https://github.com/dracula/dracula-theme) |
| `retro` | 独自配色（一般的な「ベージュ筐体」のイメージ） | 該当なし | — | — |
| `wa` | 独自配色（日本の伝統色名を参照） | 該当なし | — | — |
| `bauhaus` | 独自配色（美術様式を参照） | 該当なし | — | — |
| `mono` | 独自配色 | 該当なし | — | — |
| `pastel` | 独自配色 | 該当なし | — | — |
| `earth` | 独自配色 | 該当なし | — | — |
