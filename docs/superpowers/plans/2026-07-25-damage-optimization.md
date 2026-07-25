# Damage Optimization Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Japanese-fixed "ダメージ最適化" tab that finds the vessel + 6-relic combination (3 normal + 3 deep, per-slot color constraints) maximizing the combined damage multiplier for a chosen attack profile, by adding a damage-scoring mode to the existing WASM combination-search engine.

**Architecture:** Reuse the existing Combo Finder WASM engine (`wasm/combo_search/src/lib.rs`) — vessel iteration, per-slot color constraints, normal/deep split, top-K pruning, dedup — and add one new scoring path (`calc_damage` = product of per-EffectKey multipliers) plus demerit rejection. JS computes a per-EffectKey multiplier array from the user's selection; the engine prunes and ranks by that product. UI mirrors `src/components/ComboFinder.tsx` but is Japanese-fixed and renders damage multipliers.

**Tech Stack:** TypeScript, React 19, MUI, Vitest, Rust + wasm-bindgen (cargo 1.97, wasm-pack — confirmed available), plain Node ESM (`.mjs`) generators.

**Design doc:** `docs/superpowers/specs/2026-07-25-damage-optimization-design.md` (read it first; it is the source of truth for domain facts).

## Global Constraints

- A build is a **vessel of 6 slots: 3 normal + 3 deep**, each with a fixed color (R/B/Y/G/ALL), differing per Nightfarer. Optimize the best 6-relic *combination*, never rank relics individually.
- Damage score = **product** of per-EffectKey multipliers. `stacks=true` (or unset) effects multiply on **every** occurrence; `stacks=false` effects multiply **once** across all 6 slots. Do NOT apply Combo Finder's group-duplicate dedup in the damage path (`物理攻撃力上昇` and `物理攻撃力上昇+1` both multiply).
- The 5 `multiplier: null` "特殊処理" effects stay excluded (already handled in `damageMultipliers.ts`).
- Nightfarer-exclusive effects (`nightfarer` set) contribute only when they match the selected Nightfarer.
- This tab is **Japanese-fixed**: its own UI strings are hardcoded Japanese literals (no i18n keys); effect names come from the generated `effectNamesJa` map, not the app's i18n `effects.*`.
- Situational/conditional effects are **individual** toggles filtered by the selected Nightfarer — never lumped into "Character Exclusive"/"Other" buckets.
- Demerits (deep-relic `EffectType.Debuff` effects) are an **individual** exclusion checklist; default nothing excluded.
- The existing Combo Finder path must stay behavior-identical: all new Rust input fields are optional; damage mode is entered only when `damage_multipliers` is present.
- No new npm dependencies. `@tanstack/react-virtual` is already a dependency.
- Rust `EFFECT_KEY_SPACE` is currently 850 while `EffectKey.LENGTH` is 852 — Task 3 reconciles this (bump to 852) so no damage-relevant key is silently dropped.
- Color u8 mapping (JS `RelicSlotColor` → Rust): Any=0, Red=1, Blue=2, Yellow=3, Green=4 (already how `getRelicColor` + the engine agree).

---

### Task 1: Japanese effect-name map + demerit effect list (generated data)

**Files:**
- Modify: `scripts/generate-damage-multipliers.mjs` (emit two more files)
- Create (generated, committed): `src/resources/effectNamesJa.ts`
- Create (generated, committed): `src/resources/demeritEffects.ts`
- Test: `scripts/damage-multiplier-matching.test.mjs` (add cases)

**Interfaces:**
- Consumes: `RelicHub/data/{skills.json,deep.json,demerit.json}`, `src/i18n.ts` (en block), existing matching helpers in `scripts/damage-multiplier-matching.mjs`.
- Produces (for later tasks):
  ```ts
  // effectNamesJa.ts
  export const effectNamesJa: Partial<Record<EffectKey, string>>;
  // demeritEffects.ts
  export interface DemeritEffect { key: EffectKey; jaName: string; }
  export const demeritEffects: DemeritEffect[];
  ```

- [ ] **Step 1: Add a failing test for a jpn-name lookup helper**

In `scripts/damage-multiplier-matching.test.mjs`, add:

```js
import { buildEngToJpnLookup } from "./damage-multiplier-matching.mjs";

describe("buildEngToJpnLookup", () => {
  it("maps eng -> jpn, first match wins", () => {
    const m = buildEngToJpnLookup([
      [{ jpn: "物理攻撃力上昇", eng: "Physical Attack Up" }],
      [{ jpn: "SHOULD NOT WIN", eng: "Physical Attack Up" }],
    ]);
    expect(m.get("Physical Attack Up")).toBe("物理攻撃力上昇");
    expect(m.size).toBe(1);
  });
  it("skips entries missing jpn or eng", () => {
    expect(buildEngToJpnLookup([[{ jpn: "", eng: "x" }, { jpn: "y", eng: "" }]]).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run scripts/damage-multiplier-matching.test.mjs`
Expected: FAIL — `buildEngToJpnLookup` is not exported.

- [ ] **Step 3: Implement the helper**

In `scripts/damage-multiplier-matching.mjs` add and export:

```js
export function buildEngToJpnLookup(sourceLists) {
  const lookup = new Map();
  for (const list of sourceLists) {
    for (const entry of list) {
      if (entry.jpn && entry.eng && !lookup.has(entry.eng)) {
        lookup.set(entry.eng, entry.jpn);
      }
    }
  }
  return lookup;
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run scripts/damage-multiplier-matching.test.mjs`
Expected: PASS.

- [ ] **Step 5: Extend the generator to emit the two files**

In `scripts/generate-damage-multipliers.mjs`, after the existing `damageMultipliers.ts` emission, add generation of both files. Insert imports at top: add `buildEngToJpnLookup` to the existing import from `./damage-multiplier-matching.mjs`. Then, using the already-loaded `skills`, `deep`, `demerit` JSON and the already-built `englishToEffectKeyName` map:

```js
// --- effectNamesJa.ts : EffectKey -> Japanese name ---
const engToJpn = buildEngToJpnLookup([
  ...Object.values(skills.skills),
  deep.skills.deep,
  demerit.demerit_skills,
]);
const jaNameEntries = [];
for (const [eng, effectKeyName] of englishToEffectKeyName.entries()) {
  const jpn = engToJpn.get(eng);
  if (jpn) jaNameEntries.push(`  [EffectKey.${effectKeyName}]: ${JSON.stringify(jpn)},`);
}
const effectNamesJaOut = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-damage-multipliers.mjs
import { EffectKey } from "./effectKeys";

export const effectNamesJa: Partial<Record<EffectKey, string>> = {
${jaNameEntries.join("\n")}
};
`;
writeFileSync(join(ROOT, "src/resources/effectNamesJa.ts"), effectNamesJaOut, "utf-8");
console.log(`Wrote ${jaNameEntries.length} entries to src/resources/effectNamesJa.ts`);

// --- demeritEffects.ts : the individual demerit types with EffectKey ---
const demeritEntries = [];
const unmatchedDemerits = [];
for (const d of demerit.demerit_skills) {
  const effectKeyName = englishToEffectKeyName.get(d.eng);
  if (!effectKeyName) { unmatchedDemerits.push(d.eng); continue; }
  demeritEntries.push(`  { key: EffectKey.${effectKeyName}, jaName: ${JSON.stringify(d.jpn)} },`);
}
if (unmatchedDemerits.length > 0) {
  console.error(`\nWARNING: ${unmatchedDemerits.length} demerit(s) had no EffectKey match:\n` +
    unmatchedDemerits.map((k) => `  - ${k}`).join("\n") +
    `\nAdd them to MANUAL_EFFECT_KEY_OVERRIDES (or a demerit-specific override) and re-run.\n`);
}
const demeritOut = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-damage-multipliers.mjs
import { EffectKey } from "./effectKeys";

export interface DemeritEffect { key: EffectKey; jaName: string; }

export const demeritEffects: DemeritEffect[] = [
${demeritEntries.join("\n")}
];
`;
writeFileSync(join(ROOT, "src/resources/demeritEffects.ts"), demeritOut, "utf-8");
console.log(`Wrote ${demeritEntries.length} entries to src/resources/demeritEffects.ts`);
```

- [ ] **Step 6: Run the generator (needs RelicHub/ data present)**

If `RelicHub/` is absent in this worktree, copy it in first:
`cp -r <main-repo>/RelicHub RelicHub` (it is git-ignored; remove it again after if desired — the generated .ts files are what get committed).
Run: `node scripts/generate-damage-multipliers.mjs`
Expected: three "Wrote N entries" lines (damageMultipliers, effectNamesJa, demeritEffects). If any demerit warns as unmatched, resolve via `MANUAL_EFFECT_KEY_OVERRIDES` and re-run until clean.

- [ ] **Step 7: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add scripts/generate-damage-multipliers.mjs scripts/damage-multiplier-matching.mjs scripts/damage-multiplier-matching.test.mjs src/resources/effectNamesJa.ts src/resources/demeritEffects.ts
git commit -m "feat: generate Japanese effect names and demerit effect list"
```

---

### Task 2: Attack-profile taxonomy corrections + multiplier-array builder

**Files:**
- Modify: `src/resources/damageCategories.ts` (correct to the attack-profile model)
- Create: `src/utils/DamageMultiplierArray.ts`
- Test: `src/utils/DamageMultiplierArray.test.ts`
- Test: `src/resources/damageCategories.test.ts` (update counts)

**Interfaces:**
- Consumes: `damageMultipliers` (Task-0 existing), `damageCategories`, `EffectKey`, `Nightfarer`.
- Produces (for Task 6 UI and Task 4 glue):
  ```ts
  export interface DamageProfileSelection {
    nightfarer: Nightfarer;
    primaryCategoryId: string;      // weapon:* | sorcery | incantation | thrownPot | thrownKnife | glintstoneGravityItem | perfumeBottle | roarAndBreath
    schoolId?: string;              // only when primary is sorcery/incantation
    element: "physical" | "magic" | "fire" | "lightning" | "holy";
    enabledAttackModes: ReadonlySet<string>;    // weaponSkill|normalAttackFirstHit|criticalHit|guardCounter
    enabledSituational: ReadonlySet<EffectKey>; // individual situational effect keys the user turned on
  }
  export const EFFECT_KEY_ARRAY_LENGTH = 852;
  export function buildDamageMultiplierArray(sel: DamageProfileSelection): Float32Array;
  // Also exported for the UI's situational checklist:
  export function situationalEffectsForNightfarer(nf: Nightfarer): { key: EffectKey; groupId: string }[];
  ```

Notes for the implementer:
- "Situational" = every `damageMultipliers` entry that has a `conditionalGroup` set. Each such entry is an individual toggle. Filter by `nightfarer` (entries with a `nightfarer` show only for that Nightfarer; entries without show for all).
- "Attack-mode" buckets are the weapon-only opt-in damage buckets: `weaponSkill`, `normalAttackFirstHit`, `criticalHit`/`criticalHitPlus1`, `guardCounter`. When a weapon primary is selected, `近接` (melee bucket) is always active.
- `buildDamageMultiplierArray` returns an array of length `EFFECT_KEY_ARRAY_LENGTH` (852) filled with 1.0, then sets active effects' multipliers. Active = (bucket ∈ activeBuckets) OR (conditionalGroup effect whose key ∈ enabledSituational), with Nightfarer gating. Element non-physical also activates the `affinityAttackUp` bucket.

- [ ] **Step 1: Write the failing test for `buildDamageMultiplierArray`**

Create `src/utils/DamageMultiplierArray.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EffectKey } from "../resources/effectKeys";
import { damageMultipliers } from "../resources/damageMultipliers";
import {
  buildDamageMultiplierArray,
  EFFECT_KEY_ARRAY_LENGTH,
  type DamageProfileSelection,
} from "./DamageMultiplierArray";
import { Nightfarer } from "./Nightfarers";

const base: DamageProfileSelection = {
  nightfarer: Nightfarer.Wylder,
  primaryCategoryId: "weapon:greatsword",
  element: "physical",
  enabledAttackModes: new Set(),
  enabledSituational: new Set(),
};

describe("buildDamageMultiplierArray", () => {
  it("has the expected length, default 1.0", () => {
    const a = buildDamageMultiplierArray(base);
    expect(a.length).toBe(EFFECT_KEY_ARRAY_LENGTH);
    expect(a[EffectKey.vigorPlus1]).toBe(1); // irrelevant effect stays 1.0
  });

  it("activates melee, weapon-specific and element multipliers for a physical greatsword build", () => {
    const a = buildDamageMultiplierArray(base);
    expect(a[EffectKey.improvedMeleeAttackPower]).toBeCloseTo(
      damageMultipliers[EffectKey.improvedMeleeAttackPower]!.multiplier, 5);
    expect(a[EffectKey.improvedGreatswordAttackPower]).toBeCloseTo(
      damageMultipliers[EffectKey.improvedGreatswordAttackPower]!.multiplier, 5);
    expect(a[EffectKey.physicalAttackUp]).toBeCloseTo(
      damageMultipliers[EffectKey.physicalAttackUp]!.multiplier, 5);
  });

  it("does not activate a different weapon's multiplier", () => {
    const a = buildDamageMultiplierArray(base);
    expect(a[EffectKey.improvedDaggerAttackPower]).toBe(1);
  });

  it("activates affinity for non-physical elements", () => {
    const a = buildDamageMultiplierArray({ ...base, element: "fire" });
    expect(a[EffectKey.improvedAffinityAttackPower]).toBeGreaterThan(1);
  });

  it("activates an attack-mode bucket only when toggled", () => {
    const off = buildDamageMultiplierArray(base);
    expect(off[EffectKey.improvedSkillAttackPower]).toBe(1);
    const on = buildDamageMultiplierArray({ ...base, enabledAttackModes: new Set(["weaponSkill"]) });
    expect(on[EffectKey.improvedSkillAttackPower]).toBeGreaterThan(1);
  });

  it("activates a situational effect only when its key is enabled", () => {
    const off = buildDamageMultiplierArray(base);
    expect(off[EffectKey.takingAttacksImprovesAttackPower]).toBe(1);
    const on = buildDamageMultiplierArray({
      ...base, enabledSituational: new Set([EffectKey.takingAttacksImprovesAttackPower]),
    });
    expect(on[EffectKey.takingAttacksImprovesAttackPower]).toBeGreaterThan(1);
  });

  it("keeps a mismatched Nightfarer-exclusive effect at 1.0 even if enabled", () => {
    const executorOnly = EffectKey.executorCharacterSkillBoostsAttackButDrainsHP;
    const a = buildDamageMultiplierArray({
      ...base, nightfarer: Nightfarer.Wylder, enabledSituational: new Set([executorOnly]),
    });
    expect(a[executorOnly]).toBe(1);
  });
});
```

Note: verify the exact member names (`improvedDaggerAttackPower`, `improvedSkillAttackPower`, `takingAttacksImprovesAttackPower`, `executorCharacterSkillBoostsAttackButDrainsHP`) exist in `src/resources/effectKeys.ts`; if any differs, correct the test reference before running.

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run src/utils/DamageMultiplierArray.test.ts` → FAIL (module missing).

- [ ] **Step 3: Correct `damageCategories.ts` and implement the builder**

First, in `src/resources/damageCategories.ts`, ensure these exports exist (adjust from the current file): `primaryCategories` (the 24 weapons with `bucket: "weapon:<slug>"`, plus `sorcery`(bucket `sorceryGeneric`,hasSchools), `incantation`(bucket `incantationGeneric`,hasSchools), `thrownPot`(`thrownPot`), `thrownKnife`(`thrownKnife`), `glintstoneGravityItem`(`glintstoneGravityItem`), `perfumeBottle`(`perfumeBottle`), `roarAndBreath`(`roarAndBreath`)); `sorcerySchools`, `incantationSchools`; `damageElements` (5, each `bucket: "element:<id>"`); `attackModes` = `[{id:"weaponSkill",bucket:"weaponSkill"},{id:"normalAttackFirstHit",bucket:"normalAttackFirstHit"},{id:"criticalHit",bucket:"criticalHit"},{id:"guardCounter",bucket:"guardCounter"}]`. Remove the old `situationalModifiers`/`conditionalGroups` arrays that lumped things — situational effects are now derived from `damageMultipliers` directly (see builder). Keep whatever the existing tests still reference in sync (update `damageCategories.test.ts` counts accordingly).

Then create `src/utils/DamageMultiplierArray.ts`:

```ts
import {
  attackModes,
  damageElements,
  incantationSchools,
  primaryCategories,
  sorcerySchools,
} from "../resources/damageCategories";
import { damageMultipliers } from "../resources/damageMultipliers";
import { EffectKey } from "../resources/effectKeys";
import { Nightfarer } from "./Nightfarers";

export const EFFECT_KEY_ARRAY_LENGTH = 852;

export interface DamageProfileSelection {
  nightfarer: Nightfarer;
  primaryCategoryId: string;
  schoolId?: string;
  element: "physical" | "magic" | "fire" | "lightning" | "holy";
  enabledAttackModes: ReadonlySet<string>;
  enabledSituational: ReadonlySet<EffectKey>;
}

function activeBuckets(sel: DamageProfileSelection): Set<string> {
  const active = new Set<string>();
  const cat = primaryCategories.find((c) => c.id === sel.primaryCategoryId);
  if (cat) {
    active.add(cat.bucket);
    if (cat.id.startsWith("weapon:")) {
      active.add("melee");
      for (const m of attackModes) {
        if (sel.enabledAttackModes.has(m.id)) active.add(m.bucket);
      }
      // criticalHit toggle also activates the +1 variant bucket
      if (sel.enabledAttackModes.has("criticalHit")) active.add("criticalHitPlus1");
    }
    if (cat.hasSchools === "sorcery") {
      const s = sorcerySchools.find((x) => x.id === sel.schoolId);
      if (s) active.add(s.bucket);
    }
    if (cat.hasSchools === "incantation") {
      const s = incantationSchools.find((x) => x.id === sel.schoolId);
      if (s) active.add(s.bucket);
    }
  }
  const el = damageElements.find((e) => e.id === sel.element);
  if (el) {
    active.add(el.bucket);
    if (sel.element !== "physical") active.add("affinityAttackUp");
  }
  return active;
}

export function buildDamageMultiplierArray(sel: DamageProfileSelection): Float32Array {
  const arr = new Float32Array(EFFECT_KEY_ARRAY_LENGTH).fill(1);
  const buckets = activeBuckets(sel);
  for (const keyStr of Object.keys(damageMultipliers)) {
    const key = Number(keyStr) as EffectKey;
    const entry = damageMultipliers[key];
    if (!entry) continue;
    if (entry.nightfarer !== undefined && entry.nightfarer !== sel.nightfarer) continue;
    let active = false;
    if (entry.conditionalGroup !== undefined) {
      active = sel.enabledSituational.has(key);
    } else if (entry.bucket !== undefined) {
      active = buckets.has(entry.bucket);
    }
    if (active && key < EFFECT_KEY_ARRAY_LENGTH) arr[key] = entry.multiplier;
  }
  return arr;
}

export function situationalEffectsForNightfarer(
  nf: Nightfarer
): { key: EffectKey; groupId: string }[] {
  const out: { key: EffectKey; groupId: string }[] = [];
  for (const keyStr of Object.keys(damageMultipliers)) {
    const key = Number(keyStr) as EffectKey;
    const entry = damageMultipliers[key];
    if (!entry || entry.conditionalGroup === undefined) continue;
    if (entry.nightfarer !== undefined && entry.nightfarer !== nf) continue;
    out.push({ key, groupId: entry.conditionalGroup });
  }
  return out;
}
```

- [ ] **Step 4: Run tests, verify pass** — `npx vitest run src/utils/DamageMultiplierArray.test.ts src/resources/damageCategories.test.ts` → PASS. Then `npm run type-check` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/resources/damageCategories.ts src/resources/damageCategories.test.ts src/utils/DamageMultiplierArray.ts src/utils/DamageMultiplierArray.test.ts
git commit -m "feat: attack-profile taxonomy and damage multiplier array builder"
```

---

### Task 3: Rust damage-scoring mode + demerit rejection

**Files:**
- Modify: `wasm/combo_search/src/lib.rs`
- Build: `npm run build:wasm`

**Interfaces:**
- Consumes: the multiplier array (as `Vec<f32>`) and excluded demerit keys, passed from the worker (Task 4).
- Produces: `SearchOutput.combinations[].points` now carries the damage-multiplier product when in damage mode.

- [ ] **Step 1: Reconcile the key-space constant**

Change `const EFFECT_KEY_SPACE: usize = 850;` to `852` (matches `EffectKey.LENGTH`). This is safe: it only widens guard bounds and array sizes.

- [ ] **Step 2: Add optional input fields**

In `struct SearchInput`, add:

```rust
    pub damage_multipliers: Option<Vec<f32>>,   // len == EFFECT_KEY_SPACE; 1.0 = irrelevant
    pub excluded_demerit_keys: Option<Vec<u32>>,
```

- [ ] **Step 3: Write a Rust unit test for `calc_damage`**

At the bottom of `lib.rs`, add (guard with `#[cfg(test)]`):

```rust
#[cfg(test)]
mod damage_tests {
    use super::*;
    fn relic(effects: Vec<(u32, Option<bool>, Option<u8>)>) -> RelicSlot {
        RelicSlot { color: Some(1), effects: effects.into_iter().map(|(key, stacks, nf)| Effect {
            key, nightfarer: nf, stacks, group: None, level: None, startingBonus: None, r#type: None,
        }).collect() }
    }
    fn mults(pairs: &[(usize, f32)]) -> Vec<f32> {
        let mut m = vec![1.0f32; EFFECT_KEY_SPACE];
        for &(k, v) in pairs { m[k] = v; }
        m
    }

    #[test]
    fn stacks_true_multiplies_each_occurrence() {
        let normal = vec![relic(vec![(10, Some(true), None)]), relic(vec![(10, Some(true), None)])];
        let deep: Vec<RelicSlot> = vec![];
        let m = mults(&[(10, 1.1)]);
        let idx: [Option<usize>;6] = [Some(0), Some(1), None, None, None, None];
        let mut ctx = ScoreContext::new();
        let p = calc_damage(0, idx, &normal, &deep, &m, &mut ctx);
        assert!((p - 1.1f32 * 1.1f32).abs() < 1e-5);
    }

    #[test]
    fn stacks_false_multiplies_once() {
        let normal = vec![relic(vec![(10, Some(false), None)]), relic(vec![(10, Some(false), None)])];
        let deep: Vec<RelicSlot> = vec![];
        let m = mults(&[(10, 1.15)]);
        let idx: [Option<usize>;6] = [Some(0), Some(1), None, None, None, None];
        let mut ctx = ScoreContext::new();
        let p = calc_damage(0, idx, &normal, &deep, &m, &mut ctx);
        assert!((p - 1.15f32).abs() < 1e-5);
    }

    #[test]
    fn nightfarer_mismatch_ignored_and_irrelevant_ignored() {
        let normal = vec![relic(vec![(10, Some(true), Some(3)), (20, Some(true), None)])];
        let deep: Vec<RelicSlot> = vec![];
        let m = mults(&[(10, 1.5) /* nf-exclusive, wrong nf */]); // key 20 stays 1.0
        let idx: [Option<usize>;6] = [Some(0), None, None, None, None, None];
        let mut ctx = ScoreContext::new();
        let p = calc_damage(0 /* nightfarer 0 != 3 */, idx, &normal, &deep, &m, &mut ctx);
        assert!((p - 1.0f32).abs() < 1e-5);
    }
}
```

- [ ] **Step 4: Run the Rust test, verify it fails** — `cargo test --manifest-path wasm/combo_search/Cargo.toml` → FAIL (`calc_damage` not defined).

- [ ] **Step 5: Implement `calc_damage`**

Add near `calc_points`:

```rust
#[inline(always)]
fn calc_damage(
    nightfarer: u8,
    relic_indices6: [Option<usize>; 6],
    relics_normal: &[RelicSlot],
    relics_deep: &[RelicSlot],
    multipliers: &[f32],
    ctx: &mut ScoreContext,
) -> f32 {
    ctx.next_generation();
    let mut product: f32 = 1.0;
    for (slot_i, opt_idx) in relic_indices6.iter().enumerate() {
        if let Some(idx) = opt_idx {
            let relic = if slot_i < 3 { unsafe { relics_normal.get_unchecked(*idx) } }
                        else { unsafe { relics_deep.get_unchecked(*idx) } };
            for effect in &relic.effects {
                if let Some(nf) = effect.nightfarer { if nf != nightfarer { continue; } }
                let k = effect.key as usize;
                if k >= EFFECT_KEY_SPACE { continue; }
                let m = unsafe { *multipliers.get_unchecked(k) };
                if m <= 1.0 { continue; }
                let stacks = effect.stacks.unwrap_or(true);
                if !stacks {
                    if ctx.is_key(k) { continue; }
                    ctx.set_key(k);
                }
                product *= m;
            }
        }
    }
    product
}
```

- [ ] **Step 6: Add a demerit-rejection helper**

```rust
#[inline(always)]
fn combination_has_excluded_demerit(
    relic_indices6: &[Option<usize>;6],
    relics_deep: &[RelicSlot],
    excluded: &[u32],
) -> bool {
    if excluded.is_empty() { return false; }
    // Demerits live on deep relics (slots 3..5).
    for slot_i in 3..6 {
        if let Some(idx) = relic_indices6[slot_i] {
            let relic = unsafe { relics_deep.get_unchecked(idx) };
            for effect in &relic.effects {
                if excluded.iter().any(|&e| e == effect.key) { return true; }
            }
        }
    }
    false
}
```

- [ ] **Step 7: Branch scoring on damage mode in `search_combinations`**

Compute once near the top of `search_combinations` after parsing input:

```rust
    let damage_mode = input.damage_multipliers.is_some();
    let damage_mults: Vec<f32> = input.damage_multipliers.clone().unwrap_or_default();
    let excluded_demerits: Vec<u32> = input.excluded_demerit_keys.clone().unwrap_or_default();
```

Thread `damage_mode`, `&damage_mults`, `&excluded_demerits` into `search_group_triples` and `add_combination_if_unique6`. In each place that currently calls `calc_points(...)`, use:

```rust
    let points = if damage_mode {
        calc_damage(nightfarer, full_indices6 /* or relic_indices6 */, relics_normal, relics_deep, &damage_mults, &mut score_ctx)
    } else {
        calc_points(/* existing args */)
    };
```

For candidate bitmaps in damage mode, replace the "has a selected effect" test with "has any effect whose `multipliers[key] > 1.0` (and nightfarer matches)". Concretely, where `is_candidate_norm` / `is_candidate_deep` are built, in damage mode set the candidate flag when the relic has any such effect. (Keep the existing selected-effect logic for non-damage mode.)

In `add_combination_if_unique6`, before scoring, add:

```rust
    if damage_mode && combination_has_excluded_demerit(&relic_indices6, relics_deep, excluded_demerits) { return; }
```

(pass `damage_mode` and `excluded_demerits` into the function signature).

Keep `combination_satisfies_ranges` intact and still applied (Phase 2 must-haves).

- [ ] **Step 8: Run Rust tests, verify pass** — `cargo test --manifest-path wasm/combo_search/Cargo.toml` → PASS (3 damage tests + any existing).

- [ ] **Step 9: Build the WASM**

Run: `npm run build:wasm`
Expected: builds `wasm/combo_search/pkg/` with no errors.

- [ ] **Step 10: Commit**

```bash
git add wasm/combo_search/src/lib.rs
git commit -m "feat: add damage-multiplier scoring mode and demerit rejection to combo search"
```

(Do not commit `wasm/combo_search/pkg/` — it is git-ignored and rebuilt.)

---

### Task 4: Worker + ComboSearch glue for damage mode

**Files:**
- Modify: `src/workers/comboSearchWorker.ts`
- Modify: `src/utils/ComboSearch.ts`
- Test: `src/utils/ComboSearch.damage.test.ts`

**Interfaces:**
- Produces (for Task 6):
  ```ts
  export function searchDamageCombinations(
    nightfarer: Nightfarer,
    normalRelics: RelicSlot[],
    deepRelics: RelicSlot[],
    enabledVessels: Vessel[],
    multiplierArray: Float32Array,
    excludedDemeritKeys: number[],
    onProgress?: (p: ComboSearchProgress) => void
  ): Promise<ComboSearchResult>;
  ```

- [ ] **Step 1: Extend worker input type + `buildWasmInput`**

In `comboSearchWorker.ts`, add to `ComboSearchWorkerInput`:

```ts
  damageMultipliers?: number[];
  excludedDemeritKeys?: number[];
```

In `buildWasmInput`, destructure and pass them:

```ts
    damage_multipliers: damageMultipliers ?? undefined,
    excluded_demerit_keys: excludedDemeritKeys ?? undefined,
```

(Damage mode does not need `selectedEffects`/`recommendedEffects`; pass empty arrays for those in the payload built by `searchDamageCombinations`.)

- [ ] **Step 2: Add `searchDamageCombinations` in `ComboSearch.ts`**

It mirrors `searchCombinations` but builds a damage payload directly (no effect filtering by selected effects — instead keep relics that have any damage-relevant effect). Minimal candidate filtering: pass all normal/deep relics of colors used by enabled vessels (reuse the color-filter portion of `filterRelics`, but drop the `effects.some(selected)` requirement). Convert the `Float32Array` to a plain `number[]` for structured-clone to the worker. Reuse the same worker singleton, pending-map, and result-mapping machinery already in the file (factor the result mapping if convenient, or duplicate the small mapping block).

- [ ] **Step 3: Write a smoke test**

Create `src/utils/ComboSearch.damage.test.ts` that builds a tiny fixture (2-3 normal + 2-3 deep relics with known effects/colors, one enabled vessel) and a multiplier array activating one stacks=true effect, then asserts the returned top combination's `points` equals the hand-computed product. Follow the setup pattern in the existing `src/utils/ComboSearch.test.ts` (WASM init, worker). If the worker/WASM cannot run in jsdom for damage mode the same way it does for the existing tests, match whatever the existing ComboSearch tests do.

- [ ] **Step 4: Run tests + type-check** — `npx vitest run src/utils/ComboSearch.damage.test.ts` and `npm run type-check` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/workers/comboSearchWorker.ts src/utils/ComboSearch.ts src/utils/ComboSearch.damage.test.ts
git commit -m "feat: worker/ComboSearch damage-mode search entry point"
```

---

### Task 5: Japanese relic-slot display component

**Files:**
- Create: `src/components/DamageRelicSlot.tsx`

**Interfaces:**
- Produces (for Task 6):
  ```ts
  interface DamageRelicSlotProps {
    relic: RelicSlot | undefined;          // undefined = empty slot
    isDeep: boolean;
    highlightedEffectKeys: ReadonlySet<EffectKey>; // effects that contributed to the multiplier
  }
  export function DamageRelicSlot(props: DamageRelicSlotProps): JSX.Element;
  ```

- [ ] **Step 1: Implement it**

A compact MUI card showing: the relic's item name (via existing `getItemName`), its color chip (reuse `RelicColorChip`), and its effects listed with **Japanese names from `effectNamesJa`** (fall back to `getEffectName` if a key is missing from the map). Effects whose key ∈ `highlightedEffectKeys` are visually emphasized (bold + accent color). Empty slot renders a muted placeholder ("空き"). Keep it presentational (no state). Read `src/components/RelicCard.tsx` for the color-chip and layout idioms to match the app's look.

- [ ] **Step 2: Type-check** — `npm run type-check` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/DamageRelicSlot.tsx
git commit -m "feat: Japanese relic-slot display for damage optimization"
```

---

### Task 6: DamageOptimizer tab component

**Files:**
- Create: `src/components/DamageOptimizer.tsx`

**Interfaces:**
- Consumes: `searchDamageCombinations` (Task 4), `buildDamageMultiplierArray` + `situationalEffectsForNightfarer` (Task 2), `demeritEffects` (Task 1), `effectNamesJa` (Task 1), taxonomy from `damageCategories` (Task 2), `DamageRelicSlot` (Task 5), `nightfarers`/`Nightfarer`, `getContributingEffectKeys`-equivalent (compute locally: an effect contributed if `multiplierArray[key] > 1` and it appears on a slotted relic and passed stacking — for highlight purposes, `multiplierArray[key] > 1` is sufficient).
- Produces (for Task 7): `export function DamageOptimizer(props: { currentSlot: CharacterSlot }): JSX.Element`.

- [ ] **Step 1: Implement it (mirror ComboFinder structure; Japanese literals)**

Left panel (all labels Japanese literals):
- Nightfarer select (`キャラクター`) — iterate `Object.keys(nightfarers).map(Number)` (const-enum safe), show `nightfarers[nf].name`.
- Primary category select (`攻撃カテゴリ`) from `primaryCategories`, Japanese labels (define a local `id → 日本語` label map in this file, or add Japanese labels to `damageCategories`).
- School select (`系統`) shown only when the primary has `hasSchools`.
- Element select (`属性`: 物理/魔力/炎/雷/聖).
- Attack-mode checkboxes (`攻撃手段`: 戦技/通常攻撃1段目/致命の一撃/ガードカウンター) shown only for weapon primaries.
- Situational checkboxes (`状況効果`): from `situationalEffectsForNightfarer(nightfarer)`; label each with `effectNamesJa[key]`; may fold under `groupId` headers but each checkbox is one effect key.
- Demerit-exclusion checkboxes (`除外するデメリット`): from `demeritEffects`, label `jaName`.
- Vessel enable/disable (`聖杯`): reuse Combo Finder's per-Nightfarer `disabledVessels` pattern over `nightfarers[nf].vessels`.

State persisted to `localStorage` per-Nightfarer under `damageOpt:settings:v1` as `Record<Nightfarer, DamageOptSettings>` (mirror ComboFinder's `createInitialSettings`/`loadSettingsFromStorage` with per-field validation). `enabledSituational`/excluded demerits stored as arrays of numbers.

Right panel:
- On any selection change, build the multiplier array with `buildDamageMultiplierArray`, split `currentSlot.relics` into normal/deep by `items.get(r.itemId)?.type === ItemType.DeepRelic`, compute enabled vessels, and call `searchDamageCombinations`. Debounce/guard with a run-id like ComboFinder does.
- Render results as a **virtualized** list (`useVirtualizer`) with **`data-index` + `ref={rowVirtualizer.measureElement}` on the row element** (do not use a fixed estimateSize without measurement). Each row: vessel name; `ダメージ倍率 ×{product.toFixed(2)}（+{((product-1)*100).toFixed(0)}%）`; the 6 slots rendered with `DamageRelicSlot` (slots 0-2 `isDeep={false}`, 3-5 `isDeep={true}`), passing `highlightedEffectKeys` = the set of keys where `multiplierArray[key] > 1`.
- Loading/progress UI as ComboFinder does.

- [ ] **Step 2: Type-check + lint** — `npm run type-check` and `npm run lint` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/DamageOptimizer.tsx
git commit -m "feat: Damage Optimizer tab component"
```

---

### Task 7: Wire the tab into RelicsPage and remove the scrapped flat implementation

**Files:**
- Modify: `src/components/RelicsPage.tsx`
- Delete: `src/components/DamageRanking.tsx`, `src/utils/DamageRanking.ts`, `src/utils/DamageRanking.test.ts`
- Modify/keep: `src/resources/damageCategories.ts` (kept, already corrected in Task 2)

**Interfaces:** final integration; nothing downstream.

- [ ] **Step 1: Remove the scrapped flat files**

```bash
git rm src/components/DamageRanking.tsx src/utils/DamageRanking.ts src/utils/DamageRanking.test.ts
```

(If any other file imports them, update it — only `RelicsPage.tsx` should.)

- [ ] **Step 2: Wire the new tab**

In `src/components/RelicsPage.tsx`: rename/replace the old `DamageRanking` tab entry. `TabIndex` gets `DamageOptimizer` (replacing `DamageRanking`). Import `DamageOptimizer`. The `<Tab>` label is the Japanese literal `"ダメージ最適化"` (not an i18n key). Render `{tab === TabIndex.DamageOptimizer && <DamageOptimizer currentSlot={currentSlot} />}`.

- [ ] **Step 3: Type-check + full test suite**

Run: `npm run type-check && npm run test -- --run`
Expected: PASS — new tests plus the existing suite (baseline was 65 passed / 1 skipped before this feature; the removed flat tests are gone, the new tests are added).

- [ ] **Step 4: Manual smoke test (requires a human with a browser)**

Run `npm run dev` from the worktree. Load demo/save data. Open the 「ダメージ最適化」 tab. Verify: selecting a Nightfarer + 大剣 + 物理 shows a ranked list of vessel combinations with `×N.NN（+NN%）` multipliers; toggling 戦技 or a situational effect changes the ranking; ticking a demerit removes combinations containing it; the 6 slots render Japanese effect names with contributing effects highlighted. Note in the report that interactive verification needs a human.

- [ ] **Step 5: Commit**

```bash
git add src/components/RelicsPage.tsx
git commit -m "feat: wire Damage Optimizer tab and remove scrapped flat ranking"
```

---

## Self-Review

**Spec coverage:** engine damage mode + demerit rejection (Task 3); JS multiplier array + corrected taxonomy (Task 2); Japanese names + demerit list (Task 1); worker/search glue (Task 4); Japanese slot display (Task 5); the tab UI with individual situational toggles, demerit checklist, per-Nightfarer settings, multiplier display (Task 6); wiring + removal of the scrapped flat tab (Task 7). Phase 2 (weighted score, must-haves) is deliberately excluded and the engine's `selected_effect_ranges` is preserved for it.

**Placeholder scan:** Task 4 Step 3 and Task 6 Step 1 describe structure with exact signatures/data sources rather than full line-by-line code, because they are "mirror ComboFinder.tsx" transcriptions whose reference implementation lives in the repo; every non-obvious computation (multiplier-array build, `calc_damage`, demerit rejection, multiplier formatting, virtualizer measurement, per-Nightfarer settings shape) is given as complete code in Tasks 2/3/6. No TBD/TODO remain.

**Type consistency:** `DamageProfileSelection` (Task 2) is consumed unchanged by Tasks 4/6. The multiplier array length `852` is consistent between `EFFECT_KEY_ARRAY_LENGTH` (Task 2) and Rust `EFFECT_KEY_SPACE` (Task 3 Step 1). `searchDamageCombinations`'s signature (Task 4) matches its call in Task 6. `DamageRelicSlotProps` (Task 5) matches its use in Task 6.
