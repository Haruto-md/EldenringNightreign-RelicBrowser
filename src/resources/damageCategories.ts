// Static taxonomy for the Damage Optimization tab's attack-profile selector.
// Japanese display labels for these ids are supplied by the UI layer, not here.

export interface PrimaryCategory {
  id: string;
  bucket: string;
  weaponOnly?: boolean;
  hasSchools?: "sorcery" | "incantation";
}

export interface SchoolOption {
  id: string;
  bucket: string;
}

export interface DamageElementOption {
  id: string;
  bucket: string;
}

export interface AttackMode {
  id: string;
  bucket: string;
}

const weaponSlugs = [
  "dagger",
  "straightSword",
  "greatsword",
  "colossalSword",
  "thrustingSword",
  "heavyThrustingSword",
  "curvedSword",
  "curvedGreatsword",
  "katana",
  "twinblade",
  "axe",
  "greataxe",
  "hammer",
  "flail",
  "greatHammer",
  "colossalWeapon",
  "spear",
  "greatSpear",
  "halberd",
  "reaper",
  "whip",
  "fist",
  "claw",
  "bow",
] as const;

const weaponCategories: PrimaryCategory[] = weaponSlugs.map((slug) => ({
  id: `weapon:${slug}`,
  bucket: `weapon:${slug}`,
  weaponOnly: true,
}));

export const primaryCategories: PrimaryCategory[] = [
  ...weaponCategories,
  { id: "thrownPot", bucket: "thrownPot" },
  { id: "thrownKnife", bucket: "thrownKnife" },
  { id: "glintstoneGravityItem", bucket: "glintstoneGravityItem" },
  { id: "perfumeBottle", bucket: "perfumeBottle" },
  { id: "sorcery", bucket: "sorceryGeneric", hasSchools: "sorcery" },
  { id: "incantation", bucket: "incantationGeneric", hasSchools: "incantation" },
  { id: "roarAndBreath", bucket: "roarAndBreath" },
];

export const sorcerySchools: SchoolOption[] = [
  "glintblade",
  "stonedigger",
  "carianSword",
  "invisibility",
  "crystalian",
  "gravity",
  "thorn",
].map((id) => ({ id, bucket: `sorcerySchool:${id}` }));

export const incantationSchools: SchoolOption[] = [
  "fundamentalist",
  "dragonCult",
  "giantsFlame",
  "godslayer",
  "bestial",
  "frenziedFlame",
  "dragonCommunion",
].map((id) => ({ id, bucket: `incantationSchool:${id}` }));

export const damageElements: DamageElementOption[] = [
  "physical",
  "magic",
  "fire",
  "lightning",
  "holy",
].map((id) => ({ id, bucket: `element:${id}` }));

export const attackModes: AttackMode[] = [
  { id: "weaponSkill", bucket: "weaponSkill" },
  { id: "normalAttackFirstHit", bucket: "normalAttackFirstHit" },
  { id: "criticalHit", bucket: "criticalHit" },
  { id: "guardCounter", bucket: "guardCounter" },
];
