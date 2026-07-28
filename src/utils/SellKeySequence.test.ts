import { describe, expect, it } from "vitest";
import { unsellableItemIds } from "../resources/items";
import type { RelicSlot } from "../types/SaveFile";
import { buildSellKeySequence } from "./SellKeySequence";

// Takes the 1-indexed in-game grid position (row, col) a test case is
// reasoning about and stores it as the 0-indexed value production code
// would actually see, mirroring RelicParser.ts's `row = Math.floor(i / 8)`
// / `column = i % 8` (i.e. RelicSlot.coordinates is 0-indexed, row is the
// unbounded axis and column is the axis capped 0-7 / 1-8).
function makeCandidate(
  row: number,
  col: number,
  itemId = 104
): RelicSlot {
  return {
    id: row * 100 + col,
    itemId,
    effects: [],
    coordinates: [row - 1, col - 1],
    coordinatesByColor: [row - 1, col - 1],
  };
}

describe("buildSellKeySequence", () => {
  it("returns an empty sequence for no candidates", () => {
    expect(buildSellKeySequence([])).toEqual([]);
  });

  it("selects a single relic at the starting position with no movement", () => {
    expect(buildSellKeySequence([makeCandidate(1, 1)])).toEqual([
      "Select",
      "Confirm",
    ]);
  });

  it("moves down then right to reach a relic in a later row and column", () => {
    // Row (the unbounded axis) is resolved first via Down/Up, then column
    // (the axis capped at 8) is resolved via Right/Left.
    expect(buildSellKeySequence([makeCandidate(3, 2)])).toEqual([
      "Down",
      "Down",
      "Right",
      "Select",
      "Confirm",
    ]);
  });

  it("moves left to go back into an earlier column for a second relic in it", () => {
    // Selecting (1,1) auto-advances the cursor to (1,2) - reaching a second
    // relic still in column 1 needs a Left press back into it, after first
    // moving down to the target row.
    expect(
      buildSellKeySequence([makeCandidate(1, 1), makeCandidate(3, 1)])
    ).toEqual(["Select", "Down", "Down", "Left", "Select", "Confirm"]);
  });

  it("uses the column-8 auto-wrap for a free transition into the next row", () => {
    // Selecting (1,8) - column 8, the last column - auto-advances the
    // cursor to (2,1) via the column-8 wrap rule, needing 2 extra Right
    // presses to reach a second relic at (2,3).
    expect(
      buildSellKeySequence([makeCandidate(1, 8), makeCandidate(2, 3)])
    ).toEqual([
      "Right",
      "Right",
      "Right",
      "Right",
      "Right",
      "Right",
      "Right",
      "Select",
      "Right",
      "Right",
      "Select",
      "Confirm",
    ]);
  });

  it("crosses a row boundary without hitting column 8 exactly", () => {
    // Two relics roughly 10 list-indices apart: list index 3 -> (1,4),
    // list index 13 -> (2,6). Selecting (1,4) auto-advances to (1,5) (no
    // wrap, column 4 != 8), then the next relic needs one Down and one
    // Right to reach (2,6).
    expect(
      buildSellKeySequence([makeCandidate(1, 4), makeCandidate(2, 6)])
    ).toEqual(["Right", "Right", "Right", "Select", "Down", "Right", "Select", "Confirm"]);
  });

  it("moves up when the next relic's row is lower than the current row", () => {
    // Selecting (7,1) auto-advances to (7,2) (column 1 != 8, so no wrap).
    // The next relic at (1,2) is the same column but a lower row, needing Up.
    expect(
      buildSellKeySequence([makeCandidate(7, 1), makeCandidate(1, 2)])
    ).toEqual([
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Select",
      "Up",
      "Up",
      "Up",
      "Up",
      "Up",
      "Up",
      "Select",
      "Confirm",
    ]);
  });

  it("produces exactly one Select per relic with zero movement between consecutive list-index relics", () => {
    // List indices 0,1,2,3 -> coordinates [0,0],[0,1],[0,2],[0,3] - under
    // the corrected model, consecutive list-index relics are always
    // adjacent (each Select's auto-advance lands exactly on the next), so
    // no movement actions should appear between them.
    const candidates = [
      makeCandidate(1, 1),
      makeCandidate(1, 2),
      makeCandidate(1, 3),
      makeCandidate(1, 4),
    ];
    expect(buildSellKeySequence(candidates)).toEqual([
      "Select",
      "Select",
      "Select",
      "Select",
      "Confirm",
    ]);
  });

  it("filters out unsellable item ids as a hard safety net", () => {
    const unsellableId = unsellableItemIds[0];
    const sequence = buildSellKeySequence([
      makeCandidate(1, 1, unsellableId),
      makeCandidate(1, 2, 104),
    ]);
    // Only the sellable relic (now the sole candidate) produces a Select;
    // the unsellable one contributes nothing, so navigation moves straight
    // to (1,2) instead of relying on an auto-advance from a filtered-out
    // relic at (1,1).
    expect(sequence).toEqual(["Right", "Select", "Confirm"]);
  });

  it("returns an empty sequence when every candidate is unsellable", () => {
    const unsellableId = unsellableItemIds[0];
    expect(
      buildSellKeySequence([makeCandidate(1, 1, unsellableId)])
    ).toEqual([]);
  });

  it("throws when candidates mix normal and deep relics", () => {
    // itemId 104 is a normal relic; itemId 30000 (deepDelicateBurningScene)
    // is a deep relic (see src/resources/items.ts) - normal and deep
    // relics live on separate in-game screens.
    expect(() =>
      buildSellKeySequence([
        makeCandidate(1, 1, 104),
        makeCandidate(1, 2, 30000),
      ])
    ).toThrow();
  });
});
