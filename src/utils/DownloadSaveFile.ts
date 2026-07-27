import { unsellableItemIds } from "../resources/items";
import type { BND4Entry, RelicSlot } from "../types/SaveFile";

export function buildDeletionPlan(
  selectedRelics: RelicSlot[],
  entry: BND4Entry
): { entry: BND4Entry; byteOffset: number; slotSize: number }[] {
  return selectedRelics
    .filter((relic) => !unsellableItemIds.includes(relic.itemId))
    .filter(
      (relic): relic is RelicSlot & { byteOffset: number; slotSize: number } =>
        relic.byteOffset !== undefined && relic.slotSize !== undefined
    )
    .map((relic) => ({
      entry,
      byteOffset: relic.byteOffset,
      slotSize: relic.slotSize,
    }));
}

export function downloadSaveFile(data: Uint8Array, fileName: string): void {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
