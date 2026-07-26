# Relic Search/Filter Engine — Design

## Motivation

Relic Browser's current search (`SearchInput.tsx` + `SearchUtils.tsx`) is a
single free-text field: one string, substring-matched (OR) against the item
name and every effect name on a relic. There is no way to:

- Require multiple specific effects at once (e.g. "has Strength +3 AND
  Vigor +2").
- Express "any of these effects" as a distinct condition from "all of these
  effects."
- Exclude relics that carry a specific demerit/debuff.
- Browse the effect list by category — today it's one flat alphabetical
  autocomplete across every effect in the game (~850 entries).

This is the first of three follow-up items scoped out of a broader
conversation about making it easier to decide what to sell (see
[[damage-optimization-project]] sibling specs for prior art on this app's
generated-resource pattern). The other two — a demerit-aware rewrite of the
`redundant`/outclassed auto-detection in `RelicProcessor.ts`, and a manual
"mark for sell" workflow with export — are explicitly **out of scope** here
and will get their own specs later. This spec only replaces how relics are
searched and filtered.

## Scope

In scope:

- A structured effect-filter model (AND-of-OR-groups, plus a NOT/exclude
  list) that composes with the existing free-text search and color filter.
- An "Advanced Search" panel UI to build that filter.
- Effect categorization (for the picker inside the Advanced Search panel),
  sourced from `RelicHub/data/skills.json`'s `genre_order`/`skills`, via a
  generated resource — mirroring the existing
  `scripts/generate-damage-multipliers.mjs` pattern.

Out of scope:

- Changing `RelicProcessor.ts`'s outclassed/`redundant` detection (demerit
  handling there is a separate future spec).
- Manual sell-marking, persistence, or export (separate future spec).
- Any save-writing or in-game automation.
- Relic "size" — raised once during brainstorming but never pinned to an
  actual data field; not included.

## Filter Model

Replaces nothing existing — it's additive. The free-text search box and the
color `ToggleButtonGroup` in `SearchInput.tsx` keep working exactly as today.
New structured state, held alongside them in `RelicBrowser.tsx`:

```ts
type Comparison = "atLeast" | "atMost";

interface EffectFilterEntry {
  effect: Effect;
  comparison: Comparison; // only meaningful when effect has group+level; see below
}

interface EffectFilterGroup {
  id: string; // stable id for React keys / editing
  entries: EffectFilterEntry[]; // "at least one of" — OR within the group
}

interface EffectFilterState {
  groups: EffectFilterGroup[]; // AND across groups; a 1-entry group == a required effect
  excluded: Effect[]; // NOT — relic is dropped if it has ANY of these
}
```

A relic matches the structured filter when, for every group in `groups`, the
relic has at least one effect satisfying at least one entry in that group:

- `comparison: "atLeast"` (the default): matched using the existing
  `isSameGroupAndEqualOrBetter(entry.effect, relicEffect)` — same group,
  `relicEffect.level >= entry.effect.level`. This is today's "or better"
  behavior (selecting "Strength +2" also matches "Strength +3").
- `comparison: "atMost"`: matched using a new mirrored helper,
  `isSameGroupAndEqualOrWorse(entry.effect, relicEffect)` — same group,
  `relicEffect.level <= entry.effect.level`. Selecting "Vigor +2 (or below)"
  matches a relic with "Vigor +1" or "Vigor +2," but not "Vigor +3." This
  answers the "how do I find weak/outclassed levels of an effect" case
  without needing to enumerate every higher level in the exclude list.
- Effects with no `group`/`level` (most non-stat effects) only ever match
  exactly — the "at least / at most" toggle is meaningless for them and is
  hidden in the UI (see below); their entry always uses plain equality.

Separately, the relic has **none** of the effects in `excluded` (exact
match, no "or better"/"or worse" — a demerit is a demerit regardless of
level for exclusion purposes; `excluded` stays a flat `Effect[]`, not
`EffectFilterEntry[]`).

`isSameGroupAndEqualOrWorse` is a small addition to `effects.ts`, mirroring
`isSameGroupAndEqualOrBetter` (`src/resources/effects.ts:4789`) with the
inequality flipped.

Empty `groups` and empty `excluded` means "no structured filter," identical
to today's behavior. `RelicBrowser.tsx`'s `matchingRelics` memo gains this as
an additional AND'd condition alongside the existing free-text/color/sell
checks.

## Effect Categorization

### Source data

`RelicHub/data/skills.json` has a `genre_order` array (display order) and a
`skills` map keyed by the same genre names, each entry `{ id, jpn, eng,
normal, deep, with_demerit }`. The user-approved genre list:

能力値, 攻撃力, スキル/アーツ, 魔術／祈祷, カット率, 状態異常耐性, 回復,
アクション, 初期戦技, 初期武器, 初期魔術/祈祷, 初期アイテム, 調香瓶, 霊薬,
マップ環境, チームメンバー, 〇〇の攻撃力上昇, 〇〇の攻撃でHP回復, 〇〇の攻撃でFP回復,
特定武器3つ所持, 見つけやすくなる, 固有スキル

Plus one bucket this app must add: **"その他" (Other)**, for any `EffectKey`
that doesn't match a `skills.json` entry. Per the existing matching-rule
memory, this match is lossy (case/wording drift between RelicHub's `eng` and
`i18n.ts`'s `en` block) — the generator must never silently drop unmatched
effects, and the UI must never build its effect list from only the matched
subset. Every `EffectKey` needs a category; unmatched ones land in "Other"
rather than failing the build (categorization is a browsing aid, not
correctness-critical like the damage-multiplier data).

### Generator script

New `scripts/generate-effect-categories.mjs`, following
`scripts/generate-damage-multipliers.mjs` exactly:

1. Load `RelicHub/data/skills.json`.
2. Reuse `buildJpnToEngLookup` / `extractI18nEnglishEffectStrings` /
   `matchEffectKeyName` from `scripts/damage-multiplier-matching.mjs`
   (already handles the `jpn → eng → EffectKey` bridge and manual-override
   table pattern).
3. For every genre in `genre_order`, resolve each `skills[genre]` entry's
   `jpn` to an `EffectKey`; unresolved entries get logged to the console
   (not a hard failure — this script does not `process.exit(1)` on
   unmatched entries, unlike the damage-multiplier generator, since gaps
   here degrade to "Other," not incorrect math).
4. Any `EffectKey` (from `src/resources/effectKeys.ts`) not covered by any
   genre after step 3 is assigned to `"その他"`.
5. Emit `src/resources/effectCategories.ts`:

```ts
// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-effect-categories.mjs
import { EffectKey } from "./effectKeys";

export const effectCategoryOrder: string[]; // genre_order + "その他" appended
export const effectCategories: Record<EffectKey, string>; // every key covered
```

A `MANUAL_EFFECT_KEY_OVERRIDES` table (same shape as the existing script's)
covers the wording mismatches found when first running it.

## UI Design

### Entry point

`SearchInput.tsx` gains an "Advanced Search" toggle button (next to the
existing color filter and SELL toggle) that expands a collapsible panel
below the existing toolbar row. Collapsed by default; state does not need to
persist across reloads.

### Panel contents

- **Required groups** — a list of "OR groups," each rendered as a chip-row of
  selected effects plus a "+ add effect" `EffectsAutocomplete` input. A
  "+ Add group" button appends a new empty group. Groups with zero entries
  are dropped automatically (no explicit remove-group button needed — clear
  the group's last chip and it disappears from the AND list).
- **At-least/at-most toggle** — each chip for an effect that has a
  `group`/`level` (i.e. `isMaxLevel`-eligible stat/stacking effects) gets a
  small clickable icon (↑ "or better" / ↓ "or below") that flips its
  `comparison`, defaulting to `atLeast`. Chips for effects without a group
  (most unique/character effects) render with no toggle, since only exact
  match applies.
- **Effect picker** — the `EffectsAutocomplete` instances inside the panel
  render their dropdown grouped by `effectCategoryOrder`/`effectCategories`
  (MUI `Autocomplete`'s built-in `groupBy` prop), instead of today's flat
  list. This applies only within the Advanced Search panel; the main
  toolbar's free-text `EffectsAutocomplete` is unaffected.
- **Excluded effects** — a single chip-row + autocomplete, same interaction
  as one required group, feeding `excluded` instead of a new group.
- A count readout ("3 filters active") and a "Clear all" button.

### Result feedback

The existing subtitle in `RelicBrowser.tsx` ("Showing N matching relics...")
already reflects `matchingRelics.length` and needs no structural change —
the structured filter just becomes one more input to that same memo.

## Testing

- Unit tests for the new matcher (`doesRelicMatchEffectFilter` or similar in
  `SearchUtils.tsx`/`RelicProcessor.ts`): empty filter matches everything;
  single required group (OR) matches on any member; multiple groups (AND)
  requires all; `atLeast` comparison matches equal-or-higher level;
  `atMost` comparison matches equal-or-lower level and correctly excludes
  higher levels (the "Vigor +2 or below" case); ungrouped effects ignore
  `comparison` and match exactly; excluded effect drops an otherwise-matching
  relic; combination with existing free-text/color filters.
- Unit test for `isSameGroupAndEqualOrWorse` in `effects.test.ts`, mirroring
  existing `isSameGroupAndEqualOrBetter` coverage.
- Unit test for the generator's category assignment: every `EffectKey` in
  `effectKeys.ts` appears in the generated `effectCategories` map; effects
  absent from `skills.json` land in "その他"; `MANUAL_EFFECT_KEY_OVERRIDES`
  entries resolve correctly.
- Component test for the Advanced Search panel: adding effects across two
  groups filters relics with AND-of-OR semantics; toggling a chip's
  at-least/at-most icon changes which relics match; adding an excluded
  effect removes matching relics; clearing a group's last chip removes the
  group; "Clear all" resets to unfiltered.
