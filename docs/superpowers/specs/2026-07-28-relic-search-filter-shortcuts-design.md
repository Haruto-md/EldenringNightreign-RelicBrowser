# Relic Search Filter Shortcuts — Design

## Motivation

The Advanced Search panel (`AdvancedSearchPanel.tsx`, `EffectFilter.ts`,
`EffectsAutocomplete.tsx`) added structured effect filtering — required
groups (AND-of-OR) and excluded groups (OR-of-OR) — but building a filter is
still all manual: every effect has to be found and added through the
autocomplete, every time, for every triage session. This is the second of
the follow-ups called out in
[[relic-search-filter-engine-project]] ("a manual 'mark for sell' workflow"
is a separate, still-later spec — not this one).

This spec covers three specific friction points raised during actual
triage use:

1. Re-building the same "these effects mean this relic is junk" filter over
   and over, one autocomplete pick at a time.
2. No fast way to say "show me relics like this one" starting from a relic
   you're already looking at.
3. The effect picker's category grouping is hard to navigate — no way to
   jump to a category, and within a category the order doesn't follow
   effect level, making it hard to find, e.g., "Vigor +2" specifically.

Out of scope (belongs to the separate manual mark-for-sell spec still to
come): moving relics into/out of a persistent "batch," and any UI for
reviewing a batch independent of the live filter view.

## 1. Named effect presets

### Data model

New `src/utils/EffectFilterPreset.ts`:

```ts
export interface EffectFilterPreset {
  id: string;
  name: string;
  kind: "required" | "excluded";
  effects: Effect[];
}
```

A preset is a flat, unordered set of effects tagged with which side of the
filter it's meant for. `kind` is fixed at save time and does not change
when applying — a preset built as "excluded" always applies to
`excludedGroups`; one built as "required" always applies to `groups`. This
was a deliberate simplification: letting one preset apply to either side on
demand would require the UI to ask "apply as required or excluded?" every
time, for no real benefit — the two use cases (find junk by required-OR,
protect known-good effects by excluded-OR) are decided when the preset is
created, not when it's used.

Presets persist in `localStorage` under a single key
(`"relicBrowser.effectFilterPresets"`), following the exact pattern already
used by `DamageOptimizer.tsx` (`loadSettingsFromStorage`/
`saveSettingsToStorage`): `JSON.parse`/`JSON.stringify` a plain array,
wrapped in `try`/`catch` that silently falls back to `[]` on read and
no-ops on write failure (storage disabled/full). Effects are serialized by
`EffectKey` (matching the existing `EffectsAutocomplete` convention of
working with `Effect` objects resolved via `getEffectByKey`), not by the
full `Effect` object, to keep the persisted shape stable across any future
change to `Effect`'s other fields.

### Creating a preset

`AdvancedSearchPanel` gains a "Save as preset" button next to the existing
"Clear all." Clicking it opens a small dialog: a name field and a
kind choice (Required / Excluded). Saving snapshots **only the side that
matches the chosen kind** — picking "Required" saves the effects currently
present across `effectFilter.groups` (flattened; AND-grouping among those
manual groups is intentionally discarded, since a preset always applies as
a single OR set — see below), picking "Excluded" saves
`effectFilter.excludedGroups` flattened the same way. The button is
disabled when the corresponding side (whichever kind is selected in the
dialog) has zero effects — there's nothing to name and save.

### Applying a preset

A "Presets" dropdown (MUI `Menu` off a button) lists saved presets grouped
by `kind`, each row with an "Apply" action and a "Delete" icon button (no
edit/rename in this iteration — deleting and re-saving is enough given how
cheap presets are to build).

- Applying a `kind: "required"` preset **replaces** `effectFilter.groups`
  entirely with one new group containing the preset's effects (each as an
  `atLeast`-comparison entry, matching today's default when adding effects
  via the autocomplete). Any required groups the user had built by hand are
  discarded. This was chosen over trying to combine a preset with existing
  manual required groups because the filter engine's AND-across-groups
  model has no way to express "match my existing groups OR this preset" —
  only "match my existing groups AND this preset," which is not what
  "quickly see everything in this preset" means. Replacing keeps preset
  application predictable: it always shows exactly the preset's matches.
- Applying a `kind: "excluded"` preset **appends** a new group to
  `effectFilter.excludedGroups` containing the preset's effects. This does
  compose correctly with whatever excluded groups already exist, because
  `doesRelicMatchEffectFilter` already ORs across all excluded groups
  (`EffectFilter.ts:68-70`) — a relic is dropped if it matches *any*
  excluded group, so adding another group is exactly "OR this preset's
  junk-effects in with whatever I'd already excluded."
- Applying either kind leaves the free-text search, color filter, and the
  *other* side's groups (excluded when applying required, and vice versa)
  untouched.

## 2. Click-to-filter from a relic card

Each effect line in `RelicCard.tsx` (`effects.map(([effect, debuff]) =>
...)`, around line 229) becomes clickable: `onClick` with
`event.stopPropagation()` (same pattern already used for the "outclassed"
chip's `handleSellMeClick`, `RelicCard.tsx:76-80`, so it doesn't also
toggle the card's selection state when `selectable` is active) fires a new
`onFilterByEffect?: (effect: Effect) => void` prop, threaded down from
`RelicBrowser.tsx` through `RelicDisplay.tsx`.

`RelicBrowser.tsx`'s handler appends a **new** single-entry group to
`effectFilter.groups` (not merged into an existing group) — clicking two
different effects from two different cards produces two AND'd
single-effect groups, i.e. "must have effect A AND effect B," which is the
"find relics like this" behavior asked for. Clicking an effect already
present in some existing group is a no-op (dedup check identical to
`addEffectToGroup`'s existing `entries.some((e) => e.effect === effect)`
guard).

If the Advanced Search panel is currently collapsed, adding a filter this
way also expands it, so the user sees what was just added instead of
wondering why the relic list changed. Debuff effects (the second element of
a `RelicSlot` effect pair) are clickable the same way as the primary
effect — a demerit is as valid a thing to filter on as a boon.

Clicking an effect line does nothing when the click also has no visible
target state to show for it beyond the panel expanding and the relic list
narrowing — no separate confirmation UI is needed; the existing "N filters
active" count and re-filtered grid are sufficient feedback, consistent with
how the rest of Advanced Search already communicates state changes.

## 3. Effect picker navigation

### Category quick-filter chips

`EffectsAutocomplete.tsx`, when `groupByCategory` is set, renders a row of
`Chip`s above the `Autocomplete` — one per entry in `effectCategoryOrder`
plus an "All" chip (selected by default). Clicking a category chip filters
the `options` array (already computed in the `options` memo,
`EffectsAutocomplete.tsx:67-76`) down to just that category's effects
before the existing free-text matching runs; clicking "All" (or the
already-selected chip again) clears the restriction. This is additive to
free-text search, not a replacement — typing still narrows within whatever
category scope is active. Selected-chip state is local to each
`EffectsAutocomplete` instance (`useState`, not lifted or persisted) —
it's a browsing aid for the current pick, not a setting worth remembering
across reloads.

### Within-category ordering

The problem isn't level ordering specifically — it's that same-family
effects aren't kept together at all. Today `effectCategories.ts` (generated
by `scripts/generate-effect-categories.mjs`) only records *which* category
(genre) an `EffectKey` belongs to; it discards the position that entry had
within `skills.json`'s per-genre `skills[genre]` array. `EffectsAutocomplete`'s
`options` memo therefore sorts only by category index and leaves
same-category effects in whatever order `availableEffects` happened to
provide (stable sort preserves `effectKeys.ts` declaration order, which
has no relation to attribute families).

Confirmed by inspecting `RelicHub/data/skills.json`'s `能力値` (stats) genre
directly: it already lists 生命力+1/+2/+3 (Vigor), then 精神力+1/+2/+3 (Mind),
then 持久力+1/+2/+3 (Endurance), and so on — the same family's levels
adjacent, families in the game's own stat order — for the exact reason the
user expects. The fix is to preserve and use that existing order, not to
invent a new one from `Effect.group`/`level` (which wouldn't cover the
many category entries — skill/character effects, item effects, etc. —
that have no `group`/`level` at all).

`generate-effect-categories.mjs` gains a second export alongside
`effectCategories`, recording each `EffectKey`'s index within its genre's
`skills[genre]` array at the point it was matched (step 3 of the existing
generation loop, `scripts/generate-effect-categories.mjs:216-232`):

```ts
export const effectCategoryRank: Record<EffectKey, number>;
```

Entries assigned to `"その他"` (never matched to a `skills.json` entry) get
rank `Number.MAX_SAFE_INTEGER`, sorting last within that category —
there's no ordering signal for them beyond "not one of the categorized
ones." `EffectsAutocomplete`'s `options` memo's sort gains this as its
secondary key: `(categoryIndex, effectCategoryRank[key])` instead of
today's `categoryIndex`-only sort.

## Testing

- `EffectFilterPreset.ts`: unit tests for save/load round-trip through
  `localStorage` (mocked), and for the "corrupted/missing storage falls
  back to `[]`" path, mirroring `DamageOptimizer.tsx`'s existing coverage
  pattern for its own storage helpers.
- `AdvancedSearchPanel` component tests: saving a preset from the required
  side captures exactly the flattened current `groups` effects; saving from
  the excluded side captures `excludedGroups`; applying a required preset
  replaces `groups` and leaves `excludedGroups` untouched; applying an
  excluded preset appends to `excludedGroups` and leaves `groups`
  untouched; deleting a preset removes it from the list and from storage.
- `RelicCard`/`RelicBrowser` integration test: clicking an effect line adds
  a new required group with that single effect; clicking the same effect
  again is a no-op; clicking a debuff behaves the same as clicking a
  primary effect; clicking while the Advanced Search panel is collapsed
  expands it.
- `EffectsAutocomplete` component test: selecting a category chip narrows
  `options` to that category; the "All" chip (or re-clicking the active
  chip) restores the full list; free-text input still filters within the
  active category scope.
- Unit test for the generator's `effectCategoryRank` output: every matched
  `EffectKey` gets the index it had within its genre's `skills[genre]`
  array; unmatched ("その他") keys get `Number.MAX_SAFE_INTEGER`.
- Unit test for the `options` memo's sort: same-category effects sort by
  `effectCategoryRank` (family members stay adjacent, e.g. all of Vigor's
  levels before Mind's, matching `skills.json`'s order); sort remains
  stable across categories (no cross-category reordering from the new
  secondary key).
