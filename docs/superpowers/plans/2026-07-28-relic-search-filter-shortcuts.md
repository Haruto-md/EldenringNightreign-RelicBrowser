# Relic Search Filter Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add named effect-filter presets, click-to-filter from relic cards, and effect-picker navigation improvements (category chips + correct within-category ordering) to Relic Browser's Advanced Search.

**Architecture:** All new matching/state logic lands as small pure functions in existing or new `src/utils/*.ts` modules (testable with plain vitest, no rendering). React components (`AdvancedSearchPanel`, `RelicCard`, `RelicDisplay`, `SearchInput`, `RelicBrowser`) are thin wiring around those functions. The effect-category generator (`scripts/generate-effect-categories.mjs`) gains a second, position-based export consumed by the picker's sort.

**Tech Stack:** React + TypeScript, MUI components, vitest for unit tests, plain Node scripts (`.mjs`) for codegen.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-28-relic-search-filter-shortcuts-design.md` — every task below implements one section of it.
- This repo has **no React component-rendering test setup** (no `@testing-library/react`, despite `jsdom` being configured for other reasons). Do not add one as a side effect of this work. UI wiring tasks are verified by running `npm run dev` and exercising the feature by hand, not by automated rendering tests. Only pure, non-rendering logic gets vitest unit tests — this matches how every existing `.test.ts`/`.test.tsx` file in this repo already works (there are zero component-render tests today).
- Preset storage key: `"relicBrowser.effectFilterPresets"` in `localStorage`, following the exact try/catch-and-ignore pattern already used by `src/components/DamageOptimizer.tsx`'s `loadSettingsFromStorage`/`saveSettingsToStorage`.
- New i18n strings go in both the `en:` and `ja:` blocks of `src/i18n.ts`, matching the existing flat key style (e.g. `noAdvancedFiltersActive`, `addGroupButton`) — do not run the `generate-i18n-ja.mjs` script for these; that script only handles RelicHub-sourced item/effect names, not hand-written UI copy.
- Run `npx vitest run <path>` (not the interactive watch mode) for every test-verification step in this plan.

---

### Task 1: Effect filter preset storage

**Files:**
- Create: `src/utils/EffectFilterPreset.ts`
- Test: `src/utils/EffectFilterPreset.test.ts`

**Interfaces:**
- Consumes: `Effect` type and `getEffectByKey` from `src/utils/DataUtils.ts` (`getEffectByKey(key: EffectKey): Effect | undefined`); `EffectKey` type from `src/resources/effectKeys.ts`.
- Produces: `EffectFilterPreset` type, `EffectFilterPresetKind` type, `loadEffectFilterPresets(): EffectFilterPreset[]`, `saveEffectFilterPresets(presets: EffectFilterPreset[]): void`, `resolvePresetEffects(preset: EffectFilterPreset): Effect[]` — all consumed by Task 9.

- [ ] **Step 1: Write the failing tests**

```ts
// src/utils/EffectFilterPreset.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { getEffect } from "./DataUtils";
import {
  loadEffectFilterPresets,
  resolvePresetEffects,
  saveEffectFilterPresets,
  type EffectFilterPreset,
} from "./EffectFilterPreset";

const STORAGE_KEY = "relicBrowser.effectFilterPresets";

afterEach(() => {
  localStorage.clear();
});

describe("loadEffectFilterPresets", () => {
  it("returns an empty array when nothing is stored", () => {
    expect(loadEffectFilterPresets()).toEqual([]);
  });

  it("returns [] for corrupted JSON instead of throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadEffectFilterPresets()).toEqual([]);
  });

  it("returns [] when the stored value isn't an array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(loadEffectFilterPresets()).toEqual([]);
  });

  it("filters out malformed entries but keeps valid ones", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: "1", name: "Good", kind: "required", effectKeys: [7000200] },
        { id: "2", name: "Bad, missing kind", effectKeys: [7000200] },
        "not even an object",
      ])
    );
    const loaded = loadEffectFilterPresets();
    expect(loaded).toEqual([
      { id: "1", name: "Good", kind: "required", effectKeys: [7000200] },
    ]);
  });
});

describe("saveEffectFilterPresets / loadEffectFilterPresets round-trip", () => {
  it("persists and reloads presets", () => {
    const presets: EffectFilterPreset[] = [
      { id: "1", name: "Junk stats", kind: "required", effectKeys: [7000200, 7000700] },
      { id: "2", name: "Keep these", kind: "excluded", effectKeys: [7000700] },
    ];
    saveEffectFilterPresets(presets);
    expect(loadEffectFilterPresets()).toEqual(presets);
  });
});

describe("resolvePresetEffects", () => {
  it("resolves effectKeys to Effect objects, dropping any that no longer exist", () => {
    const endurancePlus1 = getEffect(7000200);
    const preset: EffectFilterPreset = {
      id: "1",
      name: "Test",
      kind: "required",
      effectKeys: [7000200, 999999999],
    };
    expect(resolvePresetEffects(preset)).toEqual([endurancePlus1]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/EffectFilterPreset.test.ts`
Expected: FAIL — `EffectFilterPreset` module does not exist.

- [ ] **Step 3: Implement the storage module**

```ts
// src/utils/EffectFilterPreset.ts
import type { Effect } from "../resources/effects";
import type { EffectKey } from "../resources/effectKeys";
import { getEffectByKey } from "./DataUtils";

export type EffectFilterPresetKind = "required" | "excluded";

export interface EffectFilterPreset {
  id: string;
  name: string;
  kind: EffectFilterPresetKind;
  effectKeys: EffectKey[];
}

const STORAGE_KEY = "relicBrowser.effectFilterPresets";

function isValidPreset(value: unknown): value is EffectFilterPreset {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    (candidate.kind === "required" || candidate.kind === "excluded") &&
    Array.isArray(candidate.effectKeys) &&
    candidate.effectKeys.every((key) => typeof key === "number")
  );
}

export function loadEffectFilterPresets(): EffectFilterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidPreset);
  } catch {
    return [];
  }
}

export function saveEffectFilterPresets(presets: EffectFilterPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore persistence errors (e.g. storage disabled/full)
  }
}

export function resolvePresetEffects(preset: EffectFilterPreset): Effect[] {
  return preset.effectKeys
    .map((key) => getEffectByKey(key))
    .filter((effect): effect is Effect => effect !== undefined);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/EffectFilterPreset.test.ts`
Expected: PASS (all cases from Step 1).

- [ ] **Step 5: Commit**

```bash
git add src/utils/EffectFilterPreset.ts src/utils/EffectFilterPreset.test.ts
git commit -m "feat: add localStorage-backed effect filter preset storage"
```

---

### Task 2: Pure filter-state helpers (click-to-filter and preset application)

**Files:**
- Modify: `src/utils/EffectFilter.ts`
- Modify: `src/utils/EffectFilter.test.ts`

**Interfaces:**
- Consumes: existing `EffectFilterState`, `EffectFilterGroup`, `Effect` types already in `EffectFilter.ts`.
- Produces: `addRequiredEffectAsNewGroup(state: EffectFilterState, effect: Effect): EffectFilterState` (Task 8), `flattenFilterEffects(groups: EffectFilterGroup[]): Effect[]` (Task 9), `applyRequiredPreset(state: EffectFilterState, effects: Effect[]): EffectFilterState` (Task 9), `applyExcludedPreset(state: EffectFilterState, effects: Effect[]): EffectFilterState` (Task 9).

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/EffectFilter.test.ts` (new `describe` blocks after the existing ones, before the final closing of the file):

```ts
import {
  addRequiredEffectAsNewGroup,
  applyExcludedPreset,
  applyRequiredPreset,
  flattenFilterEffects,
} from "./EffectFilter";
// (merge into the existing top-of-file import from "./EffectFilter" instead of a second import statement)

describe("addRequiredEffectAsNewGroup", () => {
  it("adds a new single-entry group for an effect not yet required", () => {
    const state = createEmptyEffectFilterState();
    const next = addRequiredEffectAsNewGroup(state, endurancePlus1);
    expect(next.groups).toHaveLength(1);
    expect(next.groups[0].entries).toEqual([
      { effect: endurancePlus1, comparison: "atLeast" },
    ]);
  });

  it("adds a second AND'd group when a different effect is added", () => {
    const state = addRequiredEffectAsNewGroup(createEmptyEffectFilterState(), endurancePlus1);
    const next = addRequiredEffectAsNewGroup(state, arcanePlus1);
    expect(next.groups).toHaveLength(2);
    expect(doesRelicMatchEffectFilter(makeRelic([7000200]), next)).toBe(false); // endurance only, missing arcane
    expect(doesRelicMatchEffectFilter(makeRelic([7000200, 7000700]), next)).toBe(true);
  });

  it("is a no-op if the effect is already present in some required group", () => {
    const state = addRequiredEffectAsNewGroup(createEmptyEffectFilterState(), endurancePlus1);
    const next = addRequiredEffectAsNewGroup(state, endurancePlus1);
    expect(next.groups).toHaveLength(1);
    expect(next).toBe(state); // same reference: genuinely unchanged
  });

  it("leaves excludedGroups untouched", () => {
    const state: EffectFilterState = {
      groups: [],
      excludedGroups: [{ id: "e1", entries: [{ effect: arcanePlus1, comparison: "atLeast" }] }],
    };
    const next = addRequiredEffectAsNewGroup(state, endurancePlus1);
    expect(next.excludedGroups).toBe(state.excludedGroups);
  });
});

describe("flattenFilterEffects", () => {
  it("collects every effect across multiple groups, deduplicated", () => {
    const groups = [
      { id: "g1", entries: [{ effect: endurancePlus1, comparison: "atLeast" as const }] },
      {
        id: "g2",
        entries: [
          { effect: arcanePlus1, comparison: "atLeast" as const },
          { effect: endurancePlus1, comparison: "atLeast" as const }, // duplicate
        ],
      },
    ];
    expect(flattenFilterEffects(groups)).toEqual([endurancePlus1, arcanePlus1]);
  });

  it("returns [] for no groups", () => {
    expect(flattenFilterEffects([])).toEqual([]);
  });
});

describe("applyRequiredPreset", () => {
  it("replaces groups with a single OR group of the preset's effects", () => {
    const state: EffectFilterState = {
      groups: [{ id: "old", entries: [{ effect: endurancePlus1, comparison: "atLeast" }] }],
      excludedGroups: [],
    };
    const next = applyRequiredPreset(state, [endurancePlus2, arcanePlus1]);
    expect(next.groups).toHaveLength(1);
    expect(next.groups[0].entries).toEqual([
      { effect: endurancePlus2, comparison: "atLeast" },
      { effect: arcanePlus1, comparison: "atLeast" },
    ]);
    expect(doesRelicMatchEffectFilter(makeRelic([7000202]), next)).toBe(true); // endurance +3 satisfies "+2 or better"
  });

  it("leaves excludedGroups untouched", () => {
    const state: EffectFilterState = {
      groups: [],
      excludedGroups: [{ id: "e1", entries: [{ effect: arcanePlus1, comparison: "atLeast" }] }],
    };
    const next = applyRequiredPreset(state, [endurancePlus1]);
    expect(next.excludedGroups).toBe(state.excludedGroups);
  });
});

describe("applyExcludedPreset", () => {
  it("appends a new OR-group to excludedGroups", () => {
    const state: EffectFilterState = {
      groups: [],
      excludedGroups: [{ id: "e1", entries: [{ effect: arcanePlus1, comparison: "atLeast" }] }],
    };
    const next = applyExcludedPreset(state, [endurancePlus1]);
    expect(next.excludedGroups).toHaveLength(2);
    // ORs with the pre-existing excluded group: a relic matching either is dropped
    expect(doesRelicMatchEffectFilter(makeRelic([7000700]), next)).toBe(false);
    expect(doesRelicMatchEffectFilter(makeRelic([7000200]), next)).toBe(false);
    expect(doesRelicMatchEffectFilter(makeRelic([7000202]), next)).toBe(false); // endurance +3, atLeast +1
  });

  it("leaves groups untouched", () => {
    const state: EffectFilterState = {
      groups: [{ id: "g1", entries: [{ effect: endurancePlus1, comparison: "atLeast" }] }],
      excludedGroups: [],
    };
    const next = applyExcludedPreset(state, [arcanePlus1]);
    expect(next.groups).toBe(state.groups);
  });
});
```

Also add `arcanePlus1`/`endurancePlus2` to the file's top-level fixtures if not already present (`endurancePlus2` already exists at the top of the file from the original spec's tests; `arcanePlus1` already exists too — reuse them, don't redeclare).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/EffectFilter.test.ts`
Expected: FAIL — the four new functions don't exist yet.

- [ ] **Step 3: Implement the four functions**

Append to `src/utils/EffectFilter.ts` (after `doesRelicMatchEffectFilter`):

```ts
export function addRequiredEffectAsNewGroup(
  state: EffectFilterState,
  effect: Effect
): EffectFilterState {
  const alreadyRequired = state.groups.some((group) =>
    group.entries.some((entry) => entry.effect === effect)
  );
  if (alreadyRequired) {
    return state;
  }
  return {
    ...state,
    groups: [
      ...state.groups,
      { id: crypto.randomUUID(), entries: [{ effect, comparison: "atLeast" }] },
    ],
  };
}

export function flattenFilterEffects(groups: EffectFilterGroup[]): Effect[] {
  const seen = new Set<Effect>();
  const result: Effect[] = [];
  for (const group of groups) {
    for (const entry of group.entries) {
      if (!seen.has(entry.effect)) {
        seen.add(entry.effect);
        result.push(entry.effect);
      }
    }
  }
  return result;
}

export function applyRequiredPreset(
  state: EffectFilterState,
  effects: Effect[]
): EffectFilterState {
  return {
    ...state,
    groups:
      effects.length === 0
        ? []
        : [
            {
              id: crypto.randomUUID(),
              entries: effects.map((effect) => ({ effect, comparison: "atLeast" as const })),
            },
          ],
  };
}

export function applyExcludedPreset(
  state: EffectFilterState,
  effects: Effect[]
): EffectFilterState {
  if (effects.length === 0) {
    return state;
  }
  return {
    ...state,
    excludedGroups: [
      ...state.excludedGroups,
      {
        id: crypto.randomUUID(),
        entries: effects.map((effect) => ({ effect, comparison: "atLeast" as const })),
      },
    ],
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/EffectFilter.test.ts`
Expected: PASS (all existing tests plus the new ones).

- [ ] **Step 5: Commit**

```bash
git add src/utils/EffectFilter.ts src/utils/EffectFilter.test.ts
git commit -m "feat: add pure helpers for click-to-filter and preset application"
```

---

### Task 3: Generator — per-genre rank export

**Files:**
- Modify: `scripts/generate-effect-categories.mjs`
- Modify: `scripts/generate-effect-categories.test.mjs`
- Regenerate: `src/resources/effectCategories.ts` (via the script — do not hand-edit)

**Interfaces:**
- Consumes: nothing new — same `skills.json` shape already read by this script.
- Produces: exported `assignCategoriesAndRanks(genreOrder, skillsByGenre, jpnToEng, englishToEffectKeyName, overrides)` (used only inside this script/its test); generated `effectCategoryRank: Record<EffectKey, number>` in `src/resources/effectCategories.ts` (consumed by Task 4).

- [ ] **Step 1: Write the failing test**

Append to `scripts/generate-effect-categories.test.mjs`:

```js
import { assignCategoriesAndRanks } from "./generate-effect-categories.mjs";

describe("assignCategoriesAndRanks", () => {
  const jpnToEng = new Map([
    ["生命力+1", "Vigor +1"],
    ["生命力+2", "Vigor +2"],
    ["精神力+1", "Mind +1"],
  ]);
  const englishToEffectKeyName = new Map([
    ["Vigor +1", "vigorPlus1"],
    ["Vigor +2", "vigorPlus2"],
    ["Mind +1", "mindPlus1"],
  ]);
  const skillsByGenre = {
    能力値: [
      { jpn: "生命力+1", eng: "Vigor +1" },
      { jpn: "生命力+2", eng: "Vigor +2" },
      { jpn: "精神力+1", eng: "Mind +1" },
      { jpn: "未知の効果", eng: "Unknown effect" },
    ],
  };

  it("assigns each matched entry its genre and its index within that genre's array", () => {
    const { categoryOfKeyName, rankOfKeyName, unmatched } = assignCategoriesAndRanks(
      ["能力値"],
      skillsByGenre,
      jpnToEng,
      englishToEffectKeyName,
      {}
    );
    expect(categoryOfKeyName.get("vigorPlus1")).toBe("能力値");
    expect(rankOfKeyName.get("vigorPlus1")).toBe(0);
    expect(rankOfKeyName.get("vigorPlus2")).toBe(1);
    expect(rankOfKeyName.get("mindPlus1")).toBe(2);
    expect(unmatched).toEqual(["能力値: 未知の効果 (Unknown effect)"]);
  });

  it("first genre entry wins when the same EffectKey appears twice", () => {
    const { rankOfKeyName } = assignCategoriesAndRanks(
      ["能力値"],
      {
        能力値: [
          { jpn: "精神力+1", eng: "Mind +1" },
          { jpn: "生命力+1", eng: "Vigor +1" },
          { jpn: "生命力+1", eng: "Vigor +1" }, // duplicate, should not overwrite rank 0's claim
        ],
      },
      jpnToEng,
      englishToEffectKeyName,
      {}
    );
    expect(rankOfKeyName.get("vigorPlus1")).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/generate-effect-categories.test.mjs`
Expected: FAIL — `assignCategoriesAndRanks` is not exported yet.

- [ ] **Step 3: Extract the function and use it from `main()`, add the rank export**

In `scripts/generate-effect-categories.mjs`, replace the inline loop (current lines ~213-232, the `categoryOfKeyName`/`unmatched` construction) and the output-writing section with:

```js
export function assignCategoriesAndRanks(
  genreOrder,
  skillsByGenre,
  jpnToEng,
  englishToEffectKeyName,
  overrides
) {
  const categoryOfKeyName = new Map();
  const rankOfKeyName = new Map();
  const unmatched = [];

  for (const genre of genreOrder) {
    skillsByGenre[genre].forEach((entry, index) => {
      const effectKeyName = matchEffectKeyName(
        entry.jpn,
        jpnToEng,
        englishToEffectKeyName,
        overrides
      );
      if (!effectKeyName) {
        unmatched.push(`${genre}: ${entry.jpn} (${entry.eng})`);
        return;
      }
      if (!categoryOfKeyName.has(effectKeyName)) {
        categoryOfKeyName.set(effectKeyName, genre);
        rankOfKeyName.set(effectKeyName, index);
      }
    });
  }

  return { categoryOfKeyName, rankOfKeyName, unmatched };
}
```

Then in `main()`, replace the old inline loop with a call to this function:

```js
  const { categoryOfKeyName, rankOfKeyName, unmatched } = assignCategoriesAndRanks(
    skills.genre_order,
    skills.skills,
    jpnToEng,
    englishToEffectKeyName,
    MANUAL_EFFECT_KEY_OVERRIDES
  );
```

(delete the old `const categoryOfKeyName = new Map(); const unmatched = []; for (const genre of skills.genre_order) { ... }` block it replaces).

The existing "any EffectKey not covered by a genre falls into その他" loop stays, but also sets a rank:

```js
  let otherCount = 0;
  for (const keyName of allEffectKeyNames) {
    if (!categoryOfKeyName.has(keyName)) {
      categoryOfKeyName.set(keyName, OTHER_CATEGORY);
      rankOfKeyName.set(keyName, Number.MAX_SAFE_INTEGER);
      otherCount++;
    }
  }
```

Finally, extend the generated output to also emit `effectCategoryRank`:

```js
  const rankLines = allEffectKeyNames.map(
    (keyName) => `  [EffectKey.${keyName}]: ${rankOfKeyName.get(keyName) ?? Number.MAX_SAFE_INTEGER},`
  );
  rankLines.push(`  [EffectKey.LENGTH]: ${Number.MAX_SAFE_INTEGER},`);

  const output = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-effect-categories.mjs
import { EffectKey } from "./effectKeys";

export const effectCategoryOrder: string[] = ${JSON.stringify(genreOrder, null, 2)};

export const effectCategories: Record<EffectKey, string> = {
${lines.join("\n")}
};

export const effectCategoryRank: Record<EffectKey, number> = {
${rankLines.join("\n")}
};
`;
```

(This replaces the existing `const output = ...` template literal; keep the rest of `main()` — the `writeFileSync` call and the `console.log` — unchanged.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/generate-effect-categories.test.mjs`
Expected: PASS.

- [ ] **Step 5: Regenerate `effectCategories.ts` and spot-check it**

Run: `node scripts/generate-effect-categories.mjs`

Confirm the console output still reports the same "N categorized, M in その他" counts as before this change (the matching logic itself didn't change, only what's recorded), and open `src/resources/effectCategories.ts` to confirm it now has a third exported const, `effectCategoryRank`, with `EffectKey.vigorPlus1` through `EffectKey.vigorPlus3` (or whatever the real generated key names are for 生命力+1/+2/+3) getting consecutive rank numbers.

- [ ] **Step 6: Run the full test suite once to make sure nothing else broke**

Run: `npx vitest run`
Expected: PASS (the regenerated `effectCategories.ts` is a strict superset of the old one — every previously-checked-in key/value pair for `effectCategoryOrder` and `effectCategories` is untouched).

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-effect-categories.mjs scripts/generate-effect-categories.test.mjs src/resources/effectCategories.ts
git commit -m "feat: record each effect's position within its skills.json genre"
```

---

### Task 4: Effect picker — sort by category rank

**Files:**
- Modify: `src/components/EffectsAutocomplete.tsx`

**Interfaces:**
- Consumes: `effectCategoryRank` from `src/resources/effectCategories.ts` (Task 3).
- Produces: nothing new for later tasks — this is a leaf UI change.

- [ ] **Step 1: Update the `options` memo's sort**

In `src/components/EffectsAutocomplete.tsx`, add the import:

```ts
import { effectCategories, effectCategoryOrder, effectCategoryRank } from "../resources/effectCategories";
```

Replace the `options` memo:

```ts
const options = useMemo(() => {
    const keys = availableEffects.map((effect) => String(effect.key));
    if (!groupByCategory) {
      return keys;
    }
    const orderIndex = new Map(effectCategoryOrder.map((category, index) => [category, index]));
    const rankOf = (option: string) => {
      const effectKey = parseInt(option) as EffectKey;
      return effectCategoryRank[effectKey] ?? Number.MAX_SAFE_INTEGER;
    };
    return [...keys].sort((a, b) => {
      const categoryDiff =
        (orderIndex.get(categoryOf(a)) ?? 0) - (orderIndex.get(categoryOf(b)) ?? 0);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }
      return rankOf(a) - rankOf(b);
    });
  }, [availableEffects, groupByCategory, categoryOf]);
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`

Open the Advanced Search panel, open the effect picker with `groupByCategory` (any of its instances), scroll to the 能力値/stats category, and confirm 生命力(Vigor)'s three levels are listed together, then 精神力(Mind)'s three levels, etc. — not interleaved.

- [ ] **Step 3: Commit**

```bash
git add src/components/EffectsAutocomplete.tsx
git commit -m "fix: sort effect picker options by their skills.json genre position"
```

---

### Task 5: Effect picker — category quick-filter chips

**Files:**
- Modify: `src/components/EffectsAutocomplete.tsx`
- Modify: `src/i18n.ts`

**Interfaces:**
- Consumes: `effectCategoryOrder` (already imported from Task 4).
- Produces: nothing new for later tasks — leaf UI change.

- [ ] **Step 1: Add the "All categories" i18n string**

In `src/i18n.ts`, add to the `en.translation` block (near the other Advanced Search strings, e.g. right after `addExcludedEffectPlaceholder`):

```ts
      allCategoriesChipLabel: "All",
```

And the matching `ja.translation` entry (near the other Advanced Search ja strings):

```ts
      allCategoriesChipLabel: "すべて",
```

- [ ] **Step 2: Add chip row and filtering state**

In `src/components/EffectsAutocomplete.tsx`, add local state and a chip row, rendered only when `groupByCategory` is true:

```tsx
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
```

Update the `options` memo (from Task 4) to also filter by `selectedCategory` before sorting:

```ts
const options = useMemo(() => {
    const keys = availableEffects.map((effect) => String(effect.key));
    if (!groupByCategory) {
      return keys;
    }
    const scoped =
      selectedCategory === null ? keys : keys.filter((key) => categoryOf(key) === selectedCategory);
    const orderIndex = new Map(effectCategoryOrder.map((category, index) => [category, index]));
    const rankOf = (option: string) => {
      const effectKey = parseInt(option) as EffectKey;
      return effectCategoryRank[effectKey] ?? Number.MAX_SAFE_INTEGER;
    };
    return [...scoped].sort((a, b) => {
      const categoryDiff =
        (orderIndex.get(categoryOf(a)) ?? 0) - (orderIndex.get(categoryOf(b)) ?? 0);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }
      return rankOf(a) - rankOf(b);
    });
  }, [availableEffects, groupByCategory, categoryOf, selectedCategory]);
```

Render the chip row above the `Autocomplete` in the returned JSX (wrap the existing `return (<Autocomplete .../>)` in a fragment):

```tsx
return (
  <Box sx={{ width: 350 }}>
    {groupByCategory && (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 0.5 }}>
        <Chip
          label={t("allCategoriesChipLabel")}
          size="small"
          color={selectedCategory === null ? "primary" : "default"}
          onClick={() => setSelectedCategory(null)}
        />
        {effectCategoryOrder.map((category) => (
          <Chip
            key={category}
            label={category}
            size="small"
            color={selectedCategory === category ? "primary" : "default"}
            onClick={() =>
              setSelectedCategory((prev) => (prev === category ? null : category))
            }
          />
        ))}
      </Box>
    )}
    <Autocomplete
      /* ...all existing Autocomplete props unchanged, but drop its own sx={{ width: 350 }} since the wrapping Box now owns the width... */
    />
  </Box>
);
```

Add `Box` and `Chip` to the existing `@mui/material` import at the top of the file.

- [ ] **Step 3: Verify manually**

Run: `npm run dev`

Open an `EffectsAutocomplete` with `groupByCategory` set (Advanced Search's required/excluded pickers), click a category chip, confirm the dropdown only shows that category's effects, click it again (or click "All") and confirm the full list returns, and confirm typing a search term still narrows further within the active chip's scope.

- [ ] **Step 4: Commit**

```bash
git add src/components/EffectsAutocomplete.tsx src/i18n.ts
git commit -m "feat: add category quick-filter chips to the effect picker"
```

---

### Task 6: Clickable effects on relic cards

**Files:**
- Modify: `src/components/RelicCard.tsx`

**Interfaces:**
- Consumes: `Effect` type (already imported).
- Produces: new `onFilterByEffect?: (effect: Effect) => void` prop on `RelicCardProps`, consumed by Task 7 (`RelicDisplay`).

- [ ] **Step 1: Add the prop and click handler**

In `src/components/RelicCard.tsx`, add to `RelicCardProps` (after `onToggleSelect`):

```ts
  /**
   * Called when the user clicks an effect (or debuff) line on the card,
   * to quickly add that effect as a new required filter condition.
   */
  onFilterByEffect?: (effect: Effect) => void;
```

Add to the destructured props in `RelicCardComponent` (after `onToggleSelect`):

```ts
  onFilterByEffect,
```

- [ ] **Step 2: Wire the click handler onto each effect/debuff line**

Replace the two `Typography` elements inside the `effects.map` callback (around lines 254-281) with clickable versions. The primary effect:

```tsx
<Typography
  variant="body2"
  onClick={(event) => {
    event.stopPropagation();
    onFilterByEffect?.(effect);
  }}
  sx={{
    cursor: onFilterByEffect ? "pointer" : undefined,
    "&:hover": onFilterByEffect ? { textDecoration: "underline" } : undefined,
    color:
      highlightedEffects.length === 0
        ? "text.primary"
        : highlightEffect
          ? "success.main"
          : "text.secondary",
  }}
>
  {effectHighlight.highlightedText}
</Typography>
```

And the debuff line (only rendered when `debuffHighlight` is truthy):

```tsx
{debuffHighlight && (
  <Typography
    variant="body2"
    onClick={(event) => {
      event.stopPropagation();
      if (debuff !== undefined) {
        onFilterByEffect?.(debuff);
      }
    }}
    sx={{
      cursor: onFilterByEffect ? "pointer" : undefined,
      "&:hover": onFilterByEffect ? { textDecoration: "underline" } : undefined,
      color:
        highlightedEffects.length === 0
          ? "#76adde"
          : highlightDebuff
            ? "success.main"
            : "#76adde",
    }}
  >
    {debuffHighlight.highlightedText}
  </Typography>
)}
```

- [ ] **Step 3: Include the new prop in the memo comparator**

In the `React.memo` comparator at the bottom of the file, add `onFilterByEffect` to the reference-equality check alongside the existing `onToggleSelect` check:

```ts
    if (
      prevProps.relic !== nextProps.relic ||
      prevProps.selectedColor !== nextProps.selectedColor ||
      prevProps.coordinatesByColor !== nextProps.coordinatesByColor ||
      prevProps.highlightedEffects !== nextProps.highlightedEffects ||
      prevProps.selectable !== nextProps.selectable ||
      prevProps.selected !== nextProps.selected ||
      prevProps.onToggleSelect !== nextProps.onToggleSelect ||
      prevProps.onFilterByEffect !== nextProps.onFilterByEffect
    ) {
      return false;
    }
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`

Confirm relic cards still render and are still clickable for selection when in selection mode (clicking an effect line should not also toggle the card's selection — check `event.stopPropagation()` is doing its job). Full end-to-end click-to-filter behavior is verified in Task 8 once `RelicBrowser` wires a real handler; for this task, passing no `onFilterByEffect` prop anywhere yet is fine — the cursor/hover styling will simply not activate.

- [ ] **Step 5: Commit**

```bash
git add src/components/RelicCard.tsx
git commit -m "feat: make relic card effect lines clickable for filtering"
```

---

### Task 7: Thread click-to-filter through RelicDisplay; lift Advanced Search's open state

**Files:**
- Modify: `src/components/RelicDisplay.tsx`
- Modify: `src/components/SearchInput.tsx`

**Interfaces:**
- Consumes: `onFilterByEffect` prop shape from Task 6.
- Produces: `RelicDisplayProps.onFilterByEffect?: (effect: Effect) => void` (consumed by Task 8's `RelicBrowser`); `SearchInputProps.advancedSearchOpen: boolean` and `onAdvancedSearchOpenChange: (open: boolean) => void` replacing the old internal `useState` (consumed by Task 8).

- [ ] **Step 1: Thread `onFilterByEffect` through `RelicDisplay`**

In `src/components/RelicDisplay.tsx`, add to `RelicDisplayProps` (after `onToggleSelect`):

```ts
  onFilterByEffect?: (effect: Effect) => void;
```

Add the import: `import type { Effect } from "../resources/effects";`

Destructure it in the component signature (after `onToggleSelect`), and pass it to `<RelicCard>` (after `onToggleSelect={onToggleSelect}`):

```tsx
onFilterByEffect={onFilterByEffect}
```

- [ ] **Step 2: Lift `advancedOpen` state out of `SearchInput`**

In `src/components/SearchInput.tsx`, replace:

```ts
  const [advancedOpen, setAdvancedOpen] = useState(false);
```

with two new required props on `SearchInputProps` (remove the `useState` import if nothing else in the file uses it):

```ts
  advancedSearchOpen: boolean;
  onAdvancedSearchOpenChange: (open: boolean) => void;
```

and destructure `advancedSearchOpen, onAdvancedSearchOpenChange` in place of the old local state, replacing every remaining use of `advancedOpen`/`setAdvancedOpen` in the JSX:

```tsx
<ToggleButton
  value="advanced"
  selected={advancedSearchOpen}
  onChange={() => onAdvancedSearchOpenChange(!advancedSearchOpen)}
  aria-label="Toggle advanced search"
>
  <TuneIcon fontSize="small" />
</ToggleButton>

/* ... */

<Collapse in={advancedSearchOpen}>
```

- [ ] **Step 3: Verify the app still compiles**

Run: `npx tsc --noEmit`
Expected: errors only in `RelicBrowser.tsx` (which hasn't been updated to pass the now-required `SearchInput` props yet — that's Task 8). No errors in `RelicDisplay.tsx` or `SearchInput.tsx` themselves.

- [ ] **Step 4: Commit**

```bash
git add src/components/RelicDisplay.tsx src/components/SearchInput.tsx
git commit -m "refactor: lift Advanced Search panel's open state, thread click-to-filter prop"
```

(This intentionally leaves the build broken at `RelicBrowser.tsx` until Task 8 — the two changes are tightly coupled and splitting the commit further would leave an equally-broken intermediate state either way. Task 8 fixes it immediately next.)

---

### Task 8: Wire click-to-filter and the lifted panel-open state into RelicBrowser

**Files:**
- Modify: `src/components/RelicBrowser.tsx`

**Interfaces:**
- Consumes: `addRequiredEffectAsNewGroup` (Task 2), `SearchInputProps.advancedSearchOpen`/`onAdvancedSearchOpenChange` (Task 7), `RelicDisplayProps.onFilterByEffect` (Task 7).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Add `advancedSearchOpen` state and the click-to-filter handler**

In `src/components/RelicBrowser.tsx`, add the import:

```ts
import { addRequiredEffectAsNewGroup } from "../utils/EffectFilter";
```

(merge into the existing `import { createEmptyEffectFilterState, doesRelicMatchEffectFilter, type EffectFilterState } from "../utils/EffectFilter";` line)

Add new state near the existing `effectFilter` state:

```ts
const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
```

Add the handler near `handleToggleSelect`:

```ts
const handleFilterByEffect = useCallback((effect: Effect) => {
  setEffectFilter((prev) => addRequiredEffectAsNewGroup(prev, effect));
  setAdvancedSearchOpen(true);
}, []);
```

- [ ] **Step 2: Pass the new props down**

Update the `<SearchInput>` element to add:

```tsx
advancedSearchOpen={advancedSearchOpen}
onAdvancedSearchOpenChange={setAdvancedSearchOpen}
```

Update the `<RelicDisplay>` element to add:

```tsx
onFilterByEffect={handleFilterByEffect}
```

- [ ] **Step 3: Verify the build is clean**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`

With the Advanced Search panel collapsed, click an effect on any relic card. Confirm: the panel expands, the clicked effect appears as a new required-group chip, and the relic grid narrows to relics carrying that effect. Click a second, different effect on another card and confirm the grid narrows further (AND). Click the same effect again (on any card showing it) and confirm nothing changes (no duplicate group).

- [ ] **Step 5: Commit**

```bash
git add src/components/RelicBrowser.tsx
git commit -m "feat: wire relic-card effect clicks into the required filter"
```

---

### Task 9: Named effect-filter presets in Advanced Search

**Files:**
- Modify: `src/components/AdvancedSearchPanel.tsx`
- Modify: `src/i18n.ts`

**Interfaces:**
- Consumes: `EffectFilterPreset`, `loadEffectFilterPresets`, `saveEffectFilterPresets`, `resolvePresetEffects` (Task 1); `flattenFilterEffects`, `applyRequiredPreset`, `applyExcludedPreset` (Task 2).
- Produces: nothing new for later tasks — this is the last task in the plan.

- [ ] **Step 1: Add the new i18n strings**

In `src/i18n.ts`'s `en.translation` block, add (near the other Advanced Search strings):

```ts
      savePresetButton: "Save as preset",
      savePresetDialogTitle: "Save filter as preset",
      savePresetNameLabel: "Name",
      savePresetKindRequired: "Required (show relics matching any of these)",
      savePresetKindExcluded: "Excluded (hide relics matching any of these)",
      savePresetCancelButton: "Cancel",
      savePresetSaveButton: "Save",
      presetsButton: "Presets",
      presetsMenuEmpty: "No presets saved yet",
      presetsMenuRequiredGroupLabel: "Required presets",
      presetsMenuExcludedGroupLabel: "Excluded presets",
      presetApplyLabel: "Apply",
      presetDeleteLabel: "Delete",
```

And the matching `ja.translation` entries:

```ts
      savePresetButton: "プリセットとして保存",
      savePresetDialogTitle: "フィルターをプリセットとして保存",
      savePresetNameLabel: "名前",
      savePresetKindRequired: "必須(いずれかを持つ遺物を表示)",
      savePresetKindExcluded: "除外(いずれかを持つ遺物を非表示)",
      savePresetCancelButton: "キャンセル",
      savePresetSaveButton: "保存",
      presetsButton: "プリセット",
      presetsMenuEmpty: "保存済みのプリセットはありません",
      presetsMenuRequiredGroupLabel: "必須プリセット",
      presetsMenuExcludedGroupLabel: "除外プリセット",
      presetApplyLabel: "適用",
      presetDeleteLabel: "削除",
```

- [ ] **Step 2: Add preset state, load-on-mount, and save/apply/delete handlers**

In `src/components/AdvancedSearchPanel.tsx`, add imports:

```ts
import { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import {
  applyExcludedPreset,
  applyRequiredPreset,
  flattenFilterEffects,
  type EffectFilterGroup,
  type EffectFilterState,
} from "../utils/EffectFilter";
import {
  loadEffectFilterPresets,
  resolvePresetEffects,
  saveEffectFilterPresets,
  type EffectFilterPreset,
  type EffectFilterPresetKind,
} from "../utils/EffectFilterPreset";
```

(`useState`/`useEffect` and the `EffectFilterGroup`/`EffectFilterState` type import already exist in the file in some form — merge rather than duplicate; only `useEffect`, the MUI dialog/menu components, and the two new util imports are actually new.)

Inside the `AdvancedSearchPanel` component function, add state and the load-on-mount effect (near the top, after the `t` destructure):

```ts
  const [presets, setPresets] = useState<EffectFilterPreset[]>([]);
  useEffect(() => {
    setPresets(loadEffectFilterPresets());
  }, []);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState("");
  const [saveDialogKind, setSaveDialogKind] = useState<EffectFilterPresetKind>("required");

  const [presetsMenuAnchor, setPresetsMenuAnchor] = useState<HTMLElement | null>(null);
```

Add the save handler:

```ts
  const currentSideGroups: Record<EffectFilterPresetKind, EffectFilterGroup[]> = {
    required: effectFilter.groups,
    excluded: effectFilter.excludedGroups,
  };

  const handleOpenSaveDialog = () => {
    setSaveDialogName("");
    setSaveDialogKind("required");
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = () => {
    const effects = flattenFilterEffects(currentSideGroups[saveDialogKind]);
    if (saveDialogName.trim() === "" || effects.length === 0) {
      return;
    }
    const newPreset: EffectFilterPreset = {
      id: crypto.randomUUID(),
      name: saveDialogName.trim(),
      kind: saveDialogKind,
      effectKeys: effects.map((effect) => effect.key),
    };
    const next = [...presets, newPreset];
    setPresets(next);
    saveEffectFilterPresets(next);
    setSaveDialogOpen(false);
  };

  const handleApplyPreset = (preset: EffectFilterPreset) => {
    const effects = resolvePresetEffects(preset);
    onEffectFilterChange(
      preset.kind === "required"
        ? applyRequiredPreset(effectFilter, effects)
        : applyExcludedPreset(effectFilter, effects)
    );
    setPresetsMenuAnchor(null);
  };

  const handleDeletePreset = (presetId: string) => {
    const next = presets.filter((preset) => preset.id !== presetId);
    setPresets(next);
    saveEffectFilterPresets(next);
  };

  const canSaveCurrentDialogSelection =
    saveDialogName.trim() !== "" && flattenFilterEffects(currentSideGroups[saveDialogKind]).length > 0;

  const requiredPresets = presets.filter((preset) => preset.kind === "required");
  const excludedPresets = presets.filter((preset) => preset.kind === "excluded");
```

- [ ] **Step 3: Add the buttons, dialog, and menu to the rendered JSX**

In the header `Stack` that currently holds the filter count and "Clear all" button, add two buttons before the closing of that `Stack`:

```tsx
<Button size="small" onClick={handleOpenSaveDialog}>
  {t("savePresetButton")}
</Button>
<Button size="small" onClick={(event) => setPresetsMenuAnchor(event.currentTarget)}>
  {t("presetsButton")}
</Button>
```

After the panel's closing `Box` content (still inside the outer `Box`, as siblings to the existing content, right before the final `</Box>`), add the dialog and menu:

```tsx
<Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
  <DialogTitle>{t("savePresetDialogTitle")}</DialogTitle>
  <DialogContent>
    <TextField
      autoFocus
      fullWidth
      label={t("savePresetNameLabel")}
      value={saveDialogName}
      onChange={(event) => setSaveDialogName(event.target.value)}
      sx={{ mt: 1, mb: 2 }}
    />
    <RadioGroup
      value={saveDialogKind}
      onChange={(event) => setSaveDialogKind(event.target.value as EffectFilterPresetKind)}
    >
      <FormControlLabel value="required" control={<Radio />} label={t("savePresetKindRequired")} />
      <FormControlLabel value="excluded" control={<Radio />} label={t("savePresetKindExcluded")} />
    </RadioGroup>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setSaveDialogOpen(false)}>{t("savePresetCancelButton")}</Button>
    <Button onClick={handleConfirmSave} disabled={!canSaveCurrentDialogSelection}>
      {t("savePresetSaveButton")}
    </Button>
  </DialogActions>
</Dialog>

<Menu
  anchorEl={presetsMenuAnchor}
  open={presetsMenuAnchor !== null}
  onClose={() => setPresetsMenuAnchor(null)}
>
  {presets.length === 0 && <MenuItem disabled>{t("presetsMenuEmpty")}</MenuItem>}
  {requiredPresets.length > 0 && (
    <MenuItem disabled sx={{ opacity: 1, fontWeight: "bold" }}>
      {t("presetsMenuRequiredGroupLabel")}
    </MenuItem>
  )}
  {requiredPresets.map((preset) => (
    <MenuItem key={preset.id} onClick={() => handleApplyPreset(preset)}>
      <ListItemText>{preset.name}</ListItemText>
      <IconButton
        size="small"
        edge="end"
        aria-label={t("presetDeleteLabel")}
        onClick={(event) => {
          event.stopPropagation();
          handleDeletePreset(preset.id);
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </MenuItem>
  ))}
  {excludedPresets.length > 0 && (
    <MenuItem disabled sx={{ opacity: 1, fontWeight: "bold" }}>
      {t("presetsMenuExcludedGroupLabel")}
    </MenuItem>
  )}
  {excludedPresets.map((preset) => (
    <MenuItem key={preset.id} onClick={() => handleApplyPreset(preset)}>
      <ListItemText>{preset.name}</ListItemText>
      <IconButton
        size="small"
        edge="end"
        aria-label={t("presetDeleteLabel")}
        onClick={(event) => {
          event.stopPropagation();
          handleDeletePreset(preset.id);
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </MenuItem>
  ))}
</Menu>
```

- [ ] **Step 4: Verify the build is clean**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify manually**

Run: `npm run dev`

1. Build a required filter (add a couple of effects), click "Save as preset," name it, pick "Required," save. Clear all filters. Open "Presets," apply the saved preset, confirm the relic grid narrows to relics matching any of the saved effects and the panel shows a single group with those effects.
2. Build an excluded filter (add an effect to "Excluded"), save it as an excluded preset. Add a *different* manual excluded effect. Apply the excluded preset and confirm both the manual excluded effect and the preset's effect(s) now exclude matching relics (OR).
3. Reload the page (or restart `npm run dev`) and confirm both presets are still listed under "Presets" (localStorage persistence).
4. Delete a preset from the menu and confirm it disappears from the list and stays gone after a reload.

- [ ] **Step 6: Commit**

```bash
git add src/components/AdvancedSearchPanel.tsx src/i18n.ts
git commit -m "feat: add named, savable effect filter presets"
```

---

## Post-plan verification

- [ ] Run the full test suite once more end-to-end: `npx vitest run`
- [ ] Run `npx tsc --noEmit` once more end-to-end
- [ ] Manually re-walk all three spec scenarios from `docs/superpowers/specs/2026-07-28-relic-search-filter-shortcuts-design.md` against `npm run dev`: presets (required + excluded), click-to-filter from a card (including the panel auto-expand and AND-across-clicks behavior), and the effect picker (category chips + within-category skills.json ordering).
