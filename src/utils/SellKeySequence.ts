import type { RelicSlot } from "../types/SaveFile";

export type SellAction = "Up" | "Down" | "Left" | "Right" | "Select" | "Confirm";

interface GridPosition {
  row: number;
  col: number;
}

const GRID_ROWS = 8;

/**
 * One Right press: normally keeps the same row and moves to the next
 * column, except pressing it while on row 8 wraps to row 1 of the next
 * column instead (there is no row 9). `F` (select) auto-advances the
 * cursor with this exact same rule.
 */
function applyRight(pos: GridPosition): GridPosition {
  return pos.row === GRID_ROWS
    ? { row: 1, col: pos.col + 1 }
    : { row: pos.row, col: pos.col + 1 };
}

/**
 * Appends the actions needed to move from `pos` to `(targetRow, targetCol)`
 * and returns the resulting position. Column is resolved first (Right/Left),
 * then row (Down/Up) - moving column first means any row-8 wraps that happen
 * along the way don't matter, since the row is corrected exactly afterward.
 */
function moveTo(
  pos: GridPosition,
  targetRow: number,
  targetCol: number,
  actions: SellAction[]
): GridPosition {
  let { row, col } = pos;

  while (col < targetCol) {
    actions.push("Right");
    ({ row, col } = applyRight({ row, col }));
  }
  while (col > targetCol) {
    actions.push("Left");
    col--;
  }
  while (row < targetRow) {
    actions.push("Down");
    row++;
  }
  while (row > targetRow) {
    actions.push("Up");
    row--;
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
 */
export function buildSellKeySequence(candidates: RelicSlot[]): SellAction[] {
  if (candidates.length === 0) {
    return [];
  }

  const actions: SellAction[] = [];
  let pos: GridPosition = { row: 1, col: 1 };

  for (const candidate of candidates) {
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
