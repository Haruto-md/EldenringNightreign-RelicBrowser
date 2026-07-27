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
}
