import AddIcon from "@mui/icons-material/Add";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
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
  return groupEntries + filter.excluded.length;
}

export function AdvancedSearchPanel({
  availableEffects,
  effectFilter,
  onEffectFilterChange,
}: AdvancedSearchPanelProps) {
  const updateGroup = (groupId: string, updater: (group: EffectFilterGroup) => EffectFilterGroup) => {
    onEffectFilterChange({
      ...effectFilter,
      groups: effectFilter.groups.map((group) =>
        group.id === groupId ? updater(group) : group
      ),
    });
  };

  const addGroup = () => {
    onEffectFilterChange({
      ...effectFilter,
      groups: [...effectFilter.groups, createEmptyEffectFilterGroup()],
    });
  };

  const addEffectToGroup = (groupId: string, effect: Effect) => {
    updateGroup(groupId, (group) => ({
      ...group,
      entries: group.entries.some((e) => e.effect === effect)
        ? group.entries
        : [...group.entries, { effect, comparison: "atLeast" }],
    }));
  };

  const toggleComparison = (groupId: string, effect: Effect) => {
    updateGroup(groupId, (group) => ({
      ...group,
      entries: group.entries.map((entry) =>
        entry.effect === effect
          ? { ...entry, comparison: entry.comparison === "atLeast" ? "atMost" : "atLeast" }
          : entry
      ),
    }));
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
      updateGroup(groupId, (g) => ({ ...g, entries: remainingEntries }));
    }
  };

  const addExcluded = (effect: Effect) => {
    if (effectFilter.excluded.includes(effect)) {return;}
    onEffectFilterChange({ ...effectFilter, excluded: [...effectFilter.excluded, effect] });
  };

  const removeExcluded = (effect: Effect) => {
    onEffectFilterChange({
      ...effectFilter,
      excluded: effectFilter.excluded.filter((e) => e !== effect),
    });
  };

  const clearAll = () => {
    onEffectFilterChange({ groups: [], excluded: [] });
  };

  const activeCount = countActiveFilters(effectFilter);

  return (
    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          {activeCount === 0 ? "No advanced filters active" : `${activeCount} filter${activeCount === 1 ? "" : "s"} active`}
        </Typography>
        <Button size="small" onClick={clearAll} disabled={activeCount === 0}>
          Clear all
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Required (each row: relic needs at least one)
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
              placeholder="Add effect..."
              onSearchChange={() => {}}
              onChange={(effect) => addEffectToGroup(group.id, effect)}
              clearOnSelect
              groupByCategory
            />
          </Stack>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addGroup} sx={{ alignSelf: "flex-start" }}>
          Add group
        </Button>
      </Stack>

      <Divider sx={{ my: 1 }} />

      <Typography variant="caption" color="text.secondary">
        Excluded (relic must have none of these)
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
        {effectFilter.excluded.map((effect) => (
          <EffectFilterChip
            key={effect.key}
            entry={{ effect, comparison: "atLeast" }}
            onRemove={() => removeExcluded(effect)}
          />
        ))}
        <EffectsAutocomplete
          availableEffects={availableEffects}
          placeholder="Add excluded effect..."
          onSearchChange={() => {}}
          onChange={addExcluded}
          clearOnSelect
          groupByCategory
        />
      </Stack>
    </Box>
  );
}
