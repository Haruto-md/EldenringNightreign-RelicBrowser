# UI Cleanup: Home Page and File Header

## Problem

The app header (`App.tsx`) reserves a dedicated full-width row above every
page (`pt: 3`, `px: 1`, `mb: 3`) solely to hold the `FileUploader` button.
When a save file is loaded, that row shows only a "Close Save File" button —
an action used once per session — yet it permanently occupies prominent
vertical space at the top of the screen.

Separately, `HomePage.tsx` carries a large amount of content inherited from
the project this was forked from: a hero title/description, a features list,
a demo card, an embedded tutorial video, a safety disclaimer, and a Discord
footer blurb. None of it serves the tool's actual entry point, which is
simply "load your save file."

## Goals

1. Remove the dedicated header row from `App.tsx`; it should not exist on
   any page as a standalone full-width strip.
2. Delete `HomePage.tsx` entirely. The `"/"` route renders a single centered
   "Open Save File" action directly — no separate home-page component, no
   title, description, features list, demo card/route, tutorial video,
   safety alert, or Discord footer.
3. On the Relics page, integrate a "Close Save File" control as a small icon
   button inside the existing `AppBar`/`Tabs` row instead of a separate row.
4. Remove the now-unreachable `/relics/demo` route and demo data-loading
   code path, since the Demo entry point is being deleted and nowhere else
   links to it.
5. Merge `CharacterSlotSelect` into the `AppBar`/`Tabs` row on the Relics
   page instead of rendering it as its own full-width row above the tabs —
   two stacked full-width rows for "one dropdown" + "one tab bar" collapses
   into one row.
6. Fold the "Showing X of Y relics" subtitle in `RelicBrowser.tsx` into the
   existing `SearchInput` row instead of giving it a dedicated centered
   `Typography` row below the search bar.

A broader space-usage audit was done across `RelicBrowser`, `SearchInput`,
`RelicCard`, and `DamageOptimizer`. Only items 5 and 6 above are in scope for
this pass; `RelicCard` padding/margin overlap and `DamageOptimizer`'s stacked
settings panel are explicitly deferred to a later pass. `SearchInput`'s own
internal padding/toggle-button sizing is left unchanged for now — the user
raised a possible future feature (OR-combinable filters) in that area, which
is a functional change, not a spacing one, and is out of scope here.

## Non-goals

- No visual redesign of the Relics tab content itself (`RelicBrowser`,
  `DamageOptimizer`) beyond the AppBar integration described above.
- No changes to the actual file upload modal/dropzone flow inside
  `FileUploader.tsx` (drag-and-drop, save path helper text, copy-to-clipboard
  toast) — only where/how the trigger buttons are placed.
- No i18n work beyond removing now-dead translation keys used exclusively by
  deleted content (e.g. `features`, `demo`, `demoDescription`, `tryDemo`),
  if any are found to be unused elsewhere.

## Design

### `App.tsx`

- Delete the `Box component="header"` wrapper and the `FileUploader` render
  currently inside it.
- Delete `HomePage.tsx` and its import. The `"/"` route renders a small
  centered `Box` (directly in `App.tsx`, or a trivial inline component if
  that reads cleaner) containing just the `FileUploader` in its "no file
  loaded" state — the existing "Open Save File" button + its file-select
  modal, unchanged.
- The "Close Save File" trigger moves into `RelicsPage`'s `AppBar` (see
  below), so `RelicsPage` needs `onClear`/`clearSaveFile` wiring passed
  through — it already receives `clearSaveFile` as a prop.
- Remove `onLoadDemo`/`handleLoadDemo` and the `tryDemo`-triggered navigation
  entirely, along with the video tutorial `useEffect`/ref/analytics event
  code (`tutorial_begin`/`tutorial_complete` dataLayer pushes) that lived in
  `HomePage`.

### `RelicsPage.tsx`

- Replace the current stacked layout (`CharacterSlotSelect` row, then
  `AppBar`/`Tabs` row) with a single `AppBar` row laid out as: character
  slot `Select` pinned left (only rendered when `slots.length > 1`, as
  today), `Tabs` centered, "Close Save File" `IconButton` (icon: `Clear`,
  with tooltip, i18n'd) pinned right.
- `CharacterSlotSelect` keeps its existing `FormControl`/`Select` markup but
  drops its own wrapping `Box`'s `p: 2` centering (that's now handled by the
  parent flex row); reduce to no padding or minimal `py: 0.5` so it sits
  flush in the bar.
- Wire the close button to the existing `clearSaveFile` prop (already passed
  in) — same behavior as today's `handleClearSaveFile` (navigates home).

### `RelicBrowser.tsx` / `SearchInput.tsx`

- Remove the standalone `Typography variant="subtitle2" textAlign="center"`
  "Showing X of Y relics" row (`RelicBrowser.tsx` lines 126–130).
- Pass the same count string into `SearchInput` as a new prop, rendered as a
  small caption/`Chip` at the end of `SearchInput`'s existing flex row (no
  new row, no change to `SearchInput`'s existing padding/gap/toggle sizes).

### Routing (`App.tsx` or wherever routes are declared)

- Remove the `/relics/demo` route and `DemoRelicsPage` import/usage.
- Remove `loadDemoData` plumbing from `useSaveFile` call sites in `App.tsx`
  if it becomes unused (verify no other consumer before deleting from the
  hook itself — the hook may stay as-is if only the route wiring is
  removed, to keep the change minimal).

### Files touched

- `src/App.tsx`
- `src/components/HomePage.tsx` (deleted)
- `src/components/DemoRelicsPage.tsx` (deleted, nothing else references it)
- `src/components/RelicsPage.tsx`
- `src/components/CharacterSlotSelect.tsx`
- `src/components/RelicBrowser.tsx`
- `src/components/SearchInput.tsx`
- Related i18n keys (`features`, `demo`, `demoDescription`, `tryDemo`, etc.)
  removed if unused elsewhere.

## Deferred (explicitly out of scope this pass)

- `RelicCard.tsx` padding/margin overlap (`CardContent` `p: 1, mb: 1`
  stacking with grid item spacing).
- `DamageOptimizer.tsx` left settings panel: stacked single-column
  `FormControl`s (`Stack spacing={2.5}`) that could pair into a 2-column
  grid; redundant left/right panel horizontal padding around the divider.
- `SearchInput.tsx` internal padding/toggle-button sizing, and the related
  idea of OR-combinable filter selection (a functional change, raised by the
  user as a possible future feature, not a spacing fix).

## Testing

- Existing unit/component tests referencing `HomePage`, the demo route, or
  `CharacterSlotSelect`'s standalone layout, updated/removed to match.
- Manual verification in-browser: load a save file from the new minimal
  root screen, confirm Close button and character slot select both work
  from the Relics AppBar row, confirm the relic count is visible next to
  the search bar instead of its own row, confirm `/relics/demo` is gone
  (redirects home).
