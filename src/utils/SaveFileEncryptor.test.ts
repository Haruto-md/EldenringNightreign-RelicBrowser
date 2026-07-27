import fs from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import type { BND4Entry, RelicSlot } from "../types/SaveFile";
import { RelicParser } from "./RelicParser";
import { SaveFileDecryptor } from "./SaveFileDecryptor";
import {
  eraseRelicSlot,
  EMPTY_SLOT_PATTERN,
  SaveFileEncryptor,
} from "./SaveFileEncryptor";

function readFixture(): Uint8Array {
  const filePath = path.join(__dirname, "..", "test", "10slots.sl2");
  const fileBuffer = fs.readFileSync(filePath);
  return new Uint8Array(
    fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    )
  );
}

function expectedErasedSlot(slotSize: number): Uint8Array {
  const expected = new Uint8Array(slotSize);
  for (let i = 0; i < slotSize; i += EMPTY_SLOT_PATTERN.length) {
    expected.set(EMPTY_SLOT_PATTERN, i);
  }
  return expected;
}

/**
 * Byte-for-byte comparison of two large buffers. Uses an explicit loop rather
 * than `toEqual` because these buffers are ~1 MB each and vitest's deep-equal
 * (and especially its diff rendering) is prohibitively slow at that size.
 */
function expectBytesEqual(
  actual: Uint8Array,
  expected: Uint8Array,
  label: string
): void {
  expect(actual.length, `${label}: length`).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(
        `${label}: byte ${i} differs - expected 0x${expected[i].toString(
          16
        )}, got 0x${actual[i].toString(16)}`
      );
    }
  }
}

function deletionFor(entry: BND4Entry, relic: RelicSlot) {
  return {
    entry,
    byteOffset: relic.byteOffset!,
    slotSize: relic.slotSize!,
    idBytes: relic.idBytes!,
  };
}

/**
 * Exercises the real writeRelicDeletions path end to end, but corrupts one
 * byte of the ciphertext right where it leaves the encrypt step - simulating
 * a save file whose round trip does not hold. Nothing is mocked: real
 * AES-CBC, real fixture, real parser.
 */
class CorruptingSaveFileEncryptor extends SaveFileEncryptor {
  protected static override async encryptPlaintext(
    plaintext: Uint8Array,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    const ciphertext = await super.encryptPlaintext(plaintext, iv);
    // Flip a bit in an interior block: AES-CBC still decrypts (padding is
    // intact) but the plaintext comes back wrong, which is exactly the
    // silent-corruption case the verification gate exists to catch.
    ciphertext[64] ^= 0xff;
    return ciphertext;
  }
}

describe("SaveFileEncryptor", () => {
  describe("eraseRelicSlot", () => {
    it("fills the given region with the repeated empty-slot pattern", () => {
      const cleanData = new Uint8Array(24).fill(0xaa);
      const result = eraseRelicSlot(cleanData, 8, 16);

      expect(result.slice(0, 8)).toEqual(new Uint8Array(8).fill(0xaa));
      for (let i = 8; i < 24; i += EMPTY_SLOT_PATTERN.length) {
        expect(result.slice(i, i + EMPTY_SLOT_PATTERN.length)).toEqual(
          EMPTY_SLOT_PATTERN
        );
      }
      // Original buffer must not be mutated.
      expect(cleanData.slice(8, 16)).toEqual(new Uint8Array(8).fill(0xaa));
    });

    it("throws if slotSize is not a multiple of EMPTY_SLOT_PATTERN.length", () => {
      const cleanData = new Uint8Array(24);
      expect(() => eraseRelicSlot(cleanData, 0, 15)).toThrow(
        /slotSize 15 must be a multiple of 8 bytes/
      );
      expect(() => eraseRelicSlot(cleanData, 0, 7)).toThrow(
        /slotSize 7 must be a multiple of 8 bytes/
      );
      expect(() => eraseRelicSlot(cleanData, 0, 81)).toThrow(
        /slotSize 81 must be a multiple of 8 bytes/
      );
    });
  });

  describe("writeRelicDeletions", () => {
    let rawFile: Uint8Array;
    let bnd4Entries: BND4Entry[];
    let before: { name: string | null; relics: RelicSlot[] };
    // The single-deletion write is shared by several assertions below;
    // decrypting + parsing the fixture repeatedly is far too slow to redo
    // inside every test.
    let modifiedRawFile: Uint8Array;
    let reDecryptedEntries: BND4Entry[];
    let after: { name: string | null; relics: RelicSlot[] };

    beforeAll(async () => {
      rawFile = readFixture();
      bnd4Entries = await SaveFileDecryptor.decryptSaveFile(rawFile.buffer);
      const names = RelicParser.getNames(bnd4Entries[10]);
      before = RelicParser.parseCharacterSlot(names[0], bnd4Entries[0]);
      expect(before.relics.length).toBeGreaterThan(0);

      modifiedRawFile = await SaveFileEncryptor.writeRelicDeletions([
        deletionFor(bnd4Entries[0], before.relics[0]),
      ]);
      reDecryptedEntries = await SaveFileDecryptor.decryptSaveFile(
        modifiedRawFile.buffer
      );
      const afterNames = RelicParser.getNames(reDecryptedEntries[10]);
      after = RelicParser.parseCharacterSlot(
        afterNames[0],
        reDecryptedEntries[0]
      );
    }, 120000);

    it("throws if called with an empty deletions array", async () => {
      await expect(SaveFileEncryptor.writeRelicDeletions([])).rejects.toThrow(
        /writeRelicDeletions requires at least one deletion/
      );
    });

    it("deletes exactly the targeted relic and leaves every other relic unchanged", () => {
      const target = before.relics[0];
      expect(target.byteOffset).toBeTypeOf("number");
      expect(target.slotSize).toBe(80);

      // The BND4 header and entry table must be untouched.
      expect(modifiedRawFile.length).toBe(rawFile.length);
      expect(modifiedRawFile.slice(0, 64)).toEqual(rawFile.slice(0, 64));

      expect(after.relics.length).toBe(before.relics.length - 1);
      const afterIds = new Set(after.relics.map((r) => r.id));
      expect(afterIds.has(target.id)).toBe(false);

      const beforeIdsMinusTarget = before.relics
        .filter((r) => r.id !== target.id)
        .map((r) => r.id)
        .sort();
      expect([...afterIds].sort()).toEqual(beforeIdsMinusTarget);
    });

    it("changes nothing in the modified entry outside the targeted 80-byte slot", () => {
      const target = before.relics[0];
      const originalCleanData = bnd4Entries[0].cleanData;
      const newCleanData = reDecryptedEntries[0].cleanData;

      // Full-buffer comparison: the entire entry must be identical to the
      // original except for the one erased slot.
      const expected = new Uint8Array(originalCleanData);
      expected.set(expectedErasedSlot(target.slotSize!), target.byteOffset!);

      expectBytesEqual(newCleanData, expected, "modified entry cleanData");
    });

    it("leaves every non-targeted BND4 entry byte-identical", () => {
      expect(reDecryptedEntries.length).toBe(bnd4Entries.length);
      for (let i = 0; i < bnd4Entries.length; i++) {
        if (bnd4Entries[i].index === bnd4Entries[0].index) {
          continue;
        }
        expect(reDecryptedEntries[i].index).toBe(bnd4Entries[i].index);
        expectBytesEqual(
          reDecryptedEntries[i].cleanData,
          bnd4Entries[i].cleanData,
          `untouched entry ${bnd4Entries[i].index} cleanData`
        );
      }
    });

    it("applies multiple deletions spread across more than one BND4 entry", async () => {
      const names = RelicParser.getNames(bnd4Entries[10]);
      const slotA = RelicParser.parseCharacterSlot(names[0], bnd4Entries[0]);
      const slotB = RelicParser.parseCharacterSlot(names[1], bnd4Entries[1]);
      expect(slotA.relics.length).toBeGreaterThan(1);
      expect(slotB.relics.length).toBeGreaterThan(0);

      const targetsA = [slotA.relics[0], slotA.relics[1]];
      const targetB = slotB.relics[0];

      const modifiedRawFile = await SaveFileEncryptor.writeRelicDeletions([
        deletionFor(bnd4Entries[0], targetsA[0]),
        deletionFor(bnd4Entries[1], targetB),
        deletionFor(bnd4Entries[0], targetsA[1]),
      ]);

      expect(modifiedRawFile.length).toBe(rawFile.length);

      const reDecryptedEntries = await SaveFileDecryptor.decryptSaveFile(
        modifiedRawFile.buffer
      );

      // Entry 0: both targets erased, everything else byte-identical.
      const expectedA = new Uint8Array(bnd4Entries[0].cleanData);
      for (const target of targetsA) {
        expectedA.set(
          expectedErasedSlot(target.slotSize!),
          target.byteOffset!
        );
      }
      expectBytesEqual(
        reDecryptedEntries[0].cleanData,
        expectedA,
        "entry 0 cleanData"
      );

      // Entry 1: its single target erased, everything else byte-identical.
      const expectedB = new Uint8Array(bnd4Entries[1].cleanData);
      expectedB.set(
        expectedErasedSlot(targetB.slotSize!),
        targetB.byteOffset!
      );
      expectBytesEqual(
        reDecryptedEntries[1].cleanData,
        expectedB,
        "entry 1 cleanData"
      );

      // Every other entry untouched.
      for (let i = 2; i < bnd4Entries.length; i++) {
        expectBytesEqual(
          reDecryptedEntries[i].cleanData,
          bnd4Entries[i].cleanData,
          `untouched entry ${bnd4Entries[i].index} cleanData`
        );
      }

      // And the relics really are gone after re-parsing.
      const afterNames = RelicParser.getNames(reDecryptedEntries[10]);
      const afterA = RelicParser.parseCharacterSlot(
        afterNames[0],
        reDecryptedEntries[0]
      );
      const afterB = RelicParser.parseCharacterSlot(
        afterNames[1],
        reDecryptedEntries[1]
      );
      expect(afterA.relics.length).toBe(slotA.relics.length - 2);
      expect(afterB.relics.length).toBe(slotB.relics.length - 1);
      const afterAIds = new Set(afterA.relics.map((r) => r.id));
      expect(afterAIds.has(targetsA[0].id)).toBe(false);
      expect(afterAIds.has(targetsA[1].id)).toBe(false);
      expect(afterB.relics.some((r) => r.id === targetB.id)).toBe(false);
    }, 120000);

    it("refuses to erase when the id bytes at the offset do not match the target relic", async () => {
      const target = before.relics[0];

      await expect(
        SaveFileEncryptor.writeRelicDeletions([
          {
            ...deletionFor(bnd4Entries[0], target),
            idBytes: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
          },
        ])
      ).rejects.toThrow(/Relic identity check failed/);
    });

    it("refuses to erase when the target relic has no id bytes to verify against", async () => {
      const target = before.relics[0];

      await expect(
        SaveFileEncryptor.writeRelicDeletions([
          {
            ...deletionFor(bnd4Entries[0], target),
            idBytes: undefined as unknown as Uint8Array,
          },
        ])
      ).rejects.toThrow(/identifying bytes are missing/);
    });

    it("throws instead of returning bytes when the round trip does not verify", async () => {
      const target = before.relics[0];

      await expect(
        CorruptingSaveFileEncryptor.writeRelicDeletions([
          deletionFor(bnd4Entries[0], target),
        ])
      ).rejects.toThrow(/Round-trip verification failed/);
    }, 60000);
  });
});
