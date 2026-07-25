import { assert, beforeAll, describe, expect, it } from "vitest";
import init, {
  search_combinations,
} from "../../wasm/combo_search/pkg/combo_search.js";
import { EffectKey } from "../resources/effectKeys.js";
import { type Effect } from "../resources/effects";
import type { RelicSlot } from "../types/SaveFile";
import { buildWasmInput } from "../workers/comboSearchWorker.js";
import { buildDamageWorkerInput, cancelCurrentSearch } from "./ComboSearch.js";
import { EFFECT_KEY_ARRAY_LENGTH } from "./DamageMultiplierArray";
import { getEffectByKey } from "./DataUtils";
import { Nightfarer } from "./Nightfarers";
import { RelicSlotColor } from "./RelicColor.js";
import type { Vessel } from "./Vessels";

// helper to build minimal RelicSlot for tests
let testRelicId = 900000;
function makeRelic(itemId: number, effect: Effect): RelicSlot {
  return {
    id: testRelicId++,
    itemId,
    effects: [[effect]],
    coordinates: [0, 0],
    coordinatesByColor: [0, 0],
  } as RelicSlot;
}

describe("ComboSearch damage mode", () => {
  beforeAll(async () => {
    await init();
  });

  it("cancelCurrentSearch is safe to call with no pending searches (sanity check)", () => {
    expect(() => cancelCurrentSearch()).not.toThrow();
  });

  it("scores the top combination as the product of active multipliers", () => {
    // improvedMeleeAttackPower is a stacks=true damage effect (multiplier 1.05 in the
    // "melee" bucket per damageMultipliers.ts).
    const meleeEffect = getEffectByKey(EffectKey.improvedMeleeAttackPower);
    assert(meleeEffect !== undefined);
    // An irrelevant effect (no entry in damageMultipliers => multiplier stays 1.0).
    const irrelevantEffect = getEffectByKey(EffectKey.strengthPlus1);
    assert(irrelevantEffect !== undefined);

    // itemId 102 is a known Red relic (see ComboSearch.test.ts).
    const RED_ITEM_ID = 102;

    const normalRelics: RelicSlot[] = [
      makeRelic(RED_ITEM_ID, meleeEffect),
      makeRelic(RED_ITEM_ID, meleeEffect),
      makeRelic(RED_ITEM_ID, irrelevantEffect),
    ];
    const deepRelics: RelicSlot[] = [
      makeRelic(RED_ITEM_ID, meleeEffect),
      makeRelic(RED_ITEM_ID, irrelevantEffect),
    ];

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

    // damage_multipliers must be a plain array of exactly EFFECT_KEY_ARRAY_LENGTH entries.
    expect(Array.isArray(workerInput.damageMultipliers)).toBe(true);
    expect(workerInput.damageMultipliers).toHaveLength(EFFECT_KEY_ARRAY_LENGTH);

    const input = buildWasmInput(workerInput);
    const result = search_combinations(input) as {
      combinations: Array<{ points: number }>;
    };

    expect(result.combinations.length).toBeGreaterThan(0);

    // Hand-computed expected product: the melee-attack-power effect (multiplier 1.05,
    // stacks=true) appears on all 3 normal relics minus the one irrelevant filler, i.e.
    // on 2 normal relics + 1 deep relic = 3 occurrences. The irrelevant fillers and the
    // empty 6th slot contribute a factor of 1.
    const expectedProduct = 1.05 * 1.05 * 1.05;
    expect(result.combinations[0].points).toBeCloseTo(expectedProduct, 4);
  });

  it("excludes combinations containing an excluded demerit key on a deep relic", () => {
    const meleeEffect = getEffectByKey(EffectKey.improvedMeleeAttackPower);
    assert(meleeEffect !== undefined);
    const demeritEffect = getEffectByKey(EffectKey.reducedVigorAndArcane);
    assert(demeritEffect !== undefined);

    const RED_ITEM_ID = 102;

    const normalRelics: RelicSlot[] = [makeRelic(RED_ITEM_ID, meleeEffect)];
    const deepRelics: RelicSlot[] = [makeRelic(RED_ITEM_ID, demeritEffect)];

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
      [EffectKey.reducedVigorAndArcane]
    );
    const input = buildWasmInput(workerInput);
    const result = search_combinations(input) as {
      combinations: Array<{
        relic_indices: (number | null)[];
        points: number;
      }>;
    };

    // No combination should include the deep relic slot (indices 3-5) since its only
    // relic carries the excluded demerit key.
    for (const combo of result.combinations) {
      expect(combo.relic_indices[3] ?? null).toBeNull();
      expect(combo.relic_indices[4] ?? null).toBeNull();
      expect(combo.relic_indices[5] ?? null).toBeNull();
    }
  });
});
