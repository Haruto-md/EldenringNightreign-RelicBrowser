# Relic Browser 日本語化 + Combo Finder 廃止 設計

## 背景

`src/i18n.ts` には `ja:` ブロックがすでに存在するが、`effects`(850件中479件)と `items`(76件中0件)に未翻訳が残っている。加えて、直近の Advanced Search 機能をはじめ一部コンポーネントは `t()` を使わず英語文言を直書きしている。RELIC BROWSER タブを完全に日本語化する。

あわせて、COMBO FINDER タブは不要と判断し廃止する。ただしダメージ最適化タブが内部で同じ検索エンジン(`src/utils/ComboSearch.ts` / `src/workers/comboSearchWorker.ts` / WASM)を利用しているため、エンジン本体は残し、Combo Finder 専用の UI 層のみを取り除く。

## スコープ1: `ja:` ブロックの翻訳補完

### effects (371件が未マッチ)

`scripts/generate-i18n-ja.mjs` を新規作成する。`scripts/generate-effect-categories.mjs` の `buildJpnToEngLookup` / `matchEffectKeyName`(mainにマージ済みのため import して再利用可)を用いて、`RelicHub/data/skills.json` の `jpn`↔`eng` から `EffectKey` を特定し、`ja.effects` に未存在のキーだけ追記する。

マッチしない分はコンソールに一覧出力し、人手で `src/i18n.ts` の `ja.effects` に直接追記する。作業時は以下の既知の罠に注意する:
- RelicHub `skills.json` は「陰者」「隠者」(Recluse)の表記ゆれが混在。`vessels.json` の正式表記(隠者)に統一する。
- RelicHub id 285(Cerulean Hidden Tear)と id 269(Greenspill Crystal Tear)は `eng` 文字列が衝突しており、first-wins matching で誤爆する既知の問題がある。手動翻訳時は個別に確認する。
- 単語選び・時制・句読点の差でマッチしない場合がある(`generate-effect-categories.mjs` の `MANUAL_EFFECT_KEY_OVERRIDES` と同種の対応表をこのスクリプトにも持たせる)。

### items (76件全件が未翻訳)

`RelicHub/data/items_knowledge.json` と `RelicHub/data/special_items.json` はどちらもキーが英語アイテム名で、値に `jpn` を持つ。`src/i18n.ts` の `en.items` の値(英語表示名)をキーにして直接引けるため、スクリプトで全件自動生成する。両ファイルで名前が重複する場合は `items_knowledge.json` を優先する(通常アイテムの一次データのため)。

### 未マッチ分の扱い

生成されなかったキーは `ja.effects` / `ja.items` に一切追加しない(空文字を入れない)。i18next の `fallbackLng: "en"` により英語表示にフォールバックする、既存の挙動をそのまま踏襲する。

## スコープ2: コンポーネント内ハードコード文言の i18n化

以下のコンポーネントの直書き英語文言を `i18n.ts` の新規キー(en/ja両方)に切り出し、`useTranslation` の `t()` 経由に置き換える。

| コンポーネント | 文言 |
|---|---|
| `SearchInput.tsx` | 検索欄プレースホルダー、"SELL" チップラベル |
| `AdvancedSearchPanel.tsx` | "No advanced filters active" / "{n} filter(s) active" / "Add effect..." / "Add excluded effect..." |
| `EffectFilterChip.tsx` | 比較切り替えツールチップ2種 |
| `RelicCard.tsx` | "Depths Relic" / "Relic"、座標ヘルプ文、"SELL" |
| `RelicComparisonModal.tsx` | outclassed / duplicate 判定文言 |
| `RelicDisplay.tsx` | "No ... relics found." のテンプレ文(deep relics / relics の出し分けを含む) |

新規キーは `translation` 直下、または既存の構造に合わせて適切な階層に追加する(命名は既存キーの慣習に合わせる: camelCase)。

## スコープ3: Combo Finder 廃止

- 削除: `src/components/ComboFinder.tsx`、`src/components/ComboFinderSettingsBar.tsx`(Combo Finder専用と確認済み)、これらに対応するテストファイル。
- `src/components/RelicsPage.tsx`: `ComboFinder` の import・`TabIndex.ComboFinder`・対応する `<Tab>` と描画ブロックを削除。`TabIndex` は `RelicBrowser` / `DamageOptimizer` の2値になる。
- **残す**: `src/utils/ComboSearch.ts`、`src/workers/comboSearchWorker.ts`、およびそれぞれのテスト(`ComboSearch.test.ts`、`ComboSearch.damage.test.ts`、`ComboSearch.perf.test.ts`、`comboSearchWorker.test.ts`)。`DamageOptimizer.tsx` がこれらを直接 import しているため。
- `src/test-setup.ts` に Combo Finder 固有のセットアップがあれば確認し、DamageOptimizer/共有エンジンに必要な部分は残す。

## テスト方針

- `generate-i18n-ja.mjs` は `generate-effect-categories.mjs` 同様、決定的な入出力なので簡単な unit test(matching primitivesの再利用分はカバー済み、item matching部分のみ追加でテスト)を書く。
- 既存の Vitest スイートを実行し、Combo Finder 削除後もビルド・型チェック・テストが通ることを確認する。
- 手動確認: `npm run dev` で RelicBrowser タブが日本語で表示され、Combo Finder タブが一覧から消えていること、Damage Optimizer タブが引き続き動作することをブラウザで確認する。
