import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { RelicParser } from "./RelicParser";
import { SaveFileDecryptor } from "./SaveFileDecryptor";
import { eraseRelicSlot, EMPTY_SLOT_PATTERN, SaveFileEncryptor } from "./SaveFileEncryptor";

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
  });

  describe("writeRelicDeletions", () => {
    it("deletes exactly the targeted relic and leaves every other relic unchanged", async () => {
      const filePath = path.join(__dirname, "..", "test", "10slots.sl2");
      const fileBuffer = fs.readFileSync(filePath);
      const rawFile = new Uint8Array(
        fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        )
      );

      const bnd4Entries = await SaveFileDecryptor.decryptSaveFile(rawFile.buffer);
      const names = RelicParser.getNames(bnd4Entries[10]);
      const before = RelicParser.parseCharacterSlot(names[0], bnd4Entries[0]);
      expect(before.relics.length).toBeGreaterThan(0);

      const target = before.relics[0];
      expect(target.byteOffset).toBeTypeOf("number");
      expect(target.slotSize).toBe(80);

      const modifiedRawFile = await SaveFileEncryptor.writeRelicDeletions([
        {
          entry: bnd4Entries[0],
          byteOffset: target.byteOffset!,
          slotSize: target.slotSize!,
        },
      ]);

      // The BND4 header and entry table must be untouched.
      expect(modifiedRawFile.length).toBe(rawFile.length);
      expect(modifiedRawFile.slice(0, 64)).toEqual(rawFile.slice(0, 64));

      const reDecryptedEntries = await SaveFileDecryptor.decryptSaveFile(
        modifiedRawFile.buffer
      );
      const afterNames = RelicParser.getNames(reDecryptedEntries[10]);
      const after = RelicParser.parseCharacterSlot(
        afterNames[0],
        reDecryptedEntries[0]
      );

      expect(after.relics.length).toBe(before.relics.length - 1);
      const afterIds = new Set(after.relics.map((r) => r.id));
      expect(afterIds.has(target.id)).toBe(false);

      const beforeIdsMinusTarget = before.relics
        .filter((r) => r.id !== target.id)
        .map((r) => r.id)
        .sort();
      expect([...afterIds].sort()).toEqual(beforeIdsMinusTarget);
    });
  });
});
