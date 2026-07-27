import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  Stack,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Effect } from "../resources/effects";
import { items, ItemType, unsellableItemIds } from "../resources/items";
import type { BND4Entry, CharacterSlot } from "../types/SaveFile";
import {
  colorFilterOptions,
  type ColorFilterOption,
} from "../utils/ColorFilterOptions";
import { getEffectName, getItemName, getRelicColor } from "../utils/DataUtils";
import { isDeleteLocked, type DeleteLockState } from "../utils/DeleteLock";
import { buildDeletionPlan, downloadSaveFile } from "../utils/DownloadSaveFile";
import { RelicSlotColor } from "../utils/RelicColor";
import { SaveFileEncryptor } from "../utils/SaveFileEncryptor";
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
  currentEntry?: BND4Entry;
  saveFileName?: string;
  /**
   * Owned by `useSaveFile` so it is scoped to the loaded save file rather than
   * to this component instance. Keeping it here as local state let a tab
   * switch (which unmounts this component) or a character-slot change silently
   * unlock the delete flow, after which the next download was rebuilt from the
   * untouched original bytes and lost the first delete.
   */
  deleteLock: DeleteLockState;
  markEntryDeleted: (entryIndex: number) => void;
}

export function RelicBrowser({
  availableEffects,
  currentSlot,
  searchTerm,
  setSearchTerm,
  handleMatchingRelicsCountChange,
  currentEntry,
  saveFileName,
  deleteLock,
  markEntryDeleted,
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Once a delete has succeeded, every in-memory entry of this file still
  // holds the ORIGINAL bytes (they all share one `rawData` buffer), so any
  // second delete would silently drop the first batch's deletions. The lock is
  // held by `useSaveFile`, keyed to the loaded file, so it cannot be reset by
  // unmounting this component or by switching character slot.
  const deleteCompleted = isDeleteLocked(deleteLock);

  // Switching character clears the in-progress selection (it's a different
  // relic list) and any stale error message; it must NOT touch the delete
  // lock itself (see above).
  useEffect(() => {
    setSelectedIds(new Set());
    setDeleteError(null);
  }, [currentEntry]);

  const canDelete = currentEntry !== undefined && !deleteCompleted;
  // Cards become click-to-select whenever the sell filter narrows the grid
  // down to candidates and a delete is actually possible - selection is
  // whatever you've clicked within however you've filtered (color, search,
  // advanced effect filter, sell filter), not a separately auto-computed list.
  const selectionEnabled = filterSell && canDelete;

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

  const handleConfirmDelete = async () => {
    if (!canDelete || currentEntry === undefined) {
      return;
    }
    try {
      const plan = buildDeletionPlan(selectedForSale, currentEntry);
      const modified = await SaveFileEncryptor.writeRelicDeletions(plan);
      downloadSaveFile(
        currentEntry.rawData,
        `${saveFileName ?? "save"}.backup.sl2`
      );
      downloadSaveFile(modified, saveFileName ?? "save.sl2");
      setDeleteError(null);
      setSelectedIds(new Set());
      setConfirmOpen(false);
      markEntryDeleted(currentEntry.index);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : t("deleteConfirmError")
      );
    }
  };

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
        // カウントの桁数でUIが変わるのは圧倒的不良UI
        // countText={
        //   currentSlot.relics.length === matchingRelics.length
        //     ? t("showingAllRelicsTemplate", {
        //         normal: normalRelicsCount,
        //         deep: deepRelicsCount,
        //         character: currentSlot.name,
        //       })
        //     : t("showingMatchingRelicsTemplate", {
        //         normal: normalRelicsCount,
        //         deep: deepRelicsCount,
        //         total: currentSlot.relics.length,
        //         character: currentSlot.name,
        //       })
        // }
      />

      {filterSell && deleteCompleted && (
        <Alert severity="success" sx={{ my: 1 }}>
          <AlertTitle>{t("deleteAlreadyDoneTitle")}</AlertTitle>
          {t("deleteAlreadyDoneBody")}
        </Alert>
      )}

      {filterSell && !deleteCompleted && currentEntry === undefined && (
        <Alert severity="info" sx={{ my: 1 }}>
          {t("deleteUnavailableNoSaveFile")}
        </Alert>
      )}

      {selectionEnabled && matchingRelics.length > 0 && (
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

      {selectionEnabled && selectedForSale.length > 0 && (
        <Button
          variant="contained"
          onClick={() => {
            setDeleteError(null);
            setConfirmOpen(true);
          }}
        >
          {t("deleteSelectedButton")}
        </Button>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
        <DialogContent>
          <p>{t("deleteConfirmBody", { count: selectedForSale.length })}</p>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t("deleteConfirmDownloadWarning")}
          </Alert>
          <List>
            {selectedForSale.map((relic) => (
              <ListItem key={relic.id}>
                {getItemName(relic.itemId)} ({relic.coordinates[0]},{" "}
                {relic.coordinates[1]})
              </ListItem>
            ))}
          </List>
          {deleteError !== null && (
            <Alert severity="error" sx={{ mt: 2 }} role="alert">
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>
            {t("deleteConfirmCancel")}
          </Button>
          <Button variant="contained" onClick={handleConfirmDelete}>
            {t("deleteConfirmProceed")}
          </Button>
        </DialogActions>
      </Dialog>

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
            selectable={selectionEnabled}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </Box>
      )}
    </Box>
  );
}
