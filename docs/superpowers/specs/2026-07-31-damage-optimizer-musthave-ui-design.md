# Damage Optimizer 必須効果 (must-have) UI — design

## Background

The Damage Optimizer's left sidebar (`src/components/DamageOptimizer.tsx`) has
a 必須効果 (must-have effects) section: an `EffectsAutocomplete` search box to
add effects, followed by a plain `Stack` of thin text rows — one per added
must-have, each showing the effect name (`noWrap`, truncated), a stacks-count
`Select`, and a delete `IconButton`.

Three problems with this, raised directly by the user:

1. The stacks-count control only expresses "at least N" — there's no way to
   require "at most N" (e.g. cap a stacking debuff-adjacent effect).
2. The autocomplete's dropdown order is effectively insertion order from the
   player's own relics — no grouping, no sensible ordering ("ゴミ" per the
   user).
3. The sidebar is too narrow for the row layout: long Japanese effect names
   (e.g. "ガード成功時、アーツゲージ増加+1") get cut off by `noWrap`.

The Relic Browser side of the app (`AdvancedSearchPanel.tsx`,
`EffectFilterChip.tsx`, `EffectsAutocomplete.tsx`'s `groupByCategory` prop)
already solves the first two problems for its own "詳細フィルター" advanced
search — an at-least/at-most chevron toggle per effect chip, and a
category-chip-filtered, category-grouped autocomplete dropdown. This design
reuses those existing patterns on the Damage Optimizer side instead of
inventing new ones.

## Goal

- Must-have entries can require "at least N stacks" (today's only mode) or
  "at most N stacks" (new), matching the Relic Browser's at-least/at-most
  toggle UX.
- The must-have autocomplete's dropdown is grouped by category with a
  category-chip filter row, matching the Relic Browser's existing
  `groupByCategory` behavior.
- Each must-have entry is readable in full (no silent truncation) inside the
  existing 360px-ish sidebar without ballooning row height unreasonably.

## Non-goals

- Reordering the must-have list. Confirmed with the user: must-haves are
  AND-combined with no notion of priority, so list order has no effect on
  search results — a reorder UI would be pure decoration. Not building it.
- Any change to the WASM search engine. `SelectedEffectEntry` /
  `combination_satisfies_ranges` already accept arbitrary `(minStacks,
  maxStacks)` ranges — an "at most N" entry is just `{minStacks: 0, maxStacks:
  N}`, already valid input today. The pruning-priority fix from the prior
  session only protects entries with `minStacks > 0` from eviction — an
  at-most-only entry (`minStacks === 0`) is a cap, not a requirement, so it
  correctly needs no such protection.
- Reusing the large result-combination `Card` (the grid-of-relics card in the
  right panel). Confirmed with the user this is too heavy for a list of ~8
  short entries; instead reuse the sidebar's own existing compact 聖杯
  (vessel) `Card` pattern (bold title + chip row, `elevation`-based styling)
  already a few sections below in the same sidebar.
- A broader sidebar/layout redesign. The two-column (controls | results)
  layout stays; only the must-have section's internal layout and the sidebar
  width change.

## Design

### 1. At-least/at-most toggle

`MustHaveEntry` (currently `{ effectKey: number; minStacks: number }`) gains a
comparison field:

```ts
interface MustHaveEntry {
  effectKey: number;
  comparison: "atLeast" | "atMost"; // new
  stacks: number; // renamed from minStacks for clarity now that it's dual-purpose
}
```

- `sanitizeMustHaves` (localStorage load path) defaults missing/invalid
  `comparison` to `"atLeast"` — existing saved settings (all currently
  `minStacks`-only) continue to mean exactly what they mean today.
- Where `mustHaves` is converted to `SelectedEffectEntry[]` for the search
  call (`current.mustHaves.map(...)` near line 598), each entry becomes:
  - `atLeast` → `{ effectKey, minStacks: stacks, maxStacks: 99 }` (today's
    behavior, unchanged in effect)
  - `atMost` → `{ effectKey, minStacks: 0, maxStacks: stacks }`
- UI: reuse `EffectFilterChip`'s chevron-up (atLeast) / chevron-down (atMost)
  `IconButton` toggle pattern (same icons, same tooltip copy source —
  `comparisonAtLeastTooltip` / `comparisonAtMostTooltip` i18n keys already
  exist and are reused as-is, not duplicated).

### 2. Grouped/categorized dropdown

The must-have `EffectsAutocomplete` call gets `groupByCategory` passed
`true`, exactly like its Relic Browser usage. No new code in
`EffectsAutocomplete.tsx` — this is purely a prop flip at the call site in
`DamageOptimizer.tsx`. `mustHaveOptions` (the `useMemo` building the option
list from the player's owned relics) is unchanged; grouping/ranking is
`EffectsAutocomplete`'s existing internal concern.

### 3. Must-have entries as compact cards

Each entry in the `current.mustHaves.map(...)` list becomes a `Card` +
`CardContent`, styled like the existing 聖杯 vessel cards immediately below
in the same sidebar (`elevation={2}`, `px: 1.5, py: 0.5` content padding):

- Row 1: effect name, `Typography variant="body2" fontWeight="bold"` — **no
  `noWrap`**, wraps to multiple lines if needed.
- Row 2: at-least/at-most toggle (chevron `IconButton`, see #1) + stacks
  `Select` (existing `MIN_STACKS_OPTIONS`, unchanged) + delete `IconButton`,
  laid out in a `Stack direction="row"` with the toggle/select/delete
  right-aligned.

This mirrors the vessel card's "title on its own row, controls below" shape
rather than trying to cram name + controls into one line, which is what
caused the truncation in the first place.

### 4. Sidebar width

`360px` → `420px` for the left panel `Box`'s `width` (currently line 682).
Combined with #3's wrap-instead-of-truncate, this keeps most effect names to
1–2 wrapped lines instead of 3+, without the sidebar eating into the results
panel enough to matter (results panel is `flexGrow: 1` and was already
comfortably wider than the sidebar).

## Testing

- Existing `sanitizeMustHaves` / localStorage round-trip: extend
  `DamageOptimizer`'s settings tests (or add if none exist for this path) to
  cover an old-shape saved entry (`{effectKey, minStacks}`, no `comparison`)
  loading as `comparison: "atLeast"`, and a new-shape `atMost` entry
  round-tripping correctly.
- `current.mustHaves` → `SelectedEffectEntry[]` conversion: unit-test both
  `atLeast` and `atMost` produce the expected `{minStacks, maxStacks}` pair.
- No WASM/Rust changes, so no new Rust tests.
- Manual/visual check in the running dev server: add an `atMost` must-have,
  confirm the search actually excludes over-cap combinations; confirm the
  dropdown shows category chips and grouped results; confirm a long effect
  name wraps fully instead of truncating.
