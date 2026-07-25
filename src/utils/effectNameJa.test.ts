import { describe, expect, it } from "vitest";
import { EffectKey } from "../resources/effectKeys";
import { effectNamesJa } from "../resources/effectNamesJa";
import { effectNameJa } from "./effectNameJa";

describe("effectNameJa", () => {
  it("returns the Japanese name when present in the map", () => {
    const key = EffectKey.revenantTriggerGhostflameExplosionDuringUltimateArtActivation;
    expect(effectNamesJa[key]).toBeDefined(); // regeneration must have covered it
    expect(effectNameJa(key)).toBe(effectNamesJa[key]);
  });

  it("never returns undefined for any EffectKey (English fallback)", () => {
    for (let k = 0; k < EffectKey.LENGTH; k++) {
      const name = effectNameJa(k as EffectKey);
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
