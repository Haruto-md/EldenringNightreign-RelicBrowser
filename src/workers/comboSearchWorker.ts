import init, {
  initThreadPool,
  progress_counter_ptr,
  search_combinations,
  wasm_memory,
} from "../../wasm/combo_search/pkg/combo_search.js";
import { type Effect } from "../resources/effects";
import type { RelicSlot } from "../types/SaveFile";
import { getRelicColor } from "../utils/DataUtils.js";
import { Nightfarer } from "../utils/Nightfarers";
import type { Vessel } from "../utils/Vessels";

export interface SelectedEffectEntry {
  effectKey: number;
  minStacks: number;
  maxStacks: number;
}

export interface ComboSearchWorkerInput {
  nightfarer: Nightfarer;
  selectedEffects: Effect[];
  recommendedEffects: Effect[];
  relics: RelicSlot[];
  deepRelics: RelicSlot[];
  enabledVessels: Vessel[];
  selectedEffectRanges: SelectedEffectEntry[];
  damageMultipliers?: number[];
  excludedDemeritKeys?: number[];
}

export interface ComboSearchWorkerProgress {
  type: "progress";
  id: number;
  totalCombinationsChecked: number;
  availableRelicsCount: number;
  stage: "main" | "done";
}

export interface ComboSearchWorkerProgressBuffer {
  type: "progressBuffer";
  id: number;
  buffer: SharedArrayBuffer;
  ptrIndex: number;
}

export interface ComboSearchWorkerResult {
  type: "result";
  id: number;
  combinations: Array<{
    vessel_index: number;
    relic_indices: [
      number | null,
      number | null,
      number | null,
      number | null,
      number | null,
      number | null,
    ];
    points: number;
  }>;
  searchTime: number;
  totalCombinationsChecked: number;
  availableRelicsCount: number;
}

export interface ComboSearchWorkerError {
  type: "error";
  id: number;
  error: string;
}

export type ComboSearchWorkerMessage =
  | ComboSearchWorkerProgress
  | ComboSearchWorkerProgressBuffer
  | ComboSearchWorkerResult
  | ComboSearchWorkerError;

export type ComboSearchWorkerRequest =
  | { type: "search"; id: number; payload: ComboSearchWorkerInput }
  | { type: "cancel"; id?: number };

let initialized: Promise<boolean> | undefined;
let threadPoolInitialized = false;

async function initComboSearchWasm(): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      await init();
      // Initialize Rayon thread pool if supported (SharedArrayBuffer required)
      if (
        typeof initThreadPool === "function" &&
        typeof SharedArrayBuffer !== "undefined"
      ) {
        try {
          const navHW = (
            globalThis as unknown as {
              navigator?: { hardwareConcurrency?: number };
            }
          ).navigator?.hardwareConcurrency;
          const hw = typeof navHW === "number" && navHW > 0 ? navHW : 4;
          const threads = Math.min(8, hw); // cap at max vessels
          await initThreadPool(threads);
          threadPoolInitialized = true;
        } catch (e) {
          // Fallback silently if threads not available
          console.warn(
            "initThreadPool failed, falling back to single-thread",
            e
          );
        }
      } else {
        // Threads unavailable (e.g. missing COOP/COEP or test env)
      }
      return true;
    })().catch((e: unknown) => {
      console.error("Failed to init WASM in worker", e);
      throw e;
    });
  }
  await initialized;
}

export function buildWasmInput({
  nightfarer,
  selectedEffects,
  recommendedEffects,
  relics,
  deepRelics,
  enabledVessels,
  selectedEffectRanges,
  damageMultipliers,
  excludedDemeritKeys,
}: ComboSearchWorkerInput) {
  return {
    nightfarer,
    selected_effects: selectedEffects,
    relics: relics.map((r) => ({
      color: getRelicColor(r.itemId),
      effects: r.effects.map(([effect]) => effect),
    })),
    deep_relics: deepRelics.map((r) => ({
      color: getRelicColor(r.itemId),
      effects: r.effects.flatMap(([effect, debuff]) =>
        debuff !== undefined ? [effect, debuff] : [effect]
      ),
    })),
    enabled_vessels: enabledVessels.map(({ slots }) => slots),
    recommended_effects: recommendedEffects,
    selected_effect_ranges: selectedEffectRanges.map((e) => ({
      effect_key: e.effectKey,
      min_stacks: e.minStacks,
      max_stacks: e.maxStacks,
    })),
    damage_multipliers: damageMultipliers ?? undefined,
    excluded_demerit_keys: excludedDemeritKeys ?? undefined,
  };
}

// Worker script
self.onmessage = async (event: MessageEvent<ComboSearchWorkerRequest>) => {
  try {
    const data = event.data;

    if (data.type === "cancel") {
      // No-op: current WASM search is synchronous and cannot be interrupted.
      // The main thread will ignore out-of-date results.
      return;
    }

    const { id, payload } = data; // type === "search"

    const { relics, deepRelics } = payload;
    const startTime = Date.now();
    const availableRelicsCount = relics.length + deepRelics.length;

    // Send initial progress
    const progressMessage: ComboSearchWorkerProgress = {
      type: "progress",
      id,
      totalCombinationsChecked: 0,
      availableRelicsCount,
      stage: "main",
    };
    self.postMessage(progressMessage);

    // Initialize WASM
    await initComboSearchWasm();

    // If the rayon thread pool initialized (SharedArrayBuffer/threads are
    // available), share this module's WASM memory with the main thread so it
    // can poll the live progress counter via Atomics.load while this worker
    // is blocked inside the synchronous search_combinations call below. This
    // is best-effort: if anything here fails or isn't available, the search
    // still proceeds normally with no live progress (today's indeterminate
    // spinner behavior).
    if (
      threadPoolInitialized &&
      typeof wasm_memory === "function" &&
      typeof progress_counter_ptr === "function"
    ) {
      try {
        const memory = wasm_memory() as WebAssembly.Memory;
        const ptr = progress_counter_ptr() as number;
        const progressBufferMessage: ComboSearchWorkerProgressBuffer = {
          type: "progressBuffer",
          id,
          buffer: memory.buffer as SharedArrayBuffer,
          ptrIndex: ptr / 4,
        };
        self.postMessage(progressBufferMessage);
      } catch {
        // Best-effort only; fall through to the normal search.
      }
    }

    // Prepare input for WASM
    const input = buildWasmInput(payload);

    // Perform the search
    const wasmResult = search_combinations(input) as {
      combinations: Array<{
        vessel_index: number;
        relic_indices: [
          number | null,
          number | null,
          number | null,
          number | null,
          number | null,
          number | null,
        ];
        points: number;
      }>;
      total_combinations_checked: number;
    };

    const searchTime = Date.now() - startTime;

    // Send final result
    const resultMessage: ComboSearchWorkerResult = {
      type: "result",
      id,
      combinations: wasmResult.combinations,
      searchTime,
      totalCombinationsChecked: wasmResult.total_combinations_checked,
      availableRelicsCount,
    };

    self.postMessage(resultMessage);
  } catch (error) {
    const id = (event.data as { id?: number }).id ?? -1;
    const errorMessage: ComboSearchWorkerError = {
      type: "error",
      id,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(errorMessage);
  }
};
