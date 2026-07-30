# Damage Optimizer Live Search Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** While a Damage Optimizer (or Combo Finder engine) search is running, show a live, increasing "combinations checked" count instead of a static "検索中..." spinner, without touching the final authoritative result.

**Architecture:** The WASM search runs synchronously inside a dedicated Web Worker, so the worker can't `postMessage` progress mid-search. Instead, a `static AtomicU32` counter lives in the WASM module's shared linear memory; rayon's parallel per-vessel search threads flush their local "checked" counts into it in batches of 256. The worker exposes the module's `WebAssembly.Memory` and the counter's byte address to the **main thread** once, right before starting the blocking search call. The main thread (which is never blocked — it's just `await`-ing the worker) polls the shared memory directly via `Atomics.load` on a `setInterval`, independent of whatever the worker is doing.

**Tech Stack:** Rust + `wasm-bindgen` (compiled via `wasm-pack build --target web`), TypeScript, Vitest (jsdom environment), React (MUI `LinearProgress`/`Typography`).

## Global Constraints

- Batch size for the atomic flush: `256` (constant `PROGRESS_BATCH` in Rust). Do not change without updating the corresponding JS-side tolerance in tests.
- Poll interval on the main thread: `150` ms.
- The existing `total_combinations_checked` returned in the final WASM result **must not change** — it always comes from the existing accurate local `checked_local` counters, never from the new atomic. No task in this plan touches that return path.
- When SharedArrayBuffer/threads are unavailable (no COOP/COEP headers, or a browser without thread support), the feature must degrade silently to today's indeterminate-spinner-only behavior — no thrown errors, no broken search.
- Only one search runs at a time (existing single-flight design in `ComboSearch.ts`); the new poll interval must be torn down on `result`, `error`, and `cancelCurrentSearch()` in all cases, with no leaked timers.
- This repository has no working `cargo test` runner for the `wasm/combo_search` crate (`wasm32-unknown-unknown` target has no configured test runner in this environment — confirmed by running `cargo test --target wasm32-unknown-unknown`, which compiles but fails to execute the resulting `.wasm` test binary). **Do not add `#[test]` functions to `lib.rs` as a verification step for this plan** — verify Rust changes by building with `wasm-pack build` and exercising the compiled module from Vitest instead, exactly like the existing `ComboSearch.test.ts` / `ComboSearch.damage.test.ts` suites already do.
- This codebase has no React component test infrastructure (no `@testing-library/react`, no `*.test.tsx` files exist anywhere in `src/`). Do not introduce one for this plan's UI task — verify the UI change with a manual browser smoke test instead, consistent with existing project conventions.

---

### Task 1: Rust progress counter + WASM exports

**Files:**
- Modify: `wasm/combo_search/src/lib.rs:1-10` (imports), `:30` (consts area), `:497` (emit closure increment), `:576` (function entry), `:740` (merge loop increment)
- Test: `src/utils/ComboSearch.progressCounter.test.ts` (new)

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces (consumed by Task 2):
  - `#[wasm_bindgen] pub fn wasm_memory() -> JsValue` — returns the module's `WebAssembly.Memory`.
  - `#[wasm_bindgen] pub fn progress_counter_ptr() -> u32` — byte address of the counter; JS divides by 4 for an `Int32Array` index.
  - Both become plain named exports of `wasm/combo_search/pkg/combo_search.js` after rebuild, importable exactly like the existing `search_combinations`.

- [ ] **Step 1: Add the atomic counter, batching helper, and exports to `lib.rs`**

Add `Ordering`/`AtomicU32` to the imports at the top of the file (after the existing `use std::collections::HashSet;` on line 4):

```rust
use std::collections::HashSet;
use std::sync::atomic::{AtomicU32, Ordering};
```

Add this block right after `const TOP_GROUP_RESULTS: usize = 200;` (currently line 30):

```rust
// Batch size for flushing the live-progress atomic counter. Each parallel
// per-vessel search call site tracks its own local `checked_local` and only
// flushes to the shared atomic every PROGRESS_BATCH combinations — this
// bounds atomic-op/cache-contention overhead across rayon's threads. The
// final `total_combinations_checked` returned to JS is NEVER read from this
// atomic; it always comes from the accurate local counters, so a search
// result is byte-for-byte identical to before this counter existed.
const PROGRESS_BATCH: u32 = 256;
static PROGRESS_COUNTER: AtomicU32 = AtomicU32::new(0);

#[inline(always)]
fn record_progress(checked_local: u32) {
    if checked_local % PROGRESS_BATCH == 0 {
        PROGRESS_COUNTER.fetch_add(PROGRESS_BATCH, Ordering::Relaxed);
    }
}

/// Returns the module's shared `WebAssembly.Memory`. JS builds an
/// `Int32Array` view over its `.buffer` to poll `PROGRESS_COUNTER` live with
/// `Atomics.load` from the main thread while a search runs on a worker
/// thread (the worker itself is blocked inside the synchronous
/// `search_combinations` call and can't post progress messages itself).
#[wasm_bindgen]
pub fn wasm_memory() -> JsValue {
    wasm_bindgen::memory()
}

/// Byte address of `PROGRESS_COUNTER` inside the shared wasm linear memory.
/// JS divides this by 4 to get an `Int32Array` element index.
#[wasm_bindgen]
pub fn progress_counter_ptr() -> u32 {
    &PROGRESS_COUNTER as *const AtomicU32 as u32
}
```

- [ ] **Step 2: Reset the counter at the start of every search**

In `pub fn search_combinations(input: JsValue) -> JsValue {` (currently line 576), add as the very first statement in the function body:

```rust
pub fn search_combinations(input: JsValue) -> JsValue {
    PROGRESS_COUNTER.store(0, Ordering::Relaxed);
    let input: SearchInput = match serde_wasm_bindgen::from_value(input) {
```

(The `let input: SearchInput = ...` line already exists immediately below — just insert the `store` call above it, don't duplicate it.)

- [ ] **Step 3: Flush progress at both existing "checked" increment sites**

There are two `checked_local += 1;` sites. Change both to also call `record_progress`:

Site A — inside `search_group_triples`'s `emit` closure (currently line 497):
```rust
                checked_local += 1;
                record_progress(checked_local);
```

Site B — inside `search_combinations`'s norm×deep merge loop (currently line 740):
```rust
                checked_local += 1;
                record_progress(checked_local);
```

- [ ] **Step 4: Rebuild the WASM module**

Run: `npm run build:wasm`
Expected: succeeds, and `wasm/combo_search/pkg/combo_search.js` now exports `wasm_memory` and `progress_counter_ptr` alongside the existing `search_combinations`/`initThreadPool`. Verify with:

Run: `grep -n "export function wasm_memory\|export function progress_counter_ptr" wasm/combo_search/pkg/combo_search.js`
Expected: both lines found.

- [ ] **Step 5: Write the failing test**

Create `src/utils/ComboSearch.progressCounter.test.ts`:

```typescript
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
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/utils/ComboSearch.progressCounter.test.ts`
Expected: FAIL — `progress_counter_ptr`/`wasm_memory` are not exported yet if step 4 wasn't done, or (if step 4 was already done) the counter assertions fail because `record_progress` isn't wired in yet. If you did steps 1-4 in order, this test should actually already pass — in that case, temporarily comment out the `record_progress(checked_local);` call at one site, confirm the test now fails (proving the test actually detects the missing increment), then restore it.

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/utils/ComboSearch.progressCounter.test.ts`
Expected: PASS

- [ ] **Step 8: Run the full existing test suite to confirm no regression**

Run: `npx vitest run src/utils/ComboSearch.test.ts src/utils/ComboSearch.damage.test.ts src/workers/comboSearchWorker.test.ts`
Expected: all pass (18 tests, same as before this task).

- [ ] **Step 9: Commit**

```bash
git add wasm/combo_search/src/lib.rs wasm/combo_search/pkg src/utils/ComboSearch.progressCounter.test.ts
git commit -m "feat: add live progress counter to WASM combo search"
```

---

### Task 2: Worker sends the shared progress buffer to the main thread

**Files:**
- Modify: `src/workers/comboSearchWorker.ts`

**Interfaces:**
- Consumes: `wasm_memory()`, `progress_counter_ptr()` from Task 1's rebuilt `wasm/combo_search/pkg/combo_search.js`.
- Produces (consumed by Task 3):
  - New message type in the `ComboSearchWorkerMessage` union:
    ```typescript
    export interface ComboSearchWorkerProgressBuffer {
      type: "progressBuffer";
      id: number;
      buffer: SharedArrayBuffer;
      ptrIndex: number;
    }
    ```
  - The worker posts this message (when available) after WASM init and before calling `search_combinations`.

- [ ] **Step 1: Add the new message type**

In `src/workers/comboSearchWorker.ts`, add the interface after `ComboSearchWorkerProgress` (currently lines 29-35) and add it to the `ComboSearchWorkerMessage` union (currently lines 63-66):

```typescript
export interface ComboSearchWorkerProgressBuffer {
  type: "progressBuffer";
  id: number;
  buffer: SharedArrayBuffer;
  ptrIndex: number;
}

export type ComboSearchWorkerMessage =
  | ComboSearchWorkerProgress
  | ComboSearchWorkerProgressBuffer
  | ComboSearchWorkerResult
  | ComboSearchWorkerError;
```

- [ ] **Step 2: Import the new WASM exports and track thread-pool init success**

Change the import at the top (currently lines 1-4):

```typescript
import init, {
  initThreadPool,
  progress_counter_ptr,
  search_combinations,
  wasm_memory,
} from "../../wasm/combo_search/pkg/combo_search.js";
```

In `initComboSearchWasm` (currently lines 74-109), add a module-level flag and set it only on confirmed success. Add near the top of the file, alongside `let initialized: Promise<boolean> | undefined;` (currently line 72):

```typescript
let initialized: Promise<boolean> | undefined;
let threadPoolInitialized = false;
```

Inside the `try { ... await initThreadPool(threads); ... }` block (currently around lines 83-91), set the flag right after the await succeeds:

```typescript
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
```

- [ ] **Step 3: Send the progress buffer before the blocking search call**

In `self.onmessage` (currently lines 148-219), after `await initComboSearchWasm();` (currently line 175) and before `const input = buildWasmInput(payload);` (currently line 178), add:

```typescript
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
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

Run: `npx eslint src/workers/comboSearchWorker.ts`
Expected: no errors.

- [ ] **Step 5: Run the existing worker/combo-search test suite to confirm no regression**

Run: `npx vitest run src/utils/ComboSearch.test.ts src/utils/ComboSearch.damage.test.ts src/workers/comboSearchWorker.test.ts src/utils/ComboSearch.progressCounter.test.ts`
Expected: all pass.

(No new automated test is added in this task — `threadPoolInitialized` only becomes `true` when `initThreadPool` genuinely succeeds, which requires real multi-threaded WASM support not available in this project's Vitest/jsdom environment. This send-path is exercised for real by the manual browser smoke test in Task 5, and its consumer side is exercised directly in Task 3's test via a simulated `progressBuffer` message.)

- [ ] **Step 6: Commit**

```bash
git add src/workers/comboSearchWorker.ts
git commit -m "feat: worker shares WASM memory for live search progress"
```

---

### Task 3: Main thread polls the shared buffer and reports live progress

**Files:**
- Modify: `src/utils/ComboSearch.ts`
- Test: `src/utils/ComboSearch.progressPolling.test.ts` (new)

**Interfaces:**
- Consumes: `ComboSearchWorkerProgressBuffer` from Task 2, existing `onProgress?: (p: ComboSearchProgress) => void` callback parameter already threaded through `runWorkerSearch` / `searchCombinations` / `searchDamageCombinations`.
- Produces (consumed by Task 4): `onProgress` is now called repeatedly (every 150ms) with increasing `totalCombinationsChecked` values while a search with a shared progress buffer is running, in addition to the existing single `stage: "main"` call at search start and the final `stage: "done"`-adjacent result.

- [ ] **Step 1: Add interval bookkeeping**

In `src/utils/ComboSearch.ts`, add after the `pending` map declaration (currently lines 56-67):

```typescript
// Live-progress poll intervals, keyed by request id. A request only gets an
// entry here if the worker sent a "progressBuffer" message for it (i.e.
// SharedArrayBuffer/threads were available); otherwise progress stays at
// today's single indeterminate "main" stage update.
const progressIntervals = new Map<number, ReturnType<typeof setInterval>>();

function clearProgressInterval(id: number): void {
  const intervalId = progressIntervals.get(id);
  if (intervalId !== undefined) {
    clearInterval(intervalId);
    progressIntervals.delete(id);
  }
}
```

- [ ] **Step 2: Handle the new message type in the worker's `onmessage`**

In the `switch (msg.type)` block inside `getWorker()` (currently lines 92-155), add a case, and clear the interval in the existing `result`/`error` cases:

```typescript
    switch (msg.type) {
      case "progress": {
        entry.onProgress?.({
          totalCombinationsChecked: msg.totalCombinationsChecked,
          availableRelicsCount: msg.availableRelicsCount,
          stage: msg.stage,
        });
        break;
      }
      case "progressBuffer": {
        const view = new Int32Array(msg.buffer);
        const { relics, deepRelics } = entry.context.data;
        const availableRelicsCount = relics.length + deepRelics.length;
        const intervalId = setInterval(() => {
          const checked = Atomics.load(view, msg.ptrIndex);
          entry.onProgress?.({
            totalCombinationsChecked: checked,
            availableRelicsCount,
            stage: "main",
          });
        }, 150);
        progressIntervals.set(msg.id, intervalId);
        break;
      }
      case "result": {
        clearProgressInterval(msg.id);
        const { enabledVessels, data } = entry.context;
```

(The rest of the existing `result` case body is unchanged — just insert `clearProgressInterval(msg.id);` as its first line.)

For the `error` case, insert the same call as its first line:

```typescript
      case "error": {
        clearProgressInterval(msg.id);
        const err = msg as ComboSearchWorkerError;
```

- [ ] **Step 3: Clear all intervals on worker error and on cancellation**

In `workerSingleton.onerror` (currently lines 158-168), clear every tracked interval when rejecting all pending requests:

```typescript
  workerSingleton.onerror = (err) => {
    // reject all pending
    for (const [id, p] of pending) {
      p.reject(err);
      pending.delete(id);
      clearProgressInterval(id);
    }
    activeRequestId = null;
    // reset worker
    workerSingleton?.terminate();
    workerSingleton = null;
  };
```

In `cancelCurrentSearch` (currently lines 173-192), do the same:

```typescript
export function cancelCurrentSearch(): void {
  // Reject all pending requests.
  for (const [id, p] of pending) {
    p.reject(new Error("Search cancelled"));
    pending.delete(id);
    clearProgressInterval(id);
  }
  activeRequestId = null;
```

- [ ] **Step 4: Write the failing test**

Create `src/utils/ComboSearch.progressPolling.test.ts`:

```typescript
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
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/utils/ComboSearch.progressPolling.test.ts`
Expected: FAIL — `progressBuffer` isn't a recognized message type yet, so no interval is created and `onProgress` is never called with the polled values.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/utils/ComboSearch.progressPolling.test.ts`
Expected: PASS

- [ ] **Step 7: Run the full related test suite to confirm no regression**

Run: `npx vitest run src/utils/ComboSearch.test.ts src/utils/ComboSearch.damage.test.ts src/utils/ComboSearch.progressCounter.test.ts src/utils/ComboSearch.progressPolling.test.ts src/workers/comboSearchWorker.test.ts`
Expected: all pass.

- [ ] **Step 8: Typecheck and lint**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

Run: `npx eslint src/utils/ComboSearch.ts src/utils/ComboSearch.progressPolling.test.ts`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/utils/ComboSearch.ts src/utils/ComboSearch.progressPolling.test.ts
git commit -m "feat: poll live search progress from the shared WASM buffer"
```

---

### Task 4: Show the live count in the Damage Optimizer UI

**Files:**
- Modify: `src/components/DamageOptimizer.tsx:948-956`

**Interfaces:**
- Consumes: `progress: ComboSearchProgress | null` (existing component state, already updated by `onProgress` from Task 3 — no new props/state needed).
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Update the search-status text**

In `src/components/DamageOptimizer.tsx`, replace the body currently at lines 948-956:

```tsx
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isSearching ? (
              "検索中..."
            ) : progress?.stage === "done" && searchResults !== null ? (
              `${progress.totalCombinationsChecked.toLocaleString()}件の組み合わせを${searchResults.searchTime}msでチェックしました。`
            ) : (
              <>&nbsp;</>
            )}
          </Typography>
```

with:

```tsx
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isSearching ? (
              progress !== null && progress.totalCombinationsChecked > 0 ? (
                `検索中... ${progress.totalCombinationsChecked.toLocaleString()}件チェック済み`
              ) : (
                "検索中..."
              )
            ) : progress?.stage === "done" && searchResults !== null ? (
              `${progress.totalCombinationsChecked.toLocaleString()}件の組み合わせを${searchResults.searchTime}msでチェックしました。`
            ) : (
              <>&nbsp;</>
            )}
          </Typography>
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

Run: `npx eslint src/components/DamageOptimizer.tsx`
Expected: no errors.

- [ ] **Step 3: Manual browser smoke test**

Run: `npm run dev` (or the project's existing dev-server command), open the app, go to the Damage Optimizer tab, load a save with a large relic inventory, pick a nightfarer/profile likely to yield many candidates (e.g. a broad element + all attack modes enabled), and click 検索.

Verify:
- The `検索中... N件チェック済み` count appears and increases several times during the search (open devtools Network tab and confirm `crossOriginIsolated` is `true` in the console — required for the live counter path; if `false`, verify the UI instead falls back cleanly to plain `検索中...` with no console errors).
- After the search finishes, the final `N件の組み合わせをXmsでチェックしました。` message still appears exactly as before.
- No dangling timers: open devtools, run two searches in a row (second one cancels/replaces the first via the existing single-flight logic), confirm no console errors and no runaway CPU usage after both complete.

- [ ] **Step 4: Commit**

```bash
git add src/components/DamageOptimizer.tsx
git commit -m "feat: show live combinations-checked count during Damage Optimizer search"
```
