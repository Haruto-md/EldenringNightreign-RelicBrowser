import { assert, beforeAll, describe, expect, it } from "vitest";
import init, {
  search_combinations,
} from "../../wasm/combo_search/pkg/combo_search.js";
import { EffectKey } from "../resources/effectKeys.js";
import { type Effect } from "../resources/effects";
import type { RelicSlot } from "../types/SaveFile";
import { buildWasmInput } from "../workers/comboSearchWorker.js";
import {
  buildDamageWorkerInput,
  cancelCurrentSearch,
} from "./ComboSearch.js";
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

function makeMultiEffectRelic(itemId: number, effects: Effect[]): RelicSlot {
  return {
    id: testRelicId++,
    itemId,
    effects: effects.map((e) => [e]),
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

  it("requires must-have effect in combinations via effect ranges", () => {
    const meleeEffect = getEffectByKey(EffectKey.improvedMeleeAttackPower);
    assert(meleeEffect !== undefined);
    const irrelevantEffect = getEffectByKey(EffectKey.strengthPlus1);
    assert(irrelevantEffect !== undefined);

    const RED_ITEM_ID = 102;

    // Create normal relics: 2 with melee effect, 1 without
    const normalRelics: RelicSlot[] = [
      makeRelic(RED_ITEM_ID, meleeEffect),
      makeRelic(RED_ITEM_ID, meleeEffect),
      makeRelic(RED_ITEM_ID, irrelevantEffect),
    ];
    // Deep relics: 1 with melee, 1 without
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

    // Require must-have: at least 1 stack of melee attack power
    const effectRanges = [
      {
        effectKey: EffectKey.improvedMeleeAttackPower,
        minStacks: 1,
        maxStacks: 99,
        matchMode: "higherOrEqual" as const,
      },
    ];

    const workerInput = buildDamageWorkerInput(
      Nightfarer.Wylder,
      normalRelics,
      deepRelics,
      [vessel],
      multiplierArray,
      [],
      effectRanges
    );
    const input = buildWasmInput(workerInput);
    const result = search_combinations(input) as {
      combinations: Array<{
        relic_indices: (number | null)[];
        points: number;
      }>;
    };

    // Every combination must include at least one relic with the melee effect
    expect(result.combinations.length).toBeGreaterThan(0);
    for (const combo of result.combinations) {
      const hasRequiredEffect = combo.relic_indices.some((relicIndex) => {
        if (relicIndex === null) {return false;}
        // Check if this relic carries the melee effect
        const relic =
          relicIndex < normalRelics.length
            ? normalRelics[relicIndex]
            : deepRelics[relicIndex - normalRelics.length];
        return relic.effects.some(([effect]) =>
          effect ? effect.key === EffectKey.improvedMeleeAttackPower : false
        );
      });
      expect(hasRequiredEffect).toBe(true);
    }
  });

  it("keeps the damage-mode candidate set small even with thousands of irrelevant filler relics", () => {
    // Regression test: buildDamageWorkerInput used to pass through every
    // color-eligible relic unfiltered (damage mode has no "selected effects"
    // to narrow by), relying on a WASM-side candidate bitmap that
    // search_group_triples never actually consulted for enumeration. Because
    // search_group_triples enumerates candidates cubically per color group,
    // a real inventory (thousands of relics) made the search run for tens of
    // seconds and eventually crash (hashbrown allocation failure) instead of
    // completing. Only relics carrying a multiplier>1 effect or a must-have
    // effect should count as real candidates; everything else may only
    // appear as a small, capped gap-filler.
    const meleeEffect = getEffectByKey(EffectKey.improvedMeleeAttackPower);
    assert(meleeEffect !== undefined);
    const irrelevantEffect = getEffectByKey(EffectKey.strengthPlus1);
    assert(irrelevantEffect !== undefined);

    const RED_ITEM_ID = 102;

    const normalRelics: RelicSlot[] = [
      makeRelic(RED_ITEM_ID, meleeEffect),
      ...Array.from({ length: 3000 }, () =>
        makeRelic(RED_ITEM_ID, irrelevantEffect)
      ),
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
      [],
      [vessel],
      multiplierArray,
      []
    );

    // 1 real candidate + a capped gap-filler batch (at most 10 per color),
    // not all 3001 relics.
    expect(workerInput.relics.length).toBeLessThanOrEqual(11);
  });

  it("still caps the candidate set with restrictToScoringRelics=false, just with a higher cap", () => {
    // Regression test for a real bug: restrictToScoringRelics=false used to
    // pass through every color-eligible relic completely unfiltered. With a
    // realistic inventory (hundreds of same-color relics) this pushed the
    // WASM search into hundreds of millions of checked combinations (tens of
    // seconds), and a user re-clicking "検索" while that was still running
    // would cancel it via the single-flight worker, silently producing an
    // empty result with no console error. The unrestricted mode must widen
    // the gap-filler cap, not remove it.
    const meleeEffect = getEffectByKey(EffectKey.improvedMeleeAttackPower);
    assert(meleeEffect !== undefined);
    const irrelevantEffect = getEffectByKey(EffectKey.strengthPlus1);
    assert(irrelevantEffect !== undefined);

    const RED_ITEM_ID = 102;

    const normalRelics: RelicSlot[] = [
      makeRelic(RED_ITEM_ID, meleeEffect),
      ...Array.from({ length: 3000 }, () =>
        makeRelic(RED_ITEM_ID, irrelevantEffect)
      ),
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
      [],
      [vessel],
      multiplierArray,
      [],
      [],
      false
    );

    // 1 real candidate + a wider, but still capped, gap-filler batch (at
    // most 60 per color) — not all 3001 relics.
    expect(workerInput.relics.length).toBeLessThanOrEqual(61);
    expect(workerInput.relics.length).toBeGreaterThan(11);
  });

  it("a must-have on a lower tier is satisfied by a relic carrying only the higher tier", () => {
    // Regression test: a must-have of "物理攻撃力上昇+3" (physicalAttackUpPlus3)
    // must also be satisfied by a relic carrying only "+4" of the same
    // stackable group (physicalAttackUpPlus4) — the higher tier is strictly
    // better, so it must count as candidate-eligible AND toward the final
    // search result, the same way the Relic Browser's combo search already
    // treats tiers via getStackableHigherLevelEffects/relicHasEffect.
    const plus3 = getEffectByKey(EffectKey.physicalAttackUpPlus3);
    const plus4 = getEffectByKey(EffectKey.physicalAttackUpPlus4);
    const filler = getEffectByKey(EffectKey.strengthPlus1);
    assert(plus3 !== undefined);
    assert(plus4 !== undefined);
    assert(filler !== undefined);

    const RED_ITEM_ID = 102;
    // Neither tier carries a damage multiplier in this test's array, so the
    // relic can only become a candidate via the must-have tier match, not
    // via the scoring-relic path.
    const higherTierRelic = makeRelic(RED_ITEM_ID, plus4);
    const fillerRelics = Array.from({ length: 10 }, () =>
      makeRelic(RED_ITEM_ID, filler)
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

    const workerInput = buildDamageWorkerInput(
      Nightfarer.Wylder,
      [higherTierRelic, ...fillerRelics],
      [],
      [vessel],
      multiplierArray,
      [],
      [{ effectKey: EffectKey.physicalAttackUpPlus3, minStacks: 1, maxStacks: 6, matchMode: "higherOrEqual" }]
    );

    // Candidate widening: the +4-only relic must not be filtered out before
    // the WASM search ever sees it (it's counted as "relevant", not just a
    // capped gap-filler).
    expect(
      workerInput.relics.some((r) =>
        r.effects.some(([e]) => e.key === EffectKey.physicalAttackUpPlus4)
      )
    ).toBe(true);

    const wasmInput = buildWasmInput(workerInput);
    const output = search_combinations(wasmInput) as {
      combinations: unknown[];
      total_combinations_checked: number;
    };

    // Final range check: a full combination built from six copies of the
    // +4-only relic must be accepted as satisfying "at least 1 of +3".
    expect(output.combinations.length).toBeGreaterThan(0);
  });

  it("pins the TS->WASM match_mode wire encoding: exact rejects a higher tier, higherOrEqual accepts it", () => {
    // Regression/pin test: MATCH_MODE_WIRE_VALUE in comboSearchWorker.ts
    // ({exact:0, higherOrEqual:1, lowerOrEqual:2}) must numerically agree
    // with MATCH_MODE_EXACT/HIGHER_OR_EQUAL/LOWER_OR_EQUAL (0/1/2) in
    // wasm/combo_search/src/lib.rs. Nothing else exercises that specific
    // numeric agreement end-to-end through the real compiled wasm binary —
    // if someone swapped two of the numbers on either side, every existing
    // must-have test would stay green (they each only exercise one mode at
    // a time against internally-consistent constants) while every real
    // search silently returned wrong combinations. This test builds a pool
    // whose only must-have satisfier is a same-group HIGHER tier than the
    // required key and, crucially, gives that tier a real damage multiplier
    // so it reaches the WASM candidate pool regardless of matchMode — the
    // acceptance/rejection is then decided purely by the WASM-side decode
    // of the wire-encoded match_mode, not by TS-side candidate filtering.
    const plus3 = getEffectByKey(EffectKey.physicalAttackUpPlus3);
    const plus4 = getEffectByKey(EffectKey.physicalAttackUpPlus4);
    assert(plus3 !== undefined);
    assert(plus4 !== undefined);

    const RED_ITEM_ID = 102;
    const higherTierRelics = Array.from({ length: 3 }, () =>
      makeRelic(RED_ITEM_ID, plus4)
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
    // Real multiplier on the higher tier so it's always a scoring candidate,
    // independent of the must-have's matchMode-driven candidate widening.
    multiplierArray[EffectKey.physicalAttackUpPlus4] = 1.05;

    const buildInput = (matchMode: "exact" | "higherOrEqual") =>
      buildDamageWorkerInput(
        Nightfarer.Wylder,
        higherTierRelics,
        [],
        [vessel],
        multiplierArray,
        [],
        [
          {
            effectKey: EffectKey.physicalAttackUpPlus3,
            minStacks: 1,
            maxStacks: 6,
            matchMode,
          },
        ]
      );

    const exactOutput = search_combinations(
      buildWasmInput(buildInput("exact"))
    ) as { combinations: unknown[] };
    expect(exactOutput.combinations.length).toBe(0);

    const higherOrEqualOutput = search_combinations(
      buildWasmInput(buildInput("higherOrEqual"))
    ) as { combinations: unknown[] };
    expect(higherOrEqualOutput.combinations.length).toBeGreaterThan(0);
  });

  it("a higher-tier must-have match survives WASM top-K pruning against many exact-key fillers", { timeout: 30000 }, () => {
    // Regression test for the compiled artifact: the WASM search's per-color
    // top-K pruning (search_group_triples) ranks triples partly by how many
    // distinct must-have keys they cover, to protect a must-have relic with
    // no damage multiplier from being evicted by higher-scoring fillers
    // before the final range check runs. That coverage check used to match
    // by exact effect key only, so a triple satisfying the requirement
    // solely via a same-group higher tier (physicalAttackUpPlus4 satisfying
    // a must-have on physicalAttackUpPlus3) would score 0 coverage — tying
    // fillers that don't satisfy the requirement at all, but outscore it on
    // real damage points, could evict the only qualifying relic before the
    // final range check ever runs. This exercises that scenario against the
    // real compiled combo_search.wasm, not just the internal Rust function.
    const plus3 = getEffectByKey(EffectKey.physicalAttackUpPlus3);
    const plus4 = getEffectByKey(EffectKey.physicalAttackUpPlus4);
    const meleeEffect = getEffectByKey(EffectKey.improvedMeleeAttackPower);
    assert(plus3 !== undefined);
    assert(plus4 !== undefined);
    assert(meleeEffect !== undefined);

    const RED_ITEM_ID = 102;
    // Fillers carry an unrelated effect with a real damage multiplier —
    // they don't satisfy the plus3 must-have at all (exact or tier), but
    // outscore the tiered relic on points, so only the coverage-priority
    // bonus can save the tiered relic's triple from eviction.
    const fillerRelics = Array.from({ length: 260 }, () =>
      makeRelic(RED_ITEM_ID, meleeEffect)
    );
    const higherTierRelic = makeRelic(RED_ITEM_ID, plus4);

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
      [higherTierRelic, ...fillerRelics],
      [],
      [vessel],
      multiplierArray,
      [],
      [{ effectKey: EffectKey.physicalAttackUpPlus3, minStacks: 1, maxStacks: 6, matchMode: "higherOrEqual" }]
    );

    // All 261 relics are "relevant" (fillers via the real multiplier, the
    // tiered relic via the must-have tier match), so none are subject to
    // the capped gap-filler path — the full pool reaches WASM, which is
    // what actually exercises top-K pruning.
    expect(workerInput.relics.length).toBe(261);

    const wasmInput = buildWasmInput(workerInput);
    const output = search_combinations(wasmInput) as {
      combinations: unknown[];
    };

    expect(output.combinations.length).toBeGreaterThan(0);
  });

  it("filterRelicsForDamage only widens candidacy per each must-have's own matchMode", () => {
    // Note: filterRelicsForDamage's gap-filler (untouched by this change)
    // unconditionally tops up each color group with whatever's left over, up
    // to RESTRICTED_GAP_FILLER_CAP (10) when restrictToScoringRelics=true.
    // With only the three tier relics in the pool, the one tier excluded by
    // isRelevantEffect would still get swept back in as the sole "leftover"
    // gap-filler candidate, masking the very widening behavior under test.
    // To isolate isRelevantEffect's matchMode handling from that unrelated
    // padding, we saturate the cap first with 10 same-color decoy relics
    // (irrelevant effect, no multiplier) placed ahead of the tier relics in
    // input order — gap-filler candidates preserve input order for ties, so
    // the decoys occupy the cap and the non-relevant tier relic(s) are
    // pushed past slice(0, 10) and excluded, leaving only the primary
    // (isRelevantEffect-driven) matches plus the predictable decoy set.
    const plus3 = getEffectByKey(EffectKey.physicalAttackUpPlus3);
    const plus2 = getEffectByKey(EffectKey.physicalAttackUpPlus2);
    const plus4 = getEffectByKey(EffectKey.physicalAttackUpPlus4);
    const fillerEffect = getEffectByKey(EffectKey.strengthPlus1);
    assert(plus3 !== undefined);
    assert(plus2 !== undefined);
    assert(plus4 !== undefined);
    assert(fillerEffect !== undefined);

    const RED_ITEM_ID = 102;
    const higherTierRelic = makeRelic(RED_ITEM_ID, plus4);
    const lowerTierRelic = makeRelic(RED_ITEM_ID, plus2);
    const exactTierRelic = makeRelic(RED_ITEM_ID, plus3);
    const decoyFillers = Array.from({ length: 10 }, () =>
      makeRelic(RED_ITEM_ID, fillerEffect)
    );
    const decoyIds = decoyFillers.map((r) => r.id);

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

    const higherOrEqualInput = buildDamageWorkerInput(
      Nightfarer.Wylder,
      [...decoyFillers, higherTierRelic, lowerTierRelic, exactTierRelic],
      [],
      [vessel],
      multiplierArray,
      [],
      [{ effectKey: EffectKey.physicalAttackUpPlus3, minStacks: 1, maxStacks: 6, matchMode: "higherOrEqual" }]
    );
    const higherOrEqualNames = higherOrEqualInput.relics.map((r) => r.id).sort();
    expect(higherOrEqualNames).toEqual(
      [higherTierRelic.id, exactTierRelic.id, ...decoyIds].sort()
    );

    const lowerOrEqualInput = buildDamageWorkerInput(
      Nightfarer.Wylder,
      [...decoyFillers, higherTierRelic, lowerTierRelic, exactTierRelic],
      [],
      [vessel],
      multiplierArray,
      [],
      [{ effectKey: EffectKey.physicalAttackUpPlus3, minStacks: 1, maxStacks: 6, matchMode: "lowerOrEqual" }]
    );
    const lowerOrEqualNames = lowerOrEqualInput.relics.map((r) => r.id).sort();
    expect(lowerOrEqualNames).toEqual(
      [lowerTierRelic.id, exactTierRelic.id, ...decoyIds].sort()
    );

    const exactInput = buildDamageWorkerInput(
      Nightfarer.Wylder,
      [...decoyFillers, higherTierRelic, lowerTierRelic, exactTierRelic],
      [],
      [vessel],
      multiplierArray,
      [],
      [{ effectKey: EffectKey.physicalAttackUpPlus3, minStacks: 1, maxStacks: 6, matchMode: "exact" }]
    );
    const exactNames = exactInput.relics.map((r) => r.id).sort();
    expect(exactNames).toEqual([exactTierRelic.id, ...decoyIds].sort());
  });

  it(
    "finds a valid combination when two exact-count must-haves must be split across the normal and deep groups",
    { timeout: 30000 },
    () => {
      // Regression test for a real bug reported against the Damage
      // Optimizer: requiring exactly 1 of effect A AND exactly 1 of effect
      // B (both matchMode "exact", neither carrying a damage multiplier)
      // returned zero results even though a satisfying 6-relic combination
      // existed. Root cause: search_group_triples' top-K retention ranked
      // triples by (covered_count, points), which is correct for
      // atLeast-only must-haves but backfires for exact/atMost ones - a
      // group sometimes needs to contribute ZERO occurrences of a required
      // key (because the other group already supplies it), yet a
      // coverage-first ranking always ranks any covering triple above a
      // zero-covering one, regardless of points. With enough triples tied
      // on points but covering the key, the zero-coverage triples got
      // squeezed out of the group's pool entirely, so no valid pairing
      // ever reached the final range check.
      //
      // Setup: the deep group's only valid contribution is a single relic
      // carrying BOTH required effects (A and B) at once - the normal
      // group must therefore contribute ZERO of either. Every normal-color
      // candidate (decoys and "noise" relics alike) carries the same real
      // damage multiplier, so all normal triples tie on points regardless
      // of whether they include a noise relic - isolating the
      // coverage-vs-zero-coverage retention bug from any point-based
      // advantage.
      const meleeEffect = getEffectByKey(EffectKey.improvedMeleeAttackPower);
      const effectA = getEffectByKey(EffectKey.strengthPlus1);
      const effectB = getEffectByKey(EffectKey.dexterityPlus1);
      assert(meleeEffect !== undefined);
      assert(effectA !== undefined);
      assert(effectB !== undefined);

      const RED_ITEM_ID = 102;
      const BLUE_ITEM_ID = 10001;

      // Decoys placed first (lower relic indices) so they're the first
      // candidates search_group_triples' enumeration tries for the normal
      // (red) group - they must survive the top-K cut on points alone,
      // with zero coverage of either required key.
      const normalDecoys = Array.from({ length: 8 }, () =>
        makeMultiEffectRelic(RED_ITEM_ID, [meleeEffect])
      );
      // Noise: same real points as a decoy (one melee-effect occurrence),
      // but also carries required key A - enough of them to fill an
      // entire top-K pool by themselves under a coverage-first ranking.
      const normalNoise = Array.from({ length: 300 }, () =>
        makeMultiEffectRelic(RED_ITEM_ID, [meleeEffect, effectA])
      );

      const deepDecoys = Array.from({ length: 8 }, () =>
        makeMultiEffectRelic(BLUE_ITEM_ID, [meleeEffect])
      );
      const cleanRelic = makeMultiEffectRelic(BLUE_ITEM_ID, [
        meleeEffect,
        effectA,
        effectB,
      ]);

      const vessel: Vessel = {
        name: "Test Vessel",
        slots: [
          RelicSlotColor.Red,
          RelicSlotColor.Red,
          RelicSlotColor.Red,
          RelicSlotColor.Blue,
          RelicSlotColor.Blue,
          RelicSlotColor.Blue,
        ],
      };

      const multiplierArray = new Float32Array(EFFECT_KEY_ARRAY_LENGTH).fill(1);
      multiplierArray[EffectKey.improvedMeleeAttackPower] = 1.05;

      const effectRanges = [
        {
          effectKey: EffectKey.strengthPlus1,
          minStacks: 1,
          maxStacks: 1,
          matchMode: "exact" as const,
        },
        {
          effectKey: EffectKey.dexterityPlus1,
          minStacks: 1,
          maxStacks: 1,
          matchMode: "exact" as const,
        },
      ];

      const workerInput = buildDamageWorkerInput(
        Nightfarer.Wylder,
        [...normalDecoys, ...normalNoise],
        [...deepDecoys, cleanRelic],
        [vessel],
        multiplierArray,
        [],
        effectRanges
      );
      const wasmInput = buildWasmInput(workerInput);
      const output = search_combinations(wasmInput) as {
        combinations: Array<{ relic_indices: (number | null)[] }>;
      };

      expect(output.combinations.length).toBeGreaterThan(0);
    }
  );
});
