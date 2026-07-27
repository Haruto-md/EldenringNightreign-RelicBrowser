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
2. Reduce `HomePage.tsx` to a single centered "Open Save File" action, with
   no title, description, features list, demo card/route, tutorial video,
   safety alert, or Discord footer.
3. On the Relics page, integrate a "Close Save File" control as a small icon
   button inside the existing `AppBar`/`Tabs` row instead of a separate row.
4. Remove the now-unreachable `/relics/demo` route and demo data-loading
   code path, since the Demo entry point is being deleted from the home page
   and nowhere else links to it.

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
- The `FileUploader` for the "Open Save File" action is rendered by
  `HomePage` directly (not global), since it's only ever needed there now.
- The "Close Save File" trigger moves into `RelicsPage`'s `AppBar` (see
  below), so `RelicsPage` needs `onClear`/`clearSaveFile` wiring passed
  through — it already receives `clearSaveFile` as a prop.

### `HomePage.tsx`

- Replace the entire `Grid` content with a single centered `Box` containing
  just the `FileUploader` component in its "no file loaded" state (i.e. the
  existing "Open Save File" button + its file-select modal, unchanged).
- Remove `onLoadDemo` prop and the `tryDemo`-triggered navigation; `HomePage`
  no longer needs `loading`/demo props beyond what `FileUploader` itself
  requires (`onFileSelect`, `loading`).
- Delete the video tutorial `useEffect`/ref/analytics event code
  (`tutorial_begin`/`tutorial_complete` dataLayer pushes) since the video is
  removed.

### `RelicsPage.tsx`

- Add a small `IconButton` (icon: `Clear`, same as today) with a tooltip
  "Close Save File" (i18n'd) placed at the end of the existing `AppBar`
  (e.g. using a flex row: `Tabs` centered, icon button pinned right).
- Wire it to the existing `clearSaveFile` prop (already passed in) — same
  behavior as today's `handleClearSaveFile` (navigates home).

### Routing (`App.tsx` or wherever routes are declared)

- Remove the `/relics/demo` route and `DemoRelicsPage` import/usage.
- Remove `loadDemoData` plumbing from `useSaveFile` call sites in `App.tsx`
  if it becomes unused (verify no other consumer before deleting from the
  hook itself — the hook may stay as-is if only the route wiring is
  removed, to keep the change minimal).

### Files touched

- `src/App.tsx`
- `src/components/HomePage.tsx`
- `src/components/RelicsPage.tsx`
- Possibly `src/components/DemoRelicsPage.tsx` (delete, if nothing else
  references it) and related i18n keys.

## Testing

- Existing unit/component tests for `HomePage` and `RelicsPage`, if any,
  updated to match the new minimal markup.
- Manual verification in-browser: load a save file from the new minimal
  home screen, confirm Close button works from the Relics AppBar, confirm
  `/relics/demo` is gone (404s or redirects home).
