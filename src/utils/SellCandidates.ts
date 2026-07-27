import { unsellableItemIds } from "../resources/items";
import type { RelicSlot } from "../types/SaveFile";

export function getSellCandidates(relics: RelicSlot[]): RelicSlot[] {
  return relics.filter(
    (relic) =>
      relic.redundant !== undefined && !unsellableItemIds.includes(relic.itemId)
  );
}

export function createDefaultSelection(candidates: RelicSlot[]): Set<number> {
  return new Set(candidates.map((relic) => relic.id));
}

export function toggleSelection(
  selected: Set<number>,
  relicId: number
): Set<number> {
  const next = new Set(selected);
  if (next.has(relicId)) {
    next.delete(relicId);
  } else {
    next.add(relicId);
  }
  return next;
}
