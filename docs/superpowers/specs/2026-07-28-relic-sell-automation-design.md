# Relic Sell Automation — Design

## Background

A prior design (`docs/superpowers/plans/2026-07-27-auto-relic-sell.md`) proposed writing modified relic data directly back into the `.sl2` save file (`SaveFileEncryptor`) and having the user replace their real save file with the output. That approach was abandoned: research confirmed Elden Ring Nightreign save slots carry a per-slot MD5 checksum outside the AES-CBC-encrypted payload (corroborated by community reports of "save data is corrupted" errors and by the existence of a dedicated community-made "Corrupt Save Fixer" tool that recalculates this checksum). Nothing in this repo's `SaveFileDecryptor`/`SaveFileEncryptor` accounts for that checksum, so writing back an edited save file risked corrupting the player's real character slot.

This design replaces that approach entirely. Instead of writing to the save file, the tool computes which relics should be sold (reusing the existing outclassed/redundant detection) and drives the *actual game UI* to sell them, via simulated keyboard input. The game's own save/checksum handling is left untouched — selling happens the same way it would if the player did it by hand, just faster.

## In-game relic sell grid — control model

The relic sell screen is an 8-column × N-row grid, cursor starts at (row 1, col 1). Columns are the bounded axis (1-8 in-game, 0-7 internally); rows are the unbounded axis and can grow arbitrarily large for a big inventory.

- Arrow keys move the cursor normally: Left/Right moves between columns keeping the same row; Up/Down moves within a column. The one non-obvious rule: pressing **Right while on column 8** moves to **column 1 of the next row** (there is no column 9, so it advances into the next row instead of doing nothing).
- **F** selects the relic under the cursor for sale, and the cursor auto-advances exactly as if Right had been pressed (including the column-8 wrap rule above). Multiple relics can be selected this way before confirming.
- **3** opens the sell confirmation screen for everything selected so far.

Relic coordinates already recorded on `RelicSlot.coordinates` (`[row, column]`) come from parsing the save file in the same order the game uses ("Order Found"), so a list of sell candidates is already naturally sorted in increasing (row, column) order — traversal from one candidate to the next never needs to move backward (no Up/Left needed) when every relic in a row is selected, though a partial selection within a row can still require a Left backtrack.

## Scope split

Two independent pieces, connected only by a clipboard handoff:

1. **Web app (this repo):** knows which relics should be sold and computes the exact key-press sequence to select them. Pure, testable TypeScript.
2. **AutoHotkey script (new, outside this repo's build):** a "dumb" player — reads that sequence from the clipboard and sends the corresponding key presses to the game window. No grid logic, no relic knowledge.

Deliberately not doing:
- Re-implementing relic detection or grid logic in the automation script — the web app is the single source of truth for both.
- Auto-confirming the sale. The script stops right after sending `3`; the player must review and confirm inside the game themselves. Selling is not reversible, so the last step is always manual.
- Writing anything to a file for the handoff. A browser download would land in the Downloads folder with no way to place it directly where the script expects it (the same sandboxing problem that sank the save-file-writeback approach). The clipboard has no such restriction.

## Web app changes

### `src/utils/SellKeySequence.ts` (new)

```ts
export type SellAction = "Up" | "Down" | "Left" | "Right" | "Select" | "Confirm";

export function buildSellKeySequence(candidates: RelicSlot[]): SellAction[]
```

Simulates a cursor starting at `(1, 1)`. For each candidate in order:
- Move down within the current column to reach the candidate's row (if already in the candidate's column), or move right (applying the row-8-wraps-to-next-column-row-1 rule) and then down to reach the candidate's exact `(row, column)`.
- Emit `"Select"` for the candidate itself, and update the simulated cursor position exactly as the game would after an F press (i.e., the same movement as one `"Right"`, including the row-8 wrap).

After all candidates are processed, append a single `"Confirm"`.

Candidates are assumed pre-sorted in increasing (column, row) order (the order `RelicSlot.coordinates` is already produced in) — the function does not sort its input and does not need to move backward. If this assumption doesn't hold for some input, the resulting sequence would be wrong; this is acceptable because the only caller (`SellCandidatesPanel`) always passes candidates in that order.

Unit tests (vitest) cover: single relic in column 1, multiple relics in the same column, relics spanning multiple columns, a candidate immediately after a row-8 wrap, and the empty-candidates case (sequence is just `["Confirm"]`... actually: if there are no candidates, no action list should be generated at all — see UI section).

### `SellCandidatesPanel` changes

Add a "Copy sell sequence" button next to the existing select-all/none controls. On click: `buildSellKeySequence(selectedCandidates)` → `JSON.stringify(...)` → `navigator.clipboard.writeText(...)`. Disabled when there is nothing selected. New i18n strings for the button label and a short confirmation toast/snackbar ("Copied N actions to clipboard" or similar, reusing whatever feedback pattern the app already uses for copy actions, if any exists — otherwise a simple MUI `Snackbar`).

No save-file writing, no download, no dialog confirmation step in the web app — that step now lives entirely in-game.

## AutoHotkey script (new, lives outside `src/`, e.g. `automation/sell-relics.ahk`)

- AutoHotkey v2.
- Bound to a hotkey (e.g. `F9`). On press: read clipboard, `JSON.parse` (AHK v2 needs a small JSON library or a hand-rolled parser for this flat string-array shape — flat enough not to need a full library), then iterate the action list.
- Action → key mapping: `Up/Down/Left/Right` → corresponding arrow key; `Select` → `f`; `Confirm` → `3`.
- Fixed delay between key sends (start conservative, e.g. 150–200ms; the exact value needs tuning against the real game and should be a single named constant at the top of the script).
- Guard: only sends input while the Nightreign game window is the active/foreground window (checked via `WinActive`), so an accidental hotkey press elsewhere does nothing.
- After sending the final `Confirm` action, the script stops. It does not attempt to detect or interact with the confirmation dialog. The player reviews and finalizes the sale by hand.
- Not covered by automated tests (no logic to test — pure input replay). Verified manually by the person running it, against the actual game.

## Error handling / edge cases

- Empty selection: "Copy sell sequence" button is disabled, so no empty/degenerate sequence is ever produced from the UI. `buildSellKeySequence([])` itself may still be called directly in tests and should return `[]` (no `Confirm` either — nothing to confirm).
- Malformed clipboard content on the AHK side (e.g., user copied something else): the script should fail to parse and do nothing rather than send garbage key presses — a parse error should abort before any key is sent.
- Any relic whose sale is deselected by the player mid-list (e.g., candidate list changed between copy and run) is out of scope for automatic detection — the player is responsible for verifying the selection on the confirmation screen before finalizing, per the manual-confirm requirement above.

## Testing

- `SellKeySequence.test.ts`: pure unit tests as described above, run via `npx vitest run src/utils/SellKeySequence.test.ts`.
- Manual end-to-end verification (documented as a plan step, not automatable): run the web app, select candidates, copy the sequence, run the AHK script against the real game, confirm the correct relics get selected on screen before the final manual confirm.
