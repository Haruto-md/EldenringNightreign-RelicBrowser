# Auto Relic Sell/Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user identify redundant/unwanted relics (demerit-aware), select which ones to remove, and download a modified save file with those relics deleted.

**Architecture:** Extends the existing detection pipeline (`RelicProcessor.findOutclassedRelics` → `filterSell` UI) with a demerit-aware comparison rewrite, a selection UI built on the existing sell-candidate filter, and a new save-file write-back engine (`SaveFileEncryptor`) that overwrites selected relic slots in place with the confirmed empty-slot byte pattern and re-encrypts only the affected BND4 entries, leaving file layout untouched.

**Tech Stack:** TypeScript, React, MUI, vitest, Web Crypto API (`crypto.subtle`, AES-CBC).

## Global Constraints

- Unique relics (`uniqueItemIds`) and shop-bought relics (`unsellableItemIds`, which already includes `uniqueItemIds`) must never be selectable or deletable, at every layer (detection, UI, write-back).
- `cleanData` length must never change — deletion is an in-place overwrite, not a shrink/shift. This keeps BND4 header/offsets untouched.
- The confirmed empty-slot pattern is `00 00 00 00 FF FF FF FF` repeated to fill the slot (8-byte unit, verified against an 80-byte slot from real before/after save data).
- All new save-file-writing code must be covered by a round-trip test using the existing repo fixtures (`src/test/10slots.sl2`) before being considered done — never commit personal save files (e.g. anything under `selling-verification/`) to the repo.
- UI text is English-first (`src/i18n.ts` `en:` block); there is no `ja:` block in this repo, do not add one (established project convention).

---

### Task 1: Demerit-aware redundant/outclassed detection

**Files:**
- Modify: `src/utils/RelicProcessor.ts`
- Test: `src/utils/RelicProcessor.test.ts`

**Interfaces:**
- Consumes: `Effect` type from `../resources/effects`, `RelicSlot`/`EffectWithOptionalDebuff` from `../types/SaveFile`, `getEffectGroup` from `./DataUtils`.
- Produces: `findBetterRelic(relic, relics)` keeps its existing signature and return type (`RelicSlot["redundant"] = { relic: RelicSlot; outclassed: boolean } | undefined`); `sortRelicsByColor` and `findOutclassedRelics` are unchanged. No other task depends on new exports from this file.

- [ ] **Step 1: Write the failing tests**

Add to `src/utils/RelicProcessor.test.ts`, inside the existing `describe("findBetterRelic", ...)` block:

```ts
    it("should not treat a relic as redundant when the only equal-or-better relic adds a demerit it doesn't have", () => {
      const relic: RelicSlot = {
        id: 1,
        effects: [[getEffect(7000201)]],
        itemId: 104,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const relicWithDemerit: RelicSlot = {
        id: 2,
        effects: [[getEffect(7000201), getEffect(6840000)]],
        itemId: 107,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const redundant = findBetterRelic(relic, [relic, relicWithDemerit]);
      expect(redundant).toBeUndefined();
    });

    it("should mark a relic with a demerit as outclassed by an otherwise identical relic without it", () => {
      const relicWithDemerit: RelicSlot = {
        id: 1,
        effects: [[getEffect(7000201), getEffect(6840000)]],
        itemId: 104,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const cleanRelic: RelicSlot = {
        id: 2,
        effects: [[getEffect(7000201)]],
        itemId: 107,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const redundant = findBetterRelic(relicWithDemerit, [
        relicWithDemerit,
        cleanRelic,
      ]);
      expect(redundant?.relic).toBe(cleanRelic);
      expect(redundant?.outclassed).toBe(true);
    });

    it("should not treat two relics with different demerits on the same effect as redundant", () => {
      const relicA: RelicSlot = {
        id: 1,
        effects: [[getEffect(7000201), getEffect(6840000)]],
        itemId: 104,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const relicB: RelicSlot = {
        id: 2,
        effects: [[getEffect(7000201), getEffect(6830400)]],
        itemId: 107,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const redundant = findBetterRelic(relicA, [relicA, relicB]);
      expect(redundant).toBeUndefined();
    });
```

(`6840000` = `reducedRuneAcquisition`, `6830400` = `reducedVigorAndArcane` — both are real registered demerit effect ids in `src/resources/effects.ts`, so `getEffect` returns stable object references for them.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/RelicProcessor.test.ts`
Expected: the 3 new tests FAIL (the existing 3 tests still pass) — the first fails because `redundant` is currently defined when it shouldn't be, the second fails because `outclassed` is currently `false`, the third fails because `redundant` is currently defined.

- [ ] **Step 3: Rewrite `findBetterRelic` to compare demerits**

Replace the full contents of `findBetterRelic` in `src/utils/RelicProcessor.ts` with:

```ts
function compareDebuffs(
  originalDebuff: Effect | undefined,
  candidateDebuff: Effect | undefined
): { comparable: boolean; better: boolean } {
  if (originalDebuff === undefined && candidateDebuff === undefined) {
    return { comparable: true, better: false };
  }
  if (originalDebuff === undefined && candidateDebuff !== undefined) {
    // The candidate adds a demerit the original doesn't have - strictly worse, not comparable.
    return { comparable: false, better: false };
  }
  if (originalDebuff !== undefined && candidateDebuff === undefined) {
    // The candidate removes the demerit - strictly better.
    return { comparable: true, better: true };
  }
  if (originalDebuff === candidateDebuff) {
    return { comparable: true, better: false };
  }
  // Different demerits aren't rankable against each other.
  return { comparable: false, better: false };
}

export function findBetterRelic(
  relic: RelicSlot,
  relics: RelicSlot[]
): RelicSlot["redundant"] {
  const relicsWithEnoughEffects = relics.filter(
    (r) => r.effects.length >= relic.effects.length
  );

  const betterOrEqualRelic = relicsWithEnoughEffects.find((r) => {
    if (relic === r) {
      return false;
    }

    return relic.effects.every(([effect, debuff]) => {
      const effectGroup = getEffectGroup(effect);

      return r.effects.some(([otherEffect, otherDebuff]) => {
        const effectMatches = effectGroup
          ? (() => {
              const otherEffectGroup = getEffectGroup(otherEffect);
              return (
                otherEffectGroup !== undefined &&
                otherEffectGroup.group === effectGroup.group &&
                otherEffectGroup.level >= effectGroup.level
              );
            })()
          : otherEffect === effect;

        return effectMatches && compareDebuffs(debuff, otherDebuff).comparable;
      });
    });
  });

  if (!betterOrEqualRelic) {
    return undefined;
  }

  // Determine if the relic is outclassed
  let outclassed = false;

  if (betterOrEqualRelic.effects.length > relic.effects.length) {
    outclassed = true;
  } else {
    for (const [effect, debuff] of relic.effects) {
      const effectGroup = getEffectGroup(effect);

      const matchingPair = betterOrEqualRelic.effects.find(
        ([otherEffect]) => {
          if (!effectGroup) {
            return otherEffect === effect;
          }
          const otherEffectGroup = getEffectGroup(otherEffect);
          return (
            otherEffectGroup !== undefined &&
            otherEffectGroup.group === effectGroup.group
          );
        }
      );

      if (effectGroup && matchingPair) {
        const otherEffectGroup = getEffectGroup(matchingPair[0]);
        if (otherEffectGroup && otherEffectGroup.level > effectGroup.level) {
          outclassed = true;
          break;
        }
      }

      if (matchingPair && compareDebuffs(debuff, matchingPair[1]).better) {
        outclassed = true;
        break;
      }
    }
  }

  return { relic: betterOrEqualRelic, outclassed };
}
```

Add `type Effect` to the existing import from `../resources/items`'s sibling import line — i.e. add this import near the top of the file (it isn't imported yet):

```ts
import type { Effect } from "../resources/effects";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/RelicProcessor.test.ts`
Expected: all 6 tests (3 existing + 3 new) PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/RelicProcessor.ts src/utils/RelicProcessor.test.ts
git commit -m "fix: make redundant/outclassed relic detection demerit-aware"
```

---

### Task 2: Track each relic slot's absolute byte offset

**Files:**
- Modify: `src/types/SaveFile.ts`
- Modify: `src/utils/RelicParser.ts`
- Modify: `src/test/SaveFile.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `RelicSlot.byteOffset?: number` — the absolute offset of the slot's first byte within its owning BND4 entry's `cleanData`. `RelicSlot.slotSize?: number` — the slot's byte length (`80` for the `0xc0`-tagged slots this app parses). Task 3 relies on both fields being present for any `RelicSlot` produced by `RelicParser.parseCharacterSlot`.

- [ ] **Step 1: Write the failing test**

Add to `src/test/SaveFile.test.ts`, as a new `it` inside the `describe("Save File Processing", ...)` → `describe(`Testing ${testEntry.name}`, ...)` block (after the existing "should parse relics with valid structure" test):

```ts
      it("should record each relic's absolute byte offset and slot size", () => {
        const names = RelicParser.getNames(bnd4Entries[10]);
        const slot = RelicParser.parseCharacterSlot(names[0], bnd4Entries[0]);
        if (slot.relics.length === 0) {
          return;
        }
        for (const relic of slot.relics) {
          expect(relic.byteOffset).toBeTypeOf("number");
          expect(relic.slotSize).toBe(80);
          // The slot's id bytes (first 4 bytes of the slot) must be readable
          // back out of cleanData at byteOffset.
          const idAtOffset = bnd4Entries[0].cleanData
            .slice(relic.byteOffset!, relic.byteOffset! + 4)
            .reduce((acc, byte, i) => acc | (byte << (8 * i)), 0) >>> 0;
          expect(idAtOffset).toBe(relic.id);
        }
      });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/SaveFile.test.ts -t "byte offset"`
Expected: FAIL — `relic.byteOffset` is `undefined`.

- [ ] **Step 3: Add the fields and populate them**

In `src/types/SaveFile.ts`, add to the `RelicSlot` interface:

```ts
export interface RelicSlot {
  id: number;
  itemId: number;
  effects: EffectWithOptionalDebuff[];
  coordinates: [row: number, column: number];
  coordinatesByColor: [row: number, column: number];
  sortKey?: number;
  idBytes?: Uint8Array;
  redundant?: { relic: RelicSlot; outclassed: boolean };
  byteOffset?: number;
  slotSize?: number;
}
```

In `src/utils/RelicParser.ts`, inside `parseRelics`, the `slotInfo` object is built right after `itemId`/`effects` are computed (in the `if (b4 === 0xc0)` branch). Update it to:

```ts
              const slotInfo: RelicSlot = {
                id,
                itemId,
                effects,
                idBytes,
                // coordinates will be set later
                coordinates: [0, 0],
                coordinatesByColor: [0, 0],
                byteOffset: patternOffsetStart + i,
                slotSize,
              };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/SaveFile.test.ts -t "byte offset"`
Expected: PASS.

- [ ] **Step 5: Run the full save-file test suite to check for regressions**

Run: `npx vitest run src/test/SaveFile.test.ts`
Expected: all tests PASS (no existing assertion depends on the exact shape of `RelicSlot` beyond the fields it already checks).

- [ ] **Step 6: Commit**

```bash
git add src/types/SaveFile.ts src/utils/RelicParser.ts src/test/SaveFile.test.ts
git commit -m "feat: track each relic slot's absolute byte offset and size"
```

---

### Task 3: Save-file write-back engine (`SaveFileEncryptor`)

**Files:**
- Create: `src/utils/SaveFileEncryptor.ts`
- Test: `src/utils/SaveFileEncryptor.test.ts`

**Interfaces:**
- Consumes: `BND4Entry` from `../types/SaveFile` (needs `.rawData`, `.dataOffset`, `.cleanData`, `.index`, all already present on the type). `RelicSlot.byteOffset`/`.slotSize` from Task 2.
- Produces:
  - `export const EMPTY_SLOT_PATTERN: Uint8Array` (8 bytes: `00 00 00 00 FF FF FF FF`).
  - `export function eraseRelicSlot(cleanData: Uint8Array, byteOffset: number, slotSize: number): Uint8Array` — returns a new `Uint8Array` (same length as input) with the given region overwritten.
  - `export class SaveFileEncryptor { static async writeRelicDeletions(deletions: { entry: BND4Entry; byteOffset: number; slotSize: number }[]): Promise<Uint8Array> }` — Task 5 calls this with the user's selected relics and gets back the full modified raw save file buffer.

- [ ] **Step 1: Write the failing test**

Create `src/utils/SaveFileEncryptor.test.ts`:

```ts
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { RelicParser } from "./RelicParser";
import { SaveFileDecryptor } from "./SaveFileDecryptor";
import { eraseRelicSlot, EMPTY_SLOT_PATTERN, SaveFileEncryptor } from "./SaveFileEncryptor";

describe("SaveFileEncryptor", () => {
  describe("eraseRelicSlot", () => {
    it("fills the given region with the repeated empty-slot pattern", () => {
      const cleanData = new Uint8Array(24).fill(0xaa);
      const result = eraseRelicSlot(cleanData, 8, 16);

      expect(result.slice(0, 8)).toEqual(new Uint8Array(8).fill(0xaa));
      for (let i = 8; i < 24; i += EMPTY_SLOT_PATTERN.length) {
        expect(result.slice(i, i + EMPTY_SLOT_PATTERN.length)).toEqual(
          EMPTY_SLOT_PATTERN
        );
      }
      // Original buffer must not be mutated.
      expect(cleanData.slice(8, 16)).toEqual(new Uint8Array(8).fill(0xaa));
    });
  });

  describe("writeRelicDeletions", () => {
    it("deletes exactly the targeted relic and leaves every other relic unchanged", async () => {
      const filePath = path.join(__dirname, "..", "test", "10slots.sl2");
      const fileBuffer = fs.readFileSync(filePath);
      const rawFile = new Uint8Array(
        fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        )
      );

      const bnd4Entries = await SaveFileDecryptor.decryptSaveFile(rawFile.buffer);
      const names = RelicParser.getNames(bnd4Entries[10]);
      const before = RelicParser.parseCharacterSlot(names[0], bnd4Entries[0]);
      expect(before.relics.length).toBeGreaterThan(0);

      const target = before.relics[0];
      expect(target.byteOffset).toBeTypeOf("number");
      expect(target.slotSize).toBe(80);

      const modifiedRawFile = await SaveFileEncryptor.writeRelicDeletions([
        {
          entry: bnd4Entries[0],
          byteOffset: target.byteOffset!,
          slotSize: target.slotSize!,
        },
      ]);

      // The BND4 header and entry table must be untouched.
      expect(modifiedRawFile.length).toBe(rawFile.length);
      expect(modifiedRawFile.slice(0, 64)).toEqual(rawFile.slice(0, 64));

      const reDecryptedEntries = await SaveFileDecryptor.decryptSaveFile(
        modifiedRawFile.buffer
      );
      const afterNames = RelicParser.getNames(reDecryptedEntries[10]);
      const after = RelicParser.parseCharacterSlot(
        afterNames[0],
        reDecryptedEntries[0]
      );

      expect(after.relics.length).toBe(before.relics.length - 1);
      const afterIds = new Set(after.relics.map((r) => r.id));
      expect(afterIds.has(target.id)).toBe(false);

      const beforeIdsMinusTarget = before.relics
        .filter((r) => r.id !== target.id)
        .map((r) => r.id)
        .sort();
      expect([...afterIds].sort()).toEqual(beforeIdsMinusTarget);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/SaveFileEncryptor.test.ts`
Expected: FAIL with a module-not-found error (`./SaveFileEncryptor` doesn't exist yet).

- [ ] **Step 3: Implement `SaveFileEncryptor`**

Create `src/utils/SaveFileEncryptor.ts`:

```ts
import type { BND4Entry } from "../types/SaveFile";

const DS2_KEY = new Uint8Array([
  0x18, 0xf6, 0x32, 0x66, 0x05, 0xbd, 0x17, 0x8a, 0x55, 0x24, 0x52, 0x3a, 0xc0,
  0xa0, 0xc6, 0x09,
]);

const IV_SIZE = 0x10;

// Confirmed against real before/after save data (see docs/superpowers/specs/
// 2026-07-27-auto-relic-sell-design.md): a deleted relic's 80-byte slot is
// overwritten in place with this 8-byte pattern repeated to fill the slot.
export const EMPTY_SLOT_PATTERN = new Uint8Array([
  0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff,
]);

export function eraseRelicSlot(
  cleanData: Uint8Array,
  byteOffset: number,
  slotSize: number
): Uint8Array {
  const result = new Uint8Array(cleanData);
  for (let offset = 0; offset < slotSize; offset += EMPTY_SLOT_PATTERN.length) {
    result.set(EMPTY_SLOT_PATTERN, byteOffset + offset);
  }
  return result;
}

interface RelicDeletion {
  entry: BND4Entry;
  byteOffset: number;
  slotSize: number;
}

export class SaveFileEncryptor {
  private static writeUint32LE(value: number): Uint8Array {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, value, true);
    return buf;
  }

  /**
   * Re-encrypts a single BND4 entry's plaintext with a fresh random IV.
   * The 4-byte length prefix that SaveFileDecryptor strips off on decrypt
   * is reconstructed from newCleanData's own length here.
   */
  private static async reEncryptEntry(
    newCleanData: Uint8Array
  ): Promise<Uint8Array> {
    const prefix = this.writeUint32LE(newCleanData.length);
    const plaintext = new Uint8Array(prefix.length + newCleanData.length);
    plaintext.set(prefix, 0);
    plaintext.set(newCleanData, prefix.length);

    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      DS2_KEY,
      { name: "AES-CBC" },
      false,
      ["encrypt"]
    );
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, plaintext)
    );

    const result = new Uint8Array(iv.length + ciphertext.length);
    result.set(iv, 0);
    result.set(ciphertext, iv.length);
    return result;
  }

  /**
   * Given a set of relic-slot deletions, returns a full copy of the raw save
   * file with each targeted slot erased and its owning BND4 entry
   * re-encrypted in place. cleanData length never changes, so entry sizes
   * and the BND4 header/offset table are left untouched.
   */
  public static async writeRelicDeletions(
    deletions: RelicDeletion[]
  ): Promise<Uint8Array> {
    const rawFile = deletions[0].entry.rawData;
    const output = new Uint8Array(rawFile);

    const deletionsByEntryIndex = new Map<number, RelicDeletion[]>();
    for (const deletion of deletions) {
      const existing = deletionsByEntryIndex.get(deletion.entry.index);
      if (existing) {
        existing.push(deletion);
      } else {
        deletionsByEntryIndex.set(deletion.entry.index, [deletion]);
      }
    }

    for (const entryDeletions of deletionsByEntryIndex.values()) {
      const entry = entryDeletions[0].entry;
      let newCleanData = entry.cleanData;
      for (const { byteOffset, slotSize } of entryDeletions) {
        newCleanData = eraseRelicSlot(newCleanData, byteOffset, slotSize);
      }
      const newEncryptedData = await this.reEncryptEntry(newCleanData);
      output.set(newEncryptedData, entry.dataOffset);
    }

    return output;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/SaveFileEncryptor.test.ts`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/SaveFileEncryptor.ts src/utils/SaveFileEncryptor.test.ts
git commit -m "feat: add SaveFileEncryptor to write relic deletions back to a save file"
```

---

### Task 4: Sell-candidate selection logic and panel

**Files:**
- Create: `src/utils/SellCandidates.ts`
- Test: `src/utils/SellCandidates.test.ts`
- Create: `src/components/SellCandidatesPanel.tsx`
- Modify: `src/components/RelicBrowser.tsx`
- Modify: `src/i18n.ts`

**Interfaces:**
- Consumes: `RelicSlot` from `../types/SaveFile`, `unsellableItemIds` from `../resources/items`.
- Produces:
  - `getSellCandidates(relics: RelicSlot[]): RelicSlot[]`
  - `createDefaultSelection(candidates: RelicSlot[]): Set<number>`
  - `toggleSelection(selected: Set<number>, relicId: number): Set<number>`
  - `<SellCandidatesPanel relics={RelicSlot[]} onSelectionChange={(selected: RelicSlot[]) => void} />` — Task 5 consumes `onSelectionChange` to know which relics to delete.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/SellCandidates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { RelicSlot } from "../types/SaveFile";
import {
  createDefaultSelection,
  getSellCandidates,
  toggleSelection,
} from "./SellCandidates";

function makeRelic(overrides: Partial<RelicSlot> & { id: number; itemId: number }): RelicSlot {
  return {
    effects: [],
    coordinates: [0, 0],
    coordinatesByColor: [0, 0],
    ...overrides,
  };
}

describe("getSellCandidates", () => {
  it("only includes redundant relics that are not unsellable", () => {
    const redundant = makeRelic({
      id: 1,
      itemId: 104, // ordinary sellable item id used elsewhere in tests
      redundant: { relic: makeRelic({ id: 2, itemId: 107 }), outclassed: false },
    });
    const notRedundant = makeRelic({ id: 3, itemId: 104 });
    const unsellableButRedundant = makeRelic({
      id: 4,
      itemId: 1520, // present in unsellableItemIds
      redundant: { relic: makeRelic({ id: 5, itemId: 104 }), outclassed: false },
    });

    const candidates = getSellCandidates([
      redundant,
      notRedundant,
      unsellableButRedundant,
    ]);

    expect(candidates.map((r) => r.id)).toEqual([1]);
  });
});

describe("createDefaultSelection", () => {
  it("selects every candidate by default", () => {
    const candidates = [
      makeRelic({ id: 1, itemId: 104 }),
      makeRelic({ id: 2, itemId: 104 }),
    ];
    const selection = createDefaultSelection(candidates);
    expect(selection).toEqual(new Set([1, 2]));
  });
});

describe("toggleSelection", () => {
  it("removes an id that is selected and adds one that isn't, without mutating the input", () => {
    const original = new Set([1, 2]);

    const removed = toggleSelection(original, 1);
    expect(removed).toEqual(new Set([2]));
    expect(original).toEqual(new Set([1, 2]));

    const added = toggleSelection(original, 3);
    expect(added).toEqual(new Set([1, 2, 3]));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/SellCandidates.test.ts`
Expected: FAIL with a module-not-found error.

- [ ] **Step 3: Implement the pure selection logic**

Create `src/utils/SellCandidates.ts`:

```ts
import { unsellableItemIds } from "../resources/items";
import type { RelicSlot } from "../types/SaveFile";

export function getSellCandidates(relics: RelicSlot[]): RelicSlot[] {
  return relics.filter(
    (relic) =>
      relic.redundant !== undefined && !unsellableItemIds.includes(relic.itemId)
  );
}

export function createDefaultSelection(candidates: RelicSlot[]): Set<number> {
  return new Set(candidates.map((relic) => relic.id));
}

export function toggleSelection(
  selected: Set<number>,
  relicId: number
): Set<number> {
  const next = new Set(selected);
  if (next.has(relicId)) {
    next.delete(relicId);
  } else {
    next.add(relicId);
  }
  return next;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/SellCandidates.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 5: Add i18n labels**

In `src/i18n.ts`, inside `resources.en.translation`, add near `sellChipLabel`:

```ts
      sellCandidatesTitle: "Sell candidates ({{count}})",
      sellCandidatesSelectAll: "Select all",
      sellCandidatesSelectNone: "Select none",
```

- [ ] **Step 6: Build the panel component**

Create `src/components/SellCandidatesPanel.tsx`:

```tsx
import { Box, Button, Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RelicSlot } from "../types/SaveFile";
import { getItemName } from "../utils/DataUtils";
import {
  createDefaultSelection,
  getSellCandidates,
  toggleSelection,
} from "../utils/SellCandidates";

interface SellCandidatesPanelProps {
  relics: RelicSlot[];
  onSelectionChange: (selected: RelicSlot[]) => void;
}

export function SellCandidatesPanel({
  relics,
  onSelectionChange,
}: SellCandidatesPanelProps) {
  const { t } = useTranslation();
  const candidates = getSellCandidates(relics);
  const candidateIds = candidates.map((relic) => relic.id);
  const candidateIdsKey = candidateIds.join(",");

  const [selected, setSelected] = useState<Set<number>>(() =>
    createDefaultSelection(candidates)
  );
  const [syncedKey, setSyncedKey] = useState(candidateIdsKey);

  if (candidateIdsKey !== syncedKey) {
    setSyncedKey(candidateIdsKey);
    setSelected(createDefaultSelection(candidates));
  }

  useEffect(() => {
    onSelectionChange(candidates.filter((relic) => selected.has(relic.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, candidateIdsKey]);

  return (
    <Box component="section" aria-label="Sell candidates">
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">
          {t("sellCandidatesTitle", { count: candidates.length })}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => setSelected(new Set(candidateIds))}>
            {t("sellCandidatesSelectAll")}
          </Button>
          <Button size="small" onClick={() => setSelected(new Set())}>
            {t("sellCandidatesSelectNone")}
          </Button>
        </Stack>
      </Stack>
      <Stack>
        {candidates.map((relic) => (
          <FormControlLabel
            key={relic.id}
            control={
              <Checkbox
                checked={selected.has(relic.id)}
                onChange={() => setSelected((prev) => toggleSelection(prev, relic.id))}
              />
            }
            label={getItemName(relic.itemId)}
          />
        ))}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 7: Wire the panel into `RelicBrowser`**

In `src/components/RelicBrowser.tsx`, add the import:

```ts
import { SellCandidatesPanel } from "./SellCandidatesPanel";
```

Add a new piece of state near the other `useState` calls:

```ts
  const [selectedForSale, setSelectedForSale] = useState<
    CharacterSlot["relics"]
  >([]);
```

Render the panel conditionally right after the `<SearchInput ... />` element, only while `filterSell` is on:

```tsx
      {filterSell && (
        <SellCandidatesPanel
          relics={currentSlot.relics}
          onSelectionChange={setSelectedForSale}
        />
      )}
```

(`selectedForSale` isn't consumed yet — Task 5 wires it to the delete/download flow. This step only needs to compile and render; no new test is added here since `RelicBrowser.tsx` has no existing test file, consistent with the rest of the codebase's convention of testing logic in `utils/`, not presentational components.)

- [ ] **Step 8: Manually verify in the browser**

Run: `npm run dev`, load the demo data, toggle "Sell" filter, confirm the panel appears with a checkable list and select-all/none buttons work.

- [ ] **Step 9: Commit**

```bash
git add src/utils/SellCandidates.ts src/utils/SellCandidates.test.ts src/components/SellCandidatesPanel.tsx src/components/RelicBrowser.tsx src/i18n.ts
git commit -m "feat: add sell-candidate selection panel"
```

---

### Task 5: Confirm-and-download delete flow

**Files:**
- Create: `src/utils/DownloadSaveFile.ts`
- Test: `src/utils/DownloadSaveFile.test.ts`
- Modify: `src/components/RelicBrowser.tsx`
- Modify: `src/i18n.ts`

**Interfaces:**
- Consumes: `SaveFileEncryptor.writeRelicDeletions` (Task 3), `SellCandidatesPanel`'s `onSelectionChange` (Task 4), `SaveFileData.bnd4Entries` (existing).
- Produces: `buildDeletionPlan(selectedRelics: RelicSlot[], entry: BND4Entry): { entry: BND4Entry; byteOffset: number; slotSize: number }[]` — the only new piece of pure, independently-testable logic in this task. The rest (dialog, actual file download) is DOM-only wiring, verified manually.

- [ ] **Step 1: Write the failing test**

Create `src/utils/DownloadSaveFile.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { BND4Entry, RelicSlot } from "../types/SaveFile";
import { buildDeletionPlan } from "./DownloadSaveFile";

function makeEntry(index: number): BND4Entry {
  return {
    index,
    size: 0,
    dataOffset: 0,
    footerLength: 0,
    rawData: new Uint8Array(),
    encryptedData: new Uint8Array(),
    iv: new Uint8Array(),
    encryptedPayload: new Uint8Array(),
    cleanData: new Uint8Array(),
    name: `USERDATA_${index}`,
    decrypted: true,
  };
}

function makeRelic(id: number, byteOffset: number, slotSize: number): RelicSlot {
  return {
    id,
    itemId: 104,
    effects: [],
    coordinates: [0, 0],
    coordinatesByColor: [0, 0],
    byteOffset,
    slotSize,
  };
}

describe("buildDeletionPlan", () => {
  it("pairs every selected relic with its owning entry and its own offset/size", () => {
    const entry = makeEntry(3);
    const relics = [makeRelic(1, 80, 80), makeRelic(2, 160, 80)];

    const plan = buildDeletionPlan(relics, entry);

    expect(plan).toEqual([
      { entry, byteOffset: 80, slotSize: 80 },
      { entry, byteOffset: 160, slotSize: 80 },
    ]);
  });

  it("skips a relic that has no recorded byte offset instead of producing an invalid entry", () => {
    const entry = makeEntry(0);
    const relics = [makeRelic(1, 80, 80), { ...makeRelic(2, 0, 0), byteOffset: undefined }];

    const plan = buildDeletionPlan(relics, entry);

    expect(plan).toEqual([{ entry, byteOffset: 80, slotSize: 80 }]);
  });

  it("never includes an unsellable item id, even if the caller passed one in", () => {
    const entry = makeEntry(0);
    const unsellableRelic = { ...makeRelic(1, 80, 80), itemId: 1520 }; // present in unsellableItemIds
    const sellableRelic = makeRelic(2, 160, 80);

    const plan = buildDeletionPlan([unsellableRelic, sellableRelic], entry);

    expect(plan).toEqual([{ entry, byteOffset: 160, slotSize: 80 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/DownloadSaveFile.test.ts`
Expected: FAIL with a module-not-found error.

- [ ] **Step 3: Implement `buildDeletionPlan` and the download helper**

Create `src/utils/DownloadSaveFile.ts`:

```ts
import { unsellableItemIds } from "../resources/items";
import type { BND4Entry, RelicSlot } from "../types/SaveFile";

export function buildDeletionPlan(
  selectedRelics: RelicSlot[],
  entry: BND4Entry
): { entry: BND4Entry; byteOffset: number; slotSize: number }[] {
  return selectedRelics
    .filter((relic) => !unsellableItemIds.includes(relic.itemId))
    .filter(
      (relic): relic is RelicSlot & { byteOffset: number; slotSize: number } =>
        relic.byteOffset !== undefined && relic.slotSize !== undefined
    )
    .map((relic) => ({
      entry,
      byteOffset: relic.byteOffset,
      slotSize: relic.slotSize,
    }));
}

export function downloadSaveFile(data: Uint8Array, fileName: string): void {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/DownloadSaveFile.test.ts`
Expected: both tests PASS.

- [ ] **Step 5: Add i18n labels**

In `src/i18n.ts`, inside `resources.en.translation`, add:

```ts
      deleteSelectedButton: "Delete selected and download save file",
      deleteConfirmTitle: "Confirm relic deletion",
      deleteConfirmBody: "The following {{count}} relics will be permanently removed from the downloaded save file. This does not modify your original save file.",
      deleteConfirmCancel: "Cancel",
      deleteConfirmProceed: "Delete and download",
```

- [ ] **Step 6: Wire the confirm dialog and downloads into `RelicBrowser`**

In `src/components/RelicBrowser.tsx`, add imports:

```ts
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem } from "@mui/material";
import { SaveFileEncryptor } from "../utils/SaveFileEncryptor";
import { buildDeletionPlan, downloadSaveFile } from "../utils/DownloadSaveFile";
```

`RelicBrowser` needs the current slot's owning `BND4Entry` and the original raw file name to build downloads. Add two new props to `RelicBrowserProps`:

```ts
  currentEntry?: BND4Entry;
  saveFileName?: string;
```

(The caller, `App.tsx`, already holds `saveFileData.bnd4Entries` and `saveFileData.currentSlot`; pass `saveFileData.bnd4Entries?.[saveFileData.currentSlot]` and `saveFileData.filePath` down as these two new props alongside the other `RelicBrowser` props it already sets. `BND4Entry` needs importing from `../types/SaveFile` in `RelicBrowser.tsx` too.)

Add state and a handler inside `RelicBrowser`:

```ts
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmDelete = async () => {
    if (!currentEntry) {
      return;
    }
    const plan = buildDeletionPlan(selectedForSale, currentEntry);
    const modified = await SaveFileEncryptor.writeRelicDeletions(plan);
    downloadSaveFile(currentEntry.rawData, `${saveFileName ?? "save"}.backup.sl2`);
    downloadSaveFile(modified, saveFileName ?? "save.sl2");
    setConfirmOpen(false);
  };
```

Render the button and dialog right after the `<SellCandidatesPanel ... />` block:

```tsx
      {filterSell && selectedForSale.length > 0 && (
        <Button variant="contained" onClick={() => setConfirmOpen(true)}>
          {t("deleteSelectedButton")}
        </Button>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
        <DialogContent>
          <p>{t("deleteConfirmBody", { count: selectedForSale.length })}</p>
          <List>
            {selectedForSale.map((relic) => (
              <ListItem key={relic.id}>
                {getItemName(relic.itemId)} ({relic.coordinates[0]}, {relic.coordinates[1]})
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>
            {t("deleteConfirmCancel")}
          </Button>
          <Button variant="contained" onClick={handleConfirmDelete}>
            {t("deleteConfirmProceed")}
          </Button>
        </DialogActions>
      </Dialog>
```

- [ ] **Step 7: Update the caller**

In `src/App.tsx`, find where `<RelicBrowser ... />` is rendered and add the two new props:

```tsx
        currentEntry={saveFileData.bnd4Entries?.[saveFileData.currentSlot]}
        saveFileName={saveFileData.filePath}
```

- [ ] **Step 8: Type-check and run the full test suite**

Run: `npm run type-check`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 9: Manually verify end-to-end in the browser**

Run: `npm run dev`. Load a real save file (not demo data, since demo data has no download/write path exercised here — any loaded `.sl2` works). Turn on the "Sell" filter, deselect a couple of candidates, click delete, confirm the dialog lists exactly the selected relics, confirm two files download (backup + modified). Load the modified file back into the app and confirm the deleted relics are gone and nothing else changed.

**This step's final sub-check — actually loading the modified save file in the game itself — cannot be automated or done by an agent. Do this by hand before considering the feature done, using a throwaway/backed-up save slot.**

- [ ] **Step 10: Commit**

```bash
git add src/utils/DownloadSaveFile.ts src/utils/DownloadSaveFile.test.ts src/components/RelicBrowser.tsx src/App.tsx src/i18n.ts
git commit -m "feat: confirm and download a save file with selected relics deleted"
```
