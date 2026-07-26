import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const OTHER_CATEGORY = "その他";

// Filled in iteratively from this script's console output (wording
// mismatches between RelicHub's skills.json and src/i18n.ts).
const MANUAL_EFFECT_KEY_OVERRIDES = {
  // Damage negation +1/+2 wording: RelicHub says "X Damage Negation Up +N",
  // i18n says "Improved X Damage Negation +N".
  "魔力カット率上昇+1": "improvedMagicDamageNegationPlus1",
  "魔力カット率上昇+2": "improvedMagicDamageNegationPlus2",
  "炎カット率上昇+1": "improvedFireDamageNegationPlus1",
  "炎カット率上昇+2": "improvedFireDamageNegationPlus2",
  "雷カット率上昇+1": "improvedLightningDamageNegationPlus1",
  "雷カット率上昇+2": "improvedLightningDamageNegationPlus2",
  "聖カット率上昇+1": "improvedHolyDamageNegationPlus1",
  "聖カット率上昇+2": "improvedHolyDamageNegationPlus2",

  // Starting armament element/status: RelicHub capitalizes the element/status
  // noun ("...deals Fire damage"), i18n does not ("...deals fire damage").
  "出撃時の武器に魔力攻撃力を付加": "startingArmamentDealsMagicDamage",
  "出撃時の武器に炎攻撃力を付加": "startingArmamentDealsFireDamage",
  "出撃時の武器に雷攻撃力を付加": "startingArmamentDealsLightningDamage",
  "出撃時の武器に聖攻撃力を付加": "startingArmamentDealsHolyDamage",
  "出撃時の武器に毒の状態異常を付加": "startingArmamentInflictsPoison",
  "出撃時の武器に出血の状態異常を付加": "startingArmamentInflictsBloodLoss",

  // "Change compatible armament's skill to X at start of expedition":
  // RelicHub says "Change...", i18n says "Changes...".
  "出撃時の武器の戦技を「我慢」にする": "changesCompatibleArmamentsSkillToEndureAtStartOfExpedition",
  "出撃時の武器の戦技を「クイックステップ」にする": "changesCompatibleArmamentsSkillToQuickstepAtStartOfExpedition",
  "出撃時の武器の戦技を「嵐脚」にする": "changesCompatibleArmamentsSkillToStormStompAtStartOfExpedition",
  "出撃時の武器の戦技を「デターミネーション」にする": "changesCompatibleArmamentsSkillToDeterminationAtStartOfExpedition",
  "出撃時の武器の戦技を「輝剣の円陣」にする": "changesCompatibleArmamentsSkillToGlintbladePhalanxAtStartOfExpedition",
  "出撃時の武器の戦技を「グラビタス」にする": "changesCompatibleArmamentsSkillToGravitasAtStartOfExpedition",
  "出撃時の武器の戦技を「炎撃」にする": "changesCompatibleArmamentsSkillToFlamingStrikeAtStartOfExpedition",
  "出撃時の武器の戦技を「溶岩噴火」にする": "changesCompatibleArmamentsSkillToEruptionAtStartOfExpedition",
  "出撃時の武器の戦技を「落雷」にする": "changesCompatibleArmamentsSkillToThunderboltAtStartOfExpedition",
  "出撃時の武器の戦技を「雷撃斬」にする": "changesCompatibleArmamentsSkillToLightningSlashAtStartOfExpedition",
  "出撃時の武器の戦技を「聖なる刃」にする": "changesCompatibleArmamentsSkillToSacredBladeAtStartOfExpedition",
  "出撃時の武器の戦技を「祈りの一撃」にする": "changesCompatibleArmamentsSkillToPrayerfulStrikeAtStartOfExpedition",
  "出撃時の武器の戦技を「毒の霧」にする": "changesCompatibleArmamentsSkillToPoisonousMistAtStartOfExpedition",
  "出撃時の武器の戦技を「毒蛾は二度舞う」にする": "changesCompatibleArmamentsSkillToPoisonMothFlightAtStartOfExpedition",
  "出撃時の武器の戦技を「血の刃」にする": "changesCompatibleArmamentsSkillToBloodBladeAtStartOfExpedition",
  "出撃時の武器の戦技を「切腹」にする": "changesCompatibleArmamentsSkillToSeppukuAtStartOfExpedition",
  "出撃時の武器の戦技を「冷気の霧」にする": "changesCompatibleArmamentsSkillToChillingMistAtStartOfExpedition",
  "出撃時の武器の戦技を「霜踏み」にする": "changesCompatibleArmamentsSkillToHoarfrostStompAtStartOfExpedition",
  "出撃時の武器の戦技を「白い影の誘い」にする": "changesCompatibleArmamentsSkillToWhiteShadowsLureAtStartOfExpedition",
  "出撃時の武器の戦技を「アローレイン」にする": "changesCompatibleArmamentsSkillToRainOfArrowsAtStartOfExpedition",

  // Art gauge wording: RelicHub phrasing differs from i18n's phrasing for the
  // same effect.
  "致命の一撃で、アーツゲージ増加": "artGaugeFillsModeratelyUponCriticalHit",
  "致命の一撃で、アーツゲージ増加+1": "artGaugeFillsModeratelyUponCriticalHitPlus1",
  "ガード成功時、アーツゲージ増加": "artGaugeChargedFromSuccessfulGuarding",
  "ガード成功時、アーツゲージ増加+1": "artGaugeChargedFromSuccessfulGuardingPlus1",

  // Misc single wording/capitalization mismatches.
  "魔術／祈祷、効果時間延長": "extendedSpellDuration",
  "結晶人の魔術を強化": "improvedCrystalianSorcery",
  "HP低下時、周囲の味方を含めHPをゆっくりと回復":
    "slowlyRestoreHpForSelfAndNearbyAlliesWhenHpIsLow",
};

// These three matching primitives are intentionally local to this script
// rather than imported from a shared module: at the time this was written,
// the only other place with equivalent logic (`scripts/damage-multiplier-matching.mjs`)
// existed solely as an uncommitted file on an unrelated, unmerged branch.
// Do not add a cross-branch import here.

export function buildJpnToEngLookup(sourceLists) {
  const lookup = new Map();
  for (const list of sourceLists) {
    for (const entry of list) {
      if (entry.jpn && entry.eng && !lookup.has(entry.jpn)) {
        lookup.set(entry.jpn, entry.eng);
      }
    }
  }
  return lookup;
}

export function extractI18nEnglishEffectStrings(i18nSourceText) {
  const enMarker = "\n  en:";
  const jaMarker = "\n  ja:";
  const enStart = i18nSourceText.indexOf(enMarker);
  if (enStart === -1) {
    throw new Error("Could not locate 'en:' translation block in i18n source");
  }

  const jaStart = i18nSourceText.indexOf(jaMarker);
  const enBlockEnd = jaStart === -1 ? i18nSourceText.lastIndexOf("};") : jaStart;

  const enBlock = i18nSourceText.slice(enStart, enBlockEnd);
  const map = new Map();
  const pattern = /\[EffectKey\.(\w+)\]:\s*"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(enBlock)) !== null) {
    const [, effectKeyName, englishText] = match;
    if (!map.has(englishText)) {
      map.set(englishText, effectKeyName);
    }
  }
  return map;
}

export function matchEffectKeyName(jpnName, jpnToEng, englishToEffectKeyName, overrides) {
  if (overrides[jpnName]) {
    return overrides[jpnName];
  }
  const eng = jpnToEng.get(jpnName);
  if (!eng) {
    return undefined;
  }
  return englishToEffectKeyName.get(eng);
}

export function extractEffectKeyNames(effectKeysSourceText) {
  const start = effectKeysSourceText.indexOf("{");
  const end = effectKeysSourceText.lastIndexOf("}");
  const body = effectKeysSourceText.slice(start + 1, end);
  return body
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter((line) => line.length > 0 && !line.startsWith("//") && line !== "LENGTH");
}

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf-8"));
}

function main() {
  const skills = loadJson("RelicHub/data/skills.json");
  const i18nSource = readFileSync(join(ROOT, "src/i18n.ts"), "utf-8");
  const effectKeysSource = readFileSync(
    join(ROOT, "src/resources/effectKeys.ts"),
    "utf-8"
  );

  const jpnToEng = buildJpnToEngLookup(Object.values(skills.skills));
  const englishToEffectKeyName = extractI18nEnglishEffectStrings(i18nSource);
  const allEffectKeyNames = extractEffectKeyNames(effectKeysSource);

  const categoryOfKeyName = new Map();
  const unmatched = [];

  for (const genre of skills.genre_order) {
    for (const entry of skills.skills[genre]) {
      const effectKeyName = matchEffectKeyName(
        entry.jpn,
        jpnToEng,
        englishToEffectKeyName,
        MANUAL_EFFECT_KEY_OVERRIDES
      );
      if (!effectKeyName) {
        unmatched.push(`${genre}: ${entry.jpn} (${entry.eng})`);
        continue;
      }
      if (!categoryOfKeyName.has(effectKeyName)) {
        categoryOfKeyName.set(effectKeyName, genre);
      }
    }
  }

  let otherCount = 0;
  for (const keyName of allEffectKeyNames) {
    if (!categoryOfKeyName.has(keyName)) {
      categoryOfKeyName.set(keyName, OTHER_CATEGORY);
      otherCount++;
    }
  }

  if (unmatched.length > 0) {
    console.warn(
      `\n${unmatched.length} RelicHub skills.json entries could not be matched to an EffectKey ` +
        `(their EffectKey, if any, falls into "${OTHER_CATEGORY}" instead):\n` +
        unmatched.map((k) => `  - ${k}`).join("\n") +
        `\n\nTo fix a specific entry, add it to MANUAL_EFFECT_KEY_OVERRIDES in this script ` +
        `(find the correct EffectKey by searching src/resources/effectKeys.ts) and re-run.\n`
    );
  }
  console.log(
    `${allEffectKeyNames.length} EffectKeys total: ${allEffectKeyNames.length - otherCount} categorized, ${otherCount} in "${OTHER_CATEGORY}".`
  );

  const genreOrder = [...skills.genre_order, OTHER_CATEGORY];
  const lines = allEffectKeyNames.map(
    (keyName) => `  [EffectKey.${keyName}]: ${JSON.stringify(categoryOfKeyName.get(keyName))},`
  );
  // EffectKey.LENGTH is a real member of the EffectKey enum type (a
  // sentinel, not a usable effect), so `Record<EffectKey, string>` requires
  // an entry for it too. It is never a valid effect key in practice (loops
  // over EffectKey always stop at `key < EffectKey.LENGTH`), so it's mapped
  // to the "other" bucket purely to satisfy the type.
  lines.push(`  [EffectKey.LENGTH]: ${JSON.stringify(OTHER_CATEGORY)},`);

  const output = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-effect-categories.mjs
import { EffectKey } from "./effectKeys";

export const effectCategoryOrder: string[] = ${JSON.stringify(genreOrder, null, 2)};

export const effectCategories: Record<EffectKey, string> = {
${lines.join("\n")}
};
`;

  writeFileSync(join(ROOT, "src/resources/effectCategories.ts"), output, "utf-8");
  console.log(`Wrote ${allEffectKeyNames.length} entries to src/resources/effectCategories.ts`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
