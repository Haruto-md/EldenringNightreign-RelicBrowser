import { describe, expect, it } from "vitest";
import {
  mustHaveToEffectRange,
  sanitizeMustHaves,
  type MustHaveEntry,
} from "./DamageOptimizer";

describe("sanitizeMustHaves", () => {
  it("defaults comparison to atLeast for legacy entries with no comparison field", () => {
    const legacy = [{ effectKey: 10, minStacks: 3 }];
    expect(sanitizeMustHaves(legacy)).toEqual([
      { effectKey: 10, comparison: "atLeast", stacks: 3 },
    ]);
  });

  it("round-trips a new-shape atMost entry", () => {
    const modern = [{ effectKey: 20, comparison: "atMost", stacks: 2 }];
    expect(sanitizeMustHaves(modern)).toEqual([
      { effectKey: 20, comparison: "atMost", stacks: 2 },
    ]);
  });

  it("falls back to atLeast for an invalid comparison value", () => {
    const bad = [{ effectKey: 30, comparison: "sideways", stacks: 1 }];
    expect(sanitizeMustHaves(bad)).toEqual([
      { effectKey: 30, comparison: "atLeast", stacks: 1 },
    ]);
  });

  it("clamps stacks to the 1-6 range read from either stacks or the legacy minStacks key", () => {
    expect(sanitizeMustHaves([{ effectKey: 1, stacks: 99 }])).toEqual([
      { effectKey: 1, comparison: "atLeast", stacks: 6 },
    ]);
    expect(sanitizeMustHaves([{ effectKey: 2, minStacks: 0 }])).toEqual([
      { effectKey: 2, comparison: "atLeast", stacks: 1 },
    ]);
  });
});

describe("mustHaveToEffectRange", () => {
  it("converts an atLeast entry to a minStacks..6 range", () => {
    const entry: MustHaveEntry = {
      effectKey: 10,
      comparison: "atLeast",
      stacks: 3,
    };
    expect(mustHaveToEffectRange(entry)).toEqual({
      effectKey: 10,
      minStacks: 3,
      maxStacks: 6,
    });
  });

  it("converts an atMost entry to a 0..stacks range", () => {
    const entry: MustHaveEntry = {
      effectKey: 10,
      comparison: "atMost",
      stacks: 2,
    };
    expect(mustHaveToEffectRange(entry)).toEqual({
      effectKey: 10,
      minStacks: 0,
      maxStacks: 2,
    });
  });
});
