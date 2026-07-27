import { items, ItemType } from "../resources/items";
import type { Effect } from "../resources/effects";
import type { RelicSlot } from "../types/SaveFile";
import { getEffectGroup, getRelicColor } from "./DataUtils";
import { RelicSlotColor, type RelicColor } from "./RelicColor";

export function sortRelicsByColor(
  relics: RelicSlot[]
): Record<RelicColor, RelicSlot[]> {
  const sortedRelics: Record<RelicColor, RelicSlot[]> = {
    [RelicSlotColor.Red]: [],
    [RelicSlotColor.Blue]: [],
    [RelicSlotColor.Yellow]: [],
    [RelicSlotColor.Green]: [],
  };

  relics.forEach((relic) => {
    const color = getRelicColor(relic.itemId);
    sortedRelics[color].push(relic);
  });

  return sortedRelics;
}

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

/**
 * Two relics that are exactly equivalent (identical effects, identical
 * demerits) each mark the other as `redundant` with `outclassed: false`.
 * Left alone, that means *both* copies of a duplicate end up on the sell
 * list and get auto-selected for deletion - so the user loses the copy they
 * meant to keep.
 *
 * This resolves such mutual ties by keeping exactly one survivor per pair:
 * the relic with the lower `id` (deterministic, stable across runs) has its
 * `redundant` mark cleared, the other one keeps it. Only genuine two-way
 * ties between exactly these two relics are touched; one-directional
 * "A is outclassed by B" marks and longer chains are left untouched.
 */
function resolveMutualTies(relics: RelicSlot[]): void {
  for (const relic of relics) {
    const redundant = relic.redundant;
    if (redundant === undefined || redundant.outclassed) {
      continue;
    }

    const other = redundant.relic;
    const otherRedundant = other.redundant;
    if (
      otherRedundant === undefined ||
      otherRedundant.outclassed ||
      otherRedundant.relic !== relic
    ) {
      continue;
    }

    // Genuine mutual tie between exactly `relic` and `other`.
    // Keep the lower id as the survivor.
    const survivor = relic.id <= other.id ? relic : other;
    survivor.redundant = undefined;
  }
}

export function findOutclassedRelics(relics: RelicSlot[]): void {
  const normalRelics = relics.filter(
    ({ itemId }) => items.get(itemId)?.type !== ItemType.DeepRelic
  );
  const relicsByColor = sortRelicsByColor(normalRelics);
  for (const relic of normalRelics) {
    const redundant = findBetterRelic(
      relic,
      relicsByColor[getRelicColor(relic.itemId)]
    );
    if (redundant) {
      relic.redundant = redundant;
    }
  }
  resolveMutualTies(normalRelics);

  const deepRelics = relics.filter(
    ({ itemId }) => items.get(itemId)?.type === ItemType.DeepRelic
  );
  const deepRelicsByColor = sortRelicsByColor(deepRelics);
  for (const relic of deepRelics) {
    const redundant = findBetterRelic(
      relic,
      deepRelicsByColor[getRelicColor(relic.itemId)]
    );
    if (redundant) {
      relic.redundant = redundant;
    }
  }
  resolveMutualTies(deepRelics);
}
