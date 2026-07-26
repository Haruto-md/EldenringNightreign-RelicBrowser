import {
  attackModes,
  damageElements,
  incantationSchools,
  primaryCategories,
  sorcerySchools,
} from "../resources/damageCategories";
import { damageMultipliers } from "../resources/damageMultipliers";
import { EffectKey } from "../resources/effectKeys";
import { Nightfarer } from "./Nightfarers";

export const EFFECT_KEY_ARRAY_LENGTH = EffectKey.LENGTH;

export interface DamageProfileSelection {
  nightfarer: Nightfarer;
  primaryCategoryId: string;
  schoolId?: string;
  element: "physical" | "magic" | "fire" | "lightning" | "holy";
  enabledAttackModes: ReadonlySet<string>;
}

function activeBuckets(sel: DamageProfileSelection): Set<string> {
  const active = new Set<string>();
  const cat = primaryCategories.find((c) => c.id === sel.primaryCategoryId);
  if (cat) {
    active.add(cat.bucket);
    if (cat.id.startsWith("weapon:")) {
      active.add("melee");
      for (const m of attackModes) {
        if (sel.enabledAttackModes.has(m.id)) {active.add(m.bucket);}
      }
      // criticalHit toggle also activates the +1 variant bucket
      if (sel.enabledAttackModes.has("criticalHit")) {active.add("criticalHitPlus1");}
    }
    if (cat.hasSchools === "sorcery") {
      const s = sorcerySchools.find((x) => x.id === sel.schoolId);
      if (s) {active.add(s.bucket);}
    }
    if (cat.hasSchools === "incantation") {
      const s = incantationSchools.find((x) => x.id === sel.schoolId);
      if (s) {active.add(s.bucket);}
    }
  }
  const el = damageElements.find((e) => e.id === sel.element);
  if (el) {
    active.add(el.bucket);
    if (sel.element !== "physical") {active.add("affinityAttackUp");}
  }
  return active;
}

// The only conditionalGroup that contributes to the ranking multiplier without
// the user declaring a matching condition. A character's own exclusive effect is
// intrinsic to playing that Nightfarer, so it counts for that character.
// Every OTHER conditionalGroup (threeOrMoreOfWeaponType, againstStatusAffected-
// Enemies, onGreaseItemUse, onNearbyStatusProc, onTakingDamage, onWeaponSwitch,
// onAffinityApplied) is situational: it must NOT inflate the score just because a
// relic happens to carry it, or a magic build gets ranked by unrelated bleed /
// weapon-type-3 / status conditionals. Those are opt-in via the must-have filter.
const ALWAYS_ON_CONDITIONAL_GROUP = "characterExclusive";

export function buildDamageMultiplierArray(sel: DamageProfileSelection): Float32Array {
  const arr = new Float32Array(EFFECT_KEY_ARRAY_LENGTH).fill(1);
  const buckets = activeBuckets(sel);
  for (const keyStr of Object.keys(damageMultipliers)) {
    const key = Number(keyStr) as EffectKey;
    const entry = damageMultipliers[key];
    if (!entry) {continue;}
    if (entry.nightfarer !== undefined && entry.nightfarer !== sel.nightfarer) {continue;}
    const active =
      entry.conditionalGroup === ALWAYS_ON_CONDITIONAL_GROUP ||
      (entry.bucket !== undefined && buckets.has(entry.bucket));
    if (active && key < EFFECT_KEY_ARRAY_LENGTH) {arr[key] = entry.multiplier;}
  }
  return arr;
}
