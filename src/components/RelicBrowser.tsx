import { Box, Typography } from "@mui/material";
import { useMemo, useState } from "react";
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
    effectFilter.excluded.length > 0;

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

  const normalRelicsCount = useMemo(() => {
    return matchingRelics.filter(
      ({ itemId }) => items.get(itemId)?.type !== ItemType.DeepRelic
    ).length;
  }, [matchingRelics]);

  const deepRelicsCount = useMemo(() => {
    return matchingRelics.filter(
      ({ itemId }) => items.get(itemId)?.type === ItemType.DeepRelic
    ).length;
  }, [matchingRelics]);

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
          />
        </Box>
      )}
    </Box>
  );
}
