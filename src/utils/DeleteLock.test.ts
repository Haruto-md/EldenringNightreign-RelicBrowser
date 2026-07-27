import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  emptyDeleteLock,
  hasEntryBeenDeletedFrom,
  isDeleteLocked,
  recordDelete,
} from "./DeleteLock";
import { RelicParser } from "./RelicParser";
import { SaveFileDecryptor } from "./SaveFileDecryptor";
import { SaveFileEncryptor } from "./SaveFileEncryptor";

describe("DeleteLock", () => {
  it("starts unlocked", () => {
    expect(isDeleteLocked(emptyDeleteLock)).toBe(false);
  });

  it("locks once a delete has been recorded", () => {
    const state = recordDelete(emptyDeleteLock, 0);
    expect(isDeleteLocked(state)).toBe(true);
    expect(hasEntryBeenDeletedFrom(state, 0)).toBe(true);
  });

  it("does not mutate the state it is given", () => {
    const state = recordDelete(emptyDeleteLock, 3);
    expect(emptyDeleteLock.deletedEntryIndices.size).toBe(0);
    expect(isDeleteLocked(emptyDeleteLock)).toBe(false);
    expect([...state.deletedEntryIndices]).toEqual([3]);
  });

  /**
   * The reproduction of the reported defect at the state level: a delete on
   * character slot A followed by a switch to character slot B must NOT unlock
   * the flow. Slot switching does not touch this state at all - only loading a
   * new file or clearing does - so the lock survives by construction.
   */
  it("stays locked for a different BND4 entry (character-slot switch)", () => {
    const afterDeleteOnA = recordDelete(emptyDeleteLock, 0);
    // Switching to character B changes nothing about the lock.
    expect(isDeleteLocked(afterDeleteOnA)).toBe(true);
    expect(hasEntryBeenDeletedFrom(afterDeleteOnA, 1)).toBe(false);
  });

  it("remains locked for entry A after a delete is recorded against entry B", () => {
    const state = recordDelete(recordDelete(emptyDeleteLock, 0), 1);
    expect(isDeleteLocked(state)).toBe(true);
    expect(hasEntryBeenDeletedFrom(state, 0)).toBe(true);
    expect(hasEntryBeenDeletedFrom(state, 1)).toBe(true);
  });

  it("is reset only by going back to the empty state (new file / clear)", () => {
    const locked = recordDelete(emptyDeleteLock, 0);
    expect(isDeleteLocked(locked)).toBe(true);
    expect(isDeleteLocked(emptyDeleteLock)).toBe(false);
  });

  /**
   * Proves the premise behind `isDeleteLocked` ignoring the entry index: a
   * per-entry lock would allow a delete on character B after a delete on
   * character A, and that second download silently loses A's deletion. Real
   * fixture, real AES, real parser - nothing mocked.
   */
  it("a second delete on a different character rebuilds from stale bytes and loses the first delete", async () => {
    const filePath = path.join(__dirname, "..", "test", "10slots.sl2");
    const fileBuffer = fs.readFileSync(filePath);
    const rawFile = new Uint8Array(
      fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      )
    );

    const entries = await SaveFileDecryptor.decryptSaveFile(rawFile.buffer);
    const names = RelicParser.getNames(entries[10]);
    const slotA = RelicParser.parseCharacterSlot(names[0], entries[0]);
    const slotB = RelicParser.parseCharacterSlot(names[1], entries[1]);
    expect(slotA.relics.length).toBeGreaterThan(0);
    expect(slotB.relics.length).toBeGreaterThan(0);

    const targetA = slotA.relics[0];
    const targetB = slotB.relics[0];

    // First delete: character A. The user downloads this file.
    const firstDownload = await SaveFileEncryptor.writeRelicDeletions([
      {
        entry: entries[0],
        byteOffset: targetA.byteOffset!,
        slotSize: targetA.slotSize!,
        idBytes: targetA.idBytes!,
      },
    ]);
    const afterFirst = RelicParser.parseCharacterSlot(
      names[0],
      (await SaveFileDecryptor.decryptSaveFile(firstDownload.buffer))[0]
    );
    expect(afterFirst.relics.some((r) => r.id === targetA.id)).toBe(false);

    // Second delete on character B, in the same session, using the same
    // (never-updated) in-memory entries - what a per-entry lock would permit.
    const secondDownload = await SaveFileEncryptor.writeRelicDeletions([
      {
        entry: entries[1],
        byteOffset: targetB.byteOffset!,
        slotSize: targetB.slotSize!,
        idBytes: targetB.idBytes!,
      },
    ]);
    const reDecrypted = await SaveFileDecryptor.decryptSaveFile(
      secondDownload.buffer
    );
    const finalA = RelicParser.parseCharacterSlot(names[0], reDecrypted[0]);
    const finalB = RelicParser.parseCharacterSlot(names[1], reDecrypted[1]);

    // B's deletion landed...
    expect(finalB.relics.some((r) => r.id === targetB.id)).toBe(false);
    // ...but A's relic is BACK. This is the silent data loss the file-scoped
    // lock exists to make unreachable.
    expect(finalA.relics.some((r) => r.id === targetA.id)).toBe(true);

    // Which is exactly why the lock does not care which entry is in view.
    expect(isDeleteLocked(recordDelete(emptyDeleteLock, entries[0].index))).toBe(
      true
    );
  }, 120000);
});
