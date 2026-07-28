import { items, ItemType, unsellableItemIds } from "../resources/items";
import type { RelicSlot } from "../types/SaveFile";

export type SellAction = "Up" | "Down" | "Left" | "Right" | "Select" | "Confirm";

interface GridPosition {
  row: number;
  col: number;
}

// The relic grid is 8 columns wide (RelicParser.ts: column = i % 8, an
// axis capped 0-7) and unboundedly tall (row = Math.floor(i / 8), which
// can grow arbitrarily large for a big inventory). The column axis is the
// one that wraps.
const GRID_COLS = 8;

/**
 * One Right press: normally keeps the same row and moves to the next
 * column, except pressing it while on column 8 wraps to column 1 of the
 * next row instead (there is no column 9). `F` (select) auto-advances the
 * cursor with this exact same rule.
 */
function applyRight(pos: GridPosition): GridPosition {
  return pos.col === GRID_COLS
    ? { row: pos.row + 1, col: 1 }
    : { row: pos.row, col: pos.col + 1 };
}

/**
 * Appends the actions needed to move from `pos` to `(targetRow, targetCol)`
 * and returns the resulting position. Row is resolved first (Down/Up) -
 * plain movement on the unbounded axis that never crosses a boundary and is
 * always safe - then column is resolved second (Right/Left), using the
 * column-8 wrap rule when needed.
 */
function moveTo(
  pos: GridPosition,
  targetRow: number,
  targetCol: number,
  actions: SellAction[]
): GridPosition {
  let { row, col } = pos;

  while (row < targetRow) {
    actions.push("Down");
    row++;
  }
  while (row > targetRow) {
    actions.push("Up");
    row--;
  }
  while (col < targetCol) {
    actions.push("Right");
    ({ row, col } = applyRight({ row, col }));
  }
  while (col > targetCol) {
    actions.push("Left");
    col--;
  }

  return { row, col };
}

/**
 * Converts an ordered list of sell-candidate relics into the sequence of
 * grid-navigation key presses needed to select all of them on the in-game
 * relic-sell screen, ending in a single Confirm. `candidates` must already
 * be in the order `RelicSlot.coordinates` naturally comes in (increasing
 * column, then increasing row within a column) - this function does not
 * sort its input and assumes nothing about relics out of that order.
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
  let pos: GridPosition = { row: 1, col: 1 };

  for (const candidate of sellableCandidates) {
    // RelicSlot.coordinates is 0-indexed (see RelicParser.ts: row =
    // Math.floor(i / 8), column = i % 8), but this function models the
    // in-game grid as 1-indexed starting at (1,1), so convert here.
    const [candidateRow, candidateCol] = candidate.coordinates;
    const targetRow = candidateRow + 1;
    const targetCol = candidateCol + 1;
    pos = moveTo(pos, targetRow, targetCol, actions);
    actions.push("Select");
    pos = applyRight(pos);
  }

  actions.push("Confirm");
  return actions;
}
