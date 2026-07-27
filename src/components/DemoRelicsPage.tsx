import { useEffect } from "react";
import type { SaveFileData } from "../types/SaveFile";
import type { DeleteLockState } from "../utils/DeleteLock";
import { RelicsPage } from "./RelicsPage";

interface DemoRelicsPageProps {
  saveFileData: SaveFileData | null;
  loading: boolean;
  error: string | null;
  loadDemoData: () => void;
  selectSlot: (slotIndex: number) => void;
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  matchingRelicsCount: number;
  handleMatchingRelicsCountChange: (count: number) => void;
  clearSaveFile: () => void;
  deleteLock: DeleteLockState;
  markEntryDeleted: (entryIndex: number) => void;
}

export function DemoRelicsPage({
  loadDemoData,
  ...props
}: DemoRelicsPageProps) {
  useEffect(() => {
    // Load demo data when component mounts if no data is loaded
    if (!props.saveFileData) {
      loadDemoData();
    }
  }, [loadDemoData, props.saveFileData]);

  return <RelicsPage {...props} />;
}
