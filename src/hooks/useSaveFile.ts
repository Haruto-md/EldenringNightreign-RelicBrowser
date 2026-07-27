import { useCallback, useState } from "react";
import type { CharacterSlot, SaveFileData } from "../types/SaveFile";
import {
  emptyDeleteLock,
  recordDelete,
  type DeleteLockState,
} from "../utils/DeleteLock";
import { RelicParser } from "../utils/RelicParser";
import { findOutclassedRelics } from "../utils/RelicProcessor";
import { SaveFileDecryptor } from "../utils/SaveFileDecryptor";

export const useSaveFile = () => {
  const [saveFileData, setSaveFileData] = useState<SaveFileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [matchingRelicsCount, setMatchingRelicsCount] = useState<number>(0);
  // Scoped to the loaded save file, not to any component or character slot:
  // it must survive tab switches (which unmount RelicBrowser) and slot
  // switches, and reset only when a new file is loaded or the file is cleared.
  const [deleteLock, setDeleteLock] =
    useState<DeleteLockState>(emptyDeleteLock);

  const markEntryDeleted = useCallback((entryIndex: number) => {
    setDeleteLock((prev) => recordDelete(prev, entryIndex));
  }, []);

  // Load and parse save file
  const loadSaveFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    // A genuinely new file means fresh, non-stale in-memory bytes.
    setDeleteLock(emptyDeleteLock);

    try {
      const fileBuffer = await file.arrayBuffer();
      const bnd4Entries = await SaveFileDecryptor.decryptSaveFile(fileBuffer);

      if (bnd4Entries.length === 0) {
        throw new Error("No BND4 entries found in save file");
      }

      if (bnd4Entries.length !== 14) {
        console.warn(`Expected 14 BND4 entries, found ${bnd4Entries.length}`);
      }

      // Parse all character slots (1-10). Each slot carries the BND4 entry it
      // came from, so nothing downstream has to assume slots and bnd4Entries
      // line up by index.
      const slots: CharacterSlot[] = RelicParser.parseCharacterSlots(
        bnd4Entries
      );
      for (const slot of slots) {
        findOutclassedRelics(slot.relics);
      }

      const saveData: SaveFileData = {
        filePath: file.name,
        slots,
        currentSlot: 0,
        bnd4Entries,
      };

      setSaveFileData(saveData);

      // Track successful file load
      window.dataLayer.push({
        event: "save_file_opened",
        file_name: file.name,
        file_size: file.size,
        relics_per_slot: slots.map((slot) => slot.relics.length),
      });
    } catch (err) {
      console.error("Error loading save file:", err);
      setError(err instanceof Error ? err.message : "Failed to load save file");
    } finally {
      setLoading(false);
    }
  }, []);

  // Select a character slot
  const selectSlot = useCallback(
    (slotIndex: number) => {
      if (
        saveFileData &&
        slotIndex >= 0 &&
        slotIndex < saveFileData.slots.length
      ) {
        setMatchingRelicsCount(saveFileData.slots[slotIndex].relics.length);
        setSaveFileData((prev) =>
          prev ? { ...prev, currentSlot: slotIndex } : null
        );
      }
    },
    [saveFileData]
  );

  // Clear save file data
  const clearSaveFile = useCallback(() => {
    setSaveFileData(null);
    setSearchTerm("");
    setMatchingRelicsCount(0);
    setError(null);
    setDeleteLock(emptyDeleteLock);
  }, []);

  return {
    deleteLock,
    markEntryDeleted,
    saveFileData,
    loading,
    error,
    loadSaveFile,
    selectSlot,
    searchTerm,
    setSearchTerm,
    matchingRelicsCount,
    setMatchingRelicsCount,
    clearSaveFile,
  };
};
