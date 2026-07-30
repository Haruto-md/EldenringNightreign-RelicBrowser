import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComboSearchWorkerMessage } from "../workers/comboSearchWorker";
import { cancelCurrentSearch, searchCombinations } from "./ComboSearch.js";
import { getEffectByKey } from "./DataUtils";
import { EffectKey } from "../resources/effectKeys.js";
import { Nightfarer } from "./Nightfarers";
import { anyoneVessels } from "./Vessels";
import type { RelicSlot } from "../types/SaveFile";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<ComboSearchWorkerMessage>) => void) | null =
    null;
  onerror: ((err: unknown) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
  emit(data: ComboSearchWorkerMessage): void {
    this.onmessage?.({ data } as MessageEvent<ComboSearchWorkerMessage>);
  }
}

describe("ComboSearch live progress polling", () => {
  beforeEach(() => {
    cancelCurrentSearch();
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
    vi.useFakeTimers();
  });

  afterEach(() => {
    cancelCurrentSearch();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("polls the shared buffer and stops after the result arrives", async () => {
    const selectedEffect = getEffectByKey(EffectKey.strengthPlus1);
    if (selectedEffect === undefined) {
      throw new Error("fixture effect missing");
    }
    const relics: RelicSlot[] = [
      {
        id: 1,
        itemId: 129,
        effects: [[selectedEffect]],
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      } as RelicSlot,
    ];

    const onProgress = vi.fn();
    const resultPromise = searchCombinations(
      Nightfarer.Wylder,
      [selectedEffect],
      relics,
      [],
      [anyoneVessels[2]],
      [],
      onProgress
    );

    const worker = FakeWorker.instances.at(-1);
    if (worker === undefined) {
      throw new Error("expected a FakeWorker to have been constructed");
    }
    // Read back the actual request id ComboSearch.ts assigned, rather than
    // assuming it's 1 — request ids are a module-level monotonic counter
    // shared across every test in this file, so hardcoding would make the
    // test order-dependent.
    const searchMessage = worker.postMessage.mock.calls[0][0] as {
      id: number;
    };
    const requestId = searchMessage.id;

    // Real SharedArrayBuffer the "worker" and the main thread's poll
    // interval both read from — simulating what wasm_memory().buffer would
    // provide in a real, thread-capable environment.
    const sab = new SharedArrayBuffer(8);
    const view = new Int32Array(sab);
    view[0] = 5;

    worker.emit({
      type: "progressBuffer",
      id: requestId,
      buffer: sab,
      ptrIndex: 0,
    });

    // First poll tick sees the initial value.
    await vi.advanceTimersByTimeAsync(150);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ totalCombinationsChecked: 5 })
    );

    // Simulate the search progressing further, then poll again.
    Atomics.store(view, 0, 42);
    await vi.advanceTimersByTimeAsync(150);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ totalCombinationsChecked: 42 })
    );

    const callCountBeforeResult = onProgress.mock.calls.length;

    worker.emit({
      type: "result",
      id: requestId,
      combinations: [],
      searchTime: 10,
      totalCombinationsChecked: 42,
      availableRelicsCount: 1,
    });

    await resultPromise;

    // Advancing time after the result must not produce any more progress
    // calls — the interval must have been cleared.
    Atomics.store(view, 0, 999);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onProgress.mock.calls.length).toBe(callCountBeforeResult);
  });
});
