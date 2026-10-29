# keyboard-color

自作キーボードの配色（カラーウェイ）をシミュレーションするWebアプリです。ビルド不要の静的ファイルだけで動きます。

## 使い方

`index.html` をブラウザで開くだけで動きます。ローカルサーバーで配信する場合は次のとおりです。

```bash
python3 -m http.server 8000
```

## 機能

- **レイアウト**: 自作キーボードでよく使われる17種類
  - ロウスタッガード: 40% / 60% / 60% 分割BS・WKL（HHKB系） / 65% / 75% / TKL（80%） / 96%（1800系） / フルサイズ（100%）
  - エルゴノミクス: エルゴ 65%（Alice系、左右±10°）
  - 分割: 3×5＋親指2（Ferris Sweep系） / 3×6＋親指3（Corne系） / 6×4＋親指4（Lily58系） / 6×4＋親指5（Sofle系）
  - オーソリニア: 4×12（Planck系） / 5×12（Preonic系） / 分割 4×6×2（Let's Split系） / 分割 5×6×2（Nyquist系）
  - 60% / 65% / 75% / TKL / 96% / フルサイズは ANSI（英語）と JIS（日本語）を切り替え可能
  - [keyboard-layout-editor.com](https://www.keyboard-layout-editor.com/)（KLE）の JSON / Raw data から任意のレイアウトを読み込み可能（回転・L字Enter などの異形キー・分割配列に対応）
  - 今のレイアウトと配色を KLE の Raw data / JSON として書き出し可能（キーキャップ色 `c`・刻印色 `t`・ケース色 `backcolor`）
- **配色ルールから生成**: ベースカラー1色から、色彩理論の定番ルールで配色を自動生成
  - モノクロマティック / 類似色 / 補色 / 分裂補色 / トライアド / テトラード
  - トーン: ライト / パステル / ビビッド / ダーク
  - 60-30-10の法則に沿って、アルファ（主色）・モディファイア（副色）・Esc/Enter（アクセント）に割り当て
- **プリセット**: Nord、Solarized、Dracula、和色、バウハウスなど、デザインでよく使われるパレット
- **微調整**: ケース、キーキャップ、刻印の色を個別に変更し、WCAGコントラスト比をその場で表示
- **刻印色の自動調整**: キーキャップ色に対して読みやすい刻印色を自動で選択
- **キーごとの設定**: キーをクリックして、グループの付け替え（例: 矢印キーをアクセントに。配色を変えても追従）または色の固定ができる（Tab で選んで Enter / Space でも可）
- **元に戻す・やり直す**: ボタンまたは Ctrl+Z / Ctrl+Shift+Z（色ピッカーのドラッグは1手にまとめる）
- **保存**: 配色をブラウザ内（localStorage）に最大30件保存。端末間では共有されない
- **色覚シミュレーション**: 1型・2型・3型2色覚と1色覚の見え方をプレビュー（PNG とキーキャップ内訳は実際の色）
- **キーキャップ内訳**: 配色に必要なキーキャップの個数を、色・サイズごとに表示（テキストでコピー可）
- **更新履歴**: ページ下部に新しい順で表示
- **共有・保存**: 配色をURLに埋め込んで共有（ブラウザ標準の圧縮で短くした URL。以前の形式の URL もそのまま開ける）、PNGで書き出し

## 構成

| ファイル | 役割 |
| --- | --- |
| `js/color.js` | 色変換、コントラスト計算、配色ルールによるパレット生成 |
| `js/layouts.js` | キーボードレイアウトの定義（キー単位の座標） |
| `js/palettes.js` | プリセットパレット |
| `js/changelog.js` | ページ下部に表示する更新履歴 |
| `js/bom.js` | キーキャップ内訳（色・サイズごとの個数）の集計 |
| `js/history.js` | 元に戻す・やり直すの履歴管理 |
| `js/kle.js` | KLE の JSON / Raw data の読み込みと書き出し |
| `js/share.js` | 共有URLの圧縮・展開 |
| `js/render.js` | SVG描画 |
| `js/app.js` | UIと状態管理 |

## テスト

```bash
npm test
```

Node.js 18以降の組み込みテストランナーで、色計算、レイアウトの整合性（キーの重なり、幅、キー数）、キーキャップ内訳の集計、KLE の読み込み、プリセットの形式、名称・権利のルールを検証します。

ブラウザでの操作は Playwright で検証します（Playwright と Chromium が必要です）。

```bash
npm run test:e2e
```

PR では GitHub Actions がどちらのテストも実行し、`main` へのデプロイは両方が通ったときだけ行われます。

## クレジット・表記について

本アプリは非公式のツールで、掲載しているキーボード・配色の作者や販売元とは関係ありません。
キーボード名・配色名は配列や配色の系統を説明する目的で参照しているもので、各名称の権利は各権利者に帰属します。
レイアウトデータは公開情報をもとに簡略化した独自のもので、実機の寸法とは異なる場合があります。

プリセットの一部は以下の配色を参考にしています。

- [Nord](https://github.com/nordtheme/nord) — Copyright (c) 2016-present Sven Greb, MIT License
- [Solarized](https://github.com/altercation/solarized) — Copyright (c) 2011 Ethan Schoonover, MIT License
- [Dracula](https://github.com/dracula/dracula-theme) — Copyright (c) 2023 Dracula Theme, MIT License

KLE 形式の読み込み・書き出しは独自実装です。形式の解釈は [kle-serial](https://github.com/ijprest/kle-serial)（MIT）と、KLE エディタの公開ソースでの挙動（`rx` / `ry` 指定時にカーソルを回転中心へ戻す）に合わせています。KLE エディタ自体のコードは複製していません。

色覚シミュレーションは、Machado, Oliveira & Fernandes, "A Physiologically-based Model for Simulation of Color Vision Deficiency" (IEEE TVCG, 2009) の重症度1.0の行列を使い、線形RGBに適用しています。数値は [colour-science](https://github.com/colour-science/colour)（BSD-3-Clause）のデータセット `CVD_MATRICES_MACHADO2010` で確認しました。
