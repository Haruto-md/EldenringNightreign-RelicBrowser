import { describe, expect, it } from "vitest";
import {
  attackModes,
  damageElements,
  incantationSchools,
  primaryCategories,
  sorcerySchools,
} from "./damageCategories";

describe("damageCategories", () => {
  it("has 24 weapon primaries plus 7 non-weapon primaries (31 total)", () => {
    expect(primaryCategories.length).toBe(31);
    const weaponCount = primaryCategories.filter((c) => c.id.startsWith("weapon:")).length;
    expect(weaponCount).toBe(24);
  });

  it("gives every weapon primary a weapon:<slug> bucket and marks it weaponOnly", () => {
    for (const c of primaryCategories.filter((c) => c.id.startsWith("weapon:"))) {
      expect(c.bucket).toBe(c.id);
      expect(c.weaponOnly).toBe(true);
    }
  });

  it("marks sorcery and incantation as hasSchools categories", () => {
    const sorcery = primaryCategories.find((c) => c.id === "sorcery");
    const incantation = primaryCategories.find((c) => c.id === "incantation");
    expect(sorcery?.hasSchools).toBe("sorcery");
    expect(sorcery?.bucket).toBe("sorceryGeneric");
    expect(incantation?.hasSchools).toBe("incantation");
    expect(incantation?.bucket).toBe("incantationGeneric");
  });

  it("has 7 sorcery schools and 7 incantation schools with prefixed buckets", () => {
    expect(sorcerySchools.length).toBe(7);
    expect(incantationSchools.length).toBe(7);
    for (const s of sorcerySchools) {expect(s.bucket).toBe(`sorcerySchool:${s.id}`);}
    for (const s of incantationSchools) {expect(s.bucket).toBe(`incantationSchool:${s.id}`);}
  });

  it("has 5 damage elements with element:<id> buckets", () => {
    expect(damageElements.length).toBe(5);
    for (const e of damageElements) {expect(e.bucket).toBe(`element:${e.id}`);}
    expect(damageElements.map((e) => e.id)).toEqual([
      "physical",
      "magic",
      "fire",
      "lightning",
      "holy",
    ]);
  });

  it("has the 4 attack modes", () => {
    expect(attackModes.map((m) => m.id)).toEqual([
      "weaponSkill",
      "normalAttackFirstHit",
      "criticalHit",
      "guardCounter",
    ]);
  });

  it("does not include labelKey fields (Japanese-fixed UI, no i18n)", () => {
    for (const c of primaryCategories) {expect((c as unknown as Record<string, unknown>).labelKey).toBeUndefined();}
    for (const s of sorcerySchools) {expect((s as unknown as Record<string, unknown>).labelKey).toBeUndefined();}
    for (const e of damageElements) {expect((e as unknown as Record<string, unknown>).labelKey).toBeUndefined();}
  });
});
