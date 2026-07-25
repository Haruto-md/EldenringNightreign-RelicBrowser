# Damage Optimization Tab — Design (supersedes damage-ranking-tab)

> **This design supersedes `2026-07-25-damage-ranking-tab-design.md`.** That
> earlier design (and its implementation on branch `damage-ranking-tab`) was
> fundamentally wrong: it scored and ranked **individual relics in isolation**,
> completely ignoring the core domain fact that a build is a **vessel of 6
> slots (3 normal + 3 deep) with per-slot color constraints**. A single relic's
> score is meaningless — what matters is the best *combination* of 6 relics that
> fits a vessel's color layout. This design throws that flat approach away and
> rebuilds on the existing combination-search engine.

## Motivation

RelicHub (a separate, reference-only desktop tool under `RelicHub/`) computes,
for a chosen character and attack build, the **combined damage multiplier** of a
full vessel loadout and finds the best relic combination the player owns. Its
OCR/detection and UX are poor and out of scope. Its data and damage math are
valuable and missing from Relic Browser. We bring the damage math in as a new
tab, built on Relic Browser's own save-file data and its existing combination
search engine.

## Core domain facts (that the previous design violated)

- A **vessel** has 6 slots: 3 normal (`n1,n2,n3`) + 3 deep (`d1,d2,d3`). Each
  slot has a fixed color requirement: R / B / Y / G / ALL. Source of truth in
  the app: `src/utils/Vessels.ts` (and `RelicHub/data/vessels.json` for
  cross-reference). Vessels differ **per Nightfarer**, so Nightfarer selection
  is mandatory.
- **Normal relics** go only in normal slots; **deep relics** only in deep slots.
  The app distinguishes them by `items.get(relic.itemId)?.type === ItemType.DeepRelic`.
- **Deep relics can carry demerit effects** (represented as `EffectType.Debuff`
  effects on the relic, i.e. the second element of an `EffectWithOptionalDebuff`
  tuple). Some demerits are build-ruining (continuous HP loss, all resistances
  down, etc.) and the player must be able to exclude them.
- The player owns a fixed **collection** of relics (parsed from their save
  file). The task is to choose, from that collection, the vessel + 6-relic
  assignment (respecting per-slot colors, normal/deep split, distinctness) that
  **maximizes the combined damage multiplier** for a chosen attack profile.

This is exactly the combinatorial problem the existing **Combo Finder** already
solves — it just optimizes an effect-match point count instead of a damage
multiplier.

## Scope

### Phase 1 (this spec)

Damage-multiplier combination optimization, done correctly:

- Reuse the existing WASM combination-search engine (`wasm/combo_search/src/lib.rs`);
  add a **damage-scoring mode** whose score is the **product of per-effect
  multipliers**, so the engine's pruning selects by the right metric.
- Attack-profile selection (weapon / spell+school / item build, crossed with
  element, plus attack-mode toggles).
- Individual situational-effect toggles (not lumped into categories), filtered
  by the selected Nightfarer.
- Demerit-exclusion checklist (individual demerit types).
- Vessel enable/disable (reuse Combo Finder's per-Nightfarer mechanism).
- Results: top combinations by damage multiplier, each showing the vessel, the
  combined **ダメージ倍率** (e.g. `×2.34` and `+134%`), and the 6 slotted relics
  with contributing effects highlighted.
- **Japanese-fixed UI** for this tab (see Localization).

### Phase 2 (future, NOT this spec — design must not preclude it)

- **Weighted スコア axis**: build-specific weights on non-damage-but-important
  effects (戦技 / 祈祷 / character-exclusive utility) producing an additive score
  to sort/compare alongside raw damage. The engine's per-effect multiplier array
  extends to a per-effect weight array with an additive accumulator — additive
  change only.
- **Must-haves (効果の強制)**: require chosen effects to be present. Already
  supported by the engine's existing `selected_effect_ranges` (set `min_stacks`
  ≥ 1). Semantics: "among combinations that contain at least one of each required
  effect, rank by damage multiplier." Phase 2 only adds UI; the engine plumbing
  stays intact through Phase 1.

### Explicitly out of scope

- RelicHub OCR / detection / import.
- Any change to how save files are parsed or to the other two tabs.
- The weighted score and must-have UI (Phase 2).

## Architecture

```
Save file (existing parse)
      │  normal relics / deep relics  (split by ItemType.DeepRelic)
      ▼
DamageOptimizer.tsx  (new UI, Japanese)
      │  selection → JS builds a per-EffectKey multiplier array (f32)
      │             + excluded demerit key list
      ▼
comboSearchWorker.ts  (extended: passes damage-mode payload)
      ▼
wasm/combo_search  (lib.rs: new calc_damage path, reuses vessel/color/
      │             normal-deep/stacks/dedup machinery)
      ▼
top combinations by damage-multiplier product → rendered as vessel cards
```

The **only** new scoring logic in Rust is `calc_damage`. Everything else —
vessel iteration, per-slot color-constrained triple enumeration, top-K pruning,
normal/deep separation, dedup, Nightfarer-exclusive effect handling — is reused
unchanged. This is what makes the result trustworthy: pruning happens on the
damage product, not on an unrelated metric.

## Data layer

### Reused from the scrapped work (keep, do not regenerate from scratch)

- `src/resources/damageMultipliers.ts` — generated `EffectKey → { multiplier,
  bucket?, conditionalGroup?, nightfarer? }`. Correct and reusable. Generated by
  `scripts/generate-damage-multipliers.mjs` from RelicHub data. The 5
  `multiplier: null` "特殊処理" effects remain excluded.
- `src/resources/damageCategories.ts` — taxonomy of buckets/categories. Reusable
  as the basis for the multiplier-array builder, but **must be corrected** for
  the attack-profile model below (attack-mode toggles, pot×element crossing,
  character-exclusive as individually-listed filtered toggles).

### New: Japanese effect-name map

Generate `src/resources/effectNamesJa.ts` exporting
`effectNamesJa: Partial<Record<EffectKey, string>>` — `EffectKey → 日本語名`,
built from RelicHub's `skills.json` / `deep.json` / `demerit.json` `jpn` fields
matched to `EffectKey` via the same English-string matching the multiplier
generator already uses. Extend `scripts/generate-damage-multipliers.mjs` (or add
a sibling generator) to emit this. This tab renders effect names from this map
(Japanese-fixed) instead of the app's incomplete i18n `effects.*` keys.

### JS multiplier-array builder

A pure function `buildDamageMultiplierArray(selection): Float32Array` (length =
`EFFECT_KEY_SPACE`, default 1.0). Logic (reuses the scrapped `getActiveBuckets`
idea, corrected):

1. From the selection, compute the **active bucket set** (primary category
   bucket, element bucket, active attack-mode buckets, enabled situational
   buckets, selected spell school bucket).
2. For each `EffectKey` in `damageMultipliers`:
   - Skip (leave 1.0) if it has a `nightfarer` that ≠ the selected Nightfarer.
   - If it has a `conditionalGroup`/situational identity: use its multiplier only
     if that specific effect's toggle is enabled, else 1.0.
   - Else if its `bucket` ∈ active set: use its multiplier, else 1.0.
3. Return the array. Nightfarer gating is *also* enforced in Rust (defense in
   depth), but doing it here keeps the array self-describing.

The excluded-demerit list is computed from the demerit checklist: the set of
demerit `EffectKey`s the user ticked to exclude.

## Rust engine changes (`wasm/combo_search/src/lib.rs`)

Existing Combo Finder path must remain byte-for-byte behavior-identical. Add an
**optional** damage mode, selected by presence of new input fields.

Add to `SearchInput`:

```rust
pub damage_multipliers: Option<Vec<f32>>,   // len == EFFECT_KEY_SPACE; 1.0 = irrelevant
pub excluded_demerit_keys: Option<Vec<u32>>,
```

When `damage_multipliers` is `Some`:

- **Candidate determination**: a relic is a candidate if it has any effect whose
  multiplier (looked up in the array, guarded by `nightfarer` match) is `> 1.0`.
  Replaces the "has a selected effect" test. (Do not route damage-relevant keys
  through `selected_effects`, which is capped at `SELECTED_EFFECTS_SPACE = 27`;
  the multiplier array is uncapped at `EFFECT_KEY_SPACE`.)
- **Scoring**: use `calc_damage` instead of `calc_points` everywhere a
  combination or triple is scored (both the per-group triple scoring in
  `search_group_triples` and the final 6-slot scoring in
  `add_combination_if_unique6`).
- **`calc_damage(nightfarer, relic_indices6, relics_normal, relics_deep,
  multipliers, ...) -> f32`**:
  - Start `product = 1.0`.
  - Maintain a per-call "seen stacks=false key" set (reuse the `ScoreContext`
    generation trick, or a small local set) so a stacks=false effect multiplies
    at most once across all 6 slots.
  - For each slot's relic, for each effect:
    - If `effect.nightfarer.is_some()` and `!= Some(nightfarer)` → skip.
    - `m = multipliers[effect.key]`; if `m <= 1.0` → skip (irrelevant).
    - If `effect.stacks == Some(false)`: if key already seen → skip; else mark
      seen and `product *= m`.
    - Else (stacks true/None per the damage model): `product *= m` every time.
    - **Do NOT apply the group-duplicate logic** used by `calc_points` — in the
      damage model, e.g. `物理攻撃力上昇` and `物理攻撃力上昇+1` on two relics both
      multiply (both are `stacks=true`). Group dedup is a Combo-Finder concept
      only.
  - Return `product`.
- **Demerit rejection**: in `add_combination_if_unique6`, before scoring, if any
  slot's relic has an effect whose key ∈ `excluded_demerit_keys`, reject the
  combination (mirror the existing `combination_satisfies_ranges` rejection).
- `selected_effect_ranges` handling stays intact (Phase 2 must-haves reuse it).

Isolation-scored triples (each group scored as if the other is empty) remain the
pruning heuristic. For a multiplicative score with all multipliers ≥ 1.0 this is
a sound ranking heuristic — identical in spirit to Combo Finder, which users
already trust. The one imprecision (a stacks=false effect present in both groups
counted once per group during isolated pruning) only affects which candidates
survive to the top-K, not the final reported product, and cannot inflate a
combination's true score.

Rebuild: `npm run build:wasm` (toolchain confirmed available: cargo 1.97,
wasm-pack). The build output `wasm/combo_search/pkg/` is git-ignored and copied
into the worktree during setup.

## Worker / TS glue (`src/workers/comboSearchWorker.ts`, `src/utils/ComboSearch.ts`)

- Extend `ComboSearchWorkerInput` and the worker's `buildWasmInput` to pass
  `damage_multipliers` and `excluded_demerit_keys` when in damage mode.
- Add a `searchDamageCombinations(...)` entry (or a `mode` param on
  `searchCombinations`) in `ComboSearch.ts` that builds the damage payload:
  splits the current character slot's relics into normal/deep, passes the
  multiplier array and excluded-demerit keys, enabled vessels, and returns the
  same `VesselCombination[]` shape (now `points` carries the damage product).
- Candidate pre-filtering in `filterRelics` must, in damage mode, keep relics
  that have any damage-relevant effect (multiplier > 1.0), not relics that have a
  selected effect. Adjust or branch `filterRelics` accordingly.

## Attack-profile taxonomy (left panel)

**(a) Primary category — exactly one:**

- Weapon categories: exactly those that have a corresponding `〇〇の攻撃力上昇`
  weapon-attack-up multiplier in `damageMultipliers.ts` (the 24 with a
  `weapon:*` bucket — 短剣・直剣・大剣・特大剣・刺剣・重刺剣・曲剣・大曲剣・刀・両刃剣・斧・大斧・
  槌・フレイル・大槌・特大武器・槍・大槍・斧槍・鎌・鞭・拳・爪・弓). Weapon categories with
  no attack-up effect (e.g. 大弓 / クロスボウ / バリスタ) are not listed, because no
  relic effect can boost them and they'd score identically to base.
- 魔術 (general) with school sub-select: 輝剣 / 石掘り / カーリアの剣 / 不可視 /
  結晶人 / 重力 / 茨
- 祈祷 (general) with school sub-select: 黄金律原理主義 / 王都古竜信仰 / 巨人の火 /
  神狩り / 獣 / 狂い火 / 竜餐
- 投擲壺 / 投擲ナイフ / 輝石・重力石アイテム / 調香術
- 咆哮とブレス

Selecting a weapon auto-activates the 近接 bucket. Selecting a spell activates
its general bucket + (if a school is chosen) the school bucket. Item builds
activate their item bucket.

**(b) Element — exactly one:** 物理 / 魔力 / 炎 / 雷 / 聖. Applies to weapon and
item/pot builds where an element is meaningful (火炎壺 = 炎, 魔力壺 = 魔力, etc.).
Activates the corresponding element bucket. Non-physical elements additionally
activate 属性攻撃力上昇 (affinity).

**(c) Attack-mode toggles — multiple, shown only for weapon primary:**
戦技 / 通常攻撃1段目 / 致命の一撃 / ガードカウンター. Each activates its bucket when
on. (These are situational damage the user opts into for the attack they care
about; do not force them all on.)

## Situational toggles & demerit exclusion (left panel)

**Situational damage toggles — individual, multiple, Nightfarer-filtered.** One
checkbox per effect, never lumped. Grouping *headers* (for visual folding) may
follow RelicHub's group labels, but each checkbox is a single effect:

- 被ダメージ時 / 武器持ち替え時 / 属性付与時 / 脂アイテム使用時 / 状態異常の敵への攻撃
  (毒・腐敗・凍傷) / 周囲の状態異常発生時 (毒腐敗・睡眠・発狂)
- 武器種3種以上装備 (the specific weapon type; typically the selected primary)
- **Character-exclusive damage effects**: list the individual effects belonging
  to the **selected Nightfarer only** (e.g. for 執行者: 【執行者】スキル中の攻撃力上昇…;
  for 葬儀屋: 【葬儀屋】アーツ発動時攻撃力上昇 and 【葬儀屋】連撃の最終攻撃命中時攻撃力上昇 as
  two separate checkboxes). Other Nightfarers' effects are not shown at all.

**Demerit-exclusion checklist — individual.** One checkbox per demerit type from
`RelicHub/data/demerit.json` `demerit_skills` (生命力と神秘が低下 / 取得ルーン減少 /
HP持続減少 / すべての状態異常耐性低下 / 被ダメージ時○○蓄積 / …). Ticking a demerit
excludes any combination containing a deep relic bearing it. **Default: nothing
excluded** (all allowed; the user opts to exclude).

## UI layout & result display

Mirror Combo Finder's structure (`src/components/ComboFinder.tsx`).

- New tab in `RelicsPage.tsx` `TabIndex`, label **「ダメージ最適化」** (Japanese
  literal; this tab is Japanese-fixed, so its own labels are hardcoded Japanese
  strings, not i18n keys).
- **Left = settings panel** (Japanese literals): Nightfarer select; primary
  category (+ school sub-select when spell); element; attack-mode toggles;
  situational toggles; demerit-exclusion checklist; vessel enable/disable
  (reuse Combo Finder's per-Nightfarer `disabledVessels`). Settings persisted to
  `localStorage` per-Nightfarer under a new key (`damageOpt:settings:v1`),
  matching Combo Finder's `Record<Nightfarer, Settings>` pattern.
- **Right = results**: top combinations sorted by damage-multiplier product,
  descending. Each result card shows: vessel name; **ダメージ倍率** as `×2.34`
  and `+134%` (both derived from the same product: `+((product-1)*100)%`); the 6
  slotted relics laid out normal/deep, with the effects that contributed
  (multiplier > 1.0 and actually applied) highlighted. Virtualized list
  (`@tanstack/react-virtual`), with real row-height measurement (`data-index` +
  `ref={virtualizer.measureElement}` — the previous build shipped a bug here by
  using a fixed `estimateSize` with no measurement).
- **Relic/effect display**: a new lightweight Japanese relic-slot display
  component (the shared `RelicCard` renders effect names via English-leaning
  i18n). This component renders effect names from `effectNamesJa`.

## Testing

- Rust: unit-test `calc_damage` for the stacking semantics — stacks=true effects
  multiply per occurrence; a stacks=false effect present on multiple slots
  multiplies once; Nightfarer-mismatched effects are ignored; irrelevant
  (multiplier 1.0) effects don't change the product; group-duplicate effects
  (e.g. 物理+1 and 物理+2) both multiply.
- Rust: demerit rejection removes combinations containing an excluded demerit
  key and keeps others.
- TS: `buildDamageMultiplierArray` — active buckets produce the right nonzero
  multipliers; Nightfarer-exclusive effects are 1.0 for other Nightfarers;
  situational effects are 1.0 unless their toggle is on; a non-physical element
  activates affinity.
- TS: the effectNamesJa generator matches every damage-relevant EffectKey to a
  Japanese name (report unmatched, like the multiplier generator does).
- Integration: a fixed fixture collection + selection yields a known top
  combination and multiplier (compute expected product by hand from the fixture).

## What is reused vs rebuilt from the scrapped `damage-ranking-tab` branch

- **Reuse:** `damageMultipliers.ts` + its generator; the active-bucket idea from
  the scrapped `getActiveBuckets`; the Nightfarer selector + per-Nightfarer
  localStorage pattern; the tab-wiring approach in `RelicsPage.tsx`.
- **Rebuild:** the calc engine (flat per-relic `DamageRanking.ts` → Rust
  `calc_damage` over combinations); the UI (`DamageRanking.tsx` → new
  `DamageOptimizer.tsx`, combination results, Japanese, demerit filter,
  individual toggles, vessel enable/disable); the taxonomy corrections in
  `damageCategories.ts`.
- **New:** Rust damage mode; worker/ComboSearch damage path; `effectNamesJa.ts`
  + its generation; Japanese relic-slot display component.

The scrapped flat implementation (`DamageRanking.tsx`, flat `DamageRanking.ts`,
the old tab wiring) is removed.
