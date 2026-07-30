import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Effect } from "../resources/effects";
import {
  applyExcludedPreset,
  applyRequiredPreset,
  createEmptyEffectFilterGroup,
  flattenFilterEffects,
  type EffectFilterGroup,
  type EffectFilterState,
} from "../utils/EffectFilter";
import {
  loadEffectFilterPresets,
  parseEffectFilterPresetsJson,
  resolvePresetEntries,
  saveEffectFilterPresets,
  type EffectFilterPreset,
  type EffectFilterPresetKind,
} from "../utils/EffectFilterPreset";
import { EffectFilterChip } from "./EffectFilterChip";
import { EffectsAutocomplete } from "./EffectsAutocomplete";

interface AdvancedSearchPanelProps {
  availableEffects: Effect[];
  effectFilter: EffectFilterState;
  onEffectFilterChange: (filter: EffectFilterState) => void;
}

function countActiveFilters(filter: EffectFilterState): number {
  const groupEntries = filter.groups.reduce(
    (sum, g) => sum + g.entries.length,
    0
  );
  const excludedEntries = filter.excludedGroups.reduce(
    (sum, g) => sum + g.entries.length,
    0
  );
  return groupEntries + excludedEntries;
}

export function AdvancedSearchPanel({
  availableEffects,
  effectFilter,
  onEffectFilterChange,
}: AdvancedSearchPanelProps) {
  const { t } = useTranslation();

  const [presets, setPresets] = useState<EffectFilterPreset[]>([]);
  useEffect(() => {
    setPresets(loadEffectFilterPresets());
  }, []);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState("");
  const [saveDialogKind, setSaveDialogKind] =
    useState<EffectFilterPresetKind>("required");

  const [presetsMenuAnchor, setPresetsMenuAnchor] =
    useState<HTMLElement | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const currentSideGroups: Record<EffectFilterPresetKind, EffectFilterGroup[]> =
    {
      required: effectFilter.groups,
      excluded: effectFilter.excludedGroups,
    };

  const handleOpenSaveDialog = () => {
    setSaveDialogName("");
    setSaveDialogKind("required");
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = () => {
    const entries = flattenFilterEffects(currentSideGroups[saveDialogKind]);
    if (saveDialogName.trim() === "" || entries.length === 0) {
      return;
    }
    const newPreset: EffectFilterPreset = {
      id: crypto.randomUUID(),
      name: saveDialogName.trim(),
      kind: saveDialogKind,
      entries: entries.map((entry) => ({
        effectKey: entry.effect.key,
        comparison: entry.comparison,
      })),
    };
    const next = [...presets, newPreset];
    setPresets(next);
    saveEffectFilterPresets(next);
    setSaveDialogOpen(false);
  };

  const handleApplyPreset = (preset: EffectFilterPreset) => {
    const entries = resolvePresetEntries(preset);
    onEffectFilterChange(
      preset.kind === "required"
        ? applyRequiredPreset(effectFilter, entries)
        : applyExcludedPreset(effectFilter, entries)
    );
    setPresetsMenuAnchor(null);
  };

  const handleDeletePreset = (presetId: string) => {
    const next = presets.filter((preset) => preset.id !== presetId);
    setPresets(next);
    saveEffectFilterPresets(next);
  };

  const handleExportPresets = () => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relic-browser-presets.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setPresetsMenuAnchor(null);
  };

  const handleImportButtonClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const text = await file.text();
    const imported = parseEffectFilterPresetsJson(text);
    if (imported.length === 0) {
      setImportError(t("presetsImportError"));
      return;
    }
    // Merge by id: an imported preset with the same id as an existing one
    // replaces it (re-importing the same export is idempotent); anything
    // new is appended.
    const merged = [
      ...presets.filter(
        (preset) => !imported.some((i) => i.id === preset.id)
      ),
      ...imported,
    ];
    setPresets(merged);
    saveEffectFilterPresets(merged);
    setImportedCount(imported.length);
    setPresetsMenuAnchor(null);
  };

  const canSaveCurrentDialogSelection =
    saveDialogName.trim() !== "" &&
    flattenFilterEffects(currentSideGroups[saveDialogKind]).length > 0;

  const requiredPresets = presets.filter(
    (preset) => preset.kind === "required"
  );
  const excludedPresets = presets.filter(
    (preset) => preset.kind === "excluded"
  );

  const updateGroup = (
    groups: EffectFilterGroup[],
    groupId: string,
    updater: (group: EffectFilterGroup) => EffectFilterGroup
  ): EffectFilterGroup[] =>
    groups.map((group) => (group.id === groupId ? updater(group) : group));

  // --- Required groups ---

  const addGroup = () => {
    onEffectFilterChange({
      ...effectFilter,
      groups: [...effectFilter.groups, createEmptyEffectFilterGroup()],
    });
  };

  const addEffectToGroup = (groupId: string, effect: Effect) => {
    onEffectFilterChange({
      ...effectFilter,
      groups: updateGroup(effectFilter.groups, groupId, (group) => ({
        ...group,
        entries: group.entries.some((e) => e.effect === effect)
          ? group.entries
          : [...group.entries, { effect, comparison: "atLeast" }],
      })),
    });
  };

  const toggleComparison = (groupId: string, effect: Effect) => {
    onEffectFilterChange({
      ...effectFilter,
      groups: updateGroup(effectFilter.groups, groupId, (group) => ({
        ...group,
        entries: group.entries.map((entry) =>
          entry.effect === effect
            ? {
                ...entry,
                comparison:
                  entry.comparison === "atLeast" ? "atMost" : "atLeast",
              }
            : entry
        ),
      })),
    });
  };

  const removeEffectFromGroup = (groupId: string, effect: Effect) => {
    const group = effectFilter.groups.find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    const remainingEntries = group.entries.filter((e) => e.effect !== effect);
    if (remainingEntries.length === 0) {
      onEffectFilterChange({
        ...effectFilter,
        groups: effectFilter.groups.filter((g) => g.id !== groupId),
      });
    } else {
      onEffectFilterChange({
        ...effectFilter,
        groups: updateGroup(effectFilter.groups, groupId, (g) => ({
          ...g,
          entries: remainingEntries,
        })),
      });
    }
  };

  const removeGroup = (groupId: string) => {
    onEffectFilterChange({
      ...effectFilter,
      groups: effectFilter.groups.filter((g) => g.id !== groupId),
    });
  };

  // --- Excluded groups (same shape/capability as required groups) ---

  const addExcludedGroup = () => {
    onEffectFilterChange({
      ...effectFilter,
      excludedGroups: [
        ...effectFilter.excludedGroups,
        createEmptyEffectFilterGroup(),
      ],
    });
  };

  const addEffectToExcludedGroup = (groupId: string, effect: Effect) => {
    onEffectFilterChange({
      ...effectFilter,
      excludedGroups: updateGroup(
        effectFilter.excludedGroups,
        groupId,
        (group) => ({
          ...group,
          entries: group.entries.some((e) => e.effect === effect)
            ? group.entries
            : [...group.entries, { effect, comparison: "atLeast" }],
        })
      ),
    });
  };

  const toggleExcludedComparison = (groupId: string, effect: Effect) => {
    onEffectFilterChange({
      ...effectFilter,
      excludedGroups: updateGroup(
        effectFilter.excludedGroups,
        groupId,
        (group) => ({
          ...group,
          entries: group.entries.map((entry) =>
            entry.effect === effect
              ? {
                  ...entry,
                  comparison:
                    entry.comparison === "atLeast" ? "atMost" : "atLeast",
                }
              : entry
          ),
        })
      ),
    });
  };

  const removeEffectFromExcludedGroup = (groupId: string, effect: Effect) => {
    const group = effectFilter.excludedGroups.find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    const remainingEntries = group.entries.filter((e) => e.effect !== effect);
    if (remainingEntries.length === 0) {
      onEffectFilterChange({
        ...effectFilter,
        excludedGroups: effectFilter.excludedGroups.filter(
          (g) => g.id !== groupId
        ),
      });
    } else {
      onEffectFilterChange({
        ...effectFilter,
        excludedGroups: updateGroup(
          effectFilter.excludedGroups,
          groupId,
          (g) => ({
            ...g,
            entries: remainingEntries,
          })
        ),
      });
    }
  };

  const removeExcludedGroup = (groupId: string) => {
    onEffectFilterChange({
      ...effectFilter,
      excludedGroups: effectFilter.excludedGroups.filter(
        (g) => g.id !== groupId
      ),
    });
  };

  const clearAll = () => {
    onEffectFilterChange({ groups: [], excludedGroups: [] });
  };

  const activeCount = countActiveFilters(effectFilter);

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <Typography variant="subtitle2">
          {activeCount === 0
            ? t("noAdvancedFiltersActive")
            : t(
                activeCount === 1
                  ? "filtersActiveCountSingular"
                  : "filtersActiveCountPlural",
                { count: activeCount }
              )}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={handleOpenSaveDialog}>
            {t("savePresetButton")}
          </Button>
          <Button
            size="small"
            onClick={(event) => setPresetsMenuAnchor(event.currentTarget)}
          >
            {t("presetsButton")}
          </Button>
          <Button size="small" onClick={clearAll} disabled={activeCount === 0}>
            {t("clearAllButton")}
          </Button>
        </Stack>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {t("requiredGroupHint")}
      </Typography>
      <Stack spacing={1} sx={{ mt: 0.5, mb: 1 }}>
        {effectFilter.groups.map((group) => (
          <Stack
            key={group.id}
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
          >
            <IconButton
              size="small"
              onClick={() => removeGroup(group.id)}
              aria-label={t("removeGroupLabel")}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
            {group.entries.map((entry) => (
              <EffectFilterChip
                key={entry.effect.key}
                entry={entry}
                onToggleComparison={() =>
                  toggleComparison(group.id, entry.effect)
                }
                onRemove={() => removeEffectFromGroup(group.id, entry.effect)}
              />
            ))}
            <EffectsAutocomplete
              availableEffects={availableEffects}
              placeholder={t("addEffectPlaceholder")}
              onSearchChange={() => {}}
              onChange={(effect) => addEffectToGroup(group.id, effect)}
              clearOnSelect
              groupByCategory
            />
          </Stack>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={addGroup}
          sx={{ alignSelf: "flex-start" }}
        >
          {t("addGroupButton")}
        </Button>
      </Stack>

      <Divider sx={{ my: 1 }} />

      <Typography variant="caption" color="text.secondary">
        {t("excludedGroupHint")}
      </Typography>
      <Stack spacing={1} sx={{ mt: 0.5 }}>
        {effectFilter.excludedGroups.map((group) => (
          <Stack
            key={group.id}
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
          >
            <IconButton
              size="small"
              onClick={() => removeExcludedGroup(group.id)}
              aria-label={t("removeGroupLabel")}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
            {group.entries.map((entry) => (
              <EffectFilterChip
                key={entry.effect.key}
                entry={entry}
                onToggleComparison={() =>
                  toggleExcludedComparison(group.id, entry.effect)
                }
                onRemove={() =>
                  removeEffectFromExcludedGroup(group.id, entry.effect)
                }
              />
            ))}
            <EffectsAutocomplete
              availableEffects={availableEffects}
              placeholder={t("addExcludedEffectPlaceholder")}
              onSearchChange={() => {}}
              onChange={(effect) => addEffectToExcludedGroup(group.id, effect)}
              clearOnSelect
              groupByCategory
            />
          </Stack>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={addExcludedGroup}
          sx={{ alignSelf: "flex-start" }}
        >
          {t("addGroupButton")}
        </Button>
      </Stack>

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>{t("savePresetDialogTitle")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t("savePresetNameLabel")}
            value={saveDialogName}
            onChange={(event) => setSaveDialogName(event.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <RadioGroup
            value={saveDialogKind}
            onChange={(event) =>
              setSaveDialogKind(event.target.value as EffectFilterPresetKind)
            }
          >
            <FormControlLabel
              value="required"
              control={<Radio />}
              label={t("savePresetKindRequired")}
            />
            <FormControlLabel
              value="excluded"
              control={<Radio />}
              label={t("savePresetKindExcluded")}
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>
            {t("savePresetCancelButton")}
          </Button>
          <Button
            onClick={handleConfirmSave}
            disabled={!canSaveCurrentDialogSelection}
          >
            {t("savePresetSaveButton")}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={presetsMenuAnchor}
        open={presetsMenuAnchor !== null}
        onClose={() => setPresetsMenuAnchor(null)}
      >
        {presets.length === 0 && (
          <MenuItem disabled>{t("presetsMenuEmpty")}</MenuItem>
        )}
        {requiredPresets.length > 0 && (
          <MenuItem disabled sx={{ opacity: 1, fontWeight: "bold" }}>
            {t("presetsMenuRequiredGroupLabel")}
          </MenuItem>
        )}
        {requiredPresets.map((preset) => (
          <MenuItem key={preset.id} onClick={() => handleApplyPreset(preset)}>
            <ListItemText>{preset.name}</ListItemText>
            <IconButton
              size="small"
              edge="end"
              aria-label={t("presetDeleteLabel")}
              onClick={(event) => {
                event.stopPropagation();
                handleDeletePreset(preset.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </MenuItem>
        ))}
        {excludedPresets.length > 0 && (
          <MenuItem disabled sx={{ opacity: 1, fontWeight: "bold" }}>
            {t("presetsMenuExcludedGroupLabel")}
          </MenuItem>
        )}
        {excludedPresets.map((preset) => (
          <MenuItem key={preset.id} onClick={() => handleApplyPreset(preset)}>
            <ListItemText>{preset.name}</ListItemText>
            <IconButton
              size="small"
              edge="end"
              aria-label={t("presetDeleteLabel")}
              onClick={(event) => {
                event.stopPropagation();
                handleDeletePreset(preset.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleExportPresets} disabled={presets.length === 0}>
          {t("presetsExportButton")}
        </MenuItem>
        <MenuItem onClick={handleImportButtonClick}>
          {t("presetsImportButton")}
        </MenuItem>
      </Menu>

      <input
        ref={importFileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFileSelected}
        style={{ display: "none" }}
      />

      <Snackbar
        open={importedCount !== null}
        autoHideDuration={3000}
        onClose={() => setImportedCount(null)}
        message={
          importedCount !== null
            ? t("presetsImportSuccess", { count: importedCount })
            : ""
        }
      />

      <Snackbar
        open={importError !== null}
        autoHideDuration={4000}
        onClose={() => setImportError(null)}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setImportError(null)}
        >
          {importError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
