import { describe, expect, it } from "vitest";
import {
  mustHaveToEffectRange,
  sanitizeMustHaves,
  type MustHaveEntry,
} from "./DamageOptimizer.mustHave";

describe("sanitizeMustHaves", () => {
  it("passes through a valid new-shape entry unchanged", () => {
    const entry = [
      { effectKey: 10, minStacks: 2, maxStacks: 4, matchMode: "exact" },
    ];
    expect(sanitizeMustHaves(entry)).toEqual([
      { effectKey: 10, minStacks: 2, maxStacks: 4, matchMode: "exact" },
    ]);
  });

  it("clamps minStacks and maxStacks independently to 0-6", () => {
    const entry = [
      {
        effectKey: 1,
        minStacks: -5,
        maxStacks: 99,
        matchMode: "higherOrEqual",
      },
    ];
    expect(sanitizeMustHaves(entry)).toEqual([
      { effectKey: 1, minStacks: 0, maxStacks: 6, matchMode: "higherOrEqual" },
    ]);
  });

  it("raises maxStacks to minStacks when minStacks > maxStacks after clamping", () => {
    const entry = [
      { effectKey: 2, minStacks: 5, maxStacks: 1, matchMode: "exact" },
    ];
    expect(sanitizeMustHaves(entry)).toEqual([
      { effectKey: 2, minStacks: 5, maxStacks: 5, matchMode: "exact" },
    ]);
  });

  it("falls back to higherOrEqual for an invalid or missing matchMode", () => {
    const entries = [
      { effectKey: 3, minStacks: 1, maxStacks: 6, matchMode: "sideways" },
      { effectKey: 4, minStacks: 1, maxStacks: 6 },
    ];
    expect(sanitizeMustHaves(entries)).toEqual([
      { effectKey: 3, minStacks: 1, maxStacks: 6, matchMode: "higherOrEqual" },
      { effectKey: 4, minStacks: 1, maxStacks: 6, matchMode: "higherOrEqual" },
    ]);
  });

  it("converts a legacy atLeast entry to a minStacks..6 range", () => {
    const legacy = [{ effectKey: 10, comparison: "atLeast", stacks: 3 }];
    expect(sanitizeMustHaves(legacy)).toEqual([
      { effectKey: 10, minStacks: 3, maxStacks: 6, matchMode: "higherOrEqual" },
    ]);
  });

  it("converts a legacy atMost entry to a 0..stacks range", () => {
    const legacy = [{ effectKey: 20, comparison: "atMost", stacks: 2 }];
    expect(sanitizeMustHaves(legacy)).toEqual([
      { effectKey: 20, minStacks: 0, maxStacks: 2, matchMode: "higherOrEqual" },
    ]);
  });

  it("converts the oldest legacy shape (bare minStacks, no comparison) as atLeast", () => {
    const legacy = [{ effectKey: 30, minStacks: 4 }];
    expect(sanitizeMustHaves(legacy)).toEqual([
      { effectKey: 30, minStacks: 4, maxStacks: 6, matchMode: "higherOrEqual" },
    ]);
  });

  it("clamps a legacy stacks value to 1-6 before converting (pre-0 era had no 0)", () => {
    const legacy = [{ effectKey: 40, comparison: "atLeast", stacks: 99 }];
    expect(sanitizeMustHaves(legacy)).toEqual([
      { effectKey: 40, minStacks: 6, maxStacks: 6, matchMode: "higherOrEqual" },
    ]);
  });

  it("ignores non-array input and non-object entries", () => {
    expect(sanitizeMustHaves(null)).toEqual([]);
    expect(sanitizeMustHaves("nope")).toEqual([]);
    expect(sanitizeMustHaves([null, 5, "x"])).toEqual([]);
  });

  it("drops entries with a non-finite effectKey", () => {
    expect(sanitizeMustHaves([{ effectKey: "abc" }])).toEqual([]);
  });
});

describe("mustHaveToEffectRange", () => {
  it("carries minStacks, maxStacks, and matchMode straight through", () => {
    const entry: MustHaveEntry = {
      effectKey: 10,
      minStacks: 2,
      maxStacks: 4,
      matchMode: "lowerOrEqual",
    };
    expect(mustHaveToEffectRange(entry)).toEqual({
      effectKey: 10,
      minStacks: 2,
      maxStacks: 4,
      matchMode: "lowerOrEqual",
    });
  });
});
