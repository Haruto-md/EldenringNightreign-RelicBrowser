import assert from "assert";
import { describe, expect, it } from "vitest";
import i18n from "../i18n";
import { getEffect, getEffectByKey, getEffectName } from "../utils/DataUtils";
import { EffectKey } from "./effectKeys";
import { effectsArray, isSameGroupAndEqualOrBetter, isSameGroupAndEqualOrWorse } from "./effects";

describe("effects", () => {
  it("should have all effects in effects array", () => {
    expect(effectsArray.length).toBe(EffectKey.LENGTH);
  });

  it("should have unique keys", () => {
    for (
      let effectKey: EffectKey = 0;
      effectKey < EffectKey.LENGTH;
      effectKey++
    ) {
      const effect = getEffectByKey(effectKey);
      assert(effect, `Effect with key ${effectKey} not found`);
      const effectsWithKey = effectsArray.filter((e) => e.key === effectKey);
      expect(
        effectsWithKey.length,
        `Effect "${getEffectName(effect)}" is duplicated`
      ).toBe(1);
    }
  });

  it("should have English translations for all effect keys", () => {
    const missingTranslations: number[] = [];

    for (
      let effectKey: EffectKey = 0;
      effectKey < EffectKey.LENGTH;
      effectKey++
    ) {
      const translationKey = `effects.${effectKey}`;
      const translation = i18n.t(translationKey, { lng: "en" });

      // If translation equals the key, it means no translation was found
      if (translation === translationKey) {
        missingTranslations.push(effectKey);
      }
    }

    expect(
      missingTranslations,
      `Missing English translations for effect keys (numeric): ${missingTranslations.join(", ")}`
    ).toHaveLength(0);
  });

  it("should have exactly 850 effects", () => {
    expect(
      EffectKey.LENGTH,
      "EffectKey.LENGTH has changed. This is just a reminder to update EFFECT_KEY_SPACE in WASM code"
    ).toBe(850);
  });
});

describe("isSameGroupAndEqualOrWorse", () => {
  const endurancePlus1 = getEffect(7000200);
  const endurancePlus2 = getEffect(7000201);
  const endurancePlus3 = getEffect(7000202);

  it("matches a lower-level effect in the same group", () => {
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, endurancePlus1)).toBe(true);
  });

  it("matches an equal-level effect in the same group", () => {
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, endurancePlus2)).toBe(true);
  });

  it("does not match a higher-level effect in the same group", () => {
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, endurancePlus3)).toBe(false);
  });

  it("does not match effects from different groups", () => {
    const arcanePlus1 = getEffect(7000700);
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, arcanePlus1)).toBe(false);
  });

  it("is the mirror image of isSameGroupAndEqualOrBetter", () => {
    expect(isSameGroupAndEqualOrBetter(endurancePlus2, endurancePlus3)).toBe(true);
    expect(isSameGroupAndEqualOrWorse(endurancePlus2, endurancePlus3)).toBe(false);
  });
});
