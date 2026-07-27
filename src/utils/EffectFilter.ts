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
  /** Required groups: relic must match every group (AND), each group needs at least one matching entry (OR). */
  groups: EffectFilterGroup[];
  /** Excluded groups: relic is rejected if it matches any group (OR), each group's entries are OR'd the same way as `groups`. */
  excludedGroups: EffectFilterGroup[];
}

export function createEmptyEffectFilterState(): EffectFilterState {
  return { groups: [], excludedGroups: [] };
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

function groupMatches(group: EffectFilterGroup, effects: Effect[]): boolean {
  return group.entries.some((entry) =>
    effects.some((relicEffect) => entryMatchesEffect(entry, relicEffect))
  );
}

export function doesRelicMatchEffectFilter(
  relic: RelicSlot,
  filter: EffectFilterState
): boolean {
  const effects = relicEffects(relic);

  const isExcluded = filter.excludedGroups
    .filter((group) => group.entries.length > 0)
    .some((group) => groupMatches(group, effects));
  if (isExcluded) {
    return false;
  }

  return filter.groups
    .filter((group) => group.entries.length > 0)
    .every((group) => groupMatches(group, effects));
}
