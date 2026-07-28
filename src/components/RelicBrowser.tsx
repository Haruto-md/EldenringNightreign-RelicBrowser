import { Alert, Box, Button, Stack } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Effect } from "../resources/effects";
import { items, ItemType, unsellableItemIds } from "../resources/items";
import type { CharacterSlot } from "../types/SaveFile";
import {
  colorFilterOptions,
  type ColorFilterOption,
} from "../utils/ColorFilterOptions";
import { getEffectName, getItemName, getRelicColor } from "../utils/DataUtils";
import { RelicSlotColor } from "../utils/RelicColor";
import { doesRelicColorMatch, doesRelicMatch } from "../utils/SearchUtils";
import {
  createEmptyEffectFilterState,
  doesRelicMatchEffectFilter,
  type EffectFilterState,
} from "../utils/EffectFilter";
import { RelicDisplay } from "./RelicDisplay";
import { SearchInput } from "./SearchInput";

interface RelicBrowserProps {
  availableEffects: Effect[];
  currentSlot: CharacterSlot;
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  handleMatchingRelicsCountChange: (count: number) => void;
}

export function RelicBrowser({
  availableEffects,
  currentSlot,
  searchTerm,
  setSearchTerm,
  handleMatchingRelicsCountChange,
}: RelicBrowserProps) {
  const { t } = useTranslation();
  const [filterSell, setFilterSell] = useState(false);
  const [colorFilter, setColorFilter] = useState<ColorFilterOption>(
    colorFilterOptions[0]
  );
  const [effectFilter, setEffectFilter] = useState<EffectFilterState>(
    createEmptyEffectFilterState()
  );

  const hasEffectFilter =
    effectFilter.groups.some((group) => group.entries.length > 0) ||
    effectFilter.excludedGroups.some((group) => group.entries.length > 0);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Independent of every filter (color, search, advanced effect filter, and
  // the redundant/"sell" filter itself): selection mode just makes whatever
  // is currently shown in the grid clickable. The redundant filter is one way
  // to narrow down to weak relics, not a requirement for selecting anything -
  // you can select any relic you can see, filtered however you like.
  const [selectionMode, setSelectionMode] = useState(false);

  const handleToggleSelect = useCallback((relicId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(relicId)) {
        next.delete(relicId);
      } else {
        next.add(relicId);
      }
      return next;
    });
  }, []);

  const selectedForSale = useMemo(
    () => currentSlot.relics.filter((relic) => selectedIds.has(relic.id)),
    [currentSlot.relics, selectedIds]
  );

  const matchingRelics = useMemo(() => {
    if (
      !searchTerm.trim() &&
      colorFilter.color === RelicSlotColor.Any &&
      !filterSell &&
      !hasEffectFilter
    ) {
      return currentSlot.relics;
    }

    return currentSlot.relics.filter((relic) => {
      const { itemId, effects, redundant } = relic;

      if (
        filterSell &&
        (redundant === undefined || unsellableItemIds.includes(itemId))
      ) {
        return false;
      }

      const item = items.get(itemId);

      if (colorFilter.type !== undefined && item !== undefined) {
        if (
          colorFilter.type === ItemType.DeepRelic &&
          item.type !== ItemType.DeepRelic
        ) {
          return false;
        }
        if (
          colorFilter.type !== ItemType.DeepRelic &&
          item.type === ItemType.DeepRelic
        ) {
          return false;
        }
      }

      const itemColor = getRelicColor(itemId);

      if (!doesRelicColorMatch(itemColor, colorFilter.color)) {
        return false;
      }

      if (hasEffectFilter && !doesRelicMatchEffectFilter(relic, effectFilter)) {
        return false;
      }

      const itemName = getItemName(itemId);
      const effectNames = effects.flatMap(([effect, debuff]) =>
        debuff !== undefined
          ? [getEffectName(effect), getEffectName(debuff)]
          : [getEffectName(effect)]
      );

      return doesRelicMatch(itemName, effectNames, searchTerm);
    });
  }, [
    searchTerm,
    colorFilter.color,
    colorFilter.type,
    filterSell,
    currentSlot.relics,
    effectFilter,
    hasEffectFilter,
  ]);

  const selectAllShown = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const relic of matchingRelics) {
        next.add(relic.id);
      }
      return next;
    });
  }, [matchingRelics]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <Box
      component="section"
      aria-label="Relic management interface"
      sx={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        minHeight: 0,
      }}
    >
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

      <Button
        variant={selectionMode ? "contained" : "outlined"}
        onClick={() => setSelectionMode((prev) => !prev)}
        sx={{ alignSelf: "flex-start", my: 1 }}
      >
        {selectionMode ? t("selectionModeStop") : t("selectionModeStart")}
      </Button>

      {selectionMode && matchingRelics.length > 0 && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ my: 1 }}
        >
          <Alert severity="info" variant="outlined" sx={{ flexGrow: 1, mr: 1 }}>
            {t("sellCandidatesTitle", { count: selectedForSale.length })}
          </Alert>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={selectAllShown}>
              {t("sellCandidatesSelectAll")}
            </Button>
            <Button size="small" onClick={clearSelection}>
              {t("sellCandidatesSelectNone")}
            </Button>
          </Stack>
        </Stack>
      )}

      {currentSlot && (
        <Box
          sx={{ flexGrow: 1, minHeight: 0 }}
          component="section"
          aria-label="Relic display"
        >
          <RelicDisplay
            matchingRelics={matchingRelics}
            searchTerm={searchTerm}
            colorFilter={colorFilter}
            onMatchCountChange={handleMatchingRelicsCountChange}
            selectable={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </Box>
      )}
    </Box>
  );
}
