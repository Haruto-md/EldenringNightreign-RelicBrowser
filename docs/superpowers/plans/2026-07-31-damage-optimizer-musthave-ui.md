# Damage Optimizer 必須効果 (must-have) UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three usability problems in the Damage Optimizer's 必須効果 (must-have effects) sidebar section: no "at most N" option, an unordered/ungrouped autocomplete dropdown, and truncated effect names in a too-narrow sidebar.

**Architecture:** Reuse three patterns that already exist elsewhere in this codebase rather than inventing new ones: the Relic Browser's at-least/at-most chevron toggle (`EffectFilterChip.tsx`), `EffectsAutocomplete`'s existing `groupByCategory` prop, and this same sidebar's own compact 聖杯 (vessel) `Card` styling. All changes are confined to `src/components/DamageOptimizer.tsx` plus one new test file; no WASM/Rust changes.

**Tech Stack:** React 18 + TypeScript, MUI v6, Vitest.

## Global Constraints

- No i18n (`react-i18next`) in `DamageOptimizer.tsx` — this file uses hardcoded Japanese strings and the `effectNameJa` helper throughout, unlike `EffectFilterChip.tsx`/`AdvancedSearchPanel.tsx`. New UI text must be hardcoded Japanese, not `t(...)` calls.
- No React component-testing infra exists in this project (no `@testing-library/react`, no `.test.tsx` files anywhere). All existing tests are for pure functions in `.test.ts` files. Follow that precedent: pure logic gets unit tests; JSX/rendering changes get verified manually in the running dev server (as the design doc's Testing section specifies), not fabricated component tests.
- `localStorage` settings must stay backward-compatible: existing saved must-have entries are `{effectKey: number, minStacks: number}` with no `comparison` field. They must continue to load and behave exactly as they do today (as "at least N").
- `MIN_STACKS_OPTIONS = [1, 2, 3, 4, 5, 6]` (src/components/DamageOptimizer.tsx:60) and the existing `maxStacks: 6` cap for "at least" mode are unchanged — reuse them, don't introduce new numeric ranges.

---

## Task 1: Must-have data model — `comparison` field, backward-compatible sanitizer, pure range conversion

**Files:**
- Modify: `src/components/DamageOptimizer.tsx:150-244` (type + sanitizer), `src/components/DamageOptimizer.tsx:598-604` (range construction)
- Test: `src/components/DamageOptimizer.mustHave.test.ts` (new)

**Interfaces:**
- Produces (consumed by Task 2 and Task 3):
  - `interface MustHaveEntry { effectKey: number; comparison: "atLeast" | "atMost"; stacks: number }` (exported)
  - `function sanitizeMustHaves(value: unknown): MustHaveEntry[]` (exported, same name, new behavior)
  - `function mustHaveToEffectRange(entry: MustHaveEntry): SelectedEffectEntry` (new, exported) — `SelectedEffectEntry` is already imported from `../utils/ComboSearch` at the top of this file.

- [ ] **Step 1: Write the failing tests**

Create `src/components/DamageOptimizer.mustHave.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  mustHaveToEffectRange,
  sanitizeMustHaves,
  type MustHaveEntry,
} from "./DamageOptimizer";

describe("sanitizeMustHaves", () => {
  it("defaults comparison to atLeast for legacy entries with no comparison field", () => {
    const legacy = [{ effectKey: 10, minStacks: 3 }];
    expect(sanitizeMustHaves(legacy)).toEqual([
      { effectKey: 10, comparison: "atLeast", stacks: 3 },
    ]);
  });

  it("round-trips a new-shape atMost entry", () => {
    const modern = [{ effectKey: 20, comparison: "atMost", stacks: 2 }];
    expect(sanitizeMustHaves(modern)).toEqual([
      { effectKey: 20, comparison: "atMost", stacks: 2 },
    ]);
  });

  it("falls back to atLeast for an invalid comparison value", () => {
    const bad = [{ effectKey: 30, comparison: "sideways", stacks: 1 }];
    expect(sanitizeMustHaves(bad)).toEqual([
      { effectKey: 30, comparison: "atLeast", stacks: 1 },
    ]);
  });

  it("clamps stacks to the 1-6 range read from either stacks or the legacy minStacks key", () => {
    expect(sanitizeMustHaves([{ effectKey: 1, stacks: 99 }])).toEqual([
      { effectKey: 1, comparison: "atLeast", stacks: 6 },
    ]);
    expect(sanitizeMustHaves([{ effectKey: 2, minStacks: 0 }])).toEqual([
      { effectKey: 2, comparison: "atLeast", stacks: 1 },
    ]);
  });
});

describe("mustHaveToEffectRange", () => {
  it("converts an atLeast entry to a minStacks..6 range", () => {
    const entry: MustHaveEntry = {
      effectKey: 10,
      comparison: "atLeast",
      stacks: 3,
    };
    expect(mustHaveToEffectRange(entry)).toEqual({
      effectKey: 10,
      minStacks: 3,
      maxStacks: 6,
    });
  });

  it("converts an atMost entry to a 0..stacks range", () => {
    const entry: MustHaveEntry = {
      effectKey: 10,
      comparison: "atMost",
      stacks: 2,
    };
    expect(mustHaveToEffectRange(entry)).toEqual({
      effectKey: 10,
      minStacks: 0,
      maxStacks: 2,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/DamageOptimizer.mustHave.test.ts`
Expected: FAIL — `sanitizeMustHaves` and `mustHaveToEffectRange` are not exported from `DamageOptimizer.tsx` yet (import error / undefined).

- [ ] **Step 3: Update the type and sanitizer**

In `src/components/DamageOptimizer.tsx`, replace the `MustHaveEntry` interface (currently lines 150-153):

```ts
export interface MustHaveEntry {
  effectKey: number;
  comparison: "atLeast" | "atMost";
  stacks: number;
}
```

Replace `clampMinStacks` (currently lines 215-220) with a same-shaped clamp for the renamed field (keep the function name — it clamps a stack count regardless of field name):

```ts
function clampStacks(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(6, Math.max(1, Math.round(value)));
}
```

Replace `sanitizeMustHaves` (currently lines 222-244):

```ts
export function sanitizeMustHaves(value: unknown): MustHaveEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: MustHaveEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const effectKeyRaw = (entry as { effectKey?: unknown }).effectKey;
    const effectKey =
      typeof effectKeyRaw === "number" ? effectKeyRaw : Number(effectKeyRaw);
    if (!Number.isFinite(effectKey)) {
      continue;
    }
    // `stacks` is the current field name; `minStacks` is the legacy field
    // name from before the atLeast/atMost toggle existed. Prefer `stacks`
    // when present so this also round-trips newly-saved entries correctly.
    const stacksRaw =
      (entry as { stacks?: unknown }).stacks ??
      (entry as { minStacks?: unknown }).minStacks;
    const stacks = clampStacks(
      typeof stacksRaw === "number" ? stacksRaw : Number(stacksRaw)
    );
    const comparisonRaw = (entry as { comparison?: unknown }).comparison;
    const comparison: MustHaveEntry["comparison"] =
      comparisonRaw === "atMost" ? "atMost" : "atLeast";
    out.push({ effectKey, comparison, stacks });
  }
  return out;
}
```

Add the pure conversion function directly below `sanitizeMustHaves`:

```ts
export function mustHaveToEffectRange(
  entry: MustHaveEntry
): SelectedEffectEntry {
  return entry.comparison === "atMost"
    ? { effectKey: entry.effectKey, minStacks: 0, maxStacks: entry.stacks }
    : { effectKey: entry.effectKey, minStacks: entry.stacks, maxStacks: 6 };
}
```

- [ ] **Step 4: Update the effectRanges construction to use the new helper**

Replace the `effectRanges` block (currently `src/components/DamageOptimizer.tsx:598-604`):

```ts
      const effectRanges: SelectedEffectEntry[] =
        current.mustHaves.map(mustHaveToEffectRange);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/DamageOptimizer.mustHave.test.ts`
Expected: PASS, all 6 tests.

Note: this step intentionally leaves the file in a state where it won't
type-check yet — `createDefaultSettings`, `addMustHave`, `setMustHaveMinStacks`,
and the JSX still reference the old `minStacks` field. That's fixed in Task 2.
Confirm with `npx vitest run src/components/DamageOptimizer.mustHave.test.ts`
specifically (not the whole suite / not `tsc`) at this step.

- [ ] **Step 6: Commit**

```bash
git add src/components/DamageOptimizer.tsx src/components/DamageOptimizer.mustHave.test.ts
git commit -m "feat: add atLeast/atMost comparison to must-have entries"
```

---

## Task 2: Wire up comparison toggle and stacks setter, fix remaining `minStacks` references

**Files:**
- Modify: `src/components/DamageOptimizer.tsx:177-187` (`createDefaultSettings`), `:452-487` (`addMustHave`/`removeMustHave`/`setMustHaveMinStacks`)

**Interfaces:**
- Consumes: `MustHaveEntry` type from Task 1 (now has `comparison`/`stacks` instead of `minStacks`).
- Produces (consumed by Task 3):
  - `addMustHave(effectKey: EffectKey): void` (unchanged signature)
  - `removeMustHave(effectKey: number): void` (unchanged signature)
  - `setMustHaveStacks(effectKey: number, stacks: number): void` (renamed from `setMustHaveMinStacks`)
  - `setMustHaveComparison(effectKey: number, comparison: MustHaveEntry["comparison"]): void` (new)

- [ ] **Step 1: `createDefaultSettings` already returns `mustHaves: []`, no change needed there — confirm by reading `src/components/DamageOptimizer.tsx:177-188`; skip to Step 2 if it's still just `mustHaves: []`.**

- [ ] **Step 2: Fix `addMustHave` to include the new field**

Replace (currently `src/components/DamageOptimizer.tsx:452-465`):

```ts
  const addMustHave = useCallback(
    (effectKey: EffectKey) => {
      updateCurrent((s) => {
        if (s.mustHaves.some((m) => m.effectKey === effectKey)) {
          return s;
        }
        return {
          ...s,
          mustHaves: [
            ...s.mustHaves,
            { effectKey, comparison: "atLeast" as const, stacks: 1 },
          ],
        };
      });
    },
    [updateCurrent]
  );
```

- [ ] **Step 3: Rename `setMustHaveMinStacks` to `setMustHaveStacks` and add `setMustHaveComparison`**

Replace (currently `src/components/DamageOptimizer.tsx:477-487`):

```ts
  const setMustHaveStacks = useCallback(
    (effectKey: number, stacks: number) => {
      updateCurrent((s) => ({
        ...s,
        mustHaves: s.mustHaves.map((m) =>
          m.effectKey === effectKey ? { ...m, stacks } : m
        ),
      }));
    },
    [updateCurrent]
  );

  const setMustHaveComparison = useCallback(
    (effectKey: number, comparison: MustHaveEntry["comparison"]) => {
      updateCurrent((s) => ({
        ...s,
        mustHaves: s.mustHaves.map((m) =>
          m.effectKey === effectKey ? { ...m, comparison } : m
        ),
      }));
    },
    [updateCurrent]
  );
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: still FAILS — the JSX block (around line 809-855) still references
`mustHave.minStacks` and calls `setMustHaveMinStacks`. That's expected; it's
fixed in Task 3. Confirm the *only* remaining errors are inside that JSX
block (file `DamageOptimizer.tsx`, referencing `minStacks` or
`setMustHaveMinStacks`) — no errors anywhere else.

- [ ] **Step 5: Commit**

```bash
git add src/components/DamageOptimizer.tsx
git commit -m "refactor: rename must-have stacks setter, add comparison setter"
```

---

## Task 3: Card-based must-have list, at-least/at-most toggle UI, grouped dropdown, wider sidebar

**Files:**
- Modify: `src/components/DamageOptimizer.tsx:1-22` (imports), `:679-690` (sidebar width), `:797-856` (必須効果 JSX block)

**Interfaces:**
- Consumes: `setMustHaveStacks`, `setMustHaveComparison`, `addMustHave`, `removeMustHave` from Task 2; `MustHaveEntry` from Task 1; `MIN_STACKS_OPTIONS` (existing, `src/components/DamageOptimizer.tsx:60`).
- Produces: nothing consumed by later tasks — this is the last task.

- [ ] **Step 1: Add the chevron icon and Tooltip imports**

At the top of `src/components/DamageOptimizer.tsx`, add two new icon imports next to the existing `DeleteIcon` import (line 1):

```ts
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
```

Add `Tooltip` to the existing `@mui/material` import block (line 2-22, alongside `Switch`, `Typography`, etc. — insert alphabetically):

```ts
  Switch,
  Tooltip,
  Typography,
```

- [ ] **Step 2: Widen the sidebar**

In `src/components/DamageOptimizer.tsx`, the left panel `Box` (around line 682) currently has:

```ts
          width: "360px",
```

Change to:

```ts
          width: "420px",
```

- [ ] **Step 3: Enable grouped dropdown and replace the must-have list with cards**

Replace the entire 必須効果 `Box` block (currently `src/components/DamageOptimizer.tsx:797-856`):

```tsx
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              必須効果
            </Typography>
            <EffectsAutocomplete
              onSearchChange={() => {}}
              onChange={(effect) => addMustHave(effect.key)}
              availableEffects={mustHaveOptions}
              placeholder="効果を検索..."
              getLabel={(key) => effectNameJa(key)}
              clearOnSelect
              groupByCategory
            />
            {current.mustHaves.length > 0 && (
              <Stack spacing={1} sx={{ mt: 1, maxHeight: 320, overflowY: "auto" }}>
                {current.mustHaves.map((mustHave) => (
                  <Card key={mustHave.effectKey} elevation={2}>
                    <CardContent
                      sx={{ px: 1.5, py: 0.5, "&:last-child": { paddingBottom: 0.5 } }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ mb: 0.5 }}
                      >
                        {effectNameJa(mustHave.effectKey as EffectKey)}
                      </Typography>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="flex-end"
                        spacing={0.5}
                      >
                        <Tooltip
                          title={
                            mustHave.comparison === "atLeast"
                              ? "この数値以上（クリックで「以下」に切り替え）"
                              : "この数値以下（クリックで「以上」に切り替え）"
                          }
                        >
                          <IconButton
                            size="small"
                            onClick={() =>
                              setMustHaveComparison(
                                mustHave.effectKey,
                                mustHave.comparison === "atLeast"
                                  ? "atMost"
                                  : "atLeast"
                              )
                            }
                          >
                            {mustHave.comparison === "atLeast" ? (
                              <KeyboardArrowUpIcon fontSize="small" />
                            ) : (
                              <KeyboardArrowDownIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                          <Select
                            value={String(mustHave.stacks)}
                            onChange={(e) =>
                              setMustHaveStacks(
                                mustHave.effectKey,
                                Number(e.target.value)
                              )
                            }
                          >
                            {MIN_STACKS_OPTIONS.map((n) => (
                              <MenuItem key={n} value={String(n)}>
                                {n}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <IconButton
                          size="small"
                          aria-label="削除"
                          onClick={() => removeMustHave(mustHave.effectKey)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS, no errors.

- [ ] **Step 5: Lint**

Run: `npx eslint src/components/DamageOptimizer.tsx`
Expected: PASS, no errors (unused-import warnings would mean Step 1's
imports aren't all used — check for that specifically if it fails).

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: same pass/fail counts as the pre-existing baseline (4 pre-existing
failures in `src/test/SaveFile.test.ts` are a known, unrelated locale issue
— see the prior debugging session in this conversation; everything else,
including the new `DamageOptimizer.mustHave.test.ts` file, passes).

- [ ] **Step 7: Manual verification in the dev server**

Run `npm run dev` if not already running (it may already be running from
earlier in this session — check before starting a second instance). In the
browser, on the ダメージ最適化 tab:

1. Open the 必須効果 search box — confirm category chips appear above the
   dropdown and results are grouped by category (not raw insertion order).
2. Add a must-have effect. Confirm it renders as a bordered/shadowed Card
   with the full effect name visible (wrapped, not cut off with `...`).
3. Click the chevron toggle on that card — confirm it flips between up
   (atLeast) and down (atMost) and the tooltip text changes accordingly.
4. Set it to atMost with stacks = 1, run a search with relics that would
   exceed 1 stack of that effect — confirm those combinations are excluded
   from the results (i.e. the atMost constraint is actually enforced, not
   just visually toggled).
5. Confirm the sidebar is visibly wider and a long effect name (e.g.
   something containing "ガード成功時、アーツゲージ増加+1") no longer gets
   cut off.

- [ ] **Step 8: Commit**

```bash
git add src/components/DamageOptimizer.tsx
git commit -m "feat: card-based must-have list with atLeast/atMost toggle and grouped dropdown"
```

---

## Self-Review Notes

- Spec coverage: at-least/at-most toggle (Task 1 + 3), grouped dropdown
  (Task 3 Step 3, `groupByCategory`), card layout + wrap (Task 3 Step 3),
  sidebar width (Task 3 Step 2). Non-goals (list reordering, WASM changes,
  big result-card reuse, broader layout redesign) are all correctly absent
  from every task.
- Type consistency checked: `MustHaveEntry.stacks`/`comparison` introduced in
  Task 1 are the only names used in Task 2 and Task 3 — no lingering
  `minStacks` references outside the Task 1 sanitizer's legacy-key read.
  `setMustHaveStacks`/`setMustHaveComparison` names from Task 2 match Task
  3's JSX usage exactly.
