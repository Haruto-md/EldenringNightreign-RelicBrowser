import AddIcon from "@mui/icons-material/Add";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { Effect } from "../resources/effects";
import {
  createEmptyEffectFilterGroup,
  type EffectFilterGroup,
  type EffectFilterState,
} from "../utils/EffectFilter";
import { EffectFilterChip } from "./EffectFilterChip";
import { EffectsAutocomplete } from "./EffectsAutocomplete";

interface AdvancedSearchPanelProps {
  availableEffects: Effect[];
  effectFilter: EffectFilterState;
  onEffectFilterChange: (filter: EffectFilterState) => void;
}

function countActiveFilters(filter: EffectFilterState): number {
  const groupEntries = filter.groups.reduce((sum, g) => sum + g.entries.length, 0);
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
            ? { ...entry, comparison: entry.comparison === "atLeast" ? "atMost" : "atLeast" }
            : entry
        ),
      })),
    });
  };

  const removeEffectFromGroup = (groupId: string, effect: Effect) => {
    const group = effectFilter.groups.find((g) => g.id === groupId);
    if (!group) {return;}
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

  // --- Excluded groups (same shape/capability as required groups) ---

  const addExcludedGroup = () => {
    onEffectFilterChange({
      ...effectFilter,
      excludedGroups: [...effectFilter.excludedGroups, createEmptyEffectFilterGroup()],
    });
  };

  const addEffectToExcludedGroup = (groupId: string, effect: Effect) => {
    onEffectFilterChange({
      ...effectFilter,
      excludedGroups: updateGroup(effectFilter.excludedGroups, groupId, (group) => ({
        ...group,
        entries: group.entries.some((e) => e.effect === effect)
          ? group.entries
          : [...group.entries, { effect, comparison: "atLeast" }],
      })),
    });
  };

  const toggleExcludedComparison = (groupId: string, effect: Effect) => {
    onEffectFilterChange({
      ...effectFilter,
      excludedGroups: updateGroup(effectFilter.excludedGroups, groupId, (group) => ({
        ...group,
        entries: group.entries.map((entry) =>
          entry.effect === effect
            ? { ...entry, comparison: entry.comparison === "atLeast" ? "atMost" : "atLeast" }
            : entry
        ),
      })),
    });
  };

  const removeEffectFromExcludedGroup = (groupId: string, effect: Effect) => {
    const group = effectFilter.excludedGroups.find((g) => g.id === groupId);
    if (!group) {return;}
    const remainingEntries = group.entries.filter((e) => e.effect !== effect);
    if (remainingEntries.length === 0) {
      onEffectFilterChange({
        ...effectFilter,
        excludedGroups: effectFilter.excludedGroups.filter((g) => g.id !== groupId),
      });
    } else {
      onEffectFilterChange({
        ...effectFilter,
        excludedGroups: updateGroup(effectFilter.excludedGroups, groupId, (g) => ({
          ...g,
          entries: remainingEntries,
        })),
      });
    }
  };

  const clearAll = () => {
    onEffectFilterChange({ groups: [], excludedGroups: [] });
  };

  const activeCount = countActiveFilters(effectFilter);

  return (
    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          {activeCount === 0
            ? t("noAdvancedFiltersActive")
            : t(activeCount === 1 ? "filtersActiveCountSingular" : "filtersActiveCountPlural", { count: activeCount })}
        </Typography>
        <Button size="small" onClick={clearAll} disabled={activeCount === 0}>
          {t("clearAllButton")}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {t("requiredGroupHint")}
      </Typography>
      <Stack spacing={1} sx={{ mt: 0.5, mb: 1 }}>
        {effectFilter.groups.map((group) => (
          <Stack key={group.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {group.entries.map((entry) => (
              <EffectFilterChip
                key={entry.effect.key}
                entry={entry}
                onToggleComparison={() => toggleComparison(group.id, entry.effect)}
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
        <Button size="small" startIcon={<AddIcon />} onClick={addGroup} sx={{ alignSelf: "flex-start" }}>
          {t("addGroupButton")}
        </Button>
      </Stack>

      <Divider sx={{ my: 1 }} />

      <Typography variant="caption" color="text.secondary">
        {t("excludedGroupHint")}
      </Typography>
      <Stack spacing={1} sx={{ mt: 0.5 }}>
        {effectFilter.excludedGroups.map((group) => (
          <Stack key={group.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {group.entries.map((entry) => (
              <EffectFilterChip
                key={entry.effect.key}
                entry={entry}
                onToggleComparison={() => toggleExcludedComparison(group.id, entry.effect)}
                onRemove={() => removeEffectFromExcludedGroup(group.id, entry.effect)}
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
        <Button size="small" startIcon={<AddIcon />} onClick={addExcludedGroup} sx={{ alignSelf: "flex-start" }}>
          {t("addGroupButton")}
        </Button>
      </Stack>
    </Box>
  );
}
