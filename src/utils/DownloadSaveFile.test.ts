import { describe, expect, it } from "vitest";
import type { BND4Entry, RelicSlot } from "../types/SaveFile";
import { buildDeletionPlan } from "./DownloadSaveFile";

function makeEntry(index: number): BND4Entry {
  return {
    index,
    size: 0,
    dataOffset: 0,
    footerLength: 0,
    rawData: new Uint8Array(),
    encryptedData: new Uint8Array(),
    iv: new Uint8Array(),
    encryptedPayload: new Uint8Array(),
    cleanData: new Uint8Array(),
    name: `USERDATA_${index}`,
    decrypted: true,
  };
}

function makeRelic(id: number, byteOffset: number, slotSize: number): RelicSlot {
  return {
    id,
    itemId: 104,
    effects: [],
    coordinates: [0, 0],
    coordinatesByColor: [0, 0],
    byteOffset,
    slotSize,
  };
}

describe("buildDeletionPlan", () => {
  it("pairs every selected relic with its owning entry and its own offset/size", () => {
    const entry = makeEntry(3);
    const relics = [makeRelic(1, 80, 80), makeRelic(2, 160, 80)];

    const plan = buildDeletionPlan(relics, entry);

    expect(plan).toEqual([
      { entry, byteOffset: 80, slotSize: 80 },
      { entry, byteOffset: 160, slotSize: 80 },
    ]);
  });

  it("skips a relic that has no recorded byte offset instead of producing an invalid entry", () => {
    const entry = makeEntry(0);
    const relics = [makeRelic(1, 80, 80), { ...makeRelic(2, 0, 0), byteOffset: undefined }];

    const plan = buildDeletionPlan(relics, entry);

    expect(plan).toEqual([{ entry, byteOffset: 80, slotSize: 80 }]);
  });

  it("never includes an unsellable item id, even if the caller passed one in", () => {
    const entry = makeEntry(0);
    const unsellableRelic = { ...makeRelic(1, 80, 80), itemId: 1520 }; // present in unsellableItemIds
    const sellableRelic = makeRelic(2, 160, 80);

    const plan = buildDeletionPlan([unsellableRelic, sellableRelic], entry);

    expect(plan).toEqual([{ entry, byteOffset: 160, slotSize: 80 }]);
  });
});
