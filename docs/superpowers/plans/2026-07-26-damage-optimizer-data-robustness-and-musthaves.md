# Damage Optimizer — Data Robustness + Must-Have Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Damage Optimizer tab structurally complete and correct — every effect always visible/selectable (no silent disappearances), Japanese character/vessel/effect names sourced from RelicHub data, and a ComboFinder-style "must-have effect + minimum quantity" filter — while keeping damage-multiplier ranking.

**Architecture:** The root defect is that the UI derives its effect list from the *RelicHub-string-matched subset* (`damageMultipliers`/`effectNamesJa`), so any unmatched effect vanishes. This plan **decouples UI completeness from RelicHub matching**: all effect lists are driven from the authoritative `src/resources/effects.ts` (850 effects, keyed by `EffectKey`), and Japanese names + damage multipliers become *overlays* keyed by `EffectKey` with guaranteed fallbacks (English name / multiplier 1.0). Must-haves reuse ComboFinder's existing `selectedEffectRanges` → WASM machinery. Situational-effect toggles are removed and folded into (a) always-on conditional damage multipliers for ranking and (b) the must-have picker for filtering.

**Tech Stack:** TypeScript, React 19, MUI, Vitest, Rust + wasm-bindgen (cargo 1.97, wasm-pack), plain Node ESM (`.mjs`) generators.

**Design context (source-of-truth data files, read-only, git-ignored):**
- `RelicHub/data/skills.json` — effect list: `{ id, jpn, eng, normal, deep, with_demerit }`.
- `RelicHub/data/deep.json` — deep-relic effects + items (with `jpn`).
- `RelicHub/data/demerit.json` — `demerit_skills` (eng/jpn).
- `RelicHub/data/vessels.json` — per-Nightfarer `label` (Japanese character name) + `vessels[].name` (Japanese vessel name). **Top-level keys contain deliberate misspellings** (`gurdian`, `revnant`, `execuor`).

## Global Constraints

- **No translation.** Japanese strings come only from matching existing RelicHub data or the app's existing resources. Never invent a Japanese string.
- **No effect may silently disappear from the UI.** Every effect list is derived from `effectsArray` (`src/resources/effects.ts`), filtered only by Nightfarer applicability. Japanese name and damage multiplier are overlays with fallbacks.
- **Japanese-fixed tab.** Damage Optimizer UI strings are hardcoded Japanese literals; effect/character/vessel names come from the generated Japanese maps with English fallback. Do **not** add a `ja:` block to `src/i18n.ts`.
- **No new npm dependencies.** `@tanstack/react-virtual` and MUI are already present.
- **The existing Combo Finder path and `ComboFinder.tsx` must stay behavior-identical.** All shared components (`EffectsAutocomplete`) gain only optional, backward-compatible props.
- `EffectKey.LENGTH` is 852; Rust `EFFECT_KEY_SPACE` is 852 (already reconciled). Color u8 mapping: Any=0, Red=1, Blue=2, Yellow=3, Green=4.
- Nightfarer enum order (`src/utils/Nightfarers.ts`): Wylder=0, Guardian=1, Ironeye=2, Duchess=3, Raider=4, Revenant=5, Recluse=6, Executor=7, Scholar=8, Undertaker=9.
- Authoritative Nightfarer→vessels.json-key→label map (use verbatim; note misspellings):
  | Nightfarer | vessels.json key | label |
  |---|---|---|
  | Wylder | `wylder` | 追跡者 |
  | Guardian | `gurdian` | 守護者 |
  | Ironeye | `ironeye` | 鉄の目 |
  | Duchess | `duchess` | レディ |
  | Raider | `raider` | 無頼漢 |
  | Revenant | `revnant` | 復讐者 |
  | Recluse | `recluse` | 隠者 |
  | Executor | `execuor` | 執行者 |
  | Scholar | `scholar` | 学者 |
  | Undertaker | `undertaker` | 葬儀屋 |

---

### Task 1: Total Japanese effect-name accessor + generator completeness

**Files:**
- Modify: `scripts/generate-damage-multipliers.mjs` (already fixed: case-insensitive first pass + corrected override direction; this task adds a completeness dump and regenerates)
- Create: `src/utils/effectNameJa.ts`
- Test: `src/utils/effectNameJa.test.ts`
- Regenerate (committed): `src/resources/effectNamesJa.ts`

**Interfaces:**
- Consumes: `effectNamesJa` (`src/resources/effectNamesJa.ts`), `i18n` (`src/i18n.ts`), `EffectKey`.
- Produces:
  ```ts
  // effectNameJa.ts — total function, never returns undefined
  export function effectNameJa(key: EffectKey): string;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/utils/effectNameJa.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EffectKey } from "../resources/effectKeys";
import { effectNamesJa } from "../resources/effectNamesJa";
import { effectNameJa } from "./effectNameJa";

describe("effectNameJa", () => {
  it("returns the Japanese name when present in the map", () => {
    const key = EffectKey.revenantTriggerGhostflameExplosionDuringUltimateArtActivation;
    expect(effectNamesJa[key]).toBeDefined(); // regeneration must have covered it
    expect(effectNameJa(key)).toBe(effectNamesJa[key]);
  });

  it("never returns undefined for any EffectKey (English fallback)", () => {
    for (let k = 0; k < EffectKey.LENGTH; k++) {
      const name = effectNameJa(k as EffectKey);
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run src/utils/effectNameJa.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement the accessor**

Create `src/utils/effectNameJa.ts`:

```ts
import i18n from "../i18n";
import type { EffectKey } from "../resources/effectKeys";
import { effectNamesJa } from "../resources/effectNamesJa";

/**
 * Japanese effect name with guaranteed fallback.
 * Uses the generated RelicHub-derived map; falls back to the app's English
 * i18n effect name so the return is always a non-empty string.
 */
export function effectNameJa(key: EffectKey): string {
  const ja = effectNamesJa[key];
  if (ja) {
    return ja;
  }
  return i18n.t(`effects.${key}`, { defaultValue: `Effect ${key}` });
}
```

- [ ] **Step 4: Add the completeness dump to the generator**

In `scripts/generate-damage-multipliers.mjs`, after the `effectNamesJa.ts` write and its `console.log`, add a warning block that lists every `skills.json` entry whose `eng` produced no `EffectKey` match (the uncovered worklist). Use the already-loaded `skills` JSON and the already-built `englishToEffectKeyName` map:

```js
const uncovered = [];
for (const genre of Object.values(skills.skills)) {
  for (const s of genre) {
    if (!s.eng) continue;
    const matched =
      englishToEffectKeyName.get(s.eng) ||
      [...englishToEffectKeyName.keys()].find(
        (k) => k.toLowerCase() === s.eng.toLowerCase()
      );
    if (!matched) uncovered.push(`  id ${s.id}: ${s.eng}  (${s.jpn})`);
  }
}
if (uncovered.length > 0) {
  console.warn(
    `\n${uncovered.length} skills.json effect(s) have no EffectKey match ` +
      `(English fallback will be used in UI):\n${uncovered.join("\n")}\n`
  );
}
```

- [ ] **Step 5: Regenerate and commit the data**

If `RelicHub/` is present (it is, in this worktree), run: `node scripts/generate-damage-multipliers.mjs`
Expected: "Wrote N entries to src/resources/effectNamesJa.ts" with N ≥ 474, plus the uncovered warning list. The uncovered entries are acceptable — the accessor falls back to English. Do **not** hand-add overrides in this task; the accessor guarantees completeness.

- [ ] **Step 6: Run tests + type-check** — `npx vitest run src/utils/effectNameJa.test.ts` and `npm run type-check` → PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-damage-multipliers.mjs src/resources/effectNamesJa.ts src/utils/effectNameJa.ts src/utils/effectNameJa.test.ts
git commit -m "feat: total Japanese effect-name accessor with English fallback + generator completeness dump"
```

---

### Task 2: Japanese Nightfarer & vessel names from vessels.json

**Files:**
- Modify: `scripts/generate-damage-multipliers.mjs` (emit two more generated files)
- Create (generated, committed): `src/resources/nightfarerNamesJa.ts`
- Create (generated, committed): `src/resources/vesselNamesJa.ts`
- Test: `src/resources/nightfarerNamesJa.test.ts`

**Interfaces:**
- Consumes: `RelicHub/data/vessels.json`, `Nightfarer` enum.
- Produces:
  ```ts
  // nightfarerNamesJa.ts
  export const nightfarerNamesJa: Record<Nightfarer, string>;
  // vesselNamesJa.ts — English vessel name (from Vessels.ts) -> Japanese name
  export const vesselNamesJa: Record<string, string>;
  ```

Notes:
- `nightfarerNamesJa` is built from the Nightfarer→key→label table in Global Constraints (the generator hardcodes that explicit map because the JSON keys are misspelled — do NOT derive keys from enum names).
- `vesselNamesJa` maps the app's existing English vessel `name` (from `src/utils/Vessels.ts`) to the RelicHub Japanese `vessels[].name`. Match by **slot-color signature** (`n1..n3,d1..d3` in vessels.json equals `slots[0..5]` in Vessels.ts) within the same Nightfarer, because English↔Japanese vessel names share no string. If a vessel's 6-color signature is not unique within a Nightfarer, fall back to positional order (same index in both arrays) and emit a warning.

- [ ] **Step 1: Write the failing test**

Create `src/resources/nightfarerNamesJa.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Nightfarer } from "../utils/Nightfarers";
import { nightfarerNamesJa } from "./nightfarerNamesJa";

describe("nightfarerNamesJa", () => {
  it("maps every Nightfarer to its RelicHub Japanese label", () => {
    expect(nightfarerNamesJa[Nightfarer.Wylder]).toBe("追跡者");
    expect(nightfarerNamesJa[Nightfarer.Revenant]).toBe("復讐者"); // misspelled JSON key
    expect(nightfarerNamesJa[Nightfarer.Executor]).toBe("執行者"); // misspelled JSON key
    expect(nightfarerNamesJa[Nightfarer.Duchess]).toBe("レディ");
  });

  it("has an entry for all 10 Nightfarers", () => {
    for (let nf = 0; nf < 10; nf++) {
      expect(nightfarerNamesJa[nf as Nightfarer]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run src/resources/nightfarerNamesJa.test.ts` → FAIL (module missing).

- [ ] **Step 3: Extend the generator**

In `scripts/generate-damage-multipliers.mjs`, add generation of both files. Use this explicit map (verbatim) and the loaded `vessels.json`:

```js
// Nightfarer enum value -> [vessels.json key, expected label]
const NIGHTFARER_VESSEL_KEYS = [
  ["wylder", 0],  ["gurdian", 1], ["ironeye", 2], ["duchess", 3],
  ["raider", 4],  ["revnant", 5], ["recluse", 6], ["execuor", 7],
  ["scholar", 8], ["undertaker", 9],
];
const nfEntries = NIGHTFARER_VESSEL_KEYS.map(([key, nf]) => {
  const label = vessels[key]?.label;
  if (!label) throw new Error(`vessels.json missing key ${key}`);
  return `  ${nf}: ${JSON.stringify(label)},`;
});
writeFileSync(
  join(ROOT, "src/resources/nightfarerNamesJa.ts"),
  `// GENERATED FILE — do not edit by hand.\n// Regenerate with: node scripts/generate-damage-multipliers.mjs\nimport type { Nightfarer } from "../utils/Nightfarers";\n\nexport const nightfarerNamesJa: Record<Nightfarer, string> = {\n${nfEntries.join("\n")}\n};\n`,
  "utf-8"
);
```

For `vesselNamesJa`, import the app's per-Nightfarer vessel arrays from `src/utils/Vessels.ts` at the top of the generator, then for each Nightfarer build a color-signature → Japanese-name lookup from `vessels[key].vessels` (signature = `[n1,n2,n3,d1,d2,d3]` mapped R/B/Y/G/ALL → the app's `RelicSlotColor` numbers) and resolve each app vessel's English `name` by its `slots` signature. Emit `Record<string,string>` (English name → Japanese name). Where a signature is ambiguous within a Nightfarer, use array-position correspondence and `console.warn`.

- [ ] **Step 4: Regenerate + run tests + type-check**

Run: `node scripts/generate-damage-multipliers.mjs` then `npx vitest run src/resources/nightfarerNamesJa.test.ts` and `npm run type-check` → PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-damage-multipliers.mjs src/resources/nightfarerNamesJa.ts src/resources/vesselNamesJa.ts src/resources/nightfarerNamesJa.test.ts
git commit -m "feat: generate Japanese Nightfarer and vessel names from vessels.json"
```

---

### Task 3: Rust candidate fix for quantity-only must-haves

**Files:**
- Modify: `wasm/combo_search/src/lib.rs` (candidate-bitmap construction, ~lines 542-577)
- Build: `npm run build:wasm`

**Interfaces:**
- Consumes: existing `input.selected_effect_ranges` (already plumbed through worker → WASM).
- Produces: in damage mode, a relic is a search candidate if it carries a damage-relevant effect **OR** any effect named by a range with `min_stacks > 0`.

**Problem:** In damage mode the candidate test marks a relic a candidate only when it has an effect with `damage_mults[k] > 1.0`. A must-have effect with no damage multiplier (e.g. a utility effect) therefore never enters the candidate set, so `combination_satisfies_ranges` can never be satisfied for it — the must-have silently fails.

- [ ] **Step 1: Write a failing Rust unit test**

At the bottom of `lib.rs`, inside the existing `#[cfg(test)] mod damage_tests` (reuse its `relic`/`mults` helpers), add:

```rust
#[test]
fn quantity_only_musthave_relic_is_a_candidate() {
    // Effect key 30 has NO damage multiplier (stays 1.0) but is a must-have (min 1).
    let normal = vec![
        relic(vec![(30, Some(true), None)]),      // only the must-have effect
        relic(vec![(10, Some(true), None)]),      // only a damage effect
    ];
    let deep: Vec<RelicSlot> = vec![];
    let m = mults(&[(10, 1.1)]); // key 30 stays 1.0
    let input = SearchInput {
        nightfarer: 0,
        relics: normal,
        deep_relics: deep,
        vessels: vec![Vessel { slots: [Some(1),Some(1),Some(1),Some(1),Some(1),Some(1)] }],
        selected_effects: vec![],
        recommended_effects: vec![],
        selected_effect_ranges: Some(vec![SelectedEffectRange { effect_key: 30, min_stacks: 1, max_stacks: 6 }]),
        damage_multipliers: Some(m),
        excluded_demerit_keys: None,
        top_k: Some(10),
    };
    let out = search_combinations_impl(&input); // use the existing internal entry point
    // At least one returned combination must include a relic carrying key 30.
    assert!(out.combinations.iter().any(|c| c.points >= 1.0));
    assert!(!out.combinations.is_empty());
}
```

Note: adjust the `SearchInput { .. }` literal to the struct's actual field set and the actual internal search entry-point name (search for how existing tests in this module invoke the search; mirror them exactly — field names, `Vessel`/`SelectedEffectRange` construction, and the impl function). If existing damage tests call `calc_damage` directly rather than a full search entry point, instead assert candidacy by calling the candidate-building logic; keep the test focused on "a relic whose only relevant effect is a min-stack range key is marked a candidate."

- [ ] **Step 2: Run it, verify it fails** — `cargo test --manifest-path wasm/combo_search/Cargo.toml quantity_only` → FAIL.

- [ ] **Step 3: Implement the fix**

Before the candidate loops (after `ranges_vec` is built, ~line 540), build a min-stack key bitmap:

```rust
let mut range_min_keys = [false; EFFECT_KEY_SPACE];
for (k, min, _max) in &ranges_vec {
    if *min > 0 {
        let ku = *k as usize;
        if ku < EFFECT_KEY_SPACE { range_min_keys[ku] = true; }
    }
}
```

Then in **both** candidate loops (normal and deep), inside the `if damage_mode { .. }` branch, extend the test so a range-min key also qualifies:

```rust
if damage_mode {
    if let Some(nf) = e.nightfarer { if nf != input.nightfarer { continue; } }
    if damage_mults.get(k).copied().unwrap_or(1.0) > 1.0
        || unsafe { *range_min_keys.get_unchecked(k) }
    {
        any_selected = true; break;
    }
} else {
    // unchanged
}
```

- [ ] **Step 4: Run Rust tests, verify pass** — `cargo test --manifest-path wasm/combo_search/Cargo.toml` → PASS (new test + existing).

- [ ] **Step 5: Build the WASM** — `npm run build:wasm` → builds `wasm/combo_search/pkg/` with no errors.

- [ ] **Step 6: Commit**

```bash
git add wasm/combo_search/src/lib.rs
git commit -m "fix: include must-have range keys in damage-mode candidate selection"
```

(Do not commit `wasm/combo_search/pkg/` — git-ignored, rebuilt.)

---

### Task 4: Simplify multiplier-array builder + fix orphaned character effects

**Files:**
- Modify: `scripts/generate-damage-multipliers.mjs` (route 3 orphan character effects to `conditionalGroup` instead of a dead bucket)
- Regenerate (committed): `src/resources/damageMultipliers.ts`
- Modify: `src/utils/DamageMultiplierArray.ts`
- Modify: `src/utils/DamageMultiplierArray.test.ts`

**Interfaces:**
- Produces (consumed by Task 6):
  ```ts
  export interface DamageProfileSelection {
    nightfarer: Nightfarer;
    primaryCategoryId: string;
    schoolId?: string;
    element: "physical" | "magic" | "fire" | "lightning" | "holy";
    enabledAttackModes: ReadonlySet<string>;
  }
  export const EFFECT_KEY_ARRAY_LENGTH: number; // 852
  export function buildDamageMultiplierArray(sel: DamageProfileSelection): Float32Array;
  ```
  **Removed:** `enabledSituational` field and the `situationalEffectsForNightfarer` export (situational toggles are gone; conditional/character damage effects are always-on for ranking, Nightfarer-gated).

**Orphan fix:** Three character-exclusive effects currently carry a bucket name absent from the taxonomy, so they never activate:
`ironeyeBoostsThrustingCounterattacksAfterArt` (bucket `ironeyeThrustCounter`),
`recluseCollectingAffinityResidueActivatesTerraMagica` (bucket `recluseLandOfSorcery`),
`executorCharacterSkillBoostsAttackButDrainsHP` (bucket `executorKatanaBoost`).
In the generator, these three targets must emit `conditionalGroup: "characterExclusive"` (and no `bucket`) in `damageMultipliers.ts`, so the always-on conditional rule activates them for their Nightfarer.

- [ ] **Step 1: Update the builder test**

In `src/utils/DamageMultiplierArray.test.ts`, remove all references to `enabledSituational` and `situationalEffectsForNightfarer`, and update the `base` selection object to the new `DamageProfileSelection` shape (no `enabledSituational`). Replace the two situational-related tests with:

```ts
it("activates a conditional/character damage effect for its Nightfarer without any toggle", () => {
  const a = buildDamageMultiplierArray({ ...base, nightfarer: Nightfarer.Recluse });
  expect(a[EffectKey.recluseCollectingAffinityResidueActivatesTerraMagica]).toBeGreaterThan(1);
});

it("keeps a mismatched Nightfarer-exclusive effect at 1.0", () => {
  const a = buildDamageMultiplierArray({ ...base, nightfarer: Nightfarer.Wylder });
  expect(a[EffectKey.recluseCollectingAffinityResidueActivatesTerraMagica]).toBe(1);
});
```

Keep the existing length / melee / weapon-specific / affinity / attack-mode tests (they do not use situational fields). Verify the referenced member names exist in `src/resources/effectKeys.ts`; correct if a name differs.

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run src/utils/DamageMultiplierArray.test.ts` → FAIL (compile error on removed field / new behavior).

- [ ] **Step 3: Fix the generator + regenerate**

In `scripts/generate-damage-multipliers.mjs`, where a target maps to one of the three orphan buckets (`ironeyeThrustCounter`, `recluseLandOfSorcery`, `executorKatanaBoost`), emit `conditionalGroup: "characterExclusive"` with no `bucket`. Then run `node scripts/generate-damage-multipliers.mjs` and confirm those three keys in `src/resources/damageMultipliers.ts` now have `conditionalGroup` and no `bucket`.

- [ ] **Step 4: Simplify the builder**

Rewrite `src/utils/DamageMultiplierArray.ts`: drop `enabledSituational` from `DamageProfileSelection`, delete `situationalEffectsForNightfarer`, and change the activation rule so an effect is active when its Nightfarer matches (or is unset) AND (`conditionalGroup !== undefined` OR (`bucket !== undefined` AND the profile's active buckets include it)):

```ts
export function buildDamageMultiplierArray(sel: DamageProfileSelection): Float32Array {
  const arr = new Float32Array(EFFECT_KEY_ARRAY_LENGTH).fill(1);
  const buckets = activeBuckets(sel);
  for (const keyStr of Object.keys(damageMultipliers)) {
    const key = Number(keyStr) as EffectKey;
    const entry = damageMultipliers[key];
    if (!entry) continue;
    if (entry.nightfarer !== undefined && entry.nightfarer !== sel.nightfarer) continue;
    const active =
      entry.conditionalGroup !== undefined ||
      (entry.bucket !== undefined && buckets.has(entry.bucket));
    if (active && key < EFFECT_KEY_ARRAY_LENGTH) arr[key] = entry.multiplier;
  }
  return arr;
}
```

Keep `activeBuckets` unchanged except that it no longer needs situational handling.

- [ ] **Step 5: Run tests + type-check** — `npx vitest run src/utils/DamageMultiplierArray.test.ts` and `npm run type-check` → PASS. (Type-check will surface DamageOptimizer's now-stale usage — that is fixed in Task 6; if running the whole app type-check here fails only in `DamageOptimizer.tsx`, that is expected and resolved in Task 6. Scope this task's type-check to the util if needed: `npx tsc --noEmit` will report DamageOptimizer errors — note them and proceed.)

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-damage-multipliers.mjs src/resources/damageMultipliers.ts src/utils/DamageMultiplierArray.ts src/utils/DamageMultiplierArray.test.ts
git commit -m "refactor: always-on conditional damage multipliers + fix 3 orphaned character effects"
```

---

### Task 5: Thread must-have ranges through the damage search

**Files:**
- Modify: `src/utils/ComboSearch.ts` (`searchDamageCombinations`, `buildDamageWorkerInput`)
- Test: `src/utils/ComboSearch.damage.test.ts` (add a must-have case)

**Interfaces:**
- Produces (consumed by Task 6):
  ```ts
  export function searchDamageCombinations(
    nightfarer: Nightfarer,
    normalRelics: RelicSlot[],
    deepRelics: RelicSlot[],
    enabledVessels: Vessel[],
    multiplierArray: Float32Array,
    excludedDemeritKeys: number[],
    effectRanges: SelectedEffectEntry[],   // NEW — must-haves
    onProgress?: (p: ComboSearchProgress) => void
  ): Promise<ComboSearchResult>;
  ```
  `SelectedEffectEntry = { effectKey: number; minStacks: number; maxStacks: number }` (already exported from `ComboSearch.ts`).

- [ ] **Step 1: Add a failing must-have test**

In `src/utils/ComboSearch.damage.test.ts`, add a test that mirrors the existing damage smoke test but passes an `effectRanges` requiring a specific effect key `minStacks: 1`, and asserts every returned combination contains at least one relic carrying that key. Follow the existing file's fixture/bypass pattern (it calls `buildDamageWorkerInput` + `buildWasmInput` + `search_combinations` directly). Pass the new `effectRanges` argument to `buildDamageWorkerInput`.

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run src/utils/ComboSearch.damage.test.ts` → FAIL (arity/behavior).

- [ ] **Step 3: Implement**

In `buildDamageWorkerInput` (`src/utils/ComboSearch.ts` ~line 428), add an `effectRanges: SelectedEffectEntry[]` parameter and set `selectedEffectRanges: effectRanges` (replacing the hardcoded `[]`). Also compute `blockedEffectKeys` from any `maxStacks === 0` entries the same way `buildWorkerInput` does (lines ~403), so a must-have with `maxStacks: 0` acts as an exclusion consistent with the ComboFinder path. Thread the new parameter through `searchDamageCombinations`.

- [ ] **Step 4: Run tests + type-check** — `npx vitest run src/utils/ComboSearch.damage.test.ts` and `npm run type-check` (DamageOptimizer errors expected until Task 6). PASS for the util + test.

- [ ] **Step 5: Commit**

```bash
git add src/utils/ComboSearch.ts src/utils/ComboSearch.damage.test.ts
git commit -m "feat: pass must-have effect ranges into damage-mode search"
```

---

### Task 6: Rebuild the Damage Optimizer left panel (must-haves + Japanese names)

**Files:**
- Modify: `src/components/DamageOptimizer.tsx` (left-panel overhaul, settings v2, wiring)
- Modify: `src/components/DamageRelicSlot.tsx` (use `effectNameJa`)
- Modify: `src/components/EffectsAutocomplete.tsx` (add optional `getLabel` prop — backward compatible)

**Interfaces:**
- Consumes: `effectNameJa` (Task 1), `nightfarerNamesJa` + `vesselNamesJa` (Task 2), `buildDamageMultiplierArray` (Task 4, no situational field), `searchDamageCombinations` with `effectRanges` (Task 5), `effectsArray` (`src/resources/effects.ts`), `demeritEffects` (existing), `EffectsAutocomplete`.
- Produces: unchanged public interface `export function DamageOptimizer(props: { currentSlot: CharacterSlot }): JSX.Element`.

**New left panel (all UI labels Japanese literals):**
1. キャラクター — select; option labels `nightfarerNamesJa[nf]`.
2. 攻撃カテゴリ — `primaryCategories` with existing local Japanese label map.
3. 系統 — only when the category `hasSchools`; includes a `なし` (empty) option (already added).
4. 属性 — 物理/魔力/炎/雷/聖.
5. 攻撃手段 — attack-mode checkboxes, weapon primaries only.
6. **必須効果** (must-haves, NEW) — `EffectsAutocomplete` over `effectsArray` filtered to `effect.nightfarer === undefined || effect.nightfarer === selectedNightfarer`, labeled with `effectNameJa(effect.key)`; on select, add `{ effectKey, minStacks: 1 }`. Each selected must-have renders a row: its Japanese name + a minimum-quantity control (Select or +/- 1–6). Remove entries via a delete button.
7. 除外するデメリット — unchanged checklist (`demeritEffects`, label `effectNameJa(d.key)` or `d.jaName`).
8. 聖杯 — vessel cards with slot-color chips (already added); vessel title uses `vesselNamesJa[v.name] ?? v.name`.

**Removed:** the entire 状況効果 section and any `enabledSituational` state/handlers.

**Settings v2:**
```ts
interface DamageOptSettings {
  primaryCategoryId: string;
  schoolId?: string;
  element: "physical" | "magic" | "fire" | "lightning" | "holy";
  enabledAttackModes: string[];
  mustHaves: { effectKey: number; minStacks: number }[]; // NEW (replaces enabledSituational)
  excludedDemerits: number[];
  disabledVessels: string[];
}
```
Bump `SETTINGS_STORAGE_KEY` to `"damageOpt:settings:v2"`. Keep the existing `loadSettingsFromStorage`/`sanitizeNumberArray` per-field validation pattern; validate `mustHaves` entries (finite `effectKey`, `minStacks` clamped 1–6). Old v1 data is not migrated.

**Search wiring:** the existing manual 「検索」 button calls `performSearch`. Build `effectRanges` from `current.mustHaves` as `{ effectKey, minStacks, maxStacks: 6 }` and pass as the new argument to `searchDamageCombinations`. The multiplier array now comes from the simplified `buildDamageMultiplierArray` (no situational field). `highlightedEffectKeys` still = keys where `multiplierArray[key] > 1`.

- [ ] **Step 1: Add optional `getLabel` to EffectsAutocomplete**

In `src/components/EffectsAutocomplete.tsx`, add an optional prop `getLabel?: (effectKey: EffectKey) => string`. In `getOptionLabel`, when `getLabel` is provided use it instead of `t(\`effects.${effectKey}\`)` (preserve the `(or better)` suffix logic). Default (prop omitted) keeps current behavior exactly — `ComboFinder.tsx` is untouched.

- [ ] **Step 2: DamageRelicSlot uses the accessor**

In `src/components/DamageRelicSlot.tsx`, replace `effectNamesJa[effectKey] ?? getEffectName(effect)` with `effectNameJa(effectKey)` (import from `../utils/effectNameJa`); drop the now-unused `effectNamesJa`/`getEffectName` imports if no longer referenced.

- [ ] **Step 3: Overhaul DamageOptimizer**

Apply the panel, settings-v2, and wiring changes above. Remove `situationalEffectsForNightfarer` import and all `enabledSituational` code. Add the must-have picker (Step 1 component) and per-must-have quantity rows. Character option labels and vessel titles use the Task-2 maps.

- [ ] **Step 4: Type-check + lint** — `npm run type-check` and `npm run lint` → PASS (whole app now consistent; Task 4/5 residual errors resolved).

- [ ] **Step 5: Full test suite** — `npm run test -- --run` → PASS (no regressions; existing damage tests + new tests green).

- [ ] **Step 6: Manual smoke test (requires a human with a browser)**

Run `npm run dev`, load save/demo data, open 「ダメージ最適化」. Verify: character names are Japanese (追跡者/復讐者/…); selecting 魔術 shows 系統 with a なし option; the 必須効果 search lists **every** effect (including Revenant/Recluse/Executor character effects) with Japanese names; adding a must-have with min quantity and pressing 検索 filters combinations to those containing it; results show `×N.NN（+NN%）`; the 6 slots render Japanese effect names with contributing effects highlighted; vessel cards show color chips and Japanese titles. Note in the report that interactive verification needs a human.

- [ ] **Step 7: Commit**

```bash
git add src/components/DamageOptimizer.tsx src/components/DamageRelicSlot.tsx src/components/EffectsAutocomplete.tsx
git commit -m "feat: Damage Optimizer must-have effects + Japanese character/vessel/effect names"
```

---

## Self-Review

**Spec coverage:**
- "Effects vanish from UI" → Task 1 (total accessor) + Task 6 (list driven from `effectsArray`) make disappearance structurally impossible.
- "Effect names English" → Task 1 accessor + Task 6 usage in picker/slot.
- "Character/vessel names English" → Task 2 maps from vessels.json + Task 6 usage.
- "Must-haves: all effects, quantity, separate, ComboFinder-like" → Task 5 (plumbing) + Task 6 (picker over full `effectsArray`, min-quantity, `selectedEffectRanges`).
- "状況効果 naming/coverage wrong; no need to separate" → Task 4 removes the toggle bucket; conditional damage effects always-on for ranking; must-have picker covers requiring them.
- "Calculation too slow / quantity-only must-haves must work" → Task 3 (candidate fix). (COOP/COEP headers already added in a prior commit; re-verify `window.crossOriginIsolated` during Task 6 Step 6.)
- Orphaned Ironeye/Recluse/Executor effects → Task 4 generator fix.

**Placeholder scan:** The 45 unmatched Japanese names are intentionally left to English fallback (Task 1) rather than enumerated — the accessor guarantees completeness, so no per-string placeholder remains. `vesselNamesJa` matching is specified by color-signature with a positional fallback (Task 2), not "TBD". Rust test literal is flagged to be reconciled with the actual struct/entry-point (Task 3 Step 1) — a real instruction, not a placeholder.

**Type consistency:** `DamageProfileSelection` loses `enabledSituational` in Task 4 and every consumer (Task 6) matches. `searchDamageCombinations` gains `effectRanges: SelectedEffectEntry[]` in Task 5 and is called with it in Task 6. `SelectedEffectEntry` fields (`effectKey`/`minStacks`/`maxStacks`) are consistent across Tasks 5–6. `mustHaves` shape (`{ effectKey, minStacks }`) is consistent between settings (Task 6) and the `{ ...minStacks, maxStacks: 6 }` mapping into `SelectedEffectEntry`.
