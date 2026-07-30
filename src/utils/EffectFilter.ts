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

/**
 * Required groups are AND-of-OR: every group must be satisfied, and any one
 * matching entry satisfies a group. But two groups that can each only be
 * satisfied by the same single relic effect (e.g. two separate "Endurance
 * or Poise" groups) must NOT both be considered satisfied by that one
 * effect - the relic needs two distinct effects, one per group. This is
 * bipartite matching (groups <-> relic effect slots, Kuhn's algorithm) -
 * cheap here since a relic has at most 8 effects/debuffs and filters have
 * only a handful of groups.
 */
function canMatchAllGroupsWithDistinctEffects(
  groups: EffectFilterGroup[],
  effects: Effect[]
): boolean {
  const assignedGroupForEffect: (number | undefined)[] = new Array(
    effects.length
  ).fill(undefined);

  const tryAssign = (groupIndex: number, visited: Set<number>): boolean => {
    for (let effectIndex = 0; effectIndex < effects.length; effectIndex++) {
      if (visited.has(effectIndex)) {
        continue;
      }
      const matches = groups[groupIndex].entries.some((entry) =>
        entryMatchesEffect(entry, effects[effectIndex])
      );
      if (!matches) {
        continue;
      }
      visited.add(effectIndex);
      const currentOwner = assignedGroupForEffect[effectIndex];
      if (currentOwner === undefined || tryAssign(currentOwner, visited)) {
        assignedGroupForEffect[effectIndex] = groupIndex;
        return true;
      }
    }
    return false;
  };

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    if (!tryAssign(groupIndex, new Set())) {
      return false;
    }
  }
  return true;
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

  const activeGroups = filter.groups.filter(
    (group) => group.entries.length > 0
  );
  return canMatchAllGroupsWithDistinctEffects(activeGroups, effects);
}

export function flattenFilterEffects(
  groups: EffectFilterGroup[]
): EffectFilterEntry[] {
  const seen = new Set<Effect>();
  const result: EffectFilterEntry[] = [];
  for (const group of groups) {
    for (const entry of group.entries) {
      if (!seen.has(entry.effect)) {
        seen.add(entry.effect);
        result.push(entry);
      }
    }
  }
  return result;
}

export function applyRequiredPreset(
  state: EffectFilterState,
  entries: EffectFilterEntry[]
): EffectFilterState {
  if (entries.length === 0) {
    return state;
  }
  return {
    ...state,
    groups: [
      ...state.groups,
      {
        id: crypto.randomUUID(),
        entries,
      },
    ],
  };
}

export function applyExcludedPreset(
  state: EffectFilterState,
  entries: EffectFilterEntry[]
): EffectFilterState {
  if (entries.length === 0) {
    return state;
  }
  return {
    ...state,
    excludedGroups: [
      ...state.excludedGroups,
      {
        id: crypto.randomUUID(),
        entries,
      },
    ],
  };
}
