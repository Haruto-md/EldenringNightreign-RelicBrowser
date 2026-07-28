import { items, ItemType, unsellableItemIds } from "../resources/items";
import type { RelicSlot } from "../types/SaveFile";

export type SellAction = "Right" | "Select" | "Confirm";

// The relic grid is 8 columns wide (RelicParser.ts: column = i % 8) and
// unboundedly tall (row = Math.floor(i / 8)). Pressing Right always moves
// exactly +1 in the grid's linear reading order `row * GRID_COLS + column`:
// within a row it's a plain +1 step, and the in-game wrap rule (Right on
// the last column of a row moves to the first column of the next row) is
// identical to "add 1 to the linear index." Selecting a relic (`F`)
// auto-advances the cursor with that exact same +1 rule. So the entire
// navigation problem collapses to tracking a single linear position and
// pressing Right enough times to close the gap to each target - no
// row/column reasoning, and no way to path through a nonexistent cell in a
// partial final row.
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
 * `unsellableItemIds` are filtered out as a hard safety net regardless of
 * what the caller passed in - RelicBrowser's selection mode is deliberately
 * independent of the sellable/redundant display filter, so a caller can
 * hand this function an unsellable relic. Normal and deep relics live on
 * separate in-game grids/screens, so a mixed selection can't be turned into
 * a single coherent sequence - this throws rather than silently producing
 * a nonsensical one.
 */
export function buildSellKeySequence(candidates: RelicSlot[]): SellAction[] {
  const sellableCandidates = candidates.filter(
    (candidate) => !unsellableItemIds.includes(candidate.itemId)
  );

  if (sellableCandidates.length === 0) {
    return [];
  }

  const isDeepRelic = (candidate: RelicSlot): boolean =>
    items.get(candidate.itemId)?.type === ItemType.DeepRelic;
  const hasDeepRelic = sellableCandidates.some(isDeepRelic);
  const hasNormalRelic = sellableCandidates.some(
    (candidate) => !isDeepRelic(candidate)
  );
  if (hasDeepRelic && hasNormalRelic) {
    throw new Error(
      "buildSellKeySequence: candidates mix normal and deep relics, which live on separate in-game screens and cannot share a single key sequence"
    );
  }

  const actions: SellAction[] = [];
  let pos = 0;

  for (const candidate of sellableCandidates) {
    const [row, column] = candidate.coordinates;
    const targetIndex = row * GRID_COLS + column;

    while (pos < targetIndex) {
      actions.push("Right");
      pos++;
    }

    actions.push("Select");
    pos++;
  }

  actions.push("Confirm");
  return actions;
}
