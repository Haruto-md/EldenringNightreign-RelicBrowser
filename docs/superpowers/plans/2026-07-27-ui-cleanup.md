# UI Cleanup (Header Row, Home Page, Relics AppBar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove wasted vertical space and dead content from the app shell: eliminate the standalone file-upload header row, delete the bloated `HomePage` component in favor of a minimal root screen, merge the "Close Save File" control and character-slot selector into the Relics page's existing `AppBar` row, and fold the relic count text into the search bar instead of giving it its own row.

**Architecture:** No new abstractions. This is a targeted reduction/merge of existing MUI layout code across `App.tsx`, `HomePage.tsx` (deleted), `RelicsPage.tsx`, `CharacterSlotSelect.tsx`, `RelicBrowser.tsx`, and `SearchInput.tsx`, plus removal of the now-unreachable demo route and its supporting code/i18n keys.

**Tech Stack:** React + TypeScript, MUI v5 (`@mui/material`, `@mui/icons-material`), react-router-dom, react-i18next, Vite. No test harness exists for React components in this repo (only unit tests for pure utils/resources) — verification is `npm run type-check`, `npm run lint`, and manual browser check.

## Global Constraints

- Do not change `FileUploader.tsx`'s internal modal/dropzone/copy-path behavior — only where/how it's invoked.
- Do not touch `DamageOptimizer.tsx`, `RelicCard.tsx` padding/margin, or `SearchInput.tsx`'s internal padding/toggle sizing — explicitly deferred per `docs/superpowers/specs/2026-07-27-ui-cleanup-design.md`.
- Every removed i18n key must be verified unused elsewhere before deletion (`grep` before removing from `src/i18n.ts` and `src/types/i18next.d.ts`).
- Run `npm run type-check` and `npm run lint` after each task; both must pass before moving on.

---

### Task 1: Delete the home page and the app-wide header row

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/components/HomePage.tsx`
- Delete: `src/components/DemoRelicsPage.tsx`
- Modify: `src/hooks/useSaveFile.ts:1-147`
- Modify: `src/i18n.ts` (remove `tryDemo`, `demo`, `demoDescription`, `features` keys from both `en` and `ja` blocks)
- Modify: `src/types/i18next.d.ts:14-21`

**Interfaces:**
- Consumes: existing `FileUploader` component (`src/components/FileUploader.tsx`), unchanged — props `onFileSelect: (file: File) => void`, `onClear?: () => void`, `loading?: boolean`, `hasFile?: boolean`.
- Consumes: `useSaveFile()` hook, with `loadDemoData` removed from its return value.
- Produces: `App.tsx` root (`"/"`) route renders the file-open UI directly (no `HomePage` component). Task 2 depends on this: `RelicsPage` continues to receive the same props it already receives (`saveFileData`, `loading`, `error`, `selectSlot`, `searchTerm`, `setSearchTerm`, `matchingRelicsCount`, `handleMatchingRelicsCountChange`, `clearSaveFile`) — none of those change in this task.

- [ ] **Step 1: Confirm the i18n keys to be deleted are only used in `HomePage.tsx`**

Run: `grep -rn "tryDemo\|demoDescription\|\bfeatures\b\|\bdemo\b" src --include=*.tsx --include=*.ts -l`
Expected output: only `src/components/HomePage.tsx`, `src/i18n.ts`, `src/types/i18next.d.ts`, and `src/components/DemoRelicsPage.tsx` (via prop name, not the i18n key) appear. If any other file appears, stop and re-scope this step before deleting those keys.

- [ ] **Step 2: Confirm `loadDemoData` has no other consumers**

Run: `grep -rn "loadDemoData" src`
Expected output: only `src/hooks/useSaveFile.ts`, `src/components/DemoRelicsPage.tsx`, and `src/App.tsx`.

- [ ] **Step 3: Delete `DemoRelicsPage.tsx` and remove its route/import from `App.tsx`**

In `src/App.tsx`, remove:
```tsx
import { DemoRelicsPage } from "./components/DemoRelicsPage";
```
and remove the whole `<Route path="/relics/demo" ...>` block (currently lines 102–118):
```tsx
<Route
  path="/relics/demo"
  element={
    <DemoRelicsPage
      saveFileData={saveFileData}
      loading={loading}
      error={error}
      loadDemoData={loadDemoData}
      selectSlot={selectSlot}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      matchingRelicsCount={matchingRelicsCount}
      handleMatchingRelicsCountChange={setMatchingRelicsCount}
      clearSaveFile={clearSaveFile}
    />
  }
/>
```
Also remove `handleLoadDemo` (the function that navigated to `/relics/demo`) since nothing calls it after this step.

Delete the file:
```bash
rm src/components/DemoRelicsPage.tsx
```

- [ ] **Step 4: Remove `loadDemoData` from `useSaveFile.ts`**

In `src/hooks/useSaveFile.ts`, delete the entire `loadDemoData` callback (lines 15–50, the block starting `// Load demo data` through its closing `}, []);`), and remove `loadDemoData` from the hook's returned object (line 139).

- [ ] **Step 5: Delete `HomePage.tsx` and inline a minimal root view in `App.tsx`**

```bash
rm src/components/HomePage.tsx
```

In `src/App.tsx`, remove the `import { HomePage } from "./components/HomePage";` line, and replace the `"/"` route's element with a minimal inline block that reuses `FileUploader` directly:

```tsx
<Route
  path="/"
  element={
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FileUploader
        onFileSelect={handleLoadSaveFile}
        loading={loading}
        hasFile={false}
      />
    </Box>
  }
/>
```

- [ ] **Step 6: Remove the standalone header row and move `FileUploader`'s "close" usage out of it**

In `src/App.tsx`, delete the entire `Box component="header"` block (currently lines 52–69):
```tsx
<Box
  component="header"
  sx={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    pt: 3,
    px: 1,
    mb: 3,
  }}
>
  <FileUploader
    onFileSelect={handleLoadSaveFile}
    onClear={handleClearSaveFile}
    loading={loading}
    hasFile={!!saveFileData}
  />
</Box>
```
The "open" usage now lives in the `"/"` route (Step 5). The "close" usage moves into `RelicsPage` in Task 2 — `handleClearSaveFile` and the `onClear`/`hasFile` props are no longer referenced in `App.tsx` after this step; remove the now-unused `handleClearSaveFile` function from `App.tsx` only if Task 2 doesn't need it passed down (it doesn't — `RelicsPage` already receives `clearSaveFile` directly from `useSaveFile()` and calls it via its own `useNavigate`, see Task 2).

- [ ] **Step 7: Remove the deleted i18n keys**

In `src/i18n.ts`, remove these four lines from the `en.translation` block:
```ts
tryDemo: "Try Demo Data",
demo: "Demo",
demoDescription: "Load sample relics to explore the interface",
features: "Features",
```
and the equivalent four lines from the `ja.translation` block:
```ts
tryDemo: "デモデータを試す",
demo: "デモ",
demoDescription: "サンプルリリックをロードしてインターフェースを探索",
features: "機能",
```

In `src/types/i18next.d.ts`, remove:
```ts
tryDemo: string;
demo: string;
demoDescription: string;
features: string;
```
(lines 18–21).

- [ ] **Step 8: Type-check and lint**

Run: `npm run type-check`
Expected: no errors. Fix any references to removed props/functions (e.g. leftover `onLoadDemo`, `handleLoadDemo`, `loadDemoData`, `HomePage`, `DemoRelicsPage` imports) if the compiler flags them.

Run: `npm run lint`
Expected: no errors (no unused-import warnings for `HomePage`, `DemoRelicsPage`, `handleClearSaveFile`, etc.).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Delete HomePage and demo route; root shows minimal Open Save File screen"
```

---

### Task 2: Merge character-slot select and Close Save File into the Relics AppBar

**Files:**
- Modify: `src/components/RelicsPage.tsx:1-137`
- Modify: `src/components/CharacterSlotSelect.tsx:34-43`

**Interfaces:**
- Consumes: `clearSaveFile: () => void` prop (already on `RelicsPageProps`, unchanged) and `useNavigate()` from `react-router-dom` (already imported in `RelicsPage.tsx`).
- Consumes: `FileUploader.tsx`'s `Clear` icon convention — import `Clear` from `@mui/icons-material` directly (matches how `FileUploader.tsx` already does `import { CloudUpload, Close, FileUpload, Clear } from "@mui/icons-material";`).
- Produces: no change to `CharacterSlotSelect`'s public props (`slots`, `value`, `onChange`, `label`) — only its internal wrapper markup changes, so nothing downstream needs updating beyond this task.

- [ ] **Step 1: Flatten `CharacterSlotSelect`'s wrapper so it can sit inline in a toolbar row**

In `src/components/CharacterSlotSelect.tsx`, change the outer `Box`'s `sx` from:
```tsx
sx={{
  p: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}}
```
to:
```tsx
sx={{
  display: "flex",
  alignItems: "center",
}}
```
(Drop the `p: 2` and `justifyContent: "center"` — the parent toolbar row now controls both padding and alignment.) Leave everything else in the file (the `FormControl`, `Select`, `MenuItem` rendering) unchanged.

- [ ] **Step 2: Replace the stacked `CharacterSlotSelect` + `AppBar` layout in `RelicsPage.tsx` with one merged toolbar row**

Current code (lines 102–117):
```tsx
return (
  <>
    {saveFileData.slots.length > 1 && (
      <CharacterSlotSelect
        slots={saveFileData.slots}
        value={saveFileData.currentSlot}
        onChange={selectSlot}
        label={t("character")}
      />
    )}
    <AppBar position="static" elevation={24}>
      <Tabs value={tab} onChange={(_e, value) => setTab(value)} centered>
        <Tab value={TabIndex.RelicBrowser} label={t("relicBrowserTab")} />
        <Tab value={TabIndex.DamageOptimizer} label="ダメージ最適化" />
      </Tabs>
    </AppBar>
```

Replace with:
```tsx
return (
  <>
    <AppBar position="static" elevation={24}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 1,
        }}
      >
        <Box sx={{ minWidth: 0, flexShrink: 0 }}>
          {saveFileData.slots.length > 1 && (
            <CharacterSlotSelect
              slots={saveFileData.slots}
              value={saveFileData.currentSlot}
              onChange={selectSlot}
              label={t("character")}
            />
          )}
        </Box>
        <Tabs
          value={tab}
          onChange={(_e, value) => setTab(value)}
          centered
          sx={{ flexGrow: 1 }}
        >
          <Tab value={TabIndex.RelicBrowser} label={t("relicBrowserTab")} />
          <Tab value={TabIndex.DamageOptimizer} label="ダメージ最適化" />
        </Tabs>
        <Tooltip title="Close Save File">
          <IconButton
            onClick={() => navigate("/")}
            aria-label="Close Save File"
            color="inherit"
          >
            <Clear />
          </IconButton>
        </Tooltip>
      </Box>
    </AppBar>
```
(The closing `</>` and the two `{tab === ...}` blocks below stay exactly as they are — only the header block above them changes.)

Note: `navigate` is already destructured at the top of the component (`const navigate = useNavigate();`); clicking the button navigates home, and the existing `useEffect` cleanup on unmount (lines 44–49: `return () => { clearSaveFile(); };`) already handles clearing the save file data — this matches how the old `FileUploader`'s `onClear` → `handleClearSaveFile` → `navigate("/")` flow worked, just triggered locally instead of through a prop.

- [ ] **Step 3: Update imports in `RelicsPage.tsx`**

Add to the `@mui/material` import (currently `import { Alert, AppBar, Box, CircularProgress, Tab, Tabs } from "@mui/material";`):
```tsx
import {
  Alert,
  AppBar,
  Box,
  CircularProgress,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
```
Add a new import for the icon:
```tsx
import { Clear } from "@mui/icons-material";
```

- [ ] **Step 4: Type-check and lint**

Run: `npm run type-check`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/RelicsPage.tsx src/components/CharacterSlotSelect.tsx
git commit -m "Merge character select and Close Save File into Relics AppBar row"
```

---

### Task 3: Fold the relic count text into the search bar row

**Files:**
- Modify: `src/components/RelicBrowser.tsx:139-163`
- Modify: `src/components/SearchInput.tsx:1-106`

**Interfaces:**
- Consumes: existing `t("showingAllRelicsTemplate", {...})` / `t("showingMatchingRelicsTemplate", {...})` i18n calls (unchanged keys/params — only where the resulting string is rendered changes).
- Produces: `SearchInput` gains a new required prop `countText: string`. No other component renders `SearchInput`, so this is the only call site to update.

- [ ] **Step 1: Add a `countText` prop to `SearchInput` and render it at the end of the toolbar row**

In `src/components/SearchInput.tsx`, add `Typography` to the `@mui/material` import:
```tsx
import { Box, Chip, Collapse, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
```

Add `countText: string;` to `SearchInputProps`:
```tsx
interface SearchInputProps {
  onSearchChange: (searchTerm: string) => void;
  selectedColor: ColorFilterOption;
  onColorChange: (colorFilter: ColorFilterOption) => void;
  availableEffects: Effect[];
  filterSell: boolean;
  onFilterSellChange: Dispatch<SetStateAction<boolean>>;
  effectFilter: EffectFilterState;
  onEffectFilterChange: (filter: EffectFilterState) => void;
  countText: string;
}
```

Destructure it in the component signature and render it as the last child of the inner flex row (right after the "advanced" `ToggleButton`, still inside the `Box` with `gap: 2` at lines 41–49):
```tsx
export const SearchInput: React.FC<SearchInputProps> = ({
  onSearchChange,
  selectedColor,
  onColorChange,
  availableEffects,
  filterSell,
  onFilterSellChange,
  effectFilter,
  onEffectFilterChange,
  countText,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Box sx={{ py: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* ...EffectsAutocomplete, ToggleButtonGroup, sell ToggleButton, advanced ToggleButton unchanged... */}

        <Typography variant="caption" color="text.secondary">
          {countText}
        </Typography>
      </Box>

      <Collapse in={advancedOpen}>
        {/* ...unchanged... */}
      </Collapse>
    </Box>
  );
};
```
(Only the `justifyContent`/`alignItems` line gains `alignItems: "center"` so the caption text vertically aligns with the buttons; everything else in that inner `Box` — `EffectsAutocomplete`, `ToggleButtonGroup`, the sell `ToggleButton`, the advanced `ToggleButton` — stays exactly as it is today, just with the new `Typography` appended after it.)

- [ ] **Step 2: Remove the standalone count `Typography` row from `RelicBrowser.tsx` and pass the text into `SearchInput` instead**

Current code (lines 139–163):
```tsx
<SearchInput
  onSearchChange={setSearchTerm}
  selectedColor={colorFilter}
  onColorChange={setColorFilter}
  availableEffects={availableEffects}
  filterSell={filterSell}
  onFilterSellChange={setFilterSell}
  effectFilter={effectFilter}
  onEffectFilterChange={setEffectFilter}
/>

<Typography variant="subtitle2" textAlign="center" gutterBottom>
  {currentSlot.relics.length === matchingRelics.length
    ? t("showingAllRelicsTemplate", {
        normal: normalRelicsCount,
        deep: deepRelicsCount,
        character: currentSlot.name,
      })
    : t("showingMatchingRelicsTemplate", {
        normal: normalRelicsCount,
        deep: deepRelicsCount,
        total: currentSlot.relics.length,
        character: currentSlot.name,
      })}
</Typography>
```

Replace with:
```tsx
<SearchInput
  onSearchChange={setSearchTerm}
  selectedColor={colorFilter}
  onColorChange={setColorFilter}
  availableEffects={availableEffects}
  filterSell={filterSell}
  onFilterSellChange={setFilterSell}
  effectFilter={effectFilter}
  onEffectFilterChange={setEffectFilter}
  countText={
    currentSlot.relics.length === matchingRelics.length
      ? t("showingAllRelicsTemplate", {
          normal: normalRelicsCount,
          deep: deepRelicsCount,
          character: currentSlot.name,
        })
      : t("showingMatchingRelicsTemplate", {
          normal: normalRelicsCount,
          deep: deepRelicsCount,
          total: currentSlot.relics.length,
          character: currentSlot.name,
        })
  }
/>
```

`Typography` may now be an unused import in `RelicBrowser.tsx` — check with the lint step below and remove it from the `@mui/material` import (currently `import { Box, Typography } from "@mui/material";` → `import { Box } from "@mui/material";`) if so.

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check`
Expected: no errors.

Run: `npm run lint`
Expected: no errors (in particular, no unused `Typography` import in `RelicBrowser.tsx`).

- [ ] **Step 4: Commit**

```bash
git add src/components/RelicBrowser.tsx src/components/SearchInput.tsx
git commit -m "Fold relic count text into search bar row instead of its own line"
```

---

### Task 4: Manual browser verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background). Note the local URL it prints (typically `http://localhost:5173`).

- [ ] **Step 2: Verify the root screen**

Open the app root in a browser. Confirm:
- No full-width header row above the content.
- The screen shows only a centered "Open Save File" button — no title, feature list, demo card, video, or Discord footer.
- `/relics/demo` returns to `/` (no demo route exists).

- [ ] **Step 3: Verify the Relics page**

Load a save file (or use `DebugMenu` if available in dev mode to inject test data — check `src/components/DebugMenu.tsx` for how it's used). Confirm:
- Character slot selector (if multiple slots exist) and the "Close Save File" icon button both appear inline in the same row as the Relic Browser / Damage Optimizer tabs — no separate full-width row above the tabs.
- Clicking the Close icon navigates back to the minimal root screen and clears the loaded save data (confirmed by the root screen showing "Open Save File" again with no residual state).
- On the Relic Browser tab, the "Showing X of Y relics" text appears inline within the search/filter bar, not as its own centered line below it.

- [ ] **Step 4: Report results**

Summarize pass/fail for each check above. If any check fails, fix the underlying code (not the check) and re-run from Step 1.

---

## Plan Self-Review Notes

- Spec coverage: Goals 1 (header row removal), 2 (HomePage deletion + minimal root), 3 (Close button in AppBar), 4 (demo route removal) are covered in Task 1 + Task 2. Goals 5 (CharacterSlotSelect merge) and 6 (count fold-in) are covered in Task 2 and Task 3 respectively. Deferred items (RelicCard, DamageOptimizer, SearchInput spacing/sizing) are called out in Global Constraints and untouched by any task.
- No placeholders: every step includes exact before/after code or exact grep/npm commands.
- Type consistency: `SearchInput`'s new `countText: string` prop name matches its one call site in `RelicBrowser.tsx`; `CharacterSlotSelect`'s public prop signature is unchanged so `RelicsPage.tsx`'s usage doesn't need updating beyond wrapping.
