import { describe, expect, it } from "vitest";
import { unsellableItemIds } from "../resources/items";
import type { RelicSlot } from "../types/SaveFile";
import { buildSellKeySequence } from "./SellKeySequence";

// Builds a candidate at the given 0-indexed [row, column] grid coordinates,
// mirroring RelicParser.ts's `row = Math.floor(i / 8)` / `column = i % 8`.
function makeCandidate(
  row: number,
  column: number,
  itemId = 104
): RelicSlot {
  return {
    id: row * 100 + column,
    itemId,
    effects: [],
    coordinates: [row, column],
    coordinatesByColor: [row, column],
  };
}

describe("buildSellKeySequence", () => {
  it("returns an empty sequence for no candidates", () => {
    expect(buildSellKeySequence([])).toEqual([]);
  });

  it("selects a single relic at linear index 0 with no movement", () => {
    expect(buildSellKeySequence([makeCandidate(0, 0)])).toEqual([
      "Select",
      "Confirm",
    ]);
  });

  it("needs zero Right presses between two consecutive linear indices", () => {
    // Index 0 -> Select auto-advances to index 1, which is exactly the next
    // candidate's target, so no Right presses are needed between them.
    expect(
      buildSellKeySequence([makeCandidate(0, 0), makeCandidate(0, 1)])
    ).toEqual(["Select", "Select", "Confirm"]);
  });

  it("presses Right repeatedly to reach a relic several linear indices away", () => {
    // Jumping from index 0 to index 5 needs 5 Right presses.
    expect(buildSellKeySequence([makeCandidate(0, 5)])).toEqual([
      "Right",
      "Right",
      "Right",
      "Right",
      "Right",
      "Select",
      "Confirm",
    ]);
  });

  it("crosses an 8-wide row boundary using plain Right presses", () => {
    // [0,6] -> linear index 6; Select auto-advances to index 7. [1,1] ->
    // linear index 9, so 9 - 7 = 2 Right presses are needed after that.
    expect(
      buildSellKeySequence([makeCandidate(0, 6), makeCandidate(1, 1)])
    ).toEqual(["Right", "Right", "Right", "Right", "Right", "Right", "Select", "Right", "Right", "Select", "Confirm"]);
  });

  it("uses Down presses to cover 8-cell jumps instead of 8 individual Rights", () => {
    // [3,0] -> linear index 24, straight down 3 rows in the same column.
    expect(buildSellKeySequence([makeCandidate(3, 0)])).toEqual([
      "Down",
      "Down",
      "Down",
      "Select",
      "Confirm",
    ]);
  });

  it("combines Down and Right for a jump that isn't a multiple of 8", () => {
    // [3,3] -> linear index 27 = 3*8 + 3, so 3 Downs then 3 Rights.
    expect(buildSellKeySequence([makeCandidate(3, 3)])).toEqual([
      "Down",
      "Down",
      "Down",
      "Right",
      "Right",
      "Right",
      "Select",
      "Confirm",
    ]);
  });

  it("filters out unsellable item ids as a hard safety net", () => {
    const unsellableId = unsellableItemIds[0];
    const sequence = buildSellKeySequence([
      makeCandidate(0, 0, unsellableId),
      makeCandidate(0, 1, 104),
    ]);
    // Only the sellable relic (now the sole candidate, at linear index 1)
    // produces a Select; the unsellable one contributes nothing, so
    // navigation moves straight to index 1 instead of relying on an
    // auto-advance from a filtered-out relic at index 0.
    expect(sequence).toEqual(["Right", "Select", "Confirm"]);
  });

  it("returns an empty sequence when every candidate is unsellable", () => {
    const unsellableId = unsellableItemIds[0];
    expect(
      buildSellKeySequence([makeCandidate(0, 0, unsellableId)])
    ).toEqual([]);
  });

  it("handles candidates mixing normal and deep relics like any other selection", () => {
    // itemId 104 is a normal relic; itemId 30000 (deepDelicateBurningScene)
    // is a deep relic (see src/resources/items.ts). RelicParser.setCoordinates
    // assigns coordinates across all of a slot's relics as one combined
    // sequence, so there's nothing special about a mixed-type selection.
    expect(
      buildSellKeySequence([
        makeCandidate(0, 0, 104),
        makeCandidate(0, 1, 30000),
      ])
    ).toEqual(["Select", "Select", "Confirm"]);
  });
});
