# Damage Ranking Tab — Design

> **⚠️ SUPERSEDED — DO NOT IMPLEMENT.** This design scored individual relics in
> isolation and ignored the core fact that a build is a 6-slot vessel (3 normal +
> 3 deep) with per-slot color constraints. It has been replaced by
> `2026-07-25-damage-optimization-design.md`. Kept only as historical record.

## Motivation

RelicHub is a separate, existing desktop tool for analyzing Elden Ring Nightreign
relics. Its OCR-based detection and overall UX are poor and out of scope here, but
its damage-scoring logic (effect multipliers, per-attack-type aggregation) is
valuable and currently missing from Relic Browser. This design brings that
scoring capability into Relic Browser as a new tab, without adopting any of
RelicHub's detection pipeline or UI.

## Scope

In scope:

- A new "Damage Ranking" tab in `RelicsPage.tsx`, alongside Relic Browser and
  Combo Finder.
- Porting RelicHub's per-effect damage multiplier data into a build-time
  generated resource keyed by the existing `EffectKey` enum.
- A damage score calculation: for a selected Nightfarer and attack type,
  multiply together the multipliers of all matching effects a relic has.
- User-toggleable inclusion of non-stacking ("conditional") effects, grouped
  the same way RelicHub groups them.
- Sorting the current character slot's relics by computed score.

Out of scope:

- The 5 RelicHub effects marked `target: "特殊処理"` (multiplier is `null`,
  e.g. "on landing consecutive attacks", "on defeating an evergaol prisoner").
  These cannot be expressed as a static multiplier and are excluded from
  scoring entirely (they never appear as selectable effects, checkbox or
  otherwise).
- Vessel/relic-slot-shape selection (that's a Combo Finder concern).
- Any RelicHub OCR/detection/import functionality.
- Changing how save files are parsed or how the existing two tabs work.

## Data Layer

### Source data (from RelicHub, read-only reference — not shipped as-is)

- `RelicHub/data/calc_data.json` → `DAMAGE_MAP`: 146 effects, each with a
  `multiplier`, `stacks` (bool), `target`, and `character` ("全部" or a specific
  Nightfarer). Also contains `WEAPON_CATEGORIES` (28 weapon types),
  `WEAPON_DATA` (per-weapon damage-type breakdown), and `ALL_ATK_GROUPS` /
  `GROUP_ORDER` — RelicHub's own grouping of the 56 non-stacking effects into 9
  categories (被ダメージ時, 武器持ち替え時, 属性付与時, 脂アイテム使用時,
  状態異常の敵への攻撃, 周囲の状態異常発生時, 武器種3種以上装備,
  キャラクター固有, その他).
- `RelicHub/data/skills.json` / `deep.json` / `demerit.json`: effect name
  lists with both `jpn` and `eng` fields. These `eng` strings are the matching
  key into Relic Browser's data (see below).

### Matching approach

Relic Browser's `src/i18n.ts` has an English translation block with 850
`[EffectKey.X]: "..."` entries and a Japanese block with only 479 (371 keys
have no Japanese translation yet — confirmed by inspection). Matching must
therefore go through the **English** strings: RelicHub `eng` field ↔
`i18n.ts` `en` block string ↔ `EffectKey`.

This matching is done once, offline, by a generator script
(`scripts/generate-damage-multipliers.js`, following the existing
`scripts/generate-sitemap.js` pattern), not at runtime. The script:

1. Loads `RelicHub/data/calc_data.json`, `skills.json`, `deep.json`,
   `demerit.json`.
2. Builds a `jpn name → eng name` lookup from the skills/deep/demerit files.
3. For each `DAMAGE_MAP` entry, resolves its `eng` name and finds the
   `EffectKey` whose `en` translation string matches exactly.
4. Entries with `multiplier: null` (the 5 "特殊処理" effects) are dropped.
5. Any RelicHub entry that fails to match an `EffectKey` is reported to the
   console so it can be fixed with a manual override table (a small hardcoded
   `Record<string, EffectKey>` in the script for the handful of wording
   mismatches), rather than silently dropped.
6. Emits `src/resources/damageMultipliers.ts`, committed to the repo like any
   other generated-but-checked-in resource.

### Generated resource shape

```ts
export interface AttackGroup {
  weaponCategory?: string; // one of WEAPON_CATEGORIES, undefined = not weapon-specific
  damageType: "physical" | "magic" | "fire" | "lightning" | "holy" | "sorcery" | "incantation" | "skill";
}

export interface ConditionalGroup {
  id: string; // one of the 9 RelicHub group ids (被ダメージ時, etc.)
}

export interface DamageMultiplierEntry {
  multiplier: number;
  stacks: boolean;
  attackGroup?: AttackGroup;       // set when this effect universally applies to an attack type
  conditionalGroup?: ConditionalGroup; // set when stacks === false, for checkbox grouping
  nightfarer?: Nightfarer;         // set for the 9 character-exclusive effects
}

export const damageMultipliers: Partial<Record<EffectKey, DamageMultiplierEntry>>;
```

## Calculation Logic

Given a selected Nightfarer, a selected attack type (weapon category +
damage type, e.g. "Greatsword / Physical"), and a set of enabled conditional
group ids:

For each relic in the current character slot:

1. Start `score = 1`.
2. For each effect on the relic that has a `damageMultipliers` entry:
   - Skip if it has a `nightfarer` set and it doesn't match the selected
     Nightfarer.
   - Skip if it has a `conditionalGroup` and that group is not enabled by the
     user.
   - Skip if it has an `attackGroup` that doesn't apply to the selected attack
     type (universal entries with no `attackGroup`, like generic "all attacks"
     boosts, always apply).
   - Multiply `score` by the effect's `multiplier`.
3. Relics are sorted descending by `score`.

Relics with no applicable effects get `score = 1` (baseline, no bonus) and
sort to the bottom.

## UI Design

### Tab placement

`RelicsPage.tsx`'s `TabIndex` enum gains `DamageRanking`, rendered as a third
tab next to Relic Browser and Combo Finder. New component:
`src/components/DamageRanking.tsx`.

### Settings persistence

Mirrors Combo Finder's existing pattern: settings (selected attack type,
enabled conditional groups) are persisted to `localStorage` per-Nightfarer,
using a new storage key (e.g. `damageRanking:settings:v1`).

### Left panel (controls)

1. **Nightfarer selector** — required. This is a *different* selection from
   the existing top-of-page `CharacterSlotSelect` (which picks a save-file
   slot nickname, not a class). Reuses the `Nightfarer` enum and the same
   selector pattern already used in Combo Finder.
2. **Attack type selector** — weapon category (from `WEAPON_CATEGORIES`)
   crossed with damage type, plus non-weapon options (sorcery/incantation).
3. **Conditional effect checkboxes** — grouped into the 9 RelicHub categories,
   collapsible. The "キャラクター固有" (character-exclusive) group only shows
   entries matching the currently selected Nightfarer.

### Right panel (results)

- The current character slot's relics, sorted by computed score, descending.
- Each row shows the relic (reusing `RelicCard`) plus its numeric score and
  a visual indication of which of its effects contributed.
- Virtualized list via `@tanstack/react-virtual`, matching existing list
  patterns in the app.

## Testing

- Unit tests for the generator script's matching logic (given fixture
  RelicHub JSON + fixture `i18n.ts` strings, produces the expected
  `damageMultipliers` map; unmatched entries are reported, not silently
  dropped).
- Unit tests for the score calculation function: universal effects apply
  regardless of toggle state, conditional effects only apply when their group
  is enabled, Nightfarer-exclusive effects only apply for the matching
  Nightfarer, unmatched/no-effect relics score as baseline.
- Component test for `DamageRanking.tsx` covering: selecting a Nightfarer and
  attack type updates the sort order; toggling a conditional group changes
  scores and re-sorts.
