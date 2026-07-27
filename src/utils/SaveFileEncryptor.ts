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
  if (slotSize % EMPTY_SLOT_PATTERN.length !== 0) {
    throw new Error(
      `eraseRelicSlot: slotSize ${slotSize} must be a multiple of ${EMPTY_SLOT_PATTERN.length} bytes`
    );
  }
  const result = new Uint8Array(cleanData);
  for (let offset = 0; offset < slotSize; offset += EMPTY_SLOT_PATTERN.length) {
    result.set(EMPTY_SLOT_PATTERN, byteOffset + offset);
  }
  return result;
}

/**
 * Confirms that the relic we are about to erase is really the one sitting at
 * `byteOffset`, by comparing its stored 4 id bytes against the bytes still in
 * `cleanData`. Guards against a stale/mis-derived offset silently blanking
 * unrelated save data.
 */
export function assertSlotIdentity(
  cleanData: Uint8Array,
  byteOffset: number,
  idBytes: Uint8Array | undefined,
  entryIndex: number
): void {
  if (idBytes === undefined) {
    throw new Error(
      `Refusing to erase a relic slot at offset ${byteOffset} in BND4 entry ${entryIndex}: the relic's identifying bytes are missing, so the target cannot be verified.`
    );
  }

  const actual = cleanData.slice(byteOffset, byteOffset + idBytes.length);
  const matches =
    actual.length === idBytes.length &&
    idBytes.every((byte, i) => actual[i] === byte);

  if (!matches) {
    const format = (bytes: Uint8Array) =>
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
    throw new Error(
      `Relic identity check failed for BND4 entry ${entryIndex} at offset ${byteOffset}: expected id bytes ${format(
        idBytes
      )} but found ${format(
        actual
      )}. Refusing to erase - no save file was produced.`
    );
  }
}

export interface RelicDeletion {
  entry: BND4Entry;
  byteOffset: number;
  slotSize: number;
  /**
   * The 4 id bytes the relic had when it was parsed. The bytes actually
   * sitting at `byteOffset` must still match these before anything is erased
   * - otherwise the offset is stale/wrong and we would blank an unrelated
   * part of the save file.
   */
  idBytes: Uint8Array;
}

export class SaveFileEncryptor {
  private static writeUint32LE(value: number): Uint8Array {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, value, true);
    return buf;
  }

  /**
   * Encrypts the given plaintext with the save-file key and the given IV.
   * Split out from `reEncryptEntry` so that tests can subclass and inject a
   * deliberately corrupted ciphertext to prove the round-trip verification
   * below actually fires. Production code never overrides this.
   */
  protected static async encryptPlaintext(
    plaintext: Uint8Array,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      DS2_KEY,
      { name: "AES-CBC" },
      false,
      ["encrypt"]
    );
    return new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, plaintext)
    );
  }

  /**
   * Decrypts an IV-prefixed encrypted BND4 entry back to its `cleanData`,
   * mirroring SaveFileDecryptor: IV is the first 16 bytes, ciphertext
   * follows, and the decrypted plaintext carries a 4-byte length prefix that
   * is stripped off.
   */
  private static async decryptEntryData(
    encryptedData: Uint8Array
  ): Promise<Uint8Array> {
    const iv = encryptedData.slice(0, IV_SIZE);
    const ciphertext = encryptedData.slice(IV_SIZE);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      DS2_KEY,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );
    const plaintext = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, ciphertext)
    );
    return plaintext.slice(4);
  }

  /**
   * Runtime round-trip gate mandated by the design spec: decrypt what we just
   * encrypted and require it to be byte-for-byte identical to the plaintext
   * we meant to write. Throws otherwise, so a caller can never be handed an
   * unverified save file.
   */
  private static async verifyRoundTrip(
    newEncryptedData: Uint8Array,
    expectedCleanData: Uint8Array,
    entryIndex: number
  ): Promise<void> {
    let roundTripped: Uint8Array;
    try {
      roundTripped = await this.decryptEntryData(newEncryptedData);
    } catch (error) {
      throw new Error(
        `Round-trip verification failed for BND4 entry ${entryIndex}: the re-encrypted data could not be decrypted again (${
          error instanceof Error ? error.message : String(error)
        }). No save file was produced.`
      );
    }

    if (roundTripped.length !== expectedCleanData.length) {
      throw new Error(
        `Round-trip verification failed for BND4 entry ${entryIndex}: decrypted length ${roundTripped.length} does not match the expected ${expectedCleanData.length} bytes. No save file was produced.`
      );
    }

    for (let i = 0; i < expectedCleanData.length; i++) {
      if (roundTripped[i] !== expectedCleanData[i]) {
        throw new Error(
          `Round-trip verification failed for BND4 entry ${entryIndex}: decrypted data differs from the intended data at byte ${i}. No save file was produced.`
        );
      }
    }
  }

  /**
   * Re-encrypts a single BND4 entry's plaintext with a fresh random IV.
   * The 4-byte length prefix that SaveFileDecryptor strips off on decrypt
   * is reconstructed from newCleanData's own length here.
   */
  private static async reEncryptEntry(
    newCleanData: Uint8Array,
    entryIndex: number
  ): Promise<Uint8Array> {
    const prefix = this.writeUint32LE(newCleanData.length);
    const plaintext = new Uint8Array(prefix.length + newCleanData.length);
    plaintext.set(prefix, 0);
    plaintext.set(newCleanData, prefix.length);

    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const ciphertext = await this.encryptPlaintext(plaintext, iv);

    const result = new Uint8Array(iv.length + ciphertext.length);
    result.set(iv, 0);
    result.set(ciphertext, iv.length);

    await this.verifyRoundTrip(result, newCleanData, entryIndex);

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
    if (deletions.length === 0) {
      throw new Error("writeRelicDeletions requires at least one deletion");
    }
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
      for (const { byteOffset, slotSize, idBytes } of entryDeletions) {
        assertSlotIdentity(entry.cleanData, byteOffset, idBytes, entry.index);
        newCleanData = eraseRelicSlot(newCleanData, byteOffset, slotSize);
      }
      const newEncryptedData = await this.reEncryptEntry(
        newCleanData,
        entry.index
      );
      if (newEncryptedData.length !== entry.size) {
        throw new Error(
          `Re-encrypted entry size mismatch: expected ${entry.size} bytes, got ${newEncryptedData.length} bytes. This indicates a critical encryption error.`
        );
      }
      output.set(newEncryptedData, entry.dataOffset);
    }

    return output;
  }
}
