# Damage Optimizer live search progress — design

## Background

`searchDamageCombinations` / `searchCombinations` run a synchronous WASM call
(`search_combinations`) inside a dedicated Web Worker
(`src/workers/comboSearchWorker.ts`). Because the call is synchronous, the
worker's own JS event loop is blocked for the full duration of the search — it
cannot `postMessage` incremental progress while the WASM call is in flight.
Today the UI (`src/components/DamageOptimizer.tsx`) only shows a single
indeterminate `LinearProgress` spinner with static "検索中..." text from the
moment the search starts until the final `result` message arrives.

A recent fix (see `2026-07-30` debugging session) narrowed the Damage
Optimizer's candidate relic set so searches now typically complete in well
under a second, but worst-case inputs (many enabled vessels, large must-have
candidate sets) can still take several seconds. The user wants a live,
increasing "combinations checked" counter during the search, not just a
static spinner.

## Goal

While a search is running, show a live count of combinations checked that
increases in real time, in addition to the existing indeterminate progress
bar. Total combination count is not known in advance without redundant
up-front computation, so the bar itself stays indeterminate — only the
numeric counter is live.

## Non-goals

- A determinate (percentage-accurate) progress bar. Rejected: would require
  an up-front enumeration/estimation pass, adding complexity and a risk of
  the bar overshooting/undershooting 100%.
- Any change to the final authoritative `total_combinations_checked` value
  returned in the search result — that stays exactly as accurate as it is
  today.
- Progress reporting when SharedArrayBuffer/threads are unavailable (e.g.
  missing COOP/COEP headers, or a browser without thread support). In that
  case the UI silently falls back to today's indeterminate-only spinner —
  consistent with how `initThreadPool` already degrades silently.

## Architecture

The worker thread cannot report progress mid-search (it's blocked inside the
synchronous WASM call), so polling must happen on the **main thread**, which
is never blocked — it's simply `await`-ing the worker's `postMessage`.

The mechanism:

1. **Rust (`wasm/combo_search/src/lib.rs`)**: a module-level
   `static PROGRESS_COUNTER: AtomicU32`, reset to 0 at the top of
   `search_combinations`. The two existing "combinations checked" increment
   sites (the `emit` closure inside `search_group_triples`, and the
   norm×deep merge loop in `search_combinations`) additionally flush to this
   atomic in batches of 256 (to bound atomic-op overhead across rayon's
   parallel vessel threads — an exact live count isn't needed, only a
   frequently-updated one). Because rayon's threads are real Web Workers
   sharing the same WebAssembly linear memory (already required for the
   existing thread pool), writes to this static are visible across all of
   them without any JS-side synchronization.
   - Two new `#[wasm_bindgen]` exports: `wasm_memory()` (returns
     `wasm_bindgen::memory()`, the module's `WebAssembly.Memory`) and
     `progress_counter_ptr()` (the counter's byte address as `u32`).
   - `total_combinations_checked` in `SearchOutput` is unaffected — it keeps
     using the existing accurate local `checked_local` counters, not the
     batched atomic.

2. **Worker (`src/workers/comboSearchWorker.ts`)**: only when the rayon
   thread pool successfully initialized (i.e. SharedArrayBuffer/threads are
   available — the same condition already guarding `initThreadPool`), send
   one extra message right before calling `search_combinations`:
   `{ type: "progressBuffer", id, buffer: wasm_memory(), ptrIndex }`.
   `buffer` is a `SharedArrayBuffer`, so structured-cloning it to the main
   thread shares the same backing memory rather than copying it.

3. **Main thread (`src/utils/ComboSearch.ts`)**: on receiving
   `progressBuffer` for a request, build an `Int32Array` view over the
   shared buffer and start a `setInterval` (150ms) that reads the counter
   via `Atomics.load` and calls the request's `onProgress` callback with
   `{ totalCombinationsChecked, availableRelicsCount, stage: "main" }`. The
   interval is cleared when that request's `result`/`error` arrives, or if
   the search is cancelled.

4. **UI (`src/components/DamageOptimizer.tsx`)**: while `isSearching`, show
   `検索中... 12,345件チェック済み` once a nonzero count has been observed via
   `onProgress`, falling back to plain `検索中...` if no live count ever
   arrives (the SharedArrayBuffer-unavailable case). The progress bar stays
   `indeterminate` throughout the search, unchanged.

## Error handling / edge cases

- If `wasm_memory()` / `progress_counter_ptr()` aren't available (older
  cached WASM build) or thread pool init failed, the worker simply never
  sends `progressBuffer` — main thread behavior is identical to today.
- Multiple concurrent searches: the existing single-flight design in
  `ComboSearch.ts` (`cancelCurrentSearch` terminates the previous worker
  before starting a new one) already guarantees only one search — and thus
  one live poll interval — runs at a time. The interval is keyed by request
  id and torn down on `result`/`error`, matching the existing `pending` map
  cleanup.
- The 150ms poll interval must be cleared in all exit paths (`result`,
  `error`, worker `onerror`, and `cancelCurrentSearch`) to avoid leaking
  timers.

## Testing

- Rust: unit test that after calling `search_combinations` with a large
  synthetic input, `PROGRESS_COUNTER` ends at a value close to (within one
  batch of) the returned `total_combinations_checked` — verifies the batched
  flush actually captures the bulk of the work, not just a fixed offset.
- JS: a `ComboSearch.ts` test that mocks a worker sending `progressBuffer`
  followed by `result`, and asserts `onProgress` was called at least once
  with an increasing `totalCombinationsChecked` before the result resolves,
  and that the interval is cleared afterward (no dangling timers left after
  the test, checked via fake timers).
- Manual smoke test in the browser: confirm the live counter increases
  during a real Damage Optimizer search, and confirm the existing "done"
  message (total checked + search time) still displays correctly afterward.
