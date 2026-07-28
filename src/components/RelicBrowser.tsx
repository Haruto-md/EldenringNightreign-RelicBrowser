import { Alert, Box, Button, Snackbar, Stack } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { buildSellKeySequence } from "../utils/SellKeySequence";
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
  const [copiedCount, setCopiedCount] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // currentSlot is a different object reference whenever the character
  // slot switches (RelicBrowser is not remounted on a slot switch, only on
  // a tab switch), so selection needs to be cleared explicitly here -
  // otherwise stale relic ids from the previous slot would silently linger
  // in selectedIds and get filtered against the new slot's relics.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentSlot]);

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

  // Mirrors the unsellableItemIds filtering buildSellKeySequence itself
  // applies internally, so this UI check can't disagree with what the
  // function would actually produce (e.g. a selection mixing a sellable
  // normal relic and an unsellable deep relic must not be blocked here,
  // since buildSellKeySequence would silently drop the unsellable one).
  const sellableSelection = useMemo(
    () =>
      selectedForSale.filter(
        (relic) => !unsellableItemIds.includes(relic.itemId)
      ),
    [selectedForSale]
  );

  const hasMixedTypeSelection = useMemo(() => {
    if (sellableSelection.length === 0) {
      return false;
    }
    const isDeepRelic = (relicId: number) =>
      items.get(relicId)?.type === ItemType.DeepRelic;
    const hasDeep = sellableSelection.some((relic) => isDeepRelic(relic.itemId));
    const hasNormal = sellableSelection.some(
      (relic) => !isDeepRelic(relic.itemId)
    );
    return hasDeep && hasNormal;
  }, [sellableSelection]);

  const handleCopySellSequence = useCallback(async () => {
    if (hasMixedTypeSelection) {
      setCopyError(t("mixedSelectionWarning"));
      return;
    }
    try {
      const sequence = buildSellKeySequence(selectedForSale);
      await navigator.clipboard.writeText(JSON.stringify(sequence));
      // Count Select actions rather than selectedForSale.length so the
      // reported count reflects relics actually included in the sequence,
      // not the pre-filter selection (some may have been dropped inside
      // buildSellKeySequence as unsellable).
      const includedCount = sequence.filter(
        (action) => action === "Select"
      ).length;
      setCopiedCount(includedCount);
    } catch (err) {
      console.error("Failed to copy sell sequence to clipboard:", err);
      setCopyError(t("copySellSequenceError"));
    }
  }, [selectedForSale, hasMixedTypeSelection, t]);

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

      {selectionMode && selectedForSale.length > 0 && (
        <Stack sx={{ alignSelf: "flex-start", mb: 1 }} spacing={1}>
          <Button
            variant="contained"
            onClick={handleCopySellSequence}
            disabled={hasMixedTypeSelection}
            sx={{ alignSelf: "flex-start" }}
          >
            {t("copySellSequenceButton")}
          </Button>
          {hasMixedTypeSelection && (
            <Alert severity="warning" variant="outlined">
              {t("mixedSelectionWarning")}
            </Alert>
          )}
        </Stack>
      )}

      <Snackbar
        open={copiedCount !== null}
        autoHideDuration={3000}
        onClose={() => setCopiedCount(null)}
        message={
          copiedCount !== null
            ? t("copySellSequenceCopied", { count: copiedCount })
            : ""
        }
      />

      <Snackbar
        open={copyError !== null}
        autoHideDuration={4000}
        onClose={() => setCopyError(null)}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setCopyError(null)}
        >
          {copyError}
        </Alert>
      </Snackbar>

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
