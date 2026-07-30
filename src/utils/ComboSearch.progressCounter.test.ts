import { beforeAll, describe, expect, it } from "vitest";
import init, {
  progress_counter_ptr,
  search_combinations,
  wasm_memory,
} from "../../wasm/combo_search/pkg/combo_search.js";
import { EffectKey } from "../resources/effectKeys.js";
import type { RelicSlot } from "../types/SaveFile";
import { buildWasmInput } from "../workers/comboSearchWorker.js";
import { buildDamageWorkerInput } from "./ComboSearch.js";
import { EFFECT_KEY_ARRAY_LENGTH } from "./DamageMultiplierArray";
import { getEffectByKey } from "./DataUtils";
import { Nightfarer } from "./Nightfarers";
import { RelicSlotColor } from "./RelicColor.js";
import type { Vessel } from "./Vessels";

let testRelicId = 800000;
function makeRelic(itemId: number, effectKey: EffectKey): RelicSlot {
  const effect = getEffectByKey(effectKey);
  if (effect === undefined) {
    throw new Error(`Unknown test effect key ${effectKey}`);
  }
  return {
    id: testRelicId++,
    itemId,
    effects: [[effect]],
    coordinates: [0, 0],
    coordinatesByColor: [0, 0],
  } as RelicSlot;
}

describe("WASM live progress counter", () => {
  beforeAll(async () => {
    await init();
  });

  it("ends close to the authoritative total_combinations_checked after a search", () => {
    const RED_ITEM_ID = 102;
    const normalRelics: RelicSlot[] = Array.from({ length: 30 }, () =>
      makeRelic(RED_ITEM_ID, EffectKey.improvedMeleeAttackPower)
    );
    const deepRelics: RelicSlot[] = Array.from({ length: 10 }, () =>
      makeRelic(RED_ITEM_ID, EffectKey.improvedMeleeAttackPower)
    );

    const vessel: Vessel = {
      name: "Test Vessel",
      slots: [
        RelicSlotColor.Red,
        RelicSlotColor.Red,
        RelicSlotColor.Red,
        RelicSlotColor.Red,
        RelicSlotColor.Red,
        RelicSlotColor.Red,
      ],
    };

    const multiplierArray = new Float32Array(EFFECT_KEY_ARRAY_LENGTH).fill(1);
    multiplierArray[EffectKey.improvedMeleeAttackPower] = 1.05;

    const workerInput = buildDamageWorkerInput(
      Nightfarer.Wylder,
      normalRelics,
      deepRelics,
      [vessel],
      multiplierArray,
      []
    );
    const input = buildWasmInput(workerInput);
    const result = search_combinations(input) as {
      total_combinations_checked: number;
    };

    // Enough relics that far more than one batch's worth of combinations are
    // checked, so this test can't pass by coincidence (e.g. if the counter
    // were never incremented at all, this assertion on the checked total
    // would still hold, but the tolerance check below would fail since
    // finalCounter would stay 0).
    expect(result.total_combinations_checked).toBeGreaterThan(1000);

    const memory = wasm_memory() as WebAssembly.Memory;
    const ptr = progress_counter_ptr() as number;
    const view = new Int32Array(memory.buffer);
    const finalCounter = Atomics.load(view, ptr / 4);

    expect(finalCounter).toBeGreaterThan(0);
    expect(finalCounter).toBeLessThanOrEqual(result.total_combinations_checked);
    // There are 3 independent local `checked_local` counters per vessel (the
    // normal-group triple search, the deep-group triple search, and the
    // final merge loop), each with up to PROGRESS_BATCH-1 unflushed at the
    // end. With 1 vessel that's a worst-case gap of 3 * (PROGRESS_BATCH - 1).
    const PROGRESS_BATCH = 256;
    const maxUnflushedGap = 3 * (PROGRESS_BATCH - 1);
    expect(finalCounter).toBeGreaterThan(
      result.total_combinations_checked - maxUnflushedGap
    );
  });
});
