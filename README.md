# Relic Browser

エルデンリング ナイトレインの遺物コレクションを解析・最適化するツールです。ローカルのセーブファイルを読み込み（処理はすべてクライアントサイドで完結し、どこにもアップロードされません）、遺物の一覧表示、詳細な条件での絞り込み、見劣りする遺物の検出、ダメージ最大化構成の探索までをサポートします。

## 機能

- 遺物の一覧表示（名前・効果でのキーワード検索、色/深層遺物での絞り込み）
- **詳細フィルター** — 効果ごとに「必須グループ」（グループ内はOR、グループ間はAND）と「除外グループ」を組み立てて絞り込み。各効果は「以上/以下」のティア指定に対応し、条件セットはプリセットとして保存・切り替え・書き出し/読み込みが可能

![遺物ブラウザ](/public/images/relic-browser.png)

- 下位互換の遺物の自動検出と、売却候補の複数選択 → ゲーム内キー操作へのコピー（AutoHotkey連携用）

- **ダメージオプティマイザー** — 夜渡り・武器種・攻撃属性などを指定し、遺物と器の組み合わせをRust/WASM製の探索エンジンでダメージ最大化。条件として必須効果を選択し、各効果について「一致/上位/下位」のマッチモードと重ねがけ数の範囲を指定可能

![ダメージオプティマイザー](/public/images/damage-optimizer.png)

- 遺物・効果・器・夜渡り名の日本語ローカライズ
- （任意）AutoHotkeyによる、ゲーム内「売却シーケンス」再生の自動化スクリプト（Windows専用）

## 技術スタック

React 19, TypeScript, Vite, MUI, i18next, Vitest, ESLint, Prettier。ダメージオプティマイザーの遺物/器の組み合わせ探索エンジンには Rust + wasm-bindgen を使用。

## セットアップ

### 前提条件

- [Node.js](https://nodejs.org/) 20以上 と npm
- [Rust](https://www.rust-lang.org/tools/install)（`cargo` を含む stable ツールチェーン）— コンボ検索のWebAssemblyモジュールのビルドに必要

### 手順

1. 依存パッケージをインストール:
   ```bash
   npm install
   ```
2. 開発サーバーを起動（WASMのコンボ検索モジュールも自動でビルドされます）:
   ```bash
   npm run dev
   ```
3. ターミナルに表示されたローカルURLを開き、エルデンリング ナイトレインのセーブファイル（`.sl2`）をアップロードして遺物の閲覧を開始してください。

### （任意）遺物売却の自動化

`automation/sell-relics.ahk` は、アプリのUIからコピーした「売却シーケンス」をゲーム内のキー操作として再生する [AutoHotkey v2](https://www.autohotkey.com/) スクリプトです。Windows と AutoHotkey v2 のインストールが必要です。`start-dev-and-automation.bat` を実行すると、開発サーバーとこのスクリプトを同時に起動できます。ゲーム内での売却の最終確定操作は必ず自分の手で行うようになっており、スクリプトはその直前で停止します。

## npm scripts

| コマンド             | 説明                                                         |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`         | WASMモジュールをビルドしてから Vite の開発サーバーを起動      |
| `npm run build`       | WASMビルド → 型チェック → 本番ビルド（`dist/` に出力）        |
| `npm run build:wasm`  | Rust製の組み合わせ探索クレートをWebAssemblyにビルド            |
| `npm run lint`        | ESLintを実行                                                  |
| `npm run test`        | Vitestによる単体テストを実行                                  |
| `npm run type-check`  | TypeScriptの型チェックのみ実行                                |
| `npm run format`      | Prettierでコードを整形                                        |

## ディレクトリ構成

- `src/` — Reactアプリ本体（コンポーネント・フック・ユーティリティ・i18nリソース）
- `wasm/combo_search/` — ダメージオプティマイザーの組み合わせ探索エンジン用Rustクレート
- `scripts/` — データ生成スクリプト（ダメージ倍率、効果カテゴリ、日本語i18nなど）
- `automation/` — 任意のAutoHotkey遺物売却自動化スクリプト
- `Presets/` — 検索/フィルタのサンプルプリセット

## Contributing

Issue・Pull Requestは歓迎します。

## License

MIT — 詳細は [LICENSE](LICENSE) を参照。本プロジェクトは Metin Çelik 氏によるオリジナル [Relic Browser](https://relicbrowser.com/) を大幅に改変したフォークです。
