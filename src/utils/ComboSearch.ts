import type { EffectKey } from "../resources/effectKeys";
import { isSameGroupAndEqualOrBetter, type Effect } from "../resources/effects";
import { items } from "../resources/items";
import type { RelicSlot } from "../types/SaveFile";
import type {
  ComboSearchWorkerError,
  ComboSearchWorkerInput,
  ComboSearchWorkerMessage,
} from "../workers/comboSearchWorker";
import {
  getEffectByKey,
  getStackableHigherLevelEffects,
  relicHasEffect,
} from "./DataUtils";
import { Nightfarer } from "./Nightfarers";
import { recommendedEffectsByCharacter } from "./RecommendedEffects";
import { RelicSlotColor } from "./RelicColor";
import { sortRelicsByColor } from "./RelicProcessor";
import type { Vessel } from "./Vessels";

export interface VesselCombination {
  vessel: Vessel;
  relicCombination: [
    RelicSlot | undefined,
    RelicSlot | undefined,
    RelicSlot | undefined,
    RelicSlot | undefined,
    RelicSlot | undefined,
    RelicSlot | undefined,
  ];
  points: number;
}

export interface ComboSearchProgress {
  totalCombinationsChecked: number;
  availableRelicsCount: number;
  stage: "main" | "done";
}

export interface ComboSearchResult {
  combinations: VesselCombination[];
  searchTime: number;
  totalCombinationsChecked: number;
  availableRelicsCount: number;
}

export type SelectedEffectEntry = {
  effectKey: number;
  minStacks: number;
  maxStacks: number;
};

// Persistent worker and request handling
let workerSingleton: Worker | null = null;
let nextRequestId = 0;
// Monotonically increasing epoch used to ignore stale messages from terminated/replaced workers.
let workerEpoch = 0;
// Track the currently running request id (single-flight).
let activeRequestId: number | null = null;
const pending = new Map<
  number,
  {
    resolve: (r: ComboSearchResult) => void;
    reject: (e: unknown) => void;
    onProgress?: (p: ComboSearchProgress) => void;
    context: {
      enabledVessels: Vessel[];
      data: ComboSearchWorkerInput;
    };
  }
>();

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

function getWorker(): Worker {
  if (workerSingleton) {
    return workerSingleton;
  }
  const epochAtCreation = ++workerEpoch;
  workerSingleton = new Worker(
    new URL("../workers/comboSearchWorker.ts", import.meta.url),
    { type: "module" }
  );

  workerSingleton.onmessage = (
    event: MessageEvent<ComboSearchWorkerMessage>
  ) => {
    // If the worker was replaced/terminated and recreated, ignore late messages.
    if (epochAtCreation !== workerEpoch) {
      return;
    }
    const msg = event.data as ComboSearchWorkerMessage;
    const entry = pending.get(msg.id);
    if (!entry) {
      return; // stale or already handled
    }

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
        const combinations: VesselCombination[] = msg.combinations.map((e) => {
          const vessel = enabledVessels[e.vessel_index];
          const relicCombination: [
            RelicSlot | undefined,
            RelicSlot | undefined,
            RelicSlot | undefined,
            RelicSlot | undefined,
            RelicSlot | undefined,
            RelicSlot | undefined,
          ] = [
            e.relic_indices[0] === null
              ? undefined
              : data.relics[e.relic_indices[0]],
            e.relic_indices[1] === null
              ? undefined
              : data.relics[e.relic_indices[1]],
            e.relic_indices[2] === null
              ? undefined
              : data.relics[e.relic_indices[2]],
            e.relic_indices[3] === null
              ? undefined
              : data.deepRelics[e.relic_indices[3]],
            e.relic_indices[4] === null
              ? undefined
              : data.deepRelics[e.relic_indices[4]],
            e.relic_indices[5] === null
              ? undefined
              : data.deepRelics[e.relic_indices[5]],
          ];
          return { vessel, relicCombination, points: e.points };
        });
        pending.delete(msg.id);
        if (activeRequestId === msg.id) {
          activeRequestId = null;
        }
        entry.resolve({
          combinations,
          searchTime: msg.searchTime,
          totalCombinationsChecked: msg.totalCombinationsChecked,
          availableRelicsCount: msg.availableRelicsCount,
        });
        break;
      }
      case "error": {
        clearProgressInterval(msg.id);
        const err = msg as ComboSearchWorkerError;
        pending.delete(msg.id);
        if (activeRequestId === msg.id) {
          activeRequestId = null;
        }
        entry.reject(new Error(err.error));
        break;
      }
    }
  };

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

  return workerSingleton;
}

export function cancelCurrentSearch(): void {
  // Reject all pending requests.
  for (const [id, p] of pending) {
    p.reject(new Error("Search cancelled"));
    pending.delete(id);
    clearProgressInterval(id);
  }
  activeRequestId = null;

  // Important: the WASM search inside the worker is synchronous, so it can't be interrupted
  // with a "cancel" message. To ensure only one search runs at a time, terminate the worker.
  // Any late messages from that worker will be ignored due to workerEpoch.
  if (workerSingleton) {
    try {
      workerSingleton.terminate();
    } catch {
      // ignore
    }
    workerSingleton = null;
  }
}

function runWorkerSearch(
  data: ComboSearchWorkerInput,
  enabledVessels: Vessel[],
  onProgress?: (progress: ComboSearchProgress) => void
): Promise<ComboSearchResult> {
  // Single-flight: cancel any previous run before starting a new one.
  cancelCurrentSearch();
  const worker = getWorker();

  return new Promise((resolve, reject) => {
    const id = ++nextRequestId;
    activeRequestId = id;
    pending.set(id, {
      resolve,
      reject,
      onProgress,
      context: { enabledVessels, data },
    });
    try {
      worker.postMessage({ type: "search", id, payload: data });
    } catch (e) {
      pending.delete(id);
      if (activeRequestId === id) {
        activeRequestId = null;
      }
      reject(e);
    }
  });
}

export async function searchCombinations(
  nightfarer: Nightfarer,
  selectedEffects: Effect[],
  relics: RelicSlot[],
  deepRelics: RelicSlot[],
  enabledVessels: Vessel[],
  selectedEffectEntries: SelectedEffectEntry[],
  onProgress?: (progress: ComboSearchProgress) => void
): Promise<ComboSearchResult> {
  const data = buildWorkerInput(
    nightfarer,
    selectedEffects,
    relics,
    deepRelics,
    enabledVessels,
    selectedEffectEntries
  );

  return runWorkerSearch(data, enabledVessels, onProgress);
}

export async function searchDamageCombinations(
  nightfarer: Nightfarer,
  normalRelics: RelicSlot[],
  deepRelics: RelicSlot[],
  enabledVessels: Vessel[],
  multiplierArray: Float32Array,
  excludedDemeritKeys: number[],
  effectRanges: SelectedEffectEntry[] = [],
  restrictToScoringRelics: boolean = true,
  onProgress?: (progress: ComboSearchProgress) => void
): Promise<ComboSearchResult> {
  const data = buildDamageWorkerInput(
    nightfarer,
    normalRelics,
    deepRelics,
    enabledVessels,
    multiplierArray,
    excludedDemeritKeys,
    effectRanges,
    restrictToScoringRelics
  );

  return runWorkerSearch(data, enabledVessels, onProgress);
}

function filterRelics(
  relics: RelicSlot[],
  effects: Effect[],
  enabledVessels: Vessel[],
  deepRelics: boolean,
  blockedEffectKeys: EffectKey[]
): RelicSlot[] {
  const vesselSlotIndices = deepRelics ? [3, 4, 5] : [0, 1, 2];
  const enabledRelicColors = new Set(
    vesselSlotIndices.flatMap((index) =>
      enabledVessels.map((v) => v.slots[index])
    )
  );

  const filteredRelics = relics.filter((relic) => {
    const item = items.get(relic.itemId);
    if (
      item === undefined ||
      item?.color === null ||
      (!enabledRelicColors.has(item.color) &&
        !enabledRelicColors.has(RelicSlotColor.Any))
    ) {
      return false;
    }
    return effects.some(
      (effect) =>
        relicHasEffect(relic, effect) &&
        blockedEffectKeys.indexOf(effect.key) < 0
    );
  });

  const relicsByColor = sortRelicsByColor(filteredRelics);
  // Gap filling: prioritize relics with more effects, then those matching selected effects
  const effectsSet = new Set(effects);
  Object.entries(relicsByColor).forEach(([color, filteredRelicsByColor]) => {
    // Build candidate list (exclude already included ones)
    const candidates = relics
      .map((relic, index) => ({ relic, index }))
      .filter(({ relic }) => {
        const item = items.get(relic.itemId);
        return (
          item?.color === Number(color) &&
          !filteredRelicsByColor.includes(relic) &&
          !blockedEffectKeys.some((blockedKey) =>
            relic.effects.some(
              ([e, debuff]) =>
                e.key === blockedKey || debuff?.key === blockedKey
            )
          )
        );
      })
      .map(({ relic, index }) => ({
        relic,
        index,
        effectCount: relic.effects.length,
        hasMatching: relic.effects.some(([relicEffect]) =>
          effectsSet.has(relicEffect)
        ),
      }));

    candidates.sort((a, b) => {
      if (b.effectCount !== a.effectCount) {
        return b.effectCount - a.effectCount; // more effects first
      }
      if (a.hasMatching !== b.hasMatching) {
        return Number(b.hasMatching) - Number(a.hasMatching); // those with matching effect first
      }
      return a.index - b.index; // stable original order fallback
    });

    const gapFillerRelics = candidates.slice(0, 10).map((c) => c.relic);
    filteredRelics.push(...gapFillerRelics);
  });

  return filteredRelics;
}

// Non-scoring relics added per color as fillers, capped so the WASM search
// (which enumerates candidates cubically per color group: anchor x other-slot
// x other-slot) stays tractable. Verified empirically: ~300 same-color relics
// pushes the search into the hundreds-of-millions of combinations checked
// (tens of seconds, effectively hanging the tab for a full inventory), so
// this cap is deliberately far below what a real relic collection can reach.
const RESTRICTED_GAP_FILLER_CAP = 10;
const UNRESTRICTED_GAP_FILLER_CAP = 60;

// Damage-mode candidate filtering: keep only relics of a color used by an
// enabled vessel slot. Relics carrying an effect that actually matters for
// scoring (a damage multiplier > 1.0) or is named by a must-have range are
// always kept in full — mirroring filterRelics' effect-based narrowing
// above. The rest ("non-scoring" relics) are added back in as capped
// fillers so every vessel slot can still be completed even without a
// scoring candidate of its color. restrictToScoring=false raises that cap
// (RESTRICTED_GAP_FILLER_CAP -> UNRESTRICTED_GAP_FILLER_CAP) so more
// non-scoring relics are considered — surfacing combinations that don't
// clear the 1.0x bar — without lifting the cap entirely, which would make
// the search run effectively forever for a full relic inventory.
function filterRelicsForDamage(
  relics: RelicSlot[],
  enabledVessels: Vessel[],
  deepRelics: boolean,
  multiplierArray: Float32Array,
  mustHaveEffects: Effect[],
  restrictToScoring: boolean
): RelicSlot[] {
  const vesselSlotIndices = deepRelics ? [3, 4, 5] : [0, 1, 2];
  const enabledRelicColors = new Set(
    vesselSlotIndices.flatMap((index) =>
      enabledVessels.map((v) => v.slots[index])
    )
  );
  // A relic satisfies a must-have not only by carrying its exact effect key,
  // but also by carrying a same-group, equal-or-higher-tier stackable effect
  // (e.g. a must-have on "物理攻撃力上昇+3" is also satisfied by "+4") —
  // matching how the final WASM range check (combination_satisfies_ranges)
  // treats tiers, so a relic that only clears the bar via a higher tier isn't
  // excluded from candidacy before that check ever sees it.
  const isRelevantEffect = (effect: Effect): boolean =>
    multiplierArray[effect.key] > 1 ||
    mustHaveEffects.some(
      (required) =>
        effect === required || isSameGroupAndEqualOrBetter(required, effect)
    );

  const colorEligible = (relic: RelicSlot): boolean => {
    const item = items.get(relic.itemId);
    return (
      item !== undefined &&
      item.color !== null &&
      (enabledRelicColors.has(item.color) ||
        enabledRelicColors.has(RelicSlotColor.Any))
    );
  };

  const filteredRelics = relics.filter((relic) => {
    if (!colorEligible(relic)) {
      return false;
    }
    return relic.effects.some(
      ([effect, debuff]) =>
        isRelevantEffect(effect) ||
        (debuff !== undefined && isRelevantEffect(debuff))
    );
  });

  const gapFillerCap = restrictToScoring
    ? RESTRICTED_GAP_FILLER_CAP
    : UNRESTRICTED_GAP_FILLER_CAP;

  const relicsByColor = sortRelicsByColor(filteredRelics);
  Object.entries(relicsByColor).forEach(([color, filteredRelicsByColor]) => {
    const candidates = relics
      .filter((relic) => {
        const item = items.get(relic.itemId);
        return (
          item?.color === Number(color) &&
          !filteredRelicsByColor.includes(relic)
        );
      })
      .map((relic) => ({ relic, effectCount: relic.effects.length }));

    candidates.sort((a, b) => b.effectCount - a.effectCount);

    const gapFillerRelics = candidates
      .slice(0, gapFillerCap)
      .map((c) => c.relic);
    filteredRelics.push(...gapFillerRelics);
  });

  return filteredRelics;
}

function filterRecommendedEffects(
  nightfarer: Nightfarer,
  selectedEffects: Effect[]
): Effect[] {
  return recommendedEffectsByCharacter[nightfarer].filter(
    (recommendedEffect) =>
      !selectedEffects.some(
        (selectedEffect) => selectedEffect.key === recommendedEffect.key
      )
  );
}

export function buildWorkerInput(
  nightfarer: Nightfarer,
  selectedEffects: Effect[],
  relics: RelicSlot[],
  deepRelics: RelicSlot[],
  enabledVessels: Vessel[],
  selectedEffectEntries: SelectedEffectEntry[]
): ComboSearchWorkerInput {
  const expandedSelectedEffects = selectedEffects.flatMap(
    getStackableHigherLevelEffects
  );
  const filteredRecommendedEffects = filterRecommendedEffects(
    nightfarer,
    expandedSelectedEffects
  );
  const effects = [...expandedSelectedEffects, ...filteredRecommendedEffects];

  const blockedEffectKeys = selectedEffectEntries
    .filter(({ maxStacks }) => maxStacks === 0)
    .map(({ effectKey }) => effectKey);
  return {
    nightfarer,
    selectedEffects: expandedSelectedEffects,
    recommendedEffects: filteredRecommendedEffects,
    relics: filterRelics(
      relics,
      effects,
      enabledVessels,
      false,
      blockedEffectKeys
    ),
    deepRelics: filterRelics(
      deepRelics,
      effects,
      enabledVessels,
      true,
      blockedEffectKeys
    ),
    enabledVessels,
    selectedEffectRanges: selectedEffectEntries,
  };
}

export function buildDamageWorkerInput(
  nightfarer: Nightfarer,
  normalRelics: RelicSlot[],
  deepRelics: RelicSlot[],
  enabledVessels: Vessel[],
  multiplierArray: Float32Array,
  excludedDemeritKeys: number[],
  effectRanges: SelectedEffectEntry[] = [],
  restrictToScoringRelics: boolean = true
): ComboSearchWorkerInput {
  // Every range's own effect (with its group/level), so the WASM final range
  // check (combination_satisfies_ranges) can treat a same-group, higher-tier
  // relic effect as satisfying a lower-tier must-have, for both atLeast and
  // atMost. Only min_stacks>0 ranges additionally widen candidate eligibility
  // below — an atMost-only range shouldn't force extra relics into the pool.
  const rangeEffects = effectRanges
    .map(({ effectKey }) => getEffectByKey(effectKey as EffectKey))
    .filter((effect): effect is Effect => effect !== undefined);
  const mustHaveEffects = effectRanges
    .filter(({ minStacks }) => minStacks > 0)
    .map(({ effectKey }) => getEffectByKey(effectKey as EffectKey))
    .filter((effect): effect is Effect => effect !== undefined);
  return {
    nightfarer,
    selectedEffects: rangeEffects,
    recommendedEffects: [],
    relics: filterRelicsForDamage(
      normalRelics,
      enabledVessels,
      false,
      multiplierArray,
      mustHaveEffects,
      restrictToScoringRelics
    ),
    deepRelics: filterRelicsForDamage(
      deepRelics,
      enabledVessels,
      true,
      multiplierArray,
      mustHaveEffects,
      restrictToScoringRelics
    ),
    enabledVessels,
    selectedEffectRanges: effectRanges,
    damageMultipliers: Array.from(multiplierArray),
    excludedDemeritKeys,
  };
}
