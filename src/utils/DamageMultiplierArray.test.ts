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
  enabledSituational: new Set(),
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

  it("activates a situational effect only when its key is enabled", () => {
    const off = buildDamageMultiplierArray(base);
    expect(off[EffectKey.takingAttacksImprovesAttackPower]).toBe(1);
    const on = buildDamageMultiplierArray({
      ...base, enabledSituational: new Set([EffectKey.takingAttacksImprovesAttackPower]),
    });
    expect(on[EffectKey.takingAttacksImprovesAttackPower]).toBeGreaterThan(1);
  });

  it("keeps a mismatched Nightfarer-exclusive effect at 1.0 even if enabled", () => {
    const raiderEffect = EffectKey.raiderDamageTakenWhileUsingCharacterSkillImprovesAttack;
    // With Wylder (non-Raider) and the conditionalGroup enabled, should stay 1.0
    const wylderArray = buildDamageMultiplierArray({
      ...base, nightfarer: Nightfarer.Wylder, enabledSituational: new Set([raiderEffect]),
    });
    expect(wylderArray[raiderEffect]).toBe(1);
    // With Raider and the same conditionalGroup enabled, should activate to the real multiplier
    const raiderArray = buildDamageMultiplierArray({
      ...base, nightfarer: Nightfarer.Raider, enabledSituational: new Set([raiderEffect]),
    });
    expect(raiderArray[raiderEffect]).toBeCloseTo(
      damageMultipliers[raiderEffect]!.multiplier, 5);
  });
});
