# Relic Search/Filter Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured, composable effect filter (AND-of-OR groups with per-effect at-least/at-most comparison, plus a NOT/exclude list) to Relic Browser, exposed through a new "Advanced Search" panel, with effects grouped by category sourced from RelicHub reference data.

**Architecture:** A new pure-logic module (`src/utils/EffectFilter.ts`) owns the filter data model and the relic-matching predicate. A generated resource (`src/resources/effectCategories.ts`), produced by a new offline script mirroring the existing `scripts/generate-damage-multipliers.mjs` pattern, maps every `EffectKey` to a category for the picker's `groupBy`. Two new presentational components (`EffectFilterChip`, `AdvancedSearchPanel`) render the filter-building UI, wired into the existing `SearchInput`/`RelicBrowser` components without touching their existing free-text/color-filter behavior.

**Tech Stack:** React 19, TypeScript, MUI v7, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-26-relic-search-filter-engine-design.md`

## Global Constraints

- No new npm dependencies. In particular, do not add `@testing-library/react`
  or any DOM-rendering test library — this repo has zero existing component
  tests (only `vitest` unit tests over pure logic/data). New React components
  in this plan are verified manually in the browser (`npm run dev`), not with
  automated render tests.
- Generated files (`src/resources/effectCategories.ts`) start with the
  comment `// GENERATED FILE — do not edit by hand.` and a regenerate
  instruction, exactly like `src/resources/damageMultipliers.ts`.
- Effect object identity matters: `Effect` instances come from the shared
  `effects`/`effectsArray` module state (`src/resources/effects.ts`) and are
  never cloned. Comparisons must use `===`/reference equality or the
  existing `isSameGroup*` helpers — never structural/deep equality.
- Run `npm run lint`, `npm run type-check`, and `npm test` before every
  commit in this plan; all three must pass.
- This plan does not touch `RelicProcessor.ts`'s `redundant`/outclassed
  detection, manual sell-marking, or save-writing — those are separate,
  out-of-scope specs.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/resources/effects.ts` (modify) | Add `isSameGroupAndEqualOrWorse`, mirroring the existing `isSameGroupAndEqualOrBetter`. |
| `src/utils/EffectFilter.ts` (new) | Filter data types (`Comparison`, `EffectFilterEntry`, `EffectFilterGroup`, `EffectFilterState`), factory helpers, and `doesRelicMatchEffectFilter`. |
| `scripts/generate-effect-categories.mjs` (new) | Offline generator: RelicHub `skills.json` → `src/resources/effectCategories.ts`. |
| `src/resources/effectCategories.ts` (generated) | `effectCategoryOrder: string[]`, `effectCategories: Record<EffectKey, string>`. |
| `src/components/EffectsAutocomplete.tsx` (modify) | Add optional `groupByCategory` prop using the generated categories. |
| `src/components/EffectFilterChip.tsx` (new) | One effect entry: label, at-least/at-most toggle (when applicable), remove button. |
| `src/components/AdvancedSearchPanel.tsx` (new) | The full panel: required groups, excluded list, add/clear controls. |
| `src/components/SearchInput.tsx` (modify) | Advanced Search toggle button + collapsible panel mount. |
| `src/components/RelicBrowser.tsx` (modify) | Owns `EffectFilterState`, feeds it into the `matchingRelics` filter. |

---

### Task 1: `isSameGroupAndEqualOrWorse` helper

**Files:**
- Modify: `src/resources/effects.ts:4789` (right after `isSameGroupAndEqualOrBetter`)
- Modify: `src/resources/effects.test.ts`

**Interfaces:**
- Produces: `isSameGroupAndEqualOrWorse(effect1: Effect, effect2: Effect): boolean` — same group as `effect1`, and `effect2.level <= effect1.level`.

- [ ] **Step 1: Write the failing tests**

Append to `src/resources/effects.test.ts` (new `describe` block, uses the
existing `endurancePlus1`/`endurancePlus2`/`endurancePlus3` effects, ids
`7000200`/`7000201`/`7000202`):

```ts
import { getEffect } from "../utils/DataUtils";
import { isSameGroupAndEqualOrBetter, isSameGroupAndEqualOrWorse } from "./effects";

describe("isSameGroupAndEqualOrWorse", () => {
  const endurancePlus1 = getEffect(7000200);
  const endurancePlus2 = getEffect(7000201);
  const endurancePlus3 = getEffect(7000202);

  it("matches a lower-level effect in the same group", () => {
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, endurancePlus1)).toBe(true);
  });

  it("matches an equal-level effect in the same group", () => {
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, endurancePlus2)).toBe(true);
  });

  it("does not match a higher-level effect in the same group", () => {
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, endurancePlus3)).toBe(false);
  });

  it("does not match effects from different groups", () => {
    const arcanePlus1 = getEffect(7000700);
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, arcanePlus1)).toBe(false);
  });

  it("is the mirror image of isSameGroupAndEqualOrBetter", () => {
    expect(isSameGroupAndEqualOrBetter(endurancePlus2, endurancePlus3)).toBe(true);
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, endurancePlus3)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/resources/effects.test.ts`
Expected: FAIL — `isSameGroupAndEqualOrWorse` is not exported.

- [ ] **Step 3: Implement the helper**

In `src/resources/effects.ts`, immediately after the existing
`isSameGroupAndEqualOrBetter` function (around line 4799):

```ts
export function isSameGroupAndEqualOrWorse(
  effect1: Effect,
  effect2: Effect
): boolean {
  return (
    isSameGroup(effect1, effect2) &&
    effect1.level !== undefined &&
    effect2.level !== undefined &&
    effect1.level >= effect2.level
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/resources/effects.test.ts`
Expected: PASS, all tests including the new `describe("isSameGroupAndEqualOrWorse")` block.

- [ ] **Step 5: Commit**

```bash
git add src/resources/effects.ts src/resources/effects.test.ts
git commit -m "Add isSameGroupAndEqualOrWorse effect comparison helper"
```

---

### Task 2: `EffectFilter` module (types + matcher)

**Files:**
- Create: `src/utils/EffectFilter.ts`
- Create: `src/utils/EffectFilter.test.ts`

**Interfaces:**
- Consumes: `Effect`, `isSameGroupAndEqualOrBetter`, `isSameGroupAndEqualOrWorse` from `../resources/effects` (Task 1); `RelicSlot` from `../types/SaveFile`.
- Produces:
  - `type Comparison = "atLeast" | "atMost"`
  - `interface EffectFilterEntry { effect: Effect; comparison: Comparison }`
  - `interface EffectFilterGroup { id: string; entries: EffectFilterEntry[] }`
  - `interface EffectFilterState { groups: EffectFilterGroup[]; excluded: Effect[] }`
  - `createEmptyEffectFilterState(): EffectFilterState`
  - `createEmptyEffectFilterGroup(): EffectFilterGroup`
  - `doesRelicMatchEffectFilter(relic: RelicSlot, filter: EffectFilterState): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/EffectFilter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { RelicSlot } from "../types/SaveFile";
import { getEffect } from "./DataUtils";
import {
  createEmptyEffectFilterGroup,
  createEmptyEffectFilterState,
  doesRelicMatchEffectFilter,
  type EffectFilterState,
} from "./EffectFilter";

const endurancePlus1 = getEffect(7000200);
const endurancePlus2 = getEffect(7000201);
const endurancePlus3 = getEffect(7000202);
const arcanePlus1 = getEffect(7000700);

function makeRelic(effectIds: number[], debuffId?: number): RelicSlot {
  return {
    id: 1,
    itemId: 104,
    coordinates: [0, 0],
    coordinatesByColor: [0, 0],
    effects: effectIds.map((id, index) =>
      index === 0 && debuffId !== undefined
        ? [getEffect(id), getEffect(debuffId)]
        : [getEffect(id)]
    ),
  };
}

describe("doesRelicMatchEffectFilter", () => {
  it("matches everything when the filter is empty", () => {
    const relic = makeRelic([7000200]);
    expect(doesRelicMatchEffectFilter(relic, createEmptyEffectFilterState())).toBe(true);
  });

  it("matches a required group on any member (OR)", () => {
    const relic = makeRelic([7000700]); // arcane +1
    const filter: EffectFilterState = {
      groups: [
        {
          id: "g1",
          entries: [
            { effect: endurancePlus1, comparison: "atLeast" },
            { effect: arcanePlus1, comparison: "atLeast" },
          ],
        },
      ],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });

  it("requires every group to match (AND)", () => {
    const relic = makeRelic([7000700]); // arcane +1 only, no endurance
    const filter: EffectFilterState = {
      groups: [
        { id: "g1", entries: [{ effect: arcanePlus1, comparison: "atLeast" }] },
        { id: "g2", entries: [{ effect: endurancePlus1, comparison: "atLeast" }] },
      ],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(false);
  });

  it("atLeast matches an equal-or-higher level", () => {
    const relic = makeRelic([7000202]); // endurance +3
    const filter: EffectFilterState = {
      groups: [{ id: "g1", entries: [{ effect: endurancePlus2, comparison: "atLeast" }] }],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });

  it("atMost matches an equal-or-lower level and rejects higher", () => {
    const lowRelic = makeRelic([7000201]); // endurance +2
    const highRelic = makeRelic([7000202]); // endurance +3
    const filter: EffectFilterState = {
      groups: [{ id: "g1", entries: [{ effect: endurancePlus2, comparison: "atMost" }] }],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(lowRelic, filter)).toBe(true);
    expect(doesRelicMatchEffectFilter(highRelic, filter)).toBe(false);
  });

  it("ungrouped effects ignore comparison and match exactly", () => {
    const uniqueEffect = getEffect(999999); // no group/level defined
    const relic = makeRelic([7000200]);
    relic.effects = [[uniqueEffect]];
    const filter: EffectFilterState = {
      groups: [{ id: "g1", entries: [{ effect: uniqueEffect, comparison: "atMost" }] }],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);

    const otherRelic = makeRelic([7000200]);
    expect(doesRelicMatchEffectFilter(otherRelic, filter)).toBe(false);
  });

  it("drops a relic that has an excluded effect", () => {
    const relic = makeRelic([7000200], 7000700); // endurance+1 with arcane+1 as debuff slot
    const filter: EffectFilterState = {
      groups: [],
      excluded: [arcanePlus1],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(false);
  });

  it("exclusion is exact-match only (does not exclude higher levels)", () => {
    const relic = makeRelic([7000202]); // endurance +3
    const filter: EffectFilterState = {
      groups: [],
      excluded: [endurancePlus1], // excluding +1 specifically
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });

  it("ignores groups with zero entries", () => {
    const relic = makeRelic([7000200]);
    const filter: EffectFilterState = {
      groups: [createEmptyEffectFilterGroup()],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });
});

describe("createEmptyEffectFilterGroup", () => {
  it("creates distinct ids", () => {
    const a = createEmptyEffectFilterGroup();
    const b = createEmptyEffectFilterGroup();
    expect(a.id).not.toBe(b.id);
    expect(a.entries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/EffectFilter.test.ts`
Expected: FAIL — cannot find module `./EffectFilter`.

- [ ] **Step 3: Implement the module**

Create `src/utils/EffectFilter.ts`:

```ts
import {
  isSameGroupAndEqualOrBetter,
  isSameGroupAndEqualOrWorse,
  type Effect,
} from "../resources/effects";
import type { RelicSlot } from "../types/SaveFile";

export type Comparison = "atLeast" | "atMost";

export interface EffectFilterEntry {
  effect: Effect;
  comparison: Comparison;
}

export interface EffectFilterGroup {
  id: string;
  entries: EffectFilterEntry[];
}

export interface EffectFilterState {
  groups: EffectFilterGroup[];
  excluded: Effect[];
}

export function createEmptyEffectFilterState(): EffectFilterState {
  return { groups: [], excluded: [] };
}

export function createEmptyEffectFilterGroup(): EffectFilterGroup {
  return { id: crypto.randomUUID(), entries: [] };
}

function relicEffects(relic: RelicSlot): Effect[] {
  return relic.effects.flatMap(([effect, debuff]) =>
    debuff !== undefined ? [effect, debuff] : [effect]
  );
}

function entryMatchesEffect(
  entry: EffectFilterEntry,
  relicEffect: Effect
): boolean {
  if (relicEffect === entry.effect) {
    return true;
  }
  if (entry.effect.group === undefined) {
    return false; // ungrouped effects only match exactly
  }
  return entry.comparison === "atLeast"
    ? isSameGroupAndEqualOrBetter(entry.effect, relicEffect)
    : isSameGroupAndEqualOrWorse(entry.effect, relicEffect);
}

export function doesRelicMatchEffectFilter(
  relic: RelicSlot,
  filter: EffectFilterState
): boolean {
  const effects = relicEffects(relic);

  if (filter.excluded.some((excludedEffect) => effects.includes(excludedEffect))) {
    return false;
  }

  return filter.groups
    .filter((group) => group.entries.length > 0)
    .every((group) =>
      group.entries.some((entry) =>
        effects.some((relicEffect) => entryMatchesEffect(entry, relicEffect))
      )
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/EffectFilter.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/EffectFilter.ts src/utils/EffectFilter.test.ts
git commit -m "Add EffectFilter module: AND-of-OR-groups plus exclude matcher"
```

---

### Task 3: Effect category generator + generated resource

**Files:**
- Create: `scripts/generate-effect-categories.mjs`
- Create: `scripts/generate-effect-categories.test.mjs`
- Create (generated, committed): `src/resources/effectCategories.ts`
- Create: `src/resources/effectCategories.test.ts`

**Interfaces:**
- Consumes: nothing from other scripts. `scripts/damage-multiplier-matching.mjs`
  and `scripts/generate-damage-multipliers.mjs`, referenced in earlier drafts
  of this plan as reusable precedent, turned out to be **uncommitted,
  untracked files that exist only in the working directory of a separate,
  unrelated in-progress branch (`damage-optimization`)** — they are not part
  of `main` and must not be depended on. This task instead defines its own
  small local copies of the three matching primitives it needs
  (`buildJpnToEngLookup`, `extractI18nEnglishEffectStrings`,
  `matchEffectKeyName`), inlined directly in `generate-effect-categories.mjs`
  and unit-tested here. If `damage-optimization` merges these into `main`
  later, deduplicating is a separate, future cleanup — not this task's
  concern.
- Produces (generated file): `effectCategoryOrder: string[]`, `effectCategories: Record<EffectKey, string>`.
- Produces (script, exported for its own tests): `extractEffectKeyNames(effectKeysSourceText: string): string[]`, `buildJpnToEngLookup(sourceLists: {jpn: string, eng: string}[][]): Map<string, string>`, `extractI18nEnglishEffectStrings(i18nSourceText: string): Map<string, string>`, `matchEffectKeyName(jpnName: string, jpnToEng: Map<string,string>, englishToEffectKeyName: Map<string,string>, overrides: Record<string,string>): string | undefined`.

- [ ] **Step 1: Write the failing tests for the script's helpers**

Create `scripts/generate-effect-categories.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import {
  buildJpnToEngLookup,
  extractEffectKeyNames,
  extractI18nEnglishEffectStrings,
  matchEffectKeyName,
} from "./generate-effect-categories.mjs";

describe("extractEffectKeyNames", () => {
  it("extracts member names in declaration order, excluding LENGTH", () => {
    const source = `export const enum EffectKey {
  vigorPlus1,
  vigorPlus2,
  // a comment line
  arcanePlus1,
  LENGTH,
}
`;
    expect(extractEffectKeyNames(source)).toEqual([
      "vigorPlus1",
      "vigorPlus2",
      "arcanePlus1",
    ]);
  });
});

describe("buildJpnToEngLookup", () => {
  it("maps jpn -> eng, first match wins", () => {
    const lookup = buildJpnToEngLookup([
      [{ jpn: "生命力+1", eng: "Vigor +1" }],
      [{ jpn: "生命力+1", eng: "SHOULD NOT WIN" }],
    ]);
    expect(lookup.get("生命力+1")).toBe("Vigor +1");
    expect(lookup.size).toBe(1);
  });

  it("skips entries missing jpn or eng", () => {
    const lookup = buildJpnToEngLookup([
      [{ jpn: "", eng: "x" }, { jpn: "y", eng: "" }],
    ]);
    expect(lookup.size).toBe(0);
  });
});

describe("extractI18nEnglishEffectStrings", () => {
  it("maps English text to EffectKey member name from the en: block", () => {
    const source = `
export const resources = {
  en: {
    translation: {
      effects: {
        [EffectKey.vigorPlus1]: "Vigor +1",
        [EffectKey.arcanePlus1]: "Arcane +1",
      },
    },
  },
  ja: {
    translation: {
      effects: {
        [EffectKey.vigorPlus1]: "生命力+1",
      },
    },
  },
};
`;
    const map = extractI18nEnglishEffectStrings(source);
    expect(map.get("Vigor +1")).toBe("vigorPlus1");
    expect(map.get("Arcane +1")).toBe("arcanePlus1");
  });
});

describe("matchEffectKeyName", () => {
  const jpnToEng = new Map([["生命力+1", "Vigor +1"]]);
  const englishToEffectKeyName = new Map([["Vigor +1", "vigorPlus1"]]);

  it("resolves via the jpn -> eng -> EffectKey chain", () => {
    expect(matchEffectKeyName("生命力+1", jpnToEng, englishToEffectKeyName, {})).toBe(
      "vigorPlus1"
    );
  });

  it("prefers an explicit override", () => {
    expect(
      matchEffectKeyName("生命力+1", jpnToEng, englishToEffectKeyName, {
        "生命力+1": "someOverrideKey",
      })
    ).toBe("someOverrideKey");
  });

  it("returns undefined when the jpn name has no eng mapping", () => {
    expect(matchEffectKeyName("未知の効果", jpnToEng, englishToEffectKeyName, {})).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/generate-effect-categories.test.mjs`
Expected: FAIL — cannot find module `./generate-effect-categories.mjs`.

- [ ] **Step 3: Write the generator script**

Create `scripts/generate-effect-categories.mjs`:

```js
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const OTHER_CATEGORY = "その他";

// Filled in iteratively from this script's console output (wording
// mismatches between RelicHub's skills.json and src/i18n.ts).
const MANUAL_EFFECT_KEY_OVERRIDES = {};

// These three matching primitives are intentionally local to this script
// rather than imported from a shared module: at the time this was written,
// the only other place with equivalent logic (`scripts/damage-multiplier-matching.mjs`)
// existed solely as an uncommitted file on an unrelated, unmerged branch.
// Do not add a cross-branch import here.

export function buildJpnToEngLookup(sourceLists) {
  const lookup = new Map();
  for (const list of sourceLists) {
    for (const entry of list) {
      if (entry.jpn && entry.eng && !lookup.has(entry.jpn)) {
        lookup.set(entry.jpn, entry.eng);
      }
    }
  }
  return lookup;
}

export function extractI18nEnglishEffectStrings(i18nSourceText) {
  const enMarker = "\n  en:";
  const jaMarker = "\n  ja:";
  const enStart = i18nSourceText.indexOf(enMarker);
  if (enStart === -1) {
    throw new Error("Could not locate 'en:' translation block in i18n source");
  }

  const jaStart = i18nSourceText.indexOf(jaMarker);
  const enBlockEnd = jaStart === -1 ? i18nSourceText.lastIndexOf("};") : jaStart;

  const enBlock = i18nSourceText.slice(enStart, enBlockEnd);
  const map = new Map();
  const pattern = /\[EffectKey\.(\w+)\]:\s*"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(enBlock)) !== null) {
    const [, effectKeyName, englishText] = match;
    if (!map.has(englishText)) {
      map.set(englishText, effectKeyName);
    }
  }
  return map;
}

export function matchEffectKeyName(jpnName, jpnToEng, englishToEffectKeyName, overrides) {
  if (overrides[jpnName]) {
    return overrides[jpnName];
  }
  const eng = jpnToEng.get(jpnName);
  if (!eng) {
    return undefined;
  }
  return englishToEffectKeyName.get(eng);
}

export function extractEffectKeyNames(effectKeysSourceText) {
  const start = effectKeysSourceText.indexOf("{");
  const end = effectKeysSourceText.lastIndexOf("}");
  const body = effectKeysSourceText.slice(start + 1, end);
  return body
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter((line) => line.length > 0 && !line.startsWith("//") && line !== "LENGTH");
}

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf-8"));
}

function main() {
  const skills = loadJson("RelicHub/data/skills.json");
  const i18nSource = readFileSync(join(ROOT, "src/i18n.ts"), "utf-8");
  const effectKeysSource = readFileSync(
    join(ROOT, "src/resources/effectKeys.ts"),
    "utf-8"
  );

  const jpnToEng = buildJpnToEngLookup(Object.values(skills.skills));
  const englishToEffectKeyName = extractI18nEnglishEffectStrings(i18nSource);
  const allEffectKeyNames = extractEffectKeyNames(effectKeysSource);

  const categoryOfKeyName = new Map();
  const unmatched = [];

  for (const genre of skills.genre_order) {
    for (const entry of skills.skills[genre]) {
      const effectKeyName = matchEffectKeyName(
        entry.jpn,
        jpnToEng,
        englishToEffectKeyName,
        MANUAL_EFFECT_KEY_OVERRIDES
      );
      if (!effectKeyName) {
        unmatched.push(`${genre}: ${entry.jpn} (${entry.eng})`);
        continue;
      }
      if (!categoryOfKeyName.has(effectKeyName)) {
        categoryOfKeyName.set(effectKeyName, genre);
      }
    }
  }

  let otherCount = 0;
  for (const keyName of allEffectKeyNames) {
    if (!categoryOfKeyName.has(keyName)) {
      categoryOfKeyName.set(keyName, OTHER_CATEGORY);
      otherCount++;
    }
  }

  if (unmatched.length > 0) {
    console.warn(
      `\n${unmatched.length} RelicHub skills.json entries could not be matched to an EffectKey ` +
        `(their EffectKey, if any, falls into "${OTHER_CATEGORY}" instead):\n` +
        unmatched.map((k) => `  - ${k}`).join("\n") +
        `\n\nTo fix a specific entry, add it to MANUAL_EFFECT_KEY_OVERRIDES in this script ` +
        `(find the correct EffectKey by searching src/resources/effectKeys.ts) and re-run.\n`
    );
  }
  console.log(
    `${allEffectKeyNames.length} EffectKeys total: ${allEffectKeyNames.length - otherCount} categorized, ${otherCount} in "${OTHER_CATEGORY}".`
  );

  const genreOrder = [...skills.genre_order, OTHER_CATEGORY];
  const lines = allEffectKeyNames.map(
    (keyName) => `  [EffectKey.${keyName}]: ${JSON.stringify(categoryOfKeyName.get(keyName))},`
  );

  const output = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-effect-categories.mjs
import { EffectKey } from "./effectKeys";

export const effectCategoryOrder: string[] = ${JSON.stringify(genreOrder, null, 2)};

export const effectCategories: Record<EffectKey, string> = {
${lines.join("\n")}
};
`;

  writeFileSync(join(ROOT, "src/resources/effectCategories.ts"), output, "utf-8");
  console.log(`Wrote ${allEffectKeyNames.length} entries to src/resources/effectCategories.ts`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

Note the `if (process.argv[1] === ...)` guard: this lets the test file
import `extractEffectKeyNames` without triggering `main()` (which reads
real repo files) as a side effect of the import — `generate-damage-multipliers.mjs`
doesn't need this guard because nothing imports it, but this script's test
does.

- [ ] **Step 4: Run the parsing-helper test to verify it passes**

Run: `npx vitest run scripts/generate-effect-categories.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the generator against the real repo data**

Run: `node scripts/generate-effect-categories.mjs`

Expected: prints a count summary and a warning list of unmatched
`skills.json` entries (this is expected — RelicHub's `eng` strings don't all
match `i18n.ts` verbatim; unmatched entries' EffectKeys, if any, land in
"その他"). Writes `src/resources/effectCategories.ts`.

Read the warning list. For any entry where the intended `EffectKey` is
obvious (e.g. a `-1`/`+1` wording difference, a "Change compatible
armament's skill to X" starting-loadout effect), add it to
`MANUAL_EFFECT_KEY_OVERRIDES` in `scripts/generate-effect-categories.mjs`
(same shape as the override table in `generate-damage-multipliers.mjs`:
`{ "<jpn text from the warning>": "<effectKeyName>" }`), then re-run the
script. Do not attempt to resolve every unmatched entry — this script does
not fail the build on unmatched entries (unlike the damage-multiplier
generator); remaining gaps correctly fall into "その他" per the spec.

- [ ] **Step 6: Write the completeness test for the generated resource**

Create `src/resources/effectCategories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { effectCategories, effectCategoryOrder } from "./effectCategories";
import { EffectKey } from "./effectKeys";

describe("effectCategories", () => {
  it("has a category for every EffectKey", () => {
    for (let key: EffectKey = 0; key < EffectKey.LENGTH; key++) {
      expect(effectCategories[key], `EffectKey ${key} has no category`).toBeDefined();
    }
  });

  it("only uses categories present in effectCategoryOrder", () => {
    const validCategories = new Set(effectCategoryOrder);
    for (let key: EffectKey = 0; key < EffectKey.LENGTH; key++) {
      expect(
        validCategories.has(effectCategories[key]),
        `EffectKey ${key} has unlisted category "${effectCategories[key]}"`
      ).toBe(true);
    }
  });

  it("includes an 'other' bucket for unmatched effects", () => {
    expect(effectCategoryOrder).toContain("その他");
  });
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/resources/effectCategories.test.ts`
Expected: PASS.

- [ ] **Step 8: Run full check and commit**

```bash
npm run lint
npm run type-check
npx vitest run
```

```bash
git add scripts/generate-effect-categories.mjs scripts/generate-effect-categories.test.mjs src/resources/effectCategories.ts src/resources/effectCategories.test.ts
git commit -m "Generate effect category mapping from RelicHub skills.json"
```

---

### Task 4: `EffectsAutocomplete` category grouping

**Files:**
- Modify: `src/components/EffectsAutocomplete.tsx`

**Interfaces:**
- Consumes: `effectCategories`, `effectCategoryOrder` from `../resources/effectCategories` (Task 3).
- Produces: new optional prop `groupByCategory?: boolean` on `EffectsAutocompleteProps` (default `false`, existing callers unaffected).

- [ ] **Step 1: Add the prop and grouping logic**

In `src/components/EffectsAutocomplete.tsx`, add the import and extend the
component. The full updated file:

```tsx
import { Search } from "@mui/icons-material";
import { InputAdornment, Typography } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  EffectType,
  isEffectKey,
  isMaxLevel,
  type Effect,
} from "../resources/effects";
import { effectCategories, effectCategoryOrder } from "../resources/effectCategories";
import type { EffectKey } from "../resources/effectKeys";
import { getEffectByKey } from "../utils/DataUtils";

interface EffectsAutocompleteProps {
  onSearchChange: (searchTerm: string) => void;
  onChange?: (effectKey: Effect) => void;
  availableEffects: Effect[];
  placeholder: string;
  showOrBetterLabels?: boolean;
  clearOnSelect?: boolean;
  groupByCategory?: boolean;
}

export function EffectsAutocomplete({
  onSearchChange,
  onChange,
  availableEffects,
  placeholder,
  showOrBetterLabels = false,
  clearOnSelect = false,
  groupByCategory = false,
}: EffectsAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");

  const getOptionLabel = useCallback(
    (option: string) => {
      const effectKey = parseInt(option);
      if (isEffectKey(effectKey)) {
        const label = t(`effects.${effectKey}`);
        const effect = getEffectByKey(effectKey);
        if (
          showOrBetterLabels &&
          effect !== undefined &&
          !isMaxLevel(effect) &&
          effect.stacks
        ) {
          return label + " (or better)";
        }
        return label;
      }
      return option;
    },
    [showOrBetterLabels, t]
  );

  const categoryOf = useCallback((option: string) => {
    const effectKey = parseInt(option) as EffectKey;
    return effectCategories[effectKey] ?? effectCategoryOrder[effectCategoryOrder.length - 1];
  }, []);

  const options = useMemo(() => {
    const keys = availableEffects.map((effect) => String(effect.key));
    if (!groupByCategory) {
      return keys;
    }
    const orderIndex = new Map(effectCategoryOrder.map((category, index) => [category, index]));
    return [...keys].sort(
      (a, b) => (orderIndex.get(categoryOf(a)) ?? 0) - (orderIndex.get(categoryOf(b)) ?? 0)
    );
  }, [availableEffects, groupByCategory, categoryOf]);

  return (
    <Autocomplete
      disablePortal
      autoHighlight
      clearOnEscape
      options={options}
      groupBy={groupByCategory ? categoryOf : undefined}
      freeSolo
      sx={{ width: 350 }}
      value={null}
      inputValue={inputValue}
      onInputChange={(_e, value) => {
        setInputValue(value);
        onSearchChange(value);
      }}
      onChange={(_e, value) => {
        if (onChange === undefined || value === null) {
          return;
        }
        const effectKey = parseInt(value);
        if (isEffectKey(effectKey)) {
          const effect = getEffectByKey(effectKey);
          if (effect) {
            onChange(effect);
            if (clearOnSelect) {
              setInputValue("");
              onSearchChange("");
            }
          }
        }
      }}
      getOptionLabel={getOptionLabel}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const debuff =
          getEffectByKey(parseInt(option))?.type === EffectType.Debuff;
        return (
          <Typography
            {...props}
            key={option}
            color={debuff ? "#76adde" : "text.primary"}
          >
            {getOptionLabel(option)}
          </Typography>
        );
      }}
    />
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke check**

Run: `npm run dev`, open the app, load demo data, confirm the existing
top-toolbar search autocomplete (which does not pass `groupByCategory`)
still renders exactly as before — flat list, no group headers.

- [ ] **Step 4: Commit**

```bash
git add src/components/EffectsAutocomplete.tsx
git commit -m "Add optional category grouping to EffectsAutocomplete"
```

---

### Task 5: `EffectFilterChip` component

**Files:**
- Create: `src/components/EffectFilterChip.tsx`

**Interfaces:**
- Consumes: `EffectFilterEntry`, `Comparison` from `../utils/EffectFilter` (Task 2).
- Produces:

```ts
interface EffectFilterChipProps {
  entry: EffectFilterEntry;
  onToggleComparison?: () => void; // omit to hide the toggle (e.g. for excluded-list chips)
  onRemove: () => void;
}
```

- [ ] **Step 1: Implement the component**

Create `src/components/EffectFilterChip.tsx`:

```tsx
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { EffectFilterEntry } from "../utils/EffectFilter";

interface EffectFilterChipProps {
  entry: EffectFilterEntry;
  onToggleComparison?: () => void;
  onRemove: () => void;
}

export function EffectFilterChip({
  entry,
  onToggleComparison,
  onRemove,
}: EffectFilterChipProps) {
  const { t } = useTranslation();
  const label = t(`effects.${entry.effect.key}`);
  const showToggle = onToggleComparison !== undefined && entry.effect.group !== undefined;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      {showToggle && (
        <Tooltip
          title={
            entry.comparison === "atLeast"
              ? "This level or better (click to switch to 'or below')"
              : "This level or below (click to switch to 'or better')"
          }
        >
          <IconButton size="small" onClick={onToggleComparison} sx={{ p: 0.25 }}>
            {entry.comparison === "atLeast" ? (
              <KeyboardArrowUpIcon fontSize="inherit" />
            ) : (
              <KeyboardArrowDownIcon fontSize="inherit" />
            )}
          </IconButton>
        </Tooltip>
      )}
      <Typography variant="body2">{label}</Typography>
      <IconButton size="small" onClick={onRemove} sx={{ p: 0.25 }} aria-label={`Remove ${label}`}>
        <CloseIcon fontSize="inherit" />
      </IconButton>
    </Box>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/EffectFilterChip.tsx
git commit -m "Add EffectFilterChip component"
```

---

### Task 6: `AdvancedSearchPanel` component

**Files:**
- Create: `src/components/AdvancedSearchPanel.tsx`

**Interfaces:**
- Consumes: `EffectFilterState`, `EffectFilterGroup`, `createEmptyEffectFilterGroup` from `../utils/EffectFilter` (Task 2); `EffectsAutocomplete` (Task 4); `EffectFilterChip` (Task 5).
- Produces:

```ts
interface AdvancedSearchPanelProps {
  availableEffects: Effect[];
  effectFilter: EffectFilterState;
  onEffectFilterChange: (filter: EffectFilterState) => void;
}
```

- [ ] **Step 1: Implement the component**

Create `src/components/AdvancedSearchPanel.tsx`:

```tsx
import AddIcon from "@mui/icons-material/Add";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import type { Effect } from "../resources/effects";
import {
  createEmptyEffectFilterGroup,
  type EffectFilterGroup,
  type EffectFilterState,
} from "../utils/EffectFilter";
import { EffectFilterChip } from "./EffectFilterChip";
import { EffectsAutocomplete } from "./EffectsAutocomplete";

interface AdvancedSearchPanelProps {
  availableEffects: Effect[];
  effectFilter: EffectFilterState;
  onEffectFilterChange: (filter: EffectFilterState) => void;
}

function countActiveFilters(filter: EffectFilterState): number {
  const groupEntries = filter.groups.reduce((sum, g) => sum + g.entries.length, 0);
  return groupEntries + filter.excluded.length;
}

export function AdvancedSearchPanel({
  availableEffects,
  effectFilter,
  onEffectFilterChange,
}: AdvancedSearchPanelProps) {
  const updateGroup = (groupId: string, updater: (group: EffectFilterGroup) => EffectFilterGroup) => {
    onEffectFilterChange({
      ...effectFilter,
      groups: effectFilter.groups.map((group) =>
        group.id === groupId ? updater(group) : group
      ),
    });
  };

  const addGroup = () => {
    onEffectFilterChange({
      ...effectFilter,
      groups: [...effectFilter.groups, createEmptyEffectFilterGroup()],
    });
  };

  const addEffectToGroup = (groupId: string, effect: Effect) => {
    updateGroup(groupId, (group) => ({
      ...group,
      entries: group.entries.some((e) => e.effect === effect)
        ? group.entries
        : [...group.entries, { effect, comparison: "atLeast" }],
    }));
  };

  const toggleComparison = (groupId: string, effect: Effect) => {
    updateGroup(groupId, (group) => ({
      ...group,
      entries: group.entries.map((entry) =>
        entry.effect === effect
          ? { ...entry, comparison: entry.comparison === "atLeast" ? "atMost" : "atLeast" }
          : entry
      ),
    }));
  };

  const removeEffectFromGroup = (groupId: string, effect: Effect) => {
    const group = effectFilter.groups.find((g) => g.id === groupId);
    if (!group) return;
    const remainingEntries = group.entries.filter((e) => e.effect !== effect);
    if (remainingEntries.length === 0) {
      onEffectFilterChange({
        ...effectFilter,
        groups: effectFilter.groups.filter((g) => g.id !== groupId),
      });
    } else {
      updateGroup(groupId, (g) => ({ ...g, entries: remainingEntries }));
    }
  };

  const addExcluded = (effect: Effect) => {
    if (effectFilter.excluded.includes(effect)) return;
    onEffectFilterChange({ ...effectFilter, excluded: [...effectFilter.excluded, effect] });
  };

  const removeExcluded = (effect: Effect) => {
    onEffectFilterChange({
      ...effectFilter,
      excluded: effectFilter.excluded.filter((e) => e !== effect),
    });
  };

  const clearAll = () => {
    onEffectFilterChange({ groups: [], excluded: [] });
  };

  const activeCount = countActiveFilters(effectFilter);

  return (
    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          {activeCount === 0 ? "No advanced filters active" : `${activeCount} filter${activeCount === 1 ? "" : "s"} active`}
        </Typography>
        <Button size="small" onClick={clearAll} disabled={activeCount === 0}>
          Clear all
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Required (each row: relic needs at least one)
      </Typography>
      <Stack spacing={1} sx={{ mt: 0.5, mb: 1 }}>
        {effectFilter.groups.map((group) => (
          <Stack key={group.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {group.entries.map((entry) => (
              <EffectFilterChip
                key={entry.effect.key}
                entry={entry}
                onToggleComparison={() => toggleComparison(group.id, entry.effect)}
                onRemove={() => removeEffectFromGroup(group.id, entry.effect)}
              />
            ))}
            <EffectsAutocomplete
              availableEffects={availableEffects}
              placeholder="Add effect..."
              onSearchChange={() => {}}
              onChange={(effect) => addEffectToGroup(group.id, effect)}
              clearOnSelect
              groupByCategory
            />
          </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addGroup} sx={{ alignSelf: "flex-start" }}>
          Add group
        </Button>
      </Stack>

      <Divider sx={{ my: 1 }} />

      <Typography variant="caption" color="text.secondary">
        Excluded (relic must have none of these)
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
        {effectFilter.excluded.map((effect) => (
          <EffectFilterChip
            key={effect.key}
            entry={{ effect, comparison: "atLeast" }}
            onRemove={() => removeExcluded(effect)}
          />
        ))}
        <EffectsAutocomplete
          availableEffects={availableEffects}
          placeholder="Add excluded effect..."
          onSearchChange={() => {}}
          onChange={addExcluded}
          clearOnSelect
          groupByCategory
        />
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdvancedSearchPanel.tsx
git commit -m "Add AdvancedSearchPanel component"
```

---

### Task 7: Wire the panel into `SearchInput` and `RelicBrowser`

**Files:**
- Modify: `src/components/SearchInput.tsx`
- Modify: `src/components/RelicBrowser.tsx`

**Interfaces:**
- Consumes: `AdvancedSearchPanel` (Task 6), `EffectFilterState`/`createEmptyEffectFilterState`/`doesRelicMatchEffectFilter` (Task 2).

- [ ] **Step 1: Update `SearchInput.tsx`**

Full updated file:

```tsx
import TuneIcon from "@mui/icons-material/Tune";
import { Box, Chip, Collapse, ToggleButton, ToggleButtonGroup } from "@mui/material";
import React, { type Dispatch, type SetStateAction, useState } from "react";
import { type Effect } from "../resources/effects";
import {
  colorFilterOptions,
  type ColorFilterOption,
} from "../utils/ColorFilterOptions";
import type { EffectFilterState } from "../utils/EffectFilter";
import { AdvancedSearchPanel } from "./AdvancedSearchPanel";
import { EffectsAutocomplete } from "./EffectsAutocomplete";
import { RelicColorChip } from "./RelicColorChip";

interface SearchInputProps {
  onSearchChange: (searchTerm: string) => void;
  selectedColor: ColorFilterOption;
  onColorChange: (colorFilter: ColorFilterOption) => void;
  availableEffects: Effect[];
  filterSell: boolean;
  onFilterSellChange: Dispatch<SetStateAction<boolean>>;
  effectFilter: EffectFilterState;
  onEffectFilterChange: (filter: EffectFilterState) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearchChange,
  selectedColor,
  onColorChange,
  availableEffects,
  filterSell,
  onFilterSellChange,
  effectFilter,
  onEffectFilterChange,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <Box sx={{ py: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <EffectsAutocomplete
          onSearchChange={onSearchChange}
          availableEffects={availableEffects}
          placeholder="Search relics by name or effect..."
        />

        <ToggleButtonGroup
          exclusive
          aria-label="Relic Color Filter"
          value={selectedColor}
          onChange={(_, newColor) => {
            if (newColor !== null) {
              onColorChange(newColor);
            }
          }}
        >
          {colorFilterOptions.map((option) => (
            <ToggleButton
              key={option.color}
              value={option}
              sx={{ textTransform: "none" }}
            >
              <RelicColorChip color={option.color} type={option.type} />
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButton
          value="check"
          selected={filterSell}
          onChange={() => onFilterSellChange((prevSelected) => !prevSelected)}
        >
          <Chip label="SELL" size="small" />
        </ToggleButton>

        <ToggleButton
          value="advanced"
          selected={advancedOpen}
          onChange={() => setAdvancedOpen((prev) => !prev)}
          aria-label="Toggle advanced search"
        >
          <TuneIcon fontSize="small" />
        </ToggleButton>
      </Box>

      <Collapse in={advancedOpen}>
        <Box sx={{ mt: 2 }}>
          <AdvancedSearchPanel
            availableEffects={availableEffects}
            effectFilter={effectFilter}
            onEffectFilterChange={onEffectFilterChange}
          />
        </Box>
      </Collapse>
    </Box>
  );
};
```

- [ ] **Step 2: Update `RelicBrowser.tsx`**

Apply these changes to `src/components/RelicBrowser.tsx`:

Add imports (alongside the existing ones):

```ts
import {
  createEmptyEffectFilterState,
  doesRelicMatchEffectFilter,
  type EffectFilterState,
} from "../utils/EffectFilter";
```

Add state, right after the existing `colorFilter` state (in the component body):

```ts
const [effectFilter, setEffectFilter] = useState<EffectFilterState>(
  createEmptyEffectFilterState()
);
```

Update the `matchingRelics` memo's early-return guard and filter body to
also account for the structured filter. Replace:

```ts
  const matchingRelics = useMemo(() => {
    if (
      !searchTerm.trim() &&
      colorFilter.color === RelicSlotColor.Any &&
      !filterSell
    ) {
      return currentSlot.relics;
    }

    return currentSlot.relics.filter((relic) => {
      const { itemId, effects, redundant } = relic;

      if (
        filterSell &&
        (redundant === undefined || unsellableItemIds.includes(itemId))
      ) {
        return false;
      }
```

with:

```ts
  const hasEffectFilter =
    effectFilter.groups.some((group) => group.entries.length > 0) ||
    effectFilter.excluded.length > 0;

  const matchingRelics = useMemo(() => {
    if (
      !searchTerm.trim() &&
      colorFilter.color === RelicSlotColor.Any &&
      !filterSell &&
      !hasEffectFilter
    ) {
      return currentSlot.relics;
    }

    return currentSlot.relics.filter((relic) => {
      const { itemId, effects, redundant } = relic;

      if (
        filterSell &&
        (redundant === undefined || unsellableItemIds.includes(itemId))
      ) {
        return false;
      }

      if (!doesRelicMatchEffectFilter(relic, effectFilter)) {
        return false;
      }
```

And add `effectFilter` (or `hasEffectFilter` plus `effectFilter`) to the
memo's dependency array — replace:

```ts
  }, [
    searchTerm,
    colorFilter.color,
    colorFilter.type,
    filterSell,
    currentSlot.relics,
  ]);
```

with:

```ts
  }, [
    searchTerm,
    colorFilter.color,
    colorFilter.type,
    filterSell,
    currentSlot.relics,
    effectFilter,
    hasEffectFilter,
  ]);
```

Finally, pass the new props to `<SearchInput />`:

```tsx
      <SearchInput
        onSearchChange={setSearchTerm}
        selectedColor={colorFilter}
        onColorChange={setColorFilter}
        availableEffects={availableEffects}
        filterSell={filterSell}
        onFilterSellChange={setFilterSell}
        effectFilter={effectFilter}
        onEffectFilterChange={setEffectFilter}
      />
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (this task changes no tested logic directly, but
confirms nothing broke).

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchInput.tsx src/components/RelicBrowser.tsx
git commit -m "Wire Advanced Search panel into RelicBrowser"
```

---

### Task 8: Manual verification in the browser

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`, open the printed local URL.

- [ ] **Step 2: Load data and open Advanced Search**

Click "Load Demo Data" (or import a real save file). In the Relic Browser
tab, click the new tune-icon toggle next to the SELL chip. Confirm the
panel expands below the toolbar and starts empty ("No advanced filters
active").

- [ ] **Step 3: Verify AND-of-OR grouping**

Add two effects to the same required group (e.g. two different Vigor
levels) — confirm the relic count updates to relics having *either* one
(OR). Click "Add group" and add a different effect (e.g. an Arcane level)
to the second group — confirm the count drops to only relics matching
*both* groups (AND).

- [ ] **Step 4: Verify at-least/at-most toggle**

Add a mid-level stat effect (e.g. Vigor +2) to a group. Note the matching
count with the default ↑ (or-better) icon. Click the icon to flip it to ↓
(or-below) and confirm the count changes to exclude relics with the
higher level (Vigor +3) while still including Vigor +1/+2.

- [ ] **Step 5: Verify exclusion**

Add an effect to the "Excluded" row and confirm any relic carrying that
effect (as a buff or as the debuff half of a pair) disappears from the
results.

- [ ] **Step 6: Verify category grouping in the picker**

Open the autocomplete dropdown inside the panel (not the main toolbar
search) and confirm options are grouped under category headers (能力値,
攻撃力, etc.) rather than one flat list. Confirm the main toolbar search
autocomplete is unchanged (flat, no headers).

- [ ] **Step 7: Verify clear/remove interactions**

Remove the last chip from a required group and confirm the whole group row
disappears. Click "Clear all" and confirm the panel resets to empty and
the relic list returns to its unfiltered state (respecting the existing
free-text/color/SELL filters if any are still active).

- [ ] **Step 8: Regression-check existing behavior**

Confirm the free-text search box, color filter buttons, and SELL toggle
still behave exactly as before this change, independent of the Advanced
Search panel's state.

No commit for this task — it is verification only. If any step fails,
return to the relevant earlier task, fix, and re-run this task's checklist
from the top.
