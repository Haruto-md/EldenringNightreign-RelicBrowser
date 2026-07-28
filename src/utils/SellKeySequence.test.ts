import { describe, expect, it } from "vitest";
import type { RelicSlot } from "../types/SaveFile";
import { buildSellKeySequence } from "./SellKeySequence";

// Takes the 1-indexed in-game grid position (row, col) a test case is
// reasoning about and stores it as the 0-indexed value production code
// would actually see, mirroring RelicParser.ts's `row = Math.floor(i / 8)`
// / `column = i % 8` (i.e. RelicSlot.coordinates is 0-indexed).
function makeCandidate(row: number, col: number): RelicSlot {
  return {
    id: row * 100 + col,
    itemId: 104,
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

  it("moves right (preserving row) to reach a relic in the next column", () => {
    expect(buildSellKeySequence([makeCandidate(3, 2)])).toEqual([
      "Right",
      "Down",
      "Down",
      "Select",
      "Confirm",
    ]);
  });

  it("moves left to go back into an earlier column for a second relic in it", () => {
    // Selecting (1,1) auto-advances the cursor to (1,2) - reaching a second
    // relic still in column 1 needs a Left press back into it.
    expect(
      buildSellKeySequence([makeCandidate(1, 1), makeCandidate(3, 1)])
    ).toEqual(["Select", "Left", "Down", "Down", "Select", "Confirm"]);
  });

  it("uses the row-8 auto-wrap for a free transition into the next column", () => {
    // Selecting (8,1) auto-advances the cursor to (1,2) via the row-8 wrap
    // rule, needing zero extra moves to reach a relic already at (1,2).
    expect(
      buildSellKeySequence([makeCandidate(8, 1), makeCandidate(1, 2)])
    ).toEqual([
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Down",
      "Select",
      "Select",
      "Confirm",
    ]);
  });

  it("moves up when the next relic's row is lower than the current row", () => {
    // Selecting (7,1) auto-advances to (7,2) (row 7 != 8, so no wrap). The
    // next relic at (1,2) is the same column but a lower row, needing Up.
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
});
