import { describe, expect, it } from "vitest";
import { effectCategories, effectCategoryOrder } from "./effectCategories";
import { EffectKey } from "./effectKeys";

describe("effectCategories", () => {
  it("has a category for every EffectKey", () => {
    for (let key: EffectKey = 0; key < EffectKey.LENGTH; key++) {
      expect(effectCategories[key], `EffectKey ${key} has no category`).toBeDefined();
    }
  });

  it("only uses categories present in effectCategoryOrder", () => {
    const validCategories = new Set(effectCategoryOrder);
    for (let key: EffectKey = 0; key < EffectKey.LENGTH; key++) {
      expect(
        validCategories.has(effectCategories[key]),
        `EffectKey ${key} has unlisted category "${effectCategories[key]}"`
      ).toBe(true);
    }
  });

  it("includes an 'other' bucket for unmatched effects", () => {
    expect(effectCategoryOrder).toContain("その他");
  });
});
