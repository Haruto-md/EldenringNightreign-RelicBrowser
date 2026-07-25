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

export const EFFECT_KEY_ARRAY_LENGTH = 852;

export interface DamageProfileSelection {
  nightfarer: Nightfarer;
  primaryCategoryId: string;
  schoolId?: string;
  element: "physical" | "magic" | "fire" | "lightning" | "holy";
  enabledAttackModes: ReadonlySet<string>;
  enabledSituational: ReadonlySet<EffectKey>;
}

function activeBuckets(sel: DamageProfileSelection): Set<string> {
  const active = new Set<string>();
  const cat = primaryCategories.find((c) => c.id === sel.primaryCategoryId);
  if (cat) {
    active.add(cat.bucket);
    if (cat.id.startsWith("weapon:")) {
      active.add("melee");
      for (const m of attackModes) {
        if (sel.enabledAttackModes.has(m.id)) active.add(m.bucket);
      }
      // criticalHit toggle also activates the +1 variant bucket
      if (sel.enabledAttackModes.has("criticalHit")) active.add("criticalHitPlus1");
    }
    if (cat.hasSchools === "sorcery") {
      const s = sorcerySchools.find((x) => x.id === sel.schoolId);
      if (s) active.add(s.bucket);
    }
    if (cat.hasSchools === "incantation") {
      const s = incantationSchools.find((x) => x.id === sel.schoolId);
      if (s) active.add(s.bucket);
    }
  }
  const el = damageElements.find((e) => e.id === sel.element);
  if (el) {
    active.add(el.bucket);
    if (sel.element !== "physical") active.add("affinityAttackUp");
  }
  return active;
}

export function buildDamageMultiplierArray(sel: DamageProfileSelection): Float32Array {
  const arr = new Float32Array(EFFECT_KEY_ARRAY_LENGTH).fill(1);
  const buckets = activeBuckets(sel);
  for (const keyStr of Object.keys(damageMultipliers)) {
    const key = Number(keyStr) as EffectKey;
    const entry = damageMultipliers[key];
    if (!entry) continue;
    if (entry.nightfarer !== undefined && entry.nightfarer !== sel.nightfarer) continue;
    let active = false;
    if (entry.conditionalGroup !== undefined) {
      active = sel.enabledSituational.has(key);
    } else if (entry.bucket !== undefined) {
      active = buckets.has(entry.bucket);
    }
    if (active && key < EFFECT_KEY_ARRAY_LENGTH) arr[key] = entry.multiplier;
  }
  return arr;
}

export function situationalEffectsForNightfarer(
  nf: Nightfarer
): { key: EffectKey; groupId: string }[] {
  const out: { key: EffectKey; groupId: string }[] = [];
  for (const keyStr of Object.keys(damageMultipliers)) {
    const key = Number(keyStr) as EffectKey;
    const entry = damageMultipliers[key];
    if (!entry || entry.conditionalGroup === undefined) continue;
    if (entry.nightfarer !== undefined && entry.nightfarer !== nf) continue;
    out.push({ key, groupId: entry.conditionalGroup });
  }
  return out;
}
