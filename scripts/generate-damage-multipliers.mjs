import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import {
  buildJpnToEngLookup,
  buildEngToJpnLookup,
  extractI18nEnglishEffectStrings,
  matchEffectKeyName,
} from "./damage-multiplier-matching.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Maps each RelicHub DAMAGE_MAP `target` string (for entries NOT covered by
// ALL_ATK_GROUPS) to a stable bucket id used by the app's calculation engine
// and taxonomy (src/resources/damageCategories.ts). There are exactly 60
// unique targets among the 92 "universal" (non-conditional, non-null-multiplier)
// DAMAGE_MAP entries; every one of them must appear here.
const BUCKET_MAP = {
  近接攻撃力上昇: "melee",
  戦技攻撃力上昇: "weaponSkill",
  通常攻撃の1段目強化: "normalAttackFirstHit",
  致命の一撃強化: "criticalHit",
  "致命の一撃強化+1": "criticalHitPlus1",
  咆哮とブレス強化: "roarAndBreath",
  輝剣の魔術を強化: "sorcerySchool:glintblade",
  石掘りの魔術を強化: "sorcerySchool:stonedigger",
  カーリアの剣の魔術を強化: "sorcerySchool:carianSword",
  不可視の魔術を強化: "sorcerySchool:invisibility",
  結晶人の魔術を強化: "sorcerySchool:crystalian",
  重力の魔術を強化: "sorcerySchool:gravity",
  茨の魔術を強化: "sorcerySchool:thorn",
  黄金律原理主義の祈祷を強化: "incantationSchool:fundamentalist",
  王都古竜信仰の祈祷を強化: "incantationSchool:dragonCult",
  巨人の火の祈祷を強化: "incantationSchool:giantsFlame",
  神狩りの祈祷を強化: "incantationSchool:godslayer",
  獣の祈祷を強化: "incantationSchool:bestial",
  狂い火の祈祷を強化: "incantationSchool:frenziedFlame",
  竜餐の祈祷を強化: "incantationSchool:dragonCommunion",
  刺突カウンターを強化: "ironeyeThrustCounter",
  魔力攻撃力を強化: "recluseLandOfSorcery",
  妖刀の攻撃を強化: "executorKatanaBoost",
  短剣の攻撃力上昇: "weapon:dagger",
  直剣の攻撃力上昇: "weapon:straightSword",
  大剣の攻撃力上昇: "weapon:greatsword",
  特大剣の攻撃力上昇: "weapon:colossalSword",
  刺剣の攻撃力上昇: "weapon:thrustingSword",
  重刺剣の攻撃力上昇: "weapon:heavyThrustingSword",
  曲剣の攻撃力上昇: "weapon:curvedSword",
  大曲剣の攻撃力上昇: "weapon:curvedGreatsword",
  刀の攻撃力上昇: "weapon:katana",
  両刃剣の攻撃力上昇: "weapon:twinblade",
  斧の攻撃力上昇: "weapon:axe",
  大斧の攻撃力上昇: "weapon:greataxe",
  槌の攻撃力上昇: "weapon:hammer",
  フレイルの攻撃力上昇: "weapon:flail",
  大槌の攻撃力上昇: "weapon:greatHammer",
  特大武器の攻撃力上昇: "weapon:colossalWeapon",
  槍の攻撃力上昇: "weapon:spear",
  大槍の攻撃力上昇: "weapon:greatSpear",
  斧槍の攻撃力上昇: "weapon:halberd",
  鎌の攻撃力上昇: "weapon:reaper",
  鞭の攻撃力上昇: "weapon:whip",
  拳の攻撃力上昇: "weapon:fist",
  爪の攻撃力上昇: "weapon:claw",
  弓の攻撃力上昇: "weapon:bow",
  属性攻撃力上昇: "affinityAttackUp",
  物理攻撃力上昇: "element:physical",
  魔力攻撃力上昇: "element:magic",
  炎攻撃力上昇: "element:fire",
  雷攻撃力上昇: "element:lightning",
  聖攻撃力上昇: "element:holy",
  魔術強化: "sorceryGeneric",
  祈祷強化: "incantationGeneric",
  ガードカウンター強化: "guardCounter",
  投擲壺の攻撃力上昇: "thrownPot",
  投擲ナイフの攻撃力上昇: "thrownKnife",
  "輝石、重力石アイテムの攻撃力上昇": "glintstoneGravityItem",
  調香術強化: "perfumeBottle",
};

// Maps RelicHub's DAMAGE_MAP `character` field (Japanese) to the app's
// Nightfarer enum member name. "全部" (all characters) has no entry.
const CHARACTER_MAP = {
  追跡者: "Wylder",
  守護者: "Guardian",
  レディ: "Duchess",
  隠者: "Recluse",
  鉄の目: "Ironeye",
  無頼漢: "Raider",
  執行者: "Executor",
  復讐者: "Revenant",
  学者: "Scholar",
  葬儀屋: "Undertaker",
};

// Maps RelicHub's ALL_ATK_GROUPS `group` field (Japanese) to a stable
// conditionalGroup id, in GROUP_ORDER.
const GROUP_ID_MAP = {
  被ダメージ時: "onTakingDamage",
  武器持ち替え時: "onWeaponSwitch",
  属性付与時: "onAffinityApplied",
  脂アイテム使用時: "onGreaseItemUse",
  状態異常の敵への攻撃: "againstStatusAffectedEnemies",
  周囲の状態異常発生時: "onNearbyStatusProc",
  武器種3種以上装備: "threeOrMoreOfWeaponType",
  キャラクター固有: "characterExclusive",
  その他: "other",
};

// Filled in as needed when an exact English-string match fails (see console
// output when running this script). Key = RelicHub DAMAGE_MAP jpn name,
// value = the matching EffectKey member name from src/resources/effectKeys.ts.
const MANUAL_EFFECT_KEY_OVERRIDES = {
  "攻撃を受けると攻撃力上昇": "takingAttacksImprovesAttackPower",
  "結晶人の魔術を強化": "improvedCrystalianSorcery",
  "【鉄の目】アーツ発動後、刺突カウンター強化": "ironeyeBoostsThrustingCounterattacksAfterArt",
  "【無頼漢】スキル中に攻撃を受けると攻撃力と最大スタミナ上昇": "raiderDamageTakenWhileUsingCharacterSkillImprovesAttack",
  "【復讐者】ファミリーと共闘中の間、自身を強化": "revenantPowerUpWhileFightingAlongsideFamily",
  "【陰者】アーツ発動時、自身が出血状態になり、攻撃力上昇": "recluseSufferBloodLossAndIncreaseAttackPower",
  "【陰者】属性痕を集めた時、「魔術の地」が発動": "recluseCollectingAffinityResidueActivatesTerraMagica",
  "【執行者】スキル中の攻撃力上昇、攻撃時にカット率低下": "executorCharacterSkillBoostsAttackButDrainsHP",
  "【葬儀屋】アーツ発動時、攻撃力上昇": "undertakerActivatingUltimateArtIncreasesAttackPower",
  "【葬儀屋】連撃の最終攻撃命中時、攻撃力上昇": "undertakerAttackPowerIncreasedByLandingTheFinalBlowOfAChainAttack",
  "脂アイテム使用時、追加で物理攻撃力上昇": "attackPowerIncreasesAfterUsingGreaseItems",
  "Reduced Damage Negation After Evading": "moreDamageTakenAfterEvasion",
};

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf-8"));
}

function main() {
  const calcData = loadJson("RelicHub/data/calc_data.json");
  const skills = loadJson("RelicHub/data/skills.json");
  const deep = loadJson("RelicHub/data/deep.json");
  const demerit = loadJson("RelicHub/data/demerit.json");
  const i18nSource = readFileSync(join(ROOT, "src/i18n.ts"), "utf-8");

  const jpnToEng = buildJpnToEngLookup([
    ...Object.values(skills.skills),
    deep.skills.deep,
    demerit.demerit_skills,
  ]);
  const englishToEffectKeyName = extractI18nEnglishEffectStrings(i18nSource);

  const groupOfKey = new Map();
  for (const group of calcData.ALL_ATK_GROUPS) {
    for (const variant of group.variants) {
      groupOfKey.set(variant, GROUP_ID_MAP[group.group]);
    }
  }

  const unmatched = [];
  const missingBucket = [];
  const entries = [];

  for (const [jpnKey, data] of Object.entries(calcData.DAMAGE_MAP)) {
    if (data.multiplier === null) {
      continue; // "特殊処理" — excluded from scope entirely
    }

    const effectKeyName = matchEffectKeyName(
      jpnKey,
      jpnToEng,
      englishToEffectKeyName,
      MANUAL_EFFECT_KEY_OVERRIDES
    );
    if (!effectKeyName) {
      unmatched.push(jpnKey);
      continue;
    }

    const conditionalGroup = groupOfKey.get(jpnKey);
    let bucket;
    if (!conditionalGroup) {
      bucket = BUCKET_MAP[data.target];
      if (!bucket) {
        missingBucket.push(`${jpnKey} (target: ${data.target})`);
        continue;
      }
    }

    const nightfarerName =
      data.character !== "全部" ? CHARACTER_MAP[data.character] : undefined;

    entries.push({ effectKeyName, multiplier: data.multiplier, bucket, conditionalGroup, nightfarerName });
  }

  if (unmatched.length > 0) {
    console.error(
      `\nERROR: ${unmatched.length} DAMAGE_MAP entries could not be matched to an EffectKey:\n` +
        unmatched.map((k) => `  - ${k}`).join("\n") +
        "\n\nAdd entries to MANUAL_EFFECT_KEY_OVERRIDES in this script (find the correct EffectKey by searching src/resources/effectKeys.ts) and re-run.\n"
    );
    process.exit(1);
  }
  if (missingBucket.length > 0) {
    console.error(
      `\nERROR: ${missingBucket.length} universal entries have no BUCKET_MAP mapping:\n` +
        missingBucket.map((k) => `  - ${k}`).join("\n") +
        "\n"
    );
    process.exit(1);
  }

  const lines = entries.map(({ effectKeyName, multiplier, bucket, conditionalGroup, nightfarerName }) => {
    const parts = [`multiplier: ${multiplier}`];
    if (bucket) parts.push(`bucket: ${JSON.stringify(bucket)}`);
    if (conditionalGroup) parts.push(`conditionalGroup: ${JSON.stringify(conditionalGroup)}`);
    if (nightfarerName) parts.push(`nightfarer: Nightfarer.${nightfarerName}`);
    return `  [EffectKey.${effectKeyName}]: { ${parts.join(", ")} },`;
  });

  const output = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-damage-multipliers.mjs
import { EffectKey } from "./effectKeys";
import { Nightfarer } from "../utils/Nightfarers";

export interface DamageMultiplierEntry {
  multiplier: number;
  bucket?: string;
  conditionalGroup?: string;
  nightfarer?: Nightfarer;
}

export const damageMultipliers: Partial<Record<EffectKey, DamageMultiplierEntry>> = {
${lines.join("\n")}
};
`;

  writeFileSync(join(ROOT, "src/resources/damageMultipliers.ts"), output, "utf-8");
  console.log(`Wrote ${entries.length} entries to src/resources/damageMultipliers.ts`);

  // --- effectNamesJa.ts : EffectKey -> Japanese name ---
  const engToJpn = buildEngToJpnLookup([
    ...Object.values(skills.skills),
    deep.skills.deep,
    demerit.demerit_skills,
  ]);
  // Case-insensitive fallback: RelicHub's `eng` text and the app's i18n.ts
  // `en` text are supposed to describe the same effect but were transcribed
  // independently, so they frequently differ only in capitalization (e.g.
  // "Ghostflame Explosion" vs "ghostflame explosion"). An exact-match-only
  // lookup silently drops every entry like that.
  const engToJpnLower = new Map();
  for (const [eng, jpn] of engToJpn) {
    const lower = eng.toLowerCase();
    if (!engToJpnLower.has(lower)) engToJpnLower.set(lower, jpn);
  }
  const jaNameEntries = [];
  const effectKeyNamesAdded = new Set();

  // First pass: from i18n.ts, exact match then case-insensitive fallback
  for (const [eng, effectKeyName] of englishToEffectKeyName.entries()) {
    const jpn = engToJpn.get(eng) ?? engToJpnLower.get(eng.toLowerCase());
    if (jpn) {
      jaNameEntries.push(`  [EffectKey.${effectKeyName}]: ${JSON.stringify(jpn)},`);
      effectKeyNamesAdded.add(effectKeyName);
    }
  }

  // Second pass: from MANUAL_EFFECT_KEY_OVERRIDES (for entries not already
  // covered). Override keys are usually RelicHub `jpn` text (the case that
  // needed an override in the first place is that the `eng` text has no
  // usable match in i18n.ts at all) — only one override key is English. Try
  // the key as English first, then fall back to treating it as already being
  // the Japanese name (verified against jpnToEng so we don't emit garbage).
  for (const [overrideKey, effectKeyName] of Object.entries(MANUAL_EFFECT_KEY_OVERRIDES)) {
    if (effectKeyNamesAdded.has(effectKeyName)) continue;
    let jpn = engToJpn.get(overrideKey) ?? engToJpnLower.get(overrideKey.toLowerCase());
    if (!jpn && jpnToEng.has(overrideKey)) {
      jpn = overrideKey;
    }
    if (jpn) {
      jaNameEntries.push(`  [EffectKey.${effectKeyName}]: ${JSON.stringify(jpn)},`);
      effectKeyNamesAdded.add(effectKeyName);
    }
  }

  // Completeness check: dump every skills.json entry whose jpn name never
  // made it into effectNamesJa, as a reference list for adding further
  // MANUAL_EFFECT_KEY_OVERRIDES entries.
  const jpnCovered = new Set(jaNameEntries.map((line) => {
    const m = line.match(/: (".*"),$/);
    return m ? JSON.parse(m[1]) : undefined;
  }));
  const uncoveredSkills = Object.values(skills.skills)
    .flat()
    .filter((s) => s.jpn && s.eng && !jpnCovered.has(s.jpn));
  if (uncoveredSkills.length > 0) {
    console.warn(
      `\nWARNING: ${uncoveredSkills.length} skills.json entries have no effectNamesJa translation:\n` +
        uncoveredSkills.map((s) => `  - [${s.id}] ${s.jpn}  (${s.eng})`).join("\n") +
        "\n\nAdd entries to MANUAL_EFFECT_KEY_OVERRIDES (keyed by the jpn text above) and re-run if these are in scope.\n"
    );
  }
  const effectNamesJaOut = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-damage-multipliers.mjs
import { EffectKey } from "./effectKeys";

export const effectNamesJa: Partial<Record<EffectKey, string>> = {
${jaNameEntries.join("\n")}
};
`;
  writeFileSync(join(ROOT, "src/resources/effectNamesJa.ts"), effectNamesJaOut, "utf-8");
  console.log(`Wrote ${jaNameEntries.length} entries to src/resources/effectNamesJa.ts`);

  // Completeness dump: list every skills.json entry whose eng text produced no
  // EffectKey match (the uncovered worklist for the English fallback).
  const uncovered = [];
  for (const genre of Object.values(skills.skills)) {
    for (const s of genre) {
      if (!s.eng) continue;
      const matched =
        englishToEffectKeyName.get(s.eng) ||
        [...englishToEffectKeyName.keys()].find(
          (k) => k.toLowerCase() === s.eng.toLowerCase()
        );
      if (!matched) uncovered.push(`  id ${s.id}: ${s.eng}  (${s.jpn})`);
    }
  }
  if (uncovered.length > 0) {
    console.warn(
      `\n${uncovered.length} skills.json effect(s) have no EffectKey match ` +
        `(English fallback will be used in UI):\n${uncovered.join("\n")}\n`
    );
  }

  // --- demeritEffects.ts : the individual demerit types with EffectKey ---
  const demeritEntries = [];
  const unmatchedDemerits = [];
  for (const d of demerit.demerit_skills) {
    let effectKeyName = englishToEffectKeyName.get(d.eng);
    if (!effectKeyName) {
      // Try the override with English name first, then Japanese name
      effectKeyName = MANUAL_EFFECT_KEY_OVERRIDES[d.eng] || MANUAL_EFFECT_KEY_OVERRIDES[d.jpn];
    }
    if (!effectKeyName) { unmatchedDemerits.push(d.eng); continue; }
    demeritEntries.push(`  { key: EffectKey.${effectKeyName}, jaName: ${JSON.stringify(d.jpn)} },`);
  }
  if (unmatchedDemerits.length > 0) {
    console.error(`\nWARNING: ${unmatchedDemerits.length} demerit(s) had no EffectKey match:\n` +
      unmatchedDemerits.map((k) => `  - ${k}`).join("\n") +
      `\nAdd them to MANUAL_EFFECT_KEY_OVERRIDES (or a demerit-specific override) and re-run.\n`);
  }
  const demeritOut = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-damage-multipliers.mjs
import { EffectKey } from "./effectKeys";

export interface DemeritEffect { key: EffectKey; jaName: string; }

export const demeritEffects: DemeritEffect[] = [
${demeritEntries.join("\n")}
];
`;
  writeFileSync(join(ROOT, "src/resources/demeritEffects.ts"), demeritOut, "utf-8");
  console.log(`Wrote ${demeritEntries.length} entries to src/resources/demeritEffects.ts`);
}

main();
