import { describe, expect, it } from "vitest";
import type { RelicSlot } from "../types/SaveFile";
import {
  createDefaultSelection,
  getSellCandidates,
  toggleSelection,
} from "./SellCandidates";

function makeRelic(overrides: Partial<RelicSlot> & { id: number; itemId: number }): RelicSlot {
  return {
    effects: [],
    coordinates: [0, 0],
    coordinatesByColor: [0, 0],
    ...overrides,
  };
}

describe("getSellCandidates", () => {
  it("only includes redundant relics that are not unsellable", () => {
    const redundant = makeRelic({
      id: 1,
      itemId: 104, // ordinary sellable item id used elsewhere in tests
      redundant: { relic: makeRelic({ id: 2, itemId: 107 }), outclassed: false },
    });
    const notRedundant = makeRelic({ id: 3, itemId: 104 });
    const unsellableButRedundant = makeRelic({
      id: 4,
      itemId: 1520, // present in unsellableItemIds
      redundant: { relic: makeRelic({ id: 5, itemId: 104 }), outclassed: false },
    });

    const candidates = getSellCandidates([
      redundant,
      notRedundant,
      unsellableButRedundant,
    ]);

    expect(candidates.map((r) => r.id)).toEqual([1]);
  });
});

describe("createDefaultSelection", () => {
  it("selects every candidate by default", () => {
    const candidates = [
      makeRelic({ id: 1, itemId: 104 }),
      makeRelic({ id: 2, itemId: 104 }),
    ];
    const selection = createDefaultSelection(candidates);
    expect(selection).toEqual(new Set([1, 2]));
  });
});

describe("toggleSelection", () => {
  it("removes an id that is selected and adds one that isn't, without mutating the input", () => {
    const original = new Set([1, 2]);

    const removed = toggleSelection(original, 1);
    expect(removed).toEqual(new Set([2]));
    expect(original).toEqual(new Set([1, 2]));

    const added = toggleSelection(original, 3);
    expect(added).toEqual(new Set([1, 2, 3]));
  });
});
