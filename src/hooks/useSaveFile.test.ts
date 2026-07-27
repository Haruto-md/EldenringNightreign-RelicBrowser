import fs from "fs";
import path from "path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isDeleteLocked } from "../utils/DeleteLock";
import { useSaveFile } from "./useSaveFile";

type Hook = ReturnType<typeof useSaveFile>;

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

function readFixture(name: string): Uint8Array {
  const filePath = path.join(__dirname, "..", "test", name);
  const fileBuffer = fs.readFileSync(filePath);
  return new Uint8Array(
    fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    )
  );
}

/**
 * jsdom's `File` has no `arrayBuffer()`, so build the minimal file-like object
 * `loadSaveFile` actually consumes (name, size, arrayBuffer). The bytes are
 * the real fixture - nothing about parsing or crypto is faked.
 */
function fixtureFile(bytes: Uint8Array, name: string): File {
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () =>
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer,
  } as unknown as File;
}

/**
 * Minimal hook harness. This repo has no component-test library, so the hook
 * is driven through a real React root in jsdom instead of mocking anything.
 */
function renderUseSaveFile(): { current: Hook; unmount: () => void } {
  const handle = { current: undefined as unknown as Hook, unmount: () => {} };

  function Harness() {
    handle.current = useSaveFile();
    return null;
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(createElement(Harness));
  });
  handle.unmount = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  return handle;
}

describe("useSaveFile delete lock", () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.dataLayer = [];
  });

  afterEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it(
    "keeps the lock across character-slot switches and clears it only on a new file load",
    async () => {
      const bytes = readFixture("10slots.sl2");
      const hook = renderUseSaveFile();

      try {
        await act(async () => {
          await hook.current.loadSaveFile(
            fixtureFile(bytes, "10slots.sl2")
          );
        });

        expect(hook.current.error).toBeNull();
        const slots = hook.current.saveFileData?.slots ?? [];
        expect(slots.length).toBeGreaterThan(1);
        const entryA = slots[0].entry;
        const entryB = slots[1].entry;
        expect(entryA).toBeDefined();
        expect(entryB).toBeDefined();
        expect(entryB!.index).not.toBe(entryA!.index);
        expect(isDeleteLocked(hook.current.deleteLock)).toBe(false);

        // Delete relics on character A.
        act(() => {
          hook.current.markEntryDeleted(entryA!.index);
        });
        expect(isDeleteLocked(hook.current.deleteLock)).toBe(true);

        // Switch to character B WITHOUT reloading the file. This is the exact
        // path that used to reset the old component-local `deleteCompleted`
        // flag (RelicBrowser re-ran its `currentEntry` effect), which let a
        // second delete rebuild the save from the untouched original bytes.
        act(() => {
          hook.current.selectSlot(1);
        });
        expect(hook.current.saveFileData?.currentSlot).toBe(1);
        expect(isDeleteLocked(hook.current.deleteLock)).toBe(true);

        // Switching back to A is still locked too.
        act(() => {
          hook.current.selectSlot(0);
        });
        expect(isDeleteLocked(hook.current.deleteLock)).toBe(true);

        // Only a genuinely new file load clears it.
        await act(async () => {
          await hook.current.loadSaveFile(
            fixtureFile(bytes, "10slots.sl2")
          );
        });
        expect(hook.current.error).toBeNull();
        expect(isDeleteLocked(hook.current.deleteLock)).toBe(false);

        // ...as does clearing the file.
        act(() => {
          hook.current.markEntryDeleted(0);
        });
        expect(isDeleteLocked(hook.current.deleteLock)).toBe(true);
        act(() => {
          hook.current.clearSaveFile();
        });
        expect(isDeleteLocked(hook.current.deleteLock)).toBe(false);
      } finally {
        hook.unmount();
      }
    },
    120000
  );
});
