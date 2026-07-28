# Relic Sell Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the existing save-file write-back/download delete feature (unsafe: it never accounts for Nightreign's per-character-slot MD5 checksum, so a written-back save can be rejected as corrupted by the game) and replace it with a clipboard handoff to an external AutoHotkey script that drives the real in-game relic-sell UI via simulated key presses, leaving the actual save file untouched.

**Architecture:** `SaveFileEncryptor`/`DownloadSaveFile`/`DeleteLock` and their wiring through `RelicBrowser` → `RelicsPage` → `App` are deleted outright. A new pure function, `buildSellKeySequence`, converts an ordered list of selected `RelicSlot`s into a sequence of grid-navigation actions (`Up`/`Down`/`Left`/`Right`/`Select`/`Confirm`) matching the in-game relic-sell screen's controls, which `RelicBrowser` copies to the clipboard as JSON. A separate AutoHotkey v2 script (outside the TS build) reads that JSON from the clipboard and replays it as real key presses, stopping right before the game's final sell confirmation so a human always finalizes the irreversible step by hand.

**Tech Stack:** TypeScript, React, MUI, vitest (web app); AutoHotkey v2 (automation script, not part of the npm build/test pipeline).

## Global Constraints

- The relic-sell grid is 8 columns × N rows, 1-indexed, cursor starts at `(1, 1)`. Columns are the bounded axis (1-8, capped — RelicParser.ts: `column = i % 8`); rows are the unbounded axis (can grow arbitrarily large for a big inventory — RelicParser.ts: `row = Math.floor(i / 8)`).
- Manual arrow keys: `Right`/`Left` move to the adjacent column keeping the same row; `Up`/`Down` move within the current column — **except** pressing `Right` while on column 8 moves to column 1 of the next row instead (there is no column 9).
- `F` (select) selects the relic under the cursor and auto-advances the cursor exactly as one `Right` press would (including the column-8 wrap above).
- `3` opens the sell confirmation screen for everything selected so far; the actual final confirmation inside that screen is always done by a human, never automated.
- `RelicSlot.coordinates` is `[row, column]` and is already produced in increasing (column, row) order by the existing parser — `buildSellKeySequence` must not sort its input.
- No code in this repo may write to, download, or otherwise produce a modified `.sl2` save file. Selling happens only through the real game UI.

---

### Task 1: Remove the save-file write-back/download feature

**Files:**
- Delete: `src/utils/SaveFileEncryptor.ts`
- Delete: `src/utils/SaveFileEncryptor.test.ts`
- Delete: `src/utils/DownloadSaveFile.ts`
- Delete: `src/utils/DownloadSaveFile.test.ts`
- Delete: `src/utils/DeleteLock.ts`
- Delete: `src/utils/DeleteLock.test.ts`
- Delete: `src/hooks/useSaveFile.test.ts`
- Modify: `src/hooks/useSaveFile.ts`
- Modify: `src/components/RelicBrowser.tsx`
- Modify: `src/components/RelicsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/i18n.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `RelicBrowserProps` shrinks to `{ availableEffects, currentSlot, searchTerm, setSearchTerm, handleMatchingRelicsCountChange }` — Task 3 adds to this same shape, it does not restore any of the removed props. `useSaveFile()`'s return type drops `deleteLock` and `markEntryDeleted`.

- [ ] **Step 1: Delete the write-back files and their tests**

```bash
git rm src/utils/SaveFileEncryptor.ts src/utils/SaveFileEncryptor.test.ts \
       src/utils/DownloadSaveFile.ts src/utils/DownloadSaveFile.test.ts \
       src/utils/DeleteLock.ts src/utils/DeleteLock.test.ts \
       src/hooks/useSaveFile.test.ts
```

- [ ] **Step 2: Simplify `useSaveFile.ts`**

Replace the full contents of `src/hooks/useSaveFile.ts` with:

```ts
import { useCallback, useState } from "react";
import type { CharacterSlot, SaveFileData } from "../types/SaveFile";
import { RelicParser } from "../utils/RelicParser";
import { findOutclassedRelics } from "../utils/RelicProcessor";
import { SaveFileDecryptor } from "../utils/SaveFileDecryptor";

export const useSaveFile = () => {
  const [saveFileData, setSaveFileData] = useState<SaveFileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [matchingRelicsCount, setMatchingRelicsCount] = useState<number>(0);

  const loadSaveFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const fileBuffer = await file.arrayBuffer();
      const bnd4Entries = await SaveFileDecryptor.decryptSaveFile(fileBuffer);

      if (bnd4Entries.length === 0) {
        throw new Error("No BND4 entries found in save file");
      }

      if (bnd4Entries.length !== 14) {
        console.warn(`Expected 14 BND4 entries, found ${bnd4Entries.length}`);
      }

      const slots: CharacterSlot[] =
        RelicParser.parseCharacterSlots(bnd4Entries);
      for (const slot of slots) {
        findOutclassedRelics(slot.relics);
      }

      const saveData: SaveFileData = {
        filePath: file.name,
        slots,
        currentSlot: 0,
        bnd4Entries,
      };

      setSaveFileData(saveData);

      window.dataLayer.push({
        event: "save_file_opened",
        file_name: file.name,
        file_size: file.size,
        relics_per_slot: slots.map((slot) => slot.relics.length),
      });
    } catch (err) {
      console.error("Error loading save file:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load save file"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSlot = useCallback(
    (slotIndex: number) => {
      if (
        saveFileData &&
        slotIndex >= 0 &&
        slotIndex < saveFileData.slots.length
      ) {
        setMatchingRelicsCount(saveFileData.slots[slotIndex].relics.length);
        setSaveFileData((prev) =>
          prev ? { ...prev, currentSlot: slotIndex } : null
        );
      }
    },
    [saveFileData]
  );

  const clearSaveFile = useCallback(() => {
    setSaveFileData(null);
    setSearchTerm("");
    setMatchingRelicsCount(0);
    setError(null);
  }, []);

  return {
    saveFileData,
    loading,
    error,
    loadSaveFile,
    selectSlot,
    searchTerm,
    setSearchTerm,
    matchingRelicsCount,
    setMatchingRelicsCount,
    clearSaveFile,
  };
};
```

- [ ] **Step 3: Simplify `RelicBrowser.tsx`**

Replace the full contents of `src/components/RelicBrowser.tsx` with:

```tsx
import { Alert, Box, Button, Stack } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Effect } from "../resources/effects";
import { items, ItemType, unsellableItemIds } from "../resources/items";
import type { CharacterSlot } from "../types/SaveFile";
import {
  colorFilterOptions,
  type ColorFilterOption,
} from "../utils/ColorFilterOptions";
import { getEffectName, getItemName, getRelicColor } from "../utils/DataUtils";
import { RelicSlotColor } from "../utils/RelicColor";
import { doesRelicColorMatch, doesRelicMatch } from "../utils/SearchUtils";
import {
  createEmptyEffectFilterState,
  doesRelicMatchEffectFilter,
  type EffectFilterState,
} from "../utils/EffectFilter";
import { RelicDisplay } from "./RelicDisplay";
import { SearchInput } from "./SearchInput";

interface RelicBrowserProps {
  availableEffects: Effect[];
  currentSlot: CharacterSlot;
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  handleMatchingRelicsCountChange: (count: number) => void;
}

export function RelicBrowser({
  availableEffects,
  currentSlot,
  searchTerm,
  setSearchTerm,
  handleMatchingRelicsCountChange,
}: RelicBrowserProps) {
  const { t } = useTranslation();
  const [filterSell, setFilterSell] = useState(false);
  const [colorFilter, setColorFilter] = useState<ColorFilterOption>(
    colorFilterOptions[0]
  );
  const [effectFilter, setEffectFilter] = useState<EffectFilterState>(
    createEmptyEffectFilterState()
  );

  const hasEffectFilter =
    effectFilter.groups.some((group) => group.entries.length > 0) ||
    effectFilter.excludedGroups.some((group) => group.entries.length > 0);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Independent of every filter (color, search, advanced effect filter, and
  // the redundant/"sell" filter itself): selection mode just makes whatever
  // is currently shown in the grid clickable. The redundant filter is one way
  // to narrow down to weak relics, not a requirement for selecting anything -
  // you can select any relic you can see, filtered however you like.
  const [selectionMode, setSelectionMode] = useState(false);

  const handleToggleSelect = useCallback((relicId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(relicId)) {
        next.delete(relicId);
      } else {
        next.add(relicId);
      }
      return next;
    });
  }, []);

  const selectedForSale = useMemo(
    () => currentSlot.relics.filter((relic) => selectedIds.has(relic.id)),
    [currentSlot.relics, selectedIds]
  );

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

      const item = items.get(itemId);

      if (colorFilter.type !== undefined && item !== undefined) {
        if (
          colorFilter.type === ItemType.DeepRelic &&
          item.type !== ItemType.DeepRelic
        ) {
          return false;
        }
        if (
          colorFilter.type !== ItemType.DeepRelic &&
          item.type === ItemType.DeepRelic
        ) {
          return false;
        }
      }

      const itemColor = getRelicColor(itemId);

      if (!doesRelicColorMatch(itemColor, colorFilter.color)) {
        return false;
      }

      if (hasEffectFilter && !doesRelicMatchEffectFilter(relic, effectFilter)) {
        return false;
      }

      const itemName = getItemName(itemId);
      const effectNames = effects.flatMap(([effect, debuff]) =>
        debuff !== undefined
          ? [getEffectName(effect), getEffectName(debuff)]
          : [getEffectName(effect)]
      );

      return doesRelicMatch(itemName, effectNames, searchTerm);
    });
  }, [
    searchTerm,
    colorFilter.color,
    colorFilter.type,
    filterSell,
    currentSlot.relics,
    effectFilter,
    hasEffectFilter,
  ]);

  const selectAllShown = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const relic of matchingRelics) {
        next.add(relic.id);
      }
      return next;
    });
  }, [matchingRelics]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <Box
      component="section"
      aria-label="Relic management interface"
      sx={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        minHeight: 0,
      }}
    >
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

      <Button
        variant={selectionMode ? "contained" : "outlined"}
        onClick={() => setSelectionMode((prev) => !prev)}
        sx={{ alignSelf: "flex-start", my: 1 }}
      >
        {selectionMode ? t("selectionModeStop") : t("selectionModeStart")}
      </Button>

      {selectionMode && matchingRelics.length > 0 && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ my: 1 }}
        >
          <Alert severity="info" variant="outlined" sx={{ flexGrow: 1, mr: 1 }}>
            {t("sellCandidatesTitle", { count: selectedForSale.length })}
          </Alert>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={selectAllShown}>
              {t("sellCandidatesSelectAll")}
            </Button>
            <Button size="small" onClick={clearSelection}>
              {t("sellCandidatesSelectNone")}
            </Button>
          </Stack>
        </Stack>
      )}

      {currentSlot && (
        <Box
          sx={{ flexGrow: 1, minHeight: 0 }}
          component="section"
          aria-label="Relic display"
        >
          <RelicDisplay
            matchingRelics={matchingRelics}
            searchTerm={searchTerm}
            colorFilter={colorFilter}
            onMatchCountChange={handleMatchingRelicsCountChange}
            selectable={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Simplify `RelicsPage.tsx`**

Remove this import:

```ts
import type { DeleteLockState } from "../utils/DeleteLock";
```

Replace the `RelicsPageProps` interface with:

```ts
interface RelicsPageProps {
  saveFileData: SaveFileData | null;
  loading: boolean;
  error: string | null;
  selectSlot: (index: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  matchingRelicsCount: number;
  handleMatchingRelicsCountChange: (count: number) => void;
  clearSaveFile: () => void;
}
```

Update the function signature to drop `deleteLock` and `markEntryDeleted`:

```tsx
export function RelicsPage({
  saveFileData,
  loading,
  error,
  selectSlot,
  searchTerm,
  setSearchTerm,
  handleMatchingRelicsCountChange,
  clearSaveFile,
}: RelicsPageProps) {
```

Replace the `<RelicBrowser ... />` call with:

```tsx
        <RelicBrowser
          availableEffects={availableEffects}
          currentSlot={currentSlot}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleMatchingRelicsCountChange={handleMatchingRelicsCountChange}
        />
```

- [ ] **Step 5: Simplify `App.tsx`**

Remove `deleteLock,` and `markEntryDeleted,` from the `useSaveFile()` destructure (lines 23-24), and remove `deleteLock={deleteLock}` and `markEntryDeleted={markEntryDeleted}` from the `<RelicsPage ... />` call (lines 84-85).

- [ ] **Step 6: Remove the now-dead i18n keys**

In `src/i18n.ts`, delete these lines (they sit between `sellCandidatesSelectNone` and the `nightfarers` block):

```ts
      deleteSelectedButton: "Delete selected and download save file",
      deleteConfirmTitle: "Confirm relic deletion",
      deleteConfirmBody:
        "The following {{count}} relics will be permanently removed from the downloaded save file. This does not modify your original save file.",
      deleteConfirmDownloadWarning:
        "Two files will be downloaded: a backup of your original save file and the modified save file. Your browser may ask for permission to download multiple files - allow it, and keep both files. If you only keep one, keep the backup.",
      deleteConfirmCancel: "Cancel",
      deleteConfirmProceed: "Delete and download",
      deleteConfirmError:
        "Something went wrong while deleting the selected relics. Your original save file was not modified.",
      deleteUnavailableNoSaveFile:
        "Deleting relics is only available for a loaded save file. Demo data cannot be modified.",
      deleteAlreadyDoneTitle: "Save file downloaded",
      deleteAlreadyDoneBody:
        "Your modified save file and its backup have been downloaded. To delete more relics, load the downloaded save file back into this app first - otherwise the deletions you just made would be lost.",

```

Keep `sellCandidatesTitle`, `sellCandidatesSelectAll`, `sellCandidatesSelectNone`, `selectionModeStart`, and `selectionModeStop` — they're still used.

- [ ] **Step 7: Type-check and run the full test suite**

Run: `npm run type-check`
Expected: no errors.

Run: `npx vitest run`
Expected: all remaining tests PASS (the deleted test files no longer run).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove save-file write-back/delete feature

The save-file write-back path never accounted for Nightreign's
per-character-slot MD5 checksum (separate from the AES-CBC entry
encryption), so a downloaded modified save could be rejected by the
game as corrupted. Selling now happens through the real game UI
instead - see docs/superpowers/specs/2026-07-28-relic-sell-automation-design.md."
```

---

### Task 2: `buildSellKeySequence` grid-navigation logic

**Files:**
- Create: `src/utils/SellKeySequence.ts`
- Test: `src/utils/SellKeySequence.test.ts`

**Interfaces:**
- Consumes: `RelicSlot` from `../types/SaveFile` (uses only `.coordinates`).
- Produces: `export type SellAction = "Up" | "Down" | "Left" | "Right" | "Select" | "Confirm";` and `export function buildSellKeySequence(candidates: RelicSlot[]): SellAction[]`. Task 3 calls this directly with the panel's selected relics, in the order they already come out of `currentSlot.relics`.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/SellKeySequence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { RelicSlot } from "../types/SaveFile";
import { buildSellKeySequence } from "./SellKeySequence";

function makeCandidate(row: number, col: number): RelicSlot {
  return {
    id: row * 100 + col,
    itemId: 104,
    effects: [],
    coordinates: [row, col],
    coordinatesByColor: [row, col],
  };
}

describe("buildSellKeySequence", () => {
  it("returns an empty sequence for no candidates", () => {
    expect(buildSellKeySequence([])).toEqual([]);
  });

  it("selects a single relic at the starting position with no movement", () => {
    expect(buildSellKeySequence([makeCandidate(1, 1)])).toEqual([
      "Select",
      "Confirm",
    ]);
  });

  it("moves right (preserving row) to reach a relic in the next column", () => {
    expect(buildSellKeySequence([makeCandidate(3, 2)])).toEqual([
      "Right",
      "Down",
      "Down",
      "Select",
      "Confirm",
    ]);
  });

  it("moves left to go back into an earlier column for a second relic in it", () => {
    // Selecting (1,1) auto-advances the cursor to (1,2) - reaching a second
    // relic still in column 1 needs a Left press back into it.
    expect(
      buildSellKeySequence([makeCandidate(1, 1), makeCandidate(3, 1)])
    ).toEqual(["Select", "Left", "Down", "Down", "Select", "Confirm"]);
  });

  it("uses the row-8 auto-wrap for a free transition into the next column", () => {
    // Selecting (8,1) auto-advances the cursor to (1,2) via the row-8 wrap
    // rule, needing zero extra moves to reach a relic already at (1,2).
    expect(
      buildSellKeySequence([makeCandidate(8, 1), makeCandidate(1, 2)])
    ).toEqual([
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Select",
      "Select",
      "Confirm",
    ]);
  });

  it("moves up when the next relic's row is lower than the current row", () => {
    // Selecting (7,1) auto-advances to (7,2) (row 7 != 8, so no wrap). The
    // next relic at (1,2) is the same column but a lower row, needing Up.
    expect(
      buildSellKeySequence([makeCandidate(7, 1), makeCandidate(1, 2)])
    ).toEqual([
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Select",
      "Up",
      "Up",
      "Up",
      "Up",
      "Up",
      "Up",
      "Select",
      "Confirm",
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/SellKeySequence.test.ts`
Expected: FAIL with a module-not-found error (`./SellKeySequence` doesn't exist yet).

- [ ] **Step 3: Implement `buildSellKeySequence`**

Create `src/utils/SellKeySequence.ts`:

```ts
import type { RelicSlot } from "../types/SaveFile";

export type SellAction = "Up" | "Down" | "Left" | "Right" | "Select" | "Confirm";

interface GridPosition {
  row: number;
  col: number;
}

const GRID_ROWS = 8;

/**
 * One Right press: normally keeps the same row and moves to the next
 * column, except pressing it while on row 8 wraps to row 1 of the next
 * column instead (there is no row 9). `F` (select) auto-advances the
 * cursor with this exact same rule.
 */
function applyRight(pos: GridPosition): GridPosition {
  return pos.row === GRID_ROWS
    ? { row: 1, col: pos.col + 1 }
    : { row: pos.row, col: pos.col + 1 };
}

/**
 * Appends the actions needed to move from `pos` to `(targetRow, targetCol)`
 * and returns the resulting position. Column is resolved first (Right/Left),
 * then row (Down/Up) - moving column first means any row-8 wraps that happen
 * along the way don't matter, since the row is corrected exactly afterward.
 */
function moveTo(
  pos: GridPosition,
  targetRow: number,
  targetCol: number,
  actions: SellAction[]
): GridPosition {
  let { row, col } = pos;

  while (col < targetCol) {
    actions.push("Right");
    ({ row, col } = applyRight({ row, col }));
  }
  while (col > targetCol) {
    actions.push("Left");
    col--;
  }
  while (row < targetRow) {
    actions.push("Down");
    row++;
  }
  while (row > targetRow) {
    actions.push("Up");
    row--;
  }

  return { row, col };
}

/**
 * Converts an ordered list of sell-candidate relics into the sequence of
 * grid-navigation key presses needed to select all of them on the in-game
 * relic-sell screen, ending in a single Confirm. `candidates` must already
 * be in the order `RelicSlot.coordinates` naturally comes in (increasing
 * column, then increasing row within a column) - this function does not
 * sort its input and assumes nothing about relics out of that order.
 */
export function buildSellKeySequence(candidates: RelicSlot[]): SellAction[] {
  if (candidates.length === 0) {
    return [];
  }

  const actions: SellAction[] = [];
  let pos: GridPosition = { row: 1, col: 1 };

  for (const candidate of candidates) {
    const [targetRow, targetCol] = candidate.coordinates;
    pos = moveTo(pos, targetRow, targetCol, actions);
    actions.push("Select");
    pos = applyRight(pos);
  }

  actions.push("Confirm");
  return actions;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/SellKeySequence.test.ts`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/SellKeySequence.ts src/utils/SellKeySequence.test.ts
git commit -m "feat: add buildSellKeySequence for in-game relic-sell navigation"
```

---

### Task 3: Copy sell sequence to clipboard

**Files:**
- Modify: `src/components/RelicBrowser.tsx`
- Modify: `src/i18n.ts`

**Interfaces:**
- Consumes: `buildSellKeySequence` from `../utils/SellKeySequence` (Task 2), `selectedForSale` (already computed in `RelicBrowser`, see Task 1 Step 3).
- Produces: nothing consumed by a later task - this is the last user-facing piece of the web app side.

- [ ] **Step 1: Add i18n labels**

In `src/i18n.ts`, inside `resources.en.translation`, add right after `sellCandidatesSelectNone`:

```ts
      copySellSequenceButton: "Copy sell sequence",
      copySellSequenceCopied: "Copied {{count}} actions to clipboard",
```

- [ ] **Step 2: Add the copy button and clipboard write to `RelicBrowser.tsx`**

Add these imports:

```ts
import { Snackbar } from "@mui/material";
import { buildSellKeySequence } from "../utils/SellKeySequence";
```

(Add `Snackbar` to the existing `@mui/material` import list rather than a second import statement.)

Add state for the copy confirmation, right after the `selectionMode` state:

```ts
  const [copiedCount, setCopiedCount] = useState<number | null>(null);
```

Add the handler, right after `clearSelection`:

```ts
  const handleCopySellSequence = useCallback(async () => {
    const sequence = buildSellKeySequence(selectedForSale);
    await navigator.clipboard.writeText(JSON.stringify(sequence));
    setCopiedCount(selectedForSale.length);
  }, [selectedForSale]);
```

Render the button right after the select-all/none `Stack` block's closing `)}`. It needs its own condition (`selectedForSale.length > 0`, not `matchingRelics.length > 0`) because it must only show once something is actually selected, mirroring the old delete button's condition:

```tsx
      {selectionMode && selectedForSale.length > 0 && (
        <Button
          variant="contained"
          onClick={handleCopySellSequence}
          sx={{ alignSelf: "flex-start", mb: 1 }}
        >
          {t("copySellSequenceButton")}
        </Button>
      )}

      <Snackbar
        open={copiedCount !== null}
        autoHideDuration={3000}
        onClose={() => setCopiedCount(null)}
        message={
          copiedCount !== null
            ? t("copySellSequenceCopied", { count: copiedCount })
            : ""
        }
      />
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, load the demo data, click "Select relics to delete" (selection mode), click a few relic cards to select them, click "Copy sell sequence", confirm the snackbar appears, and paste the clipboard contents somewhere to confirm it's a JSON array of action strings ending in `"Confirm"`.

- [ ] **Step 5: Commit**

```bash
git add src/components/RelicBrowser.tsx src/i18n.ts
git commit -m "feat: copy the in-game relic-sell key sequence to the clipboard"
```

---

### Task 4: AutoHotkey playback script

**Files:**
- Create: `automation/sell-relics.ahk`

**Interfaces:**
- Consumes: the clipboard content written by Task 3 - a JSON array of the exact strings `buildSellKeySequence` produces (`"Up"`, `"Down"`, `"Left"`, `"Right"`, `"Select"`, `"Confirm"`).
- Produces: nothing consumed by TS code. This script is not covered by `npm run test` or `npm run type-check` - it has no logic to unit test, only key-press replay, and is verified manually against the real game per Step 3 below.

- [ ] **Step 1: Write the script**

Create `automation/sell-relics.ahk`:

```autohotkey
; Relic Sell Automation
;
; Reads a JSON array of actions from the clipboard (written by the "Copy
; sell sequence" button in the Relic Browser web app) and replays it as key
; presses into the Elden Ring Nightreign window. Stops immediately after
; sending the final "Confirm" action - the actual in-game sell confirmation
; is always done by hand, never by this script.
;
; Usage: with the relic-sell screen open in-game and the cursor at the top
; -left slot (row 1, column 1), press F9.

#Requires AutoHotkey v2.0
#SingleInstance Force

GameWindowTitle := "ahk_exe nightreign.exe"
KeyDelayMs := 180

ActionToKey := Map(
    "Up", "{Up}",
    "Down", "{Down}",
    "Left", "{Left}",
    "Right", "{Right}",
    "Select", "f",
    "Confirm", "3"
)

; Minimal parser for the flat JSON string-array shape buildSellKeySequence
; produces (e.g. ["Down","Right","Select","Confirm"]). Not a general JSON
; parser - deliberately only handles this one shape.
ParseActionArray(json) {
    actions := []
    for match in json.RegExMatch('"([A-Za-z]+)"', "g") {
        actions.Push(match[1])
    }
    return actions
}

F9:: {
    if !WinActive(GameWindowTitle) {
        return
    }

    clipboardText := A_Clipboard
    if (clipboardText = "") {
        return
    }

    actions := []
    try {
        actions := ParseActionArray(clipboardText)
    } catch as err {
        return
    }

    if (actions.Length = 0) {
        return
    }

    for action in actions {
        if !ActionToKey.Has(action) {
            ; Unrecognized action - abort rather than send something wrong.
            return
        }
        if !WinActive(GameWindowTitle) {
            ; Window lost focus mid-sequence - abort rather than send keys
            ; into whatever else is now focused.
            return
        }
        Send(ActionToKey[action])
        Sleep(KeyDelayMs)
    }
}
```

- [ ] **Step 2: Note the manual tuning/verification requirement**

`KeyDelayMs` and the exact `GameWindowTitle` (confirm via AutoHotkey's Window Spy, `Win+Left-click` in the AHK tray menu, against the actual running game) must be verified against the real game before relying on this script - this cannot be automated or done by an agent. Do this by hand: run the web app, select a couple of low-value relics, copy the sequence, open the relic-sell screen in-game with the cursor at (1,1), press F9, and confirm the correct relics end up selected before manually pressing the in-game confirm.

- [ ] **Step 3: Commit**

```bash
git add automation/sell-relics.ahk
git commit -m "feat: add AutoHotkey script to replay the copied relic-sell sequence"
```
