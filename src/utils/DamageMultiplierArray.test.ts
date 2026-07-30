import { describe, expect, it } from "vitest";
import { EffectKey } from "../resources/effectKeys";
import { damageMultipliers } from "../resources/damageMultipliers";
import {
  buildDamageMultiplierArray,
  EFFECT_KEY_ARRAY_LENGTH,
  type DamageProfileSelection,
} from "./DamageMultiplierArray";
import { Nightfarer } from "./Nightfarers";

const base: DamageProfileSelection = {
  nightfarer: Nightfarer.Wylder,
  primaryCategoryId: "weapon:greatsword",
  element: "physical",
  enabledAttackModes: new Set(),
};

describe("buildDamageMultiplierArray", () => {
  it("has the expected length, default 1.0", () => {
    const a = buildDamageMultiplierArray(base);
    expect(a.length).toBe(EFFECT_KEY_ARRAY_LENGTH);
    expect(a[EffectKey.vigorPlus1]).toBe(1); // irrelevant effect stays 1.0
  });

  it("activates melee, weapon-specific and element multipliers for a physical greatsword build", () => {
    const a = buildDamageMultiplierArray(base);
    expect(a[EffectKey.improvedMeleeAttackPower]).toBeCloseTo(
      damageMultipliers[EffectKey.improvedMeleeAttackPower]!.multiplier, 5);
    expect(a[EffectKey.improvedGreatswordAttackPower]).toBeCloseTo(
      damageMultipliers[EffectKey.improvedGreatswordAttackPower]!.multiplier, 5);
    expect(a[EffectKey.physicalAttackUp]).toBeCloseTo(
      damageMultipliers[EffectKey.physicalAttackUp]!.multiplier, 5);
  });

  it("does not activate a different weapon's multiplier", () => {
    const a = buildDamageMultiplierArray(base);
    expect(a[EffectKey.improvedDaggerAttackPower]).toBe(1);
  });

  it("activates affinity for non-physical elements", () => {
    const a = buildDamageMultiplierArray({ ...base, element: "fire" });
    expect(a[EffectKey.improvedAffinityAttackPower]).toBeGreaterThan(1);
  });

  it("activates an attack-mode bucket only when toggled", () => {
    const off = buildDamageMultiplierArray(base);
    expect(off[EffectKey.improvedSkillAttackPower]).toBe(1);
    const on = buildDamageMultiplierArray({ ...base, enabledAttackModes: new Set(["weaponSkill"]) });
    expect(on[EffectKey.improvedSkillAttackPower]).toBeGreaterThan(1);
  });

  it("activates a conditional/character damage effect for its Nightfarer without any toggle", () => {
    const a = buildDamageMultiplierArray({ ...base, nightfarer: Nightfarer.Recluse });
    expect(a[EffectKey.recluseCollectingAffinityResidueActivatesTerraMagica]).toBeGreaterThan(1);
  });

  it("keeps a mismatched Nightfarer-exclusive effect at 1.0", () => {
    const a = buildDamageMultiplierArray({ ...base, nightfarer: Nightfarer.Wylder });
    expect(a[EffectKey.recluseCollectingAffinityResidueActivatesTerraMagica]).toBe(1);
  });

  it("does NOT activate situational conditionals (weapon-type-3, status-enemy) — they must not inflate ranking", () => {
    // A Recluse magic build must not be scored by unrelated weapon-type-3 or
    // status-enemy conditionals; those are opt-in via the must-have filter only.
    const a = buildDamageMultiplierArray({
      ...base,
      nightfarer: Nightfarer.Recluse,
      primaryCategoryId: "sorcery",
      element: "magic",
    });
    expect(a[EffectKey.improvedAttackPowerWith3PlusDaggersEquipped]).toBe(1);
    expect(a[EffectKey.improvedAttackPowerWith3PlusStraightSwordsEquipped]).toBe(1);
    expect(a[EffectKey.attackPowerUpWhenFacingPoisonAfflictedEnemy]).toBe(1);
  });

  it("activates sorcery/magic profile buckets for a magic sorcery build", () => {
    const a = buildDamageMultiplierArray({
      ...base,
      nightfarer: Nightfarer.Recluse,
      primaryCategoryId: "sorcery",
      element: "magic",
    });
    expect(a[EffectKey.improvedAffinityAttackPower]).toBeGreaterThan(1);
  });

  it("with no element selected (無属性), does not count ANY element-restricted bonus — not even physical's", () => {
    // 無属性 means "don't factor in element-specific attack-power bonuses at
    // all" — it is NOT "assume every element's bonus applies simultaneously".
    // A relic granting +physical attack power isn't relevant to a search that
    // isn't restricting by element, any more than a magic- or fire-only bonus
    // would be; none of them should inflate the multiplier or make a relic
    // count as a search candidate on that basis alone.
    const a = buildDamageMultiplierArray({ ...base, element: undefined });
    expect(a[EffectKey.physicalAttackUp]).toBe(1);
    expect(a[EffectKey.improvedAffinityAttackPower]).toBe(1);
  });
});
