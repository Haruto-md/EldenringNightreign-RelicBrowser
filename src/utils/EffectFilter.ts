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
