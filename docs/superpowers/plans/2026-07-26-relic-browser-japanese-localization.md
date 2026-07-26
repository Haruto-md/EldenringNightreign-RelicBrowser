# Relic Browser 日本語化 + Combo Finder 廃止 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully localize the Relic Browser tab into Japanese (fill remaining `ja:` gaps in `src/i18n.ts` and wire up hardcoded English strings), and remove the Combo Finder tab while keeping the shared search engine that Damage Optimizer depends on.

**Architecture:** A generator script (`scripts/generate-i18n-ja.mjs`) reuses the RelicHub eng↔jpn matching primitives already proven in `scripts/generate-effect-categories.mjs` to auto-fill `ja.effects` and `ja.items` in `src/i18n.ts` from `RelicHub/data/skills.json`, `RelicHub/data/demerit.json`, `RelicHub/data/items_knowledge.json`, and `RelicHub/data/special_items.json`. Whatever the generator cannot match is filled in by hand. Separately, six RelicBrowser-adjacent components get their hardcoded English strings extracted into new `i18n.ts` keys and swapped for `t()` calls. Combo Finder's UI is deleted; `src/utils/ComboSearch.ts` and `src/workers/comboSearchWorker.ts` (and their tests) are untouched because `DamageOptimizer.tsx` imports from them directly.

**Tech Stack:** React + TypeScript + Vite, i18next/react-i18next, Vitest, Node (generator scripts run via `node`, ESM `.mjs`).

## Global Constraints

- `src/i18n.ts` already has a `ja:` block — never create a second one or restructure the file's top-level shape (`en`/`ja` → `translation` → flat keys / `nightfarers` / `colors` / `items` / `effects`).
- Unmatched `ja.effects` / `ja.items` entries must never be written as empty strings or placeholders — either a real Japanese translation is present, or the key is absent and i18next's existing `fallbackLng: "en"` handles it.
- RelicHub `skills.json` mixes typo'd (陰者) and canonical (隠者) spellings for Recluse; always normalize to `vessels.json`'s canonical `隠者` when hand-writing text that includes it.
- RelicHub id 285 (Cerulean Hidden Tear) and id 269 (Greenspill Crystal Tear) share a colliding `eng` string in first-wins lookups — do not trust an automated match for either of these two item/effect names without a manual sanity check against `RelicHub/data/skills.json`/`items_knowledge.json` directly.
- Do not import matching helpers from `scripts/damage-multiplier-matching.mjs` or `scripts/generate-damage-multipliers.mjs` — per prior investigation those exist only as untracked files on an unrelated branch's working directory, not in git history on any branch.
- `src/utils/ComboSearch.ts`, `src/workers/comboSearchWorker.ts`, and their test files must not be deleted or modified — `DamageOptimizer.tsx` depends on them.
- No new test framework/library may be introduced. This repo has no React component-rendering tests (no `@testing-library/react` dependency) — UI wiring changes are verified via `npm run type-check`, `npm run build`, and a manual browser check, matching the project's existing verification pattern for UI changes.

---

## File Structure

- **Delete:** `src/components/ComboFinder.tsx`, `src/components/ComboFinderSettingsBar.tsx`
- **Modify:** `src/components/RelicsPage.tsx` (drop the Combo Finder tab)
- **Modify:** `src/components/DamageOptimizer.tsx` (drop a stale comment reference to Combo Finder — no functional change)
- **Create:** `scripts/generate-i18n-ja.mjs` (generator: matching primitives + `ja.effects`/`ja.items` patcher)
- **Create:** `scripts/generate-i18n-ja.test.mjs` (unit tests for the new script's pure functions)
- **Modify:** `src/i18n.ts` (generated + hand-written `ja.effects`/`ja.items` entries; new UI-string keys in both `en` and `ja`)
- **Modify:** `src/components/SearchInput.tsx`, `src/components/AdvancedSearchPanel.tsx`, `src/components/EffectFilterChip.tsx`, `src/components/RelicCard.tsx`, `src/components/RelicComparisonModal.tsx`, `src/components/RelicDisplay.tsx` (swap hardcoded strings for `t()`)

---

### Task 1: Remove the Combo Finder tab

**Files:**
- Delete: `src/components/ComboFinder.tsx`
- Delete: `src/components/ComboFinderSettingsBar.tsx`
- Modify: `src/components/RelicsPage.tsx`
- Modify: `src/components/DamageOptimizer.tsx:365-367`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by later tasks (this is an independent removal — confirmed via `grep -rn "ComboFinder" src` that only `RelicsPage.tsx` imports `ComboFinder`, and only `ComboFinder.tsx` imports `ComboFinderSettingsBar`).

- [ ] **Step 1: Confirm no other file depends on the two components being deleted**

Run: `grep -rln "ComboFinder\b" src --include=*.tsx --include=*.ts`
Expected output: only `src/components/RelicsPage.tsx` and `src/components/ComboFinder.tsx` itself (plus a comment mention in `src/components/DamageOptimizer.tsx`, handled in Step 4).

- [ ] **Step 2: Delete the two Combo-Finder-only components**

```bash
git rm src/components/ComboFinder.tsx src/components/ComboFinderSettingsBar.tsx
```

- [ ] **Step 3: Remove the tab from `RelicsPage.tsx`**

In `src/components/RelicsPage.tsx`, remove the `ComboFinder` import (line 7), collapse the `TabIndex` enum to two members, remove the `<Tab>` for Combo Finder, and remove the `{tab === TabIndex.ComboFinder && (...)}` block.

Before:
```tsx
import { CharacterSlotSelect } from "./CharacterSlotSelect";
import { ComboFinder } from "./ComboFinder";
import { DamageOptimizer } from "./DamageOptimizer";
import { RelicBrowser } from "./RelicBrowser";

const enum TabIndex {
  RelicBrowser,
  ComboFinder,
  DamageOptimizer,
}
```

After:
```tsx
import { CharacterSlotSelect } from "./CharacterSlotSelect";
import { DamageOptimizer } from "./DamageOptimizer";
import { RelicBrowser } from "./RelicBrowser";

const enum TabIndex {
  RelicBrowser,
  DamageOptimizer,
}
```

Before (tabs + panels, further down in the same file):
```tsx
      <AppBar position="static" elevation={24}>
        <Tabs value={tab} onChange={(_e, value) => setTab(value)} centered>
          <Tab value={TabIndex.RelicBrowser} label="Relic Browser" />
          <Tab value={TabIndex.ComboFinder} label="Combo Finder" />
          <Tab value={TabIndex.DamageOptimizer} label="ダメージ最適化" />
        </Tabs>
      </AppBar>
      {tab === TabIndex.RelicBrowser && (
        <RelicBrowser
          availableEffects={availableEffects}
          currentSlot={currentSlot}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleMatchingRelicsCountChange={handleMatchingRelicsCountChange}
        />
      )}
      {tab === TabIndex.ComboFinder && (
        <ComboFinder
          saveFileData={saveFileData}
          availableEffects={availableEffects}
          currentSlot={currentSlot}
          selectSlot={selectSlot}
        />
      )}
      {tab === TabIndex.DamageOptimizer && (
        <DamageOptimizer currentSlot={currentSlot} />
      )}
```

After:
```tsx
      <AppBar position="static" elevation={24}>
        <Tabs value={tab} onChange={(_e, value) => setTab(value)} centered>
          <Tab value={TabIndex.RelicBrowser} label="Relic Browser" />
          <Tab value={TabIndex.DamageOptimizer} label="ダメージ最適化" />
        </Tabs>
      </AppBar>
      {tab === TabIndex.RelicBrowser && (
        <RelicBrowser
          availableEffects={availableEffects}
          currentSlot={currentSlot}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleMatchingRelicsCountChange={handleMatchingRelicsCountChange}
        />
      )}
      {tab === TabIndex.DamageOptimizer && (
        <DamageOptimizer currentSlot={currentSlot} />
      )}
```

(The `"Relic Browser"` tab label itself is addressed in Task 4's i18n wiring, not here.)

- [ ] **Step 4: Drop the stale Combo Finder mention in `DamageOptimizer.tsx`**

In `src/components/DamageOptimizer.tsx` around line 365-367:

Before:
```tsx
  // Must-have options are the effects actually present on the player's own
  // relics (like ComboFinder), NOT the full effect enum. effectsArray contains
  // non-relic effects too — e.g. innate character passives such as
```

After:
```tsx
  // Must-have options are the effects actually present on the player's own
  // relics, NOT the full effect enum. effectsArray contains
  // non-relic effects too — e.g. innate character passives such as
```

- [ ] **Step 5: Verify the build and test suite are clean**

Run: `npm run type-check && npm run test -- --run`
Expected: both succeed with no references to the deleted files.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Remove Combo Finder tab, keep shared ComboSearch engine for Damage Optimizer"
```

---

### Task 2: Build the `ja.effects`/`ja.items` generator script (TDD)

**Files:**
- Create: `scripts/generate-i18n-ja.mjs`
- Test: `scripts/generate-i18n-ja.test.mjs`

**Interfaces:**
- Consumes: `buildJpnToEngLookup(sourceLists)` and `matchEffectKeyName(jpnName, jpnToEng, englishToEffectKeyName, overrides)` from `scripts/generate-effect-categories.mjs` (already merged to `main`, safe to import). `extractI18nEnglishEffectStrings(i18nSourceText)` from the same module.
- Produces (consumed by Task 3):
  - `buildItemEngToJpnLookup(itemSourceLists: Array<Record<string, { jpn: string }>>): Map<string, string>` — merges `items_knowledge.json.items` and `special_items.json` (both keyed by English item name, first-wins across the array order given).
  - `extractI18nEnglishItemStrings(i18nSourceText: string): Map<string, string>` — returns `Map<englishText, itemKeyName>` by parsing the `en.items` block (mirrors `extractI18nEnglishEffectStrings`'s effects parsing, but for plain `key: "English Text",` lines instead of `[EffectKey.x]: "..."`).
  - `buildJaEffectsPatch(i18nSourceText, skillsJson, demeritJson, overrides): { patch: Map<effectKeyName, jpnText>, unmatched: string[] }` — for every entry in `skillsJson.skills` (all genres) and `demeritJson.demerit_skills`, resolves the target `EffectKey` name via `matchEffectKeyName`, and — only for `EffectKey` names that do **not** already have a `ja.effects` entry in `i18nSourceText` — adds `effectKeyName -> jpnText` to the patch. Keys already present in `ja.effects` are left untouched (never overwritten). Entries whose `EffectKey` can't be resolved go into `unmatched`.
  - `buildJaItemsPatch(i18nSourceText, itemEngToJpn): { patch: Map<itemKeyName, jpnText>, unmatched: string[] }` — same shape, for items.
  - `applyJaPatch(i18nSourceText, effectsPatch, itemsPatch): string` — returns the new file text with the patches inserted into the `ja.effects` / `ja.items` object literals (alphabetically by key, matching the existing `ja.effects` ordering convention), leaving everything else byte-identical.

- [ ] **Step 1: Write failing tests for the item lookup and item-string-extraction helpers**

```js
// scripts/generate-i18n-ja.test.mjs
import { describe, it, expect } from "vitest";
import {
  buildItemEngToJpnLookup,
  extractI18nEnglishItemStrings,
  buildJaEffectsPatch,
  buildJaItemsPatch,
  applyJaPatch,
} from "./generate-i18n-ja.mjs";

describe("buildItemEngToJpnLookup", () => {
  it("merges multiple eng-keyed sources, first source wins on conflict", () => {
    const lookup = buildItemEngToJpnLookup([
      { "Besmirched Frame": { jpn: "汚れた額" } },
      { "Besmirched Frame": { jpn: "SHOULD NOT WIN" }, "Silver Tear": { jpn: "銀の雫" } },
    ]);
    expect(lookup.get("Besmirched Frame")).toBe("汚れた額");
    expect(lookup.get("Silver Tear")).toBe("銀の雫");
    expect(lookup.size).toBe(2);
  });
});

describe("extractI18nEnglishItemStrings", () => {
  it("maps English item text to its i18n key from the en.items block", () => {
    const source = `
export const resources = {
  en: {
    translation: {
      items: {
        besmirchedFrame: "Besmirched Frame",
        silverTear: "Silver Tear",
      },
      effects: {
        [EffectKey.vigorPlus1]: "Vigor +1",
      },
    },
  },
  ja: {
    translation: {
      items: {},
      effects: {},
    },
  },
};
`;
    const map = extractI18nEnglishItemStrings(source);
    expect(map.get("Besmirched Frame")).toBe("besmirchedFrame");
    expect(map.get("Silver Tear")).toBe("silverTear");
    expect(map.size).toBe(2);
  });
});

describe("buildJaItemsPatch", () => {
  it("only patches items missing from ja.items, using the eng->jpn lookup", () => {
    const source = `
export const resources = {
  en: {
    translation: {
      items: {
        besmirchedFrame: "Besmirched Frame",
        silverTear: "Silver Tear",
      },
    },
  },
  ja: {
    translation: {
      items: {
        silverTear: "既存の翻訳",
      },
    },
  },
};
`;
    const { patch, unmatched } = buildJaItemsPatch(
      source,
      new Map([["Besmirched Frame", "汚れた額"]])
    );
    expect(patch.get("besmirchedFrame")).toBe("汚れた額");
    expect(patch.has("silverTear")).toBe(false); // already translated, left alone
    expect(unmatched).toEqual([]);
  });

  it("reports items with no eng->jpn match as unmatched", () => {
    const source = `
export const resources = {
  en: { translation: { items: { unknownItem: "Unknown Item" } } },
  ja: { translation: { items: {} } },
};
`;
    const { patch, unmatched } = buildJaItemsPatch(source, new Map());
    expect(patch.size).toBe(0);
    expect(unmatched).toEqual(["unknownItem: Unknown Item"]);
  });
});

describe("buildJaEffectsPatch", () => {
  it("resolves RelicHub skill entries to EffectKeys and skips already-translated keys", () => {
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
        [EffectKey.vigorPlus1]: "既存の翻訳",
      },
    },
  },
};
`;
    const skillsJson = {
      genre_order: ["ステータス"],
      skills: {
        ステータス: [
          { jpn: "生命力+1", eng: "Vigor +1" },
          { jpn: "神秘+1", eng: "Arcane +1" },
        ],
      },
    };
    const demeritJson = { demerit_skills: [] };
    const { patch, unmatched } = buildJaEffectsPatch(source, skillsJson, demeritJson, {});
    expect(patch.get("arcanePlus1")).toBe("神秘+1");
    expect(patch.has("vigorPlus1")).toBe(false); // already translated
    expect(unmatched).toEqual([]);
  });
});

describe("applyJaPatch", () => {
  it("inserts new keys into ja.effects and ja.items, alphabetically, leaving existing entries untouched", () => {
    const source = `
export const resources = {
  en: {
    translation: {
      items: { besmirchedFrame: "Besmirched Frame" },
      effects: { [EffectKey.vigorPlus1]: "Vigor +1" },
    },
  },
  ja: {
    translation: {
      items: {},
      effects: {
        [EffectKey.vigorPlus1]: "既存の翻訳",
      },
    },
  },
};
`;
    const result = applyJaPatch(
      source,
      new Map([["arcanePlus1", "神秘+1"]]),
      new Map([["besmirchedFrame", "汚れた額"]])
    );
    expect(result).toContain('[EffectKey.arcanePlus1]: "神秘+1"');
    expect(result).toContain('[EffectKey.vigorPlus1]: "既存の翻訳"');
    expect(result).toContain('besmirchedFrame: "汚れた額"');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/generate-i18n-ja.test.mjs`
Expected: FAIL — `scripts/generate-i18n-ja.mjs` does not exist yet.

- [ ] **Step 3: Implement `scripts/generate-i18n-ja.mjs`**

```js
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import {
  buildJpnToEngLookup,
  extractI18nEnglishEffectStrings,
  matchEffectKeyName,
} from "./generate-effect-categories.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Wording-drift entries this script's matching couldn't resolve automatically,
// filled in iteratively from this script's console output (jpn -> EffectKey name).
// Distinct from generate-effect-categories.mjs's MANUAL_EFFECT_KEY_OVERRIDES:
// that table is about RelicHub skill -> category, this one is about RelicHub
// skill -> the specific EffectKey this i18n generator should attach the jpn text to.
export const MANUAL_JA_EFFECT_OVERRIDES = {};

export function buildItemEngToJpnLookup(itemSourceLists) {
  const lookup = new Map();
  for (const source of itemSourceLists) {
    for (const [engName, entry] of Object.entries(source)) {
      if (engName && entry?.jpn && !lookup.has(engName)) {
        lookup.set(engName, entry.jpn);
      }
    }
  }
  return lookup;
}

export function extractI18nEnglishItemStrings(i18nSourceText) {
  const itemsMarker = "items: {";
  const start = i18nSourceText.indexOf(itemsMarker);
  if (start === -1) {
    throw new Error("Could not locate 'items:' block in i18n source");
  }
  const end = i18nSourceText.indexOf("\n      },", start);
  const block = i18nSourceText.slice(start, end);
  const map = new Map();
  const pattern = /(\w+):\s*"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(block)) !== null) {
    const [, keyName, englishText] = match;
    if (!map.has(englishText)) {
      map.set(englishText, keyName);
    }
  }
  return map;
}

function extractExistingJaKeys(i18nSourceText, blockLabel) {
  const jaStart = i18nSourceText.indexOf("\n  ja:");
  if (jaStart === -1) {
    throw new Error("Could not locate 'ja:' block in i18n source");
  }
  const jaBlock = i18nSourceText.slice(jaStart);
  const { openBrace, closeBrace } = findBlock(jaBlock, blockLabel);
  const inner = jaBlock.slice(openBrace + 1, closeBrace);
  const keys = new Set();
  if (blockLabel === "effects") {
    for (const m of inner.matchAll(/\[EffectKey\.(\w+)\]:/g)) {
      keys.add(m[1]);
    }
  } else {
    for (const m of inner.matchAll(/(\w+):\s*"/g)) {
      keys.add(m[1]);
    }
  }
  return keys;
}

export function buildJaEffectsPatch(i18nSourceText, skillsJson, demeritJson, overrides) {
  const jpnToEng = buildJpnToEngLookup([
    ...Object.values(skillsJson.skills),
    demeritJson.demerit_skills,
  ]);
  const englishToEffectKeyName = extractI18nEnglishEffectStrings(i18nSourceText);
  const existingJaKeys = extractExistingJaKeys(i18nSourceText, "effects");

  const patch = new Map();
  const unmatched = [];

  const allEntries = [
    ...Object.values(skillsJson.skills).flat(),
    ...demeritJson.demerit_skills,
  ];
  for (const entry of allEntries) {
    const effectKeyName = matchEffectKeyName(
      entry.jpn,
      jpnToEng,
      englishToEffectKeyName,
      overrides
    );
    if (!effectKeyName) {
      unmatched.push(`${entry.jpn} (${entry.eng})`);
      continue;
    }
    if (existingJaKeys.has(effectKeyName)) {
      continue;
    }
    if (!patch.has(effectKeyName)) {
      patch.set(effectKeyName, entry.jpn);
    }
  }
  return { patch, unmatched };
}

export function buildJaItemsPatch(i18nSourceText, itemEngToJpn) {
  const englishToItemKeyName = extractI18nEnglishItemStrings(i18nSourceText);
  const existingJaKeys = extractExistingJaKeys(i18nSourceText, "items");

  const patch = new Map();
  const unmatched = [];

  for (const [englishText, keyName] of englishToItemKeyName) {
    if (existingJaKeys.has(keyName)) {
      continue;
    }
    const jpn = itemEngToJpn.get(englishText);
    if (!jpn) {
      unmatched.push(`${keyName}: ${englishText}`);
      continue;
    }
    patch.set(keyName, jpn);
  }
  return { patch, unmatched };
}

// Finds a `label: { ... }` block by counting braces from the first `{`
// after `label:`, so it works whether the block is empty (`items: {}`),
// single-line, or already spread across many lines.
function findBlock(text, label) {
  const marker = `${label}: {`;
  const markerStart = text.indexOf(marker);
  if (markerStart === -1) {
    throw new Error(`Could not find '${label}:' block`);
  }
  const openBrace = markerStart + marker.length - 1;
  let depth = 0;
  let i = openBrace;
  for (; i < text.length; i++) {
    if (text[i] === "{") {
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        break;
      }
    }
  }
  return { start: markerStart, openBrace, closeBrace: i };
}

function rebuildBlock(text, label, patch, formatEntry) {
  if (patch.size === 0) {
    return text;
  }
  const { start, openBrace, closeBrace } = findBlock(text, label);
  const existingEntries = text.slice(openBrace + 1, closeBrace).trim();
  const newLines = [...patch.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `        ${formatEntry(key, value)}`);
  const body = [existingEntries, newLines.join("\n")].filter(Boolean).join("\n");
  const rebuilt = `${label}: {\n${body}\n      }`;
  return text.slice(0, start) + rebuilt + text.slice(closeBrace + 1);
}

export function applyJaPatch(i18nSourceText, effectsPatch, itemsPatch) {
  const jaStart = i18nSourceText.indexOf("\n  ja:");
  const before = i18nSourceText.slice(0, jaStart);
  let jaBlock = i18nSourceText.slice(jaStart);

  jaBlock = rebuildBlock(
    jaBlock,
    "items",
    itemsPatch,
    (key, value) => `${key}: ${JSON.stringify(value)},`
  );
  jaBlock = rebuildBlock(
    jaBlock,
    "effects",
    effectsPatch,
    (key, value) => `[EffectKey.${key}]: ${JSON.stringify(value)},`
  );

  return before + jaBlock;
}

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf-8"));
}

function main() {
  const skillsJson = loadJson("RelicHub/data/skills.json");
  const demeritJson = loadJson("RelicHub/data/demerit.json");
  const itemsKnowledge = loadJson("RelicHub/data/items_knowledge.json");
  const specialItems = loadJson("RelicHub/data/special_items.json");
  const i18nSource = readFileSync(join(ROOT, "src/i18n.ts"), "utf-8");

  const itemEngToJpn = buildItemEngToJpnLookup([itemsKnowledge.items, specialItems]);

  const { patch: effectsPatch, unmatched: unmatchedEffects } = buildJaEffectsPatch(
    i18nSource,
    skillsJson,
    demeritJson,
    MANUAL_JA_EFFECT_OVERRIDES
  );
  const { patch: itemsPatch, unmatched: unmatchedItems } = buildJaItemsPatch(
    i18nSource,
    itemEngToJpn
  );

  const updated = applyJaPatch(i18nSource, effectsPatch, itemsPatch);
  writeFileSync(join(ROOT, "src/i18n.ts"), updated, "utf-8");

  console.log(`Added ${effectsPatch.size} ja.effects entries, ${itemsPatch.size} ja.items entries.`);
  if (unmatchedEffects.length > 0) {
    console.warn(
      `\n${unmatchedEffects.length} RelicHub skill/demerit entries could not be matched to an EffectKey:\n` +
        unmatchedEffects.map((e) => `  - ${e}`).join("\n")
    );
  }
  if (unmatchedItems.length > 0) {
    console.warn(
      `\n${unmatchedItems.length} en.items entries have no RelicHub jpn match:\n` +
        unmatchedItems.map((e) => `  - ${e}`).join("\n")
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/generate-i18n-ja.test.mjs`
Expected: PASS (all `describe` blocks green).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-i18n-ja.mjs scripts/generate-i18n-ja.test.mjs
git commit -m "Add generator script for filling ja.effects/ja.items from RelicHub data"
```

---

### Task 3: Run the generator and hand-translate what's left

**Files:**
- Modify: `src/i18n.ts`
- Modify: `scripts/generate-i18n-ja.mjs` (only if `MANUAL_JA_EFFECT_OVERRIDES` needs entries — see Step 2)

**Interfaces:**
- Consumes: `scripts/generate-i18n-ja.mjs`'s `main()` (run via `node`), and its exported `MANUAL_JA_EFFECT_OVERRIDES` for iterative wording-drift fixes.
- Produces: a fully-populated `ja.effects` (850/850 `EffectKey`s) and `ja.items` (76/76 items) in `src/i18n.ts`, consumed by Task 5's verification.

- [ ] **Step 1: Run the generator against real data**

Run: `node scripts/generate-i18n-ja.mjs`

This auto-fills as many `ja.effects`/`ja.items` entries as RelicHub matching allows and prints two lists to stderr: unmatched effect entries (`jpn (eng)`) and unmatched item entries (`itemKey: English Text`).

- [ ] **Step 2: Recover wording-drift matches via `MANUAL_JA_EFFECT_OVERRIDES`**

For each unmatched effect entry printed in Step 1, check whether its `eng` text is a near-miss of an existing `en.effects` string (different tense/punctuation/casing — the same class of mismatch `generate-effect-categories.mjs`'s `MANUAL_EFFECT_KEY_OVERRIDES` table already documents for the categorization script). Search `src/resources/effectKeys.ts` for the matching `EffectKey`, then add an entry to `MANUAL_JA_EFFECT_OVERRIDES` in `scripts/generate-i18n-ja.mjs`, e.g.:

```js
export const MANUAL_JA_EFFECT_OVERRIDES = {
  "魔力カット率上昇+1": "improvedMagicDamageNegationPlus1",
  // ... one line per recovered wording-drift entry
};
```

Re-run `node scripts/generate-i18n-ja.mjs` after each batch of additions until the unmatched-effects list stops shrinking from further overrides (i.e., only genuinely RelicHub-absent effects remain — deep-relic-only effects, `runes60kAtStart30kOnDeath`, and similar entries with no RelicHub `skills.json`/`demerit.json` counterpart).

- [ ] **Step 3: Hand-translate the remaining unmatched effects directly in `src/i18n.ts`**

For every `EffectKey` still missing from `ja.effects` after Step 2, add an entry by hand. Compute the exact remaining set:

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('src/i18n.ts', 'utf-8');
const jaStart = src.indexOf('\n  ja:');
const enKeys = new Set([...src.slice(0, jaStart).matchAll(/\[EffectKey\.(\w+)\]:/g)].map(m => m[1]));
const jaKeys = new Set([...src.slice(jaStart).matchAll(/\[EffectKey\.(\w+)\]:/g)].map(m => m[1]));
for (const k of enKeys) { if (!jaKeys.has(k)) console.log(k); }
"
```

Translate each listed `EffectKey`'s English text (look it up in `en.effects`) into natural Japanese, following the phrasing conventions already visible in the surrounding `ja.effects` entries (e.g. `"出撃時に「X」を持つ"` for start-of-expedition possession effects, `"[Character] "` → `"【追跡者】"`-style bracketed prefixes for character-specific effects, `"+1"/"+2"/"+3"` suffixes kept verbatim). Insert each new entry alphabetically by `EffectKey` name to match the existing ordering. Watch for:
- Recluse-related text: always write `隠者`, never `陰者`.
- Any effect whose English text closely resembles the Cerulean Hidden Tear / Greenspill Crystal Tear pair — double check against `RelicHub/data/skills.json` directly rather than trusting a loose eng-text guess.

- [ ] **Step 4: Hand-translate the remaining unmatched items directly in `src/i18n.ts`**

Re-run the same style of key-diff check against `ja.items` (swap the `EffectKey` regex for the plain `key:` pattern used in `items`). For each remaining item, translate its English display name using `RelicHub/data/items_knowledge.json` / `special_items.json` as a first reference even for near-miss (non-exact) English text matches, falling back to a direct translation only if the item has no RelicHub counterpart at all.

- [ ] **Step 5: Verify full parity**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('src/i18n.ts', 'utf-8');
const jaStart = src.indexOf('\n  ja:');
const enEffectKeys = new Set([...src.slice(0, jaStart).matchAll(/\[EffectKey\.(\w+)\]:/g)].map(m => m[1]));
const jaEffectKeys = new Set([...src.slice(jaStart).matchAll(/\[EffectKey\.(\w+)\]:/g)].map(m => m[1]));
const missingEffects = [...enEffectKeys].filter(k => !jaEffectKeys.has(k));
console.log('missing ja.effects:', missingEffects.length, missingEffects);

const enItemsBlock = src.slice(src.indexOf('items: {'), src.indexOf('effects: {'));
const enItemKeys = new Set([...enItemsBlock.matchAll(/(\w+):\s*\"/g)].map(m => m[1]));
const jaItemsBlockStart = src.indexOf('items: {', jaStart);
const jaItemsBlock = src.slice(jaItemsBlockStart, src.indexOf('effects: {', jaStart));
const jaItemKeys = new Set([...jaItemsBlock.matchAll(/(\w+):\s*\"/g)].map(m => m[1]));
const missingItems = [...enItemKeys].filter(k => !jaItemKeys.has(k));
console.log('missing ja.items:', missingItems.length, missingItems);
"
```

Expected: both `missing` arrays are empty.

- [ ] **Step 6: Run the full test suite and type-check**

Run: `npm run type-check && npx vitest run scripts/generate-i18n-ja.test.mjs scripts/generate-effect-categories.test.mjs`
Expected: all pass (Task 3 only edits data, not the tested matching logic, so this is a regression check).

- [ ] **Step 7: Commit**

```bash
git add src/i18n.ts scripts/generate-i18n-ja.mjs
git commit -m "Complete ja.effects/ja.items translation coverage (RelicHub-matched + hand-translated)"
```

---

### Task 4: i18n-wire hardcoded English strings in RelicBrowser-adjacent components

**Files:**
- Modify: `src/i18n.ts` (new flat keys, in both `en.translation` and `ja.translation`)
- Modify: `src/components/RelicsPage.tsx` (the two `<Tab label=...>` strings and `t("Character")`'s missing key)
- Modify: `src/components/SearchInput.tsx`
- Modify: `src/components/AdvancedSearchPanel.tsx`
- Modify: `src/components/EffectFilterChip.tsx`
- Modify: `src/components/RelicCard.tsx`
- Modify: `src/components/RelicComparisonModal.tsx`
- Modify: `src/components/RelicDisplay.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 2/3 (independent i18n keys, different part of the file).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the new flat keys to `src/i18n.ts`**

In `en.translation`, right after the existing `features: "Features",` line (still inside the flat top-level block, before `nightfarers: {`):

```ts
      features: "Features",
      relicBrowserTab: "Relic Browser",
      character: "Character",
      searchPlaceholder: "Search relics by name or effect...",
      sellChipLabel: "SELL",
      noAdvancedFiltersActive: "No advanced filters active",
      filtersActiveCountSingular: "{{count}} filter active",
      filtersActiveCountPlural: "{{count}} filters active",
      clearAllButton: "Clear all",
      requiredGroupHint: "Required (each row: relic needs at least one)",
      addEffectPlaceholder: "Add effect...",
      addGroupButton: "Add group",
      excludedGroupHint: "Excluded (relic must have none of these)",
      addExcludedEffectPlaceholder: "Add excluded effect...",
      comparisonAtLeastTooltip: "This level or better (click to switch to 'or below')",
      comparisonAtMostTooltip: "This level or below (click to switch to 'or better')",
      depthsRelicLabel: "Depths Relic",
      relicLabel: "Relic",
      deepRelicsPlural: "deep relics",
      relicsPlural: "relics",
      noRelicsFoundTemplate: "No {{color}}{{type}} found.",
      coordinatesHelpPrefix: "These coordinates can be used to find the relic ingame when sorted by 'Order Found' and filtered by",
      coordinatesHelpMiddle: "and type",
      coordinatesHelpSimple: "These coordinates can be used to find the relic ingame when sorted by 'Order Found'.",
      outclassedText: "This relic is outclassed by a better relic.",
      duplicateText: "This relic is a duplicate.",
      relicComparisonTitle: "Relic Comparison",
      closeButton: "Close",
```

In `ja.translation`, right after `features: "機能",`:

```ts
      features: "機能",
      relicBrowserTab: "リリックブラウザ",
      character: "キャラクター",
      searchPlaceholder: "リリック名または効果で検索...",
      sellChipLabel: "売却",
      noAdvancedFiltersActive: "詳細フィルターは未設定です",
      filtersActiveCountSingular: "{{count}}件のフィルターが有効",
      filtersActiveCountPlural: "{{count}}件のフィルターが有効",
      clearAllButton: "すべてクリア",
      requiredGroupHint: "必須条件（各行：いずれか1つを満たすリリック）",
      addEffectPlaceholder: "効果を追加...",
      addGroupButton: "条件グループを追加",
      excludedGroupHint: "除外条件（以下のいずれも持たないリリック）",
      addExcludedEffectPlaceholder: "除外する効果を追加...",
      comparisonAtLeastTooltip: "この数値以上（クリックで「以下」に切り替え）",
      comparisonAtMostTooltip: "この数値以下（クリックで「以上」に切り替え）",
      depthsRelicLabel: "深層遺物",
      relicLabel: "遺物",
      deepRelicsPlural: "深層遺物",
      relicsPlural: "遺物",
      noRelicsFoundTemplate: "該当する{{color}}{{type}}が見つかりません。",
      coordinatesHelpPrefix: "この座標は、ゲーム内で「発見順」で並び替え、",
      coordinatesHelpMiddle: "、種類",
      coordinatesHelpSimple: "この座標は、ゲーム内で「発見順」で並び替えると確認できます。",
      outclassedText: "このリリックはより優れたリリックにより不要になっています。",
      duplicateText: "このリリックは重複しています。",
      relicComparisonTitle: "リリック比較",
      closeButton: "閉じる",
```

- [ ] **Step 2: Wire `RelicsPage.tsx`**

Before:
```tsx
          label={t("Character")}
```
```tsx
          <Tab value={TabIndex.RelicBrowser} label="Relic Browser" />
```

After:
```tsx
          label={t("character")}
```
```tsx
          <Tab value={TabIndex.RelicBrowser} label={t("relicBrowserTab")} />
```

(The `"ダメージ最適化"` tab label is intentionally left as-is — it's Damage Optimizer's Japanese-fixed UI per that feature's own design, out of this plan's scope.)

- [ ] **Step 3: Wire `SearchInput.tsx`**

Add `import { useTranslation } from "react-i18next";` and `const { t } = useTranslation();` inside the component (alongside the existing `useState`).

Before:
```tsx
          placeholder="Search relics by name or effect..."
```
```tsx
          <Chip label="SELL" size="small" />
```

After:
```tsx
          placeholder={t("searchPlaceholder")}
```
```tsx
          <Chip label={t("sellChipLabel")} size="small" />
```

- [ ] **Step 4: Wire `AdvancedSearchPanel.tsx`**

Add `import { useTranslation } from "react-i18next";` and `const { t } = useTranslation();` inside the component.

Before:
```tsx
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
```
```tsx
            <EffectsAutocomplete
              availableEffects={availableEffects}
              placeholder="Add effect..."
```
```tsx
        <Button size="small" startIcon={<AddIcon />} onClick={addGroup} sx={{ alignSelf: "flex-start" }}>
          Add group
        </Button>
      </Stack>

      <Divider sx={{ my: 1 }} />

      <Typography variant="caption" color="text.secondary">
        Excluded (relic must have none of these)
      </Typography>
```
```tsx
        <EffectsAutocomplete
          availableEffects={availableEffects}
          placeholder="Add excluded effect..."
```

After:
```tsx
        <Typography variant="subtitle2">
          {activeCount === 0
            ? t("noAdvancedFiltersActive")
            : t(activeCount === 1 ? "filtersActiveCountSingular" : "filtersActiveCountPlural", { count: activeCount })}
        </Typography>
        <Button size="small" onClick={clearAll} disabled={activeCount === 0}>
          {t("clearAllButton")}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {t("requiredGroupHint")}
      </Typography>
```
```tsx
            <EffectsAutocomplete
              availableEffects={availableEffects}
              placeholder={t("addEffectPlaceholder")}
```
```tsx
        <Button size="small" startIcon={<AddIcon />} onClick={addGroup} sx={{ alignSelf: "flex-start" }}>
          {t("addGroupButton")}
        </Button>
      </Stack>

      <Divider sx={{ my: 1 }} />

      <Typography variant="caption" color="text.secondary">
        {t("excludedGroupHint")}
      </Typography>
```
```tsx
        <EffectsAutocomplete
          availableEffects={availableEffects}
          placeholder={t("addExcludedEffectPlaceholder")}
```

- [ ] **Step 5: Wire `EffectFilterChip.tsx`**

Before:
```tsx
          title={
            entry.comparison === "atLeast"
              ? "This level or better (click to switch to 'or below')"
              : "This level or below (click to switch to 'or better')"
          }
```

After:
```tsx
          title={
            entry.comparison === "atLeast"
              ? t("comparisonAtLeastTooltip")
              : t("comparisonAtMostTooltip")
          }
```

(`useTranslation`/`t` is already imported and used in this file for the effect label — no new import needed.)

- [ ] **Step 6: Wire `RelicCard.tsx`**

Before:
```tsx
  const tooltipContent = coordinatesByColor ? (
    <Typography component="span" variant="inherit">
      These coordinates can be used to find the relic ingame when sorted by
      'Order Found' and filtered by{" "}
      <Typography
        color={selectedChipColor}
        fontWeight="bold"
        component="span"
        variant="inherit"
      >
        {t(`colors.${selectedColor}`)}
      </Typography>{" "}
      and type{" "}
      <Typography
        color={itemType === ItemType.DeepRelic ? "#76adde" : "text.primary"}
        fontWeight="bold"
        component="span"
        variant="inherit"
      >
        {itemType === ItemType.DeepRelic ? "Depths Relic" : "Relic"}
      </Typography>
      .
    </Typography>
  ) : (
    "These coordinates can be used to find the relic ingame when sorted by 'Order Found'."
  );
```

After:
```tsx
  const tooltipContent = coordinatesByColor ? (
    <Typography component="span" variant="inherit">
      {t("coordinatesHelpPrefix")}{" "}
      <Typography
        color={selectedChipColor}
        fontWeight="bold"
        component="span"
        variant="inherit"
      >
        {t(`colors.${selectedColor}`)}
      </Typography>{" "}
      {t("coordinatesHelpMiddle")}{" "}
      <Typography
        color={itemType === ItemType.DeepRelic ? "#76adde" : "text.primary"}
        fontWeight="bold"
        component="span"
        variant="inherit"
      >
        {itemType === ItemType.DeepRelic ? t("depthsRelicLabel") : t("relicLabel")}
      </Typography>
      .
    </Typography>
  ) : (
    t("coordinatesHelpSimple")
  );
```

Before:
```tsx
            <Chip
              label="SELL"
```

After:
```tsx
            <Chip
              label={t("sellChipLabel")}
```

- [ ] **Step 7: Wire `RelicComparisonModal.tsx`**

Add `import { useTranslation } from "react-i18next";` and `const { t } = useTranslation();` at the top of the component body.

Before:
```tsx
      <DialogTitle>Relic Comparison</DialogTitle>
      <DialogContent dividers>
        {currentRelic.redundant?.outclassed
          ? "This relic is outclassed by a better relic."
          : "This relic is a duplicate."}
```
```tsx
        <Button onClick={onClose} autoFocus>
          Close
        </Button>
```

After:
```tsx
      <DialogTitle>{t("relicComparisonTitle")}</DialogTitle>
      <DialogContent dividers>
        {currentRelic.redundant?.outclassed
          ? t("outclassedText")
          : t("duplicateText")}
```
```tsx
        <Button onClick={onClose} autoFocus>
          {t("closeButton")}
        </Button>
```

- [ ] **Step 8: Wire `RelicDisplay.tsx`**

Before:
```tsx
        <Alert severity="info">{`No ${colorFilter.color !== RelicSlotColor.Any ? t(`colors.${colorFilter.color}`).toLowerCase() : ""} ${colorFilter.type === ItemType.DeepRelic ? "deep relics" : "relics"} found.`}</Alert>
```

After:
```tsx
        <Alert severity="info">
          {t("noRelicsFoundTemplate", {
            color: colorFilter.color !== RelicSlotColor.Any ? `${t(`colors.${colorFilter.color}`)}` : "",
            type: colorFilter.type === ItemType.DeepRelic ? t("deepRelicsPlural") : t("relicsPlural"),
          })}
        </Alert>
```

- [ ] **Step 9: Type-check and build**

Run: `npm run type-check && npm run build`
Expected: both succeed with no TypeScript errors.

- [ ] **Step 10: Manual browser check**

Run: `npm run dev`, open the app, load the demo save data, switch the language to Japanese (via whatever UI toggle exists, or `localStorage.setItem("i18nextLng", "ja")` + reload), and confirm on the Relic Browser tab: the tab label, search placeholder, SELL chip, advanced search panel copy, effect chip tooltips, relic card coordinate tooltip, and the comparison modal are all in Japanese. Confirm the "no relics found" message renders correctly with and without a color filter selected.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "i18n-wire hardcoded English strings in RelicBrowser-adjacent components"
```

---

### Task 5: Final verification

**Files:** none (verification only).

**Interfaces:** consumes the state produced by Tasks 1-4.

- [ ] **Step 1: Full test suite**

Run: `npm run test -- --run`
Expected: all tests pass, including `scripts/generate-i18n-ja.test.mjs` and `scripts/generate-effect-categories.test.mjs`, and the `ComboSearch`/`comboSearchWorker` suites (untouched, still green).

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both clean.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds (this also exercises `wasm-pack build` for the still-present `ComboSearch`/WASM engine).

- [ ] **Step 4: Manual browser smoke test**

Run: `npm run dev`. Confirm:
- The Relic Browser and Damage Optimizer tabs are present; Combo Finder is gone.
- Switching to Japanese shows fully translated relic/effect names on relic cards (spot-check a handful, including at least one from the hand-translated set in Task 3 and one Recluse-related effect to confirm 隠者/not 陰者).
- Damage Optimizer still runs a search successfully (confirms the shared `ComboSearch` engine survived the Combo Finder removal untouched).

No commit for this task — it's a verification-only gate before considering the plan complete.
