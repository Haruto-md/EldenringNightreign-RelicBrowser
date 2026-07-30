import { unsellableItemIds } from "../resources/items";
import type { RelicSlot } from "../types/SaveFile";

export type SellAction = "Down" | "Right" | "Select" | "Confirm";

// The relic grid is 8 columns wide (RelicParser.ts: column = i % 8) and
// unboundedly tall (row = Math.floor(i / 8)). Right always moves exactly +1
// in the grid's linear reading order `row * GRID_COLS + column` (the
// in-game wrap rule - Right on the last column moves to the first column of
// the next row - is identical to "add 1 to the linear index"). Down keeps
// the column fixed and moves to the next row, which is *also* just a fixed
// linear-index delta: (row+1)*GRID_COLS + column - (row*GRID_COLS + column)
// = GRID_COLS, always, regardless of row/column. So both keys are pure
// "add a constant to the linear index" operations, and any mix of d Downs
// and r Rights lands at the same final linear index (pos + GRID_COLS*d + r)
// regardless of order - closing a gap of `delta` cells only ever needs
// floor(delta / GRID_COLS) Downs (covering 8 cells per press instead of 1)
// plus delta % GRID_COLS leftover Rights, instead of `delta` individual
// Right presses. Every index visited along the way (linear index only ever
// increases, capped by the real target's own index) stays within the
// populated range 0..totalRelics-1, since relics pack the grid with no
// gaps - so there's no way to path through a nonexistent cell.
const GRID_COLS = 8;

/**
 * Converts an ordered list of sell-candidate relics into the sequence of
 * grid-navigation key presses needed to select all of them on the in-game
 * relic-sell screen, ending in a single Confirm. `candidates` must already
 * be in increasing linear-index order (`row * GRID_COLS + column`, i.e. the
 * order `RelicSlot.coordinates` naturally comes in - increasing row, then
 * increasing column within a row / "Order Found" order) - this function
 * does not sort its input and assumes nothing about relics out of that
 * order.
 *
 * `unsellableItemIds`, favorited relics, and equipped relics are filtered
 * out as a hard safety net regardless of what the caller passed in -
 * RelicBrowser's selection mode is deliberately independent of the
 * sellable/redundant display filter, so a caller can hand this function an
 * unsellable, favorited, or equipped relic. Normal and deep relics share
 * one combined coordinate space (RelicParser.setCoordinates assigns
 * coordinates across all of a slot's relics as a single sequence) and are
 * shown together on the same in-game grid whenever no type filter is
 * active, so a mixed-type selection is not a special case here.
 */
export function buildSellKeySequence(candidates: RelicSlot[]): SellAction[] {
  const sellableCandidates = candidates.filter(
    (candidate) =>
      !unsellableItemIds.includes(candidate.itemId) &&
      !candidate.favorite &&
      !candidate.equipped
  );

  if (sellableCandidates.length === 0) {
    return [];
  }

  const actions: SellAction[] = [];
  let pos = 0;

  for (const candidate of sellableCandidates) {
    const [row, column] = candidate.coordinates;
    const targetIndex = row * GRID_COLS + column;

    const delta = targetIndex - pos;
    const downs = Math.floor(delta / GRID_COLS);
    const rights = delta % GRID_COLS;
    for (let i = 0; i < downs; i++) {
      actions.push("Down");
    }
    for (let i = 0; i < rights; i++) {
      actions.push("Right");
    }
    pos = targetIndex;

    actions.push("Select");
    pos++;
  }

  actions.push("Confirm");
  return actions;
}
