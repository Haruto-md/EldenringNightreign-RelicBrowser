import type { BND4Entry } from "../types/SaveFile";

const DS2_KEY = new Uint8Array([
  0x18, 0xf6, 0x32, 0x66, 0x05, 0xbd, 0x17, 0x8a, 0x55, 0x24, 0x52, 0x3a, 0xc0,
  0xa0, 0xc6, 0x09,
]);

const IV_SIZE = 0x10;

// Confirmed against real before/after save data (see docs/superpowers/specs/
// 2026-07-27-auto-relic-sell-design.md): a deleted relic's 80-byte slot is
// overwritten in place with this 8-byte pattern repeated to fill the slot.
export const EMPTY_SLOT_PATTERN = new Uint8Array([
  0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff,
]);

export function eraseRelicSlot(
  cleanData: Uint8Array,
  byteOffset: number,
  slotSize: number
): Uint8Array {
  const result = new Uint8Array(cleanData);
  for (let offset = 0; offset < slotSize; offset += EMPTY_SLOT_PATTERN.length) {
    result.set(EMPTY_SLOT_PATTERN, byteOffset + offset);
  }
  return result;
}

interface RelicDeletion {
  entry: BND4Entry;
  byteOffset: number;
  slotSize: number;
}

export class SaveFileEncryptor {
  private static writeUint32LE(value: number): Uint8Array {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, value, true);
    return buf;
  }

  /**
   * Re-encrypts a single BND4 entry's plaintext with a fresh random IV.
   * The 4-byte length prefix that SaveFileDecryptor strips off on decrypt
   * is reconstructed from newCleanData's own length here.
   */
  private static async reEncryptEntry(
    newCleanData: Uint8Array
  ): Promise<Uint8Array> {
    const prefix = this.writeUint32LE(newCleanData.length);
    const plaintext = new Uint8Array(prefix.length + newCleanData.length);
    plaintext.set(prefix, 0);
    plaintext.set(newCleanData, prefix.length);

    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      DS2_KEY,
      { name: "AES-CBC" },
      false,
      ["encrypt"]
    );
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, plaintext)
    );

    const result = new Uint8Array(iv.length + ciphertext.length);
    result.set(iv, 0);
    result.set(ciphertext, iv.length);
    return result;
  }

  /**
   * Given a set of relic-slot deletions, returns a full copy of the raw save
   * file with each targeted slot erased and its owning BND4 entry
   * re-encrypted in place. cleanData length never changes, so entry sizes
   * and the BND4 header/offset table are left untouched.
   */
  public static async writeRelicDeletions(
    deletions: RelicDeletion[]
  ): Promise<Uint8Array> {
    const rawFile = deletions[0].entry.rawData;
    const output = new Uint8Array(rawFile);

    const deletionsByEntryIndex = new Map<number, RelicDeletion[]>();
    for (const deletion of deletions) {
      const existing = deletionsByEntryIndex.get(deletion.entry.index);
      if (existing) {
        existing.push(deletion);
      } else {
        deletionsByEntryIndex.set(deletion.entry.index, [deletion]);
      }
    }

    for (const entryDeletions of deletionsByEntryIndex.values()) {
      const entry = entryDeletions[0].entry;
      let newCleanData = entry.cleanData;
      for (const { byteOffset, slotSize } of entryDeletions) {
        newCleanData = eraseRelicSlot(newCleanData, byteOffset, slotSize);
      }
      const newEncryptedData = await this.reEncryptEntry(newCleanData);
      output.set(newEncryptedData, entry.dataOffset);
    }

    return output;
  }
}
