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
  出撃時の武器に魔力攻撃力を付加: "startingArmamentDealsMagicDamage",
  出撃時の武器に炎攻撃力を付加: "startingArmamentDealsFireDamage",
  出撃時の武器に雷攻撃力を付加: "startingArmamentDealsLightningDamage",
  出撃時の武器に聖攻撃力を付加: "startingArmamentDealsHolyDamage",
  出撃時の武器に毒の状態異常を付加: "startingArmamentInflictsPoison",
  出撃時の武器に出血の状態異常を付加: "startingArmamentInflictsBloodLoss",

  // "Change compatible armament's skill to X at start of expedition":
  // RelicHub says "Change...", i18n says "Changes...".
  "出撃時の武器の戦技を「我慢」にする":
    "changesCompatibleArmamentsSkillToEndureAtStartOfExpedition",
  "出撃時の武器の戦技を「クイックステップ」にする":
    "changesCompatibleArmamentsSkillToQuickstepAtStartOfExpedition",
  "出撃時の武器の戦技を「嵐脚」にする":
    "changesCompatibleArmamentsSkillToStormStompAtStartOfExpedition",
  "出撃時の武器の戦技を「デターミネーション」にする":
    "changesCompatibleArmamentsSkillToDeterminationAtStartOfExpedition",
  "出撃時の武器の戦技を「輝剣の円陣」にする":
    "changesCompatibleArmamentsSkillToGlintbladePhalanxAtStartOfExpedition",
  "出撃時の武器の戦技を「グラビタス」にする":
    "changesCompatibleArmamentsSkillToGravitasAtStartOfExpedition",
  "出撃時の武器の戦技を「炎撃」にする":
    "changesCompatibleArmamentsSkillToFlamingStrikeAtStartOfExpedition",
  "出撃時の武器の戦技を「溶岩噴火」にする":
    "changesCompatibleArmamentsSkillToEruptionAtStartOfExpedition",
  "出撃時の武器の戦技を「落雷」にする":
    "changesCompatibleArmamentsSkillToThunderboltAtStartOfExpedition",
  "出撃時の武器の戦技を「雷撃斬」にする":
    "changesCompatibleArmamentsSkillToLightningSlashAtStartOfExpedition",
  "出撃時の武器の戦技を「聖なる刃」にする":
    "changesCompatibleArmamentsSkillToSacredBladeAtStartOfExpedition",
  "出撃時の武器の戦技を「祈りの一撃」にする":
    "changesCompatibleArmamentsSkillToPrayerfulStrikeAtStartOfExpedition",
  "出撃時の武器の戦技を「毒の霧」にする":
    "changesCompatibleArmamentsSkillToPoisonousMistAtStartOfExpedition",
  "出撃時の武器の戦技を「毒蛾は二度舞う」にする":
    "changesCompatibleArmamentsSkillToPoisonMothFlightAtStartOfExpedition",
  "出撃時の武器の戦技を「血の刃」にする":
    "changesCompatibleArmamentsSkillToBloodBladeAtStartOfExpedition",
  "出撃時の武器の戦技を「切腹」にする":
    "changesCompatibleArmamentsSkillToSeppukuAtStartOfExpedition",
  "出撃時の武器の戦技を「冷気の霧」にする":
    "changesCompatibleArmamentsSkillToChillingMistAtStartOfExpedition",
  "出撃時の武器の戦技を「霜踏み」にする":
    "changesCompatibleArmamentsSkillToHoarfrostStompAtStartOfExpedition",
  "出撃時の武器の戦技を「白い影の誘い」にする":
    "changesCompatibleArmamentsSkillToWhiteShadowsLureAtStartOfExpedition",
  "出撃時の武器の戦技を「アローレイン」にする":
    "changesCompatibleArmamentsSkillToRainOfArrowsAtStartOfExpedition",

  // Art gauge wording: RelicHub phrasing differs from i18n's phrasing for the
  // same effect.
  "致命の一撃で、アーツゲージ増加": "artGaugeFillsModeratelyUponCriticalHit",
  "致命の一撃で、アーツゲージ増加+1":
    "artGaugeFillsModeratelyUponCriticalHitPlus1",
  "ガード成功時、アーツゲージ増加": "artGaugeChargedFromSuccessfulGuarding",
  "ガード成功時、アーツゲージ増加+1":
    "artGaugeChargedFromSuccessfulGuardingPlus1",

  // Misc single wording/capitalization mismatches.
  "魔術／祈祷、効果時間延長": "extendedSpellDuration",
  結晶人の魔術を強化: "improvedCrystalianSorcery",
  "HP低下時、周囲の味方を含めHPをゆっくりと回復":
    "slowlyRestoreHpForSelfAndNearbyAlliesWhenHpIsLow",

  // RelicHub Title-cases this one ("+1 Additional Character Skill Use"),
  // i18n does not ("+1 additional Character Skill use").
  "【追跡者】スキルの使用回数+1": "wylderAdditionalCharacterSkillUse",

  // Remaining wording/capitalization/punctuation mismatches between
  // RelicHub's `eng` field and i18n.ts's English text, found by running
  // this script and inspecting every entry in its "could not be matched"
  // warning output against src/i18n.ts.
  "魔術師塔の仕掛けが解除される度、最大FP上昇":
    "maxFpPermanentlyIncreasedAfterReleasingSorcerersRiseMechanism",
  "大教会の強敵を倒す度、最大HP上昇":
    "maxHPIncreasedForEachGreatEnemyDefeatedAtAGreatChurch",
  攻撃を受けると攻撃力上昇: "takingAttacksImprovesAttackPower",
  "封牢の囚を倒す度、攻撃力上昇":
    "attackPowerPermanentlyIncreasedForEachEvergaolPrisonerDefeated",
  "夜の侵入者を倒す度、攻撃力上昇": "attackPowerUpAfterDefeatingANightInvader",
  "脂アイテム使用時、追加で物理攻撃力上昇":
    "attackPowerIncreasesAfterUsingGreaseItems",
  "ガード中、敵に狙われやすくなる": "drawEnemyAttentionWhileGuarding",
  "ジェスチャー「あぐら」により、発狂が蓄積":
    "gestureCrossedLegsBuildsUpMadness",
  "周囲で凍傷状態の発生時、自身の姿を隠す": "nearbyFrostbiteConcealsSelf",
  自身と味方の取得ルーン増加: "increasedRuneAcquisitionForSelfAndAllies",
  "自身を除く、周囲の味方のスタミナ回復速度上昇":
    "raisedStaminaRecoveryForNearbyAlliesButNotForSelf",
  アイテムの効果が周囲の味方にも発動: "itemsConferEffectToAllNearbyAllies",
  "【追跡者】アビリティ発動時、アーツゲージ増加":
    "wylderArtGaugeGreatlyFilledWhenAbilityActivated",
  "【守護者】アーツ発動時、周囲の味方HPを徐々に回復":
    "guardianSlowlyRestoresNearbyAlliesHP",
  "【守護者】斧槍タメ攻撃時、つむじ風が発生":
    "guardianCreatesWhirlwindWhenChargingHalberd",
  "【鉄の目】アーツ発動後、刺突カウンター強化":
    "ironeyeBoostsThrustingCounterattacksAfterArt",
  "【鉄の目】弱点の持続時間を延長させる": "ironeyeExtendsDurationOfWeakPoint",
  "【レディ】アーツ発動中、敵撃破で攻撃力上昇":
    "duchessDefeatingEnemiesWhileArtActiveUpsAttack",
  "【レディ】短剣による攻撃連続時、周囲の敵に、直近の出来事を再演":
    "duchessDaggerChainAttackReprises",
  "【無頼漢】スキル中に攻撃を受けると攻撃力と最大スタミナ上昇":
    "raiderDamageTakenWhileUsingCharacterSkillImprovesAttack",
  "【無頼漢】アーツの効果時間延長": "raiderDurationOfUltimateArtExtended",
  "トーテム・ステラの周囲で敵を倒した時、HP回復":
    "defeatingEnemiesNearTotemStelaRestoresHP",
  "【復讐者】アーツ発動時、霊炎の爆発を発生":
    "revenantTriggerGhostflameExplosionDuringUltimateArtActivation",
  "【復讐者】アーツ発動時、自身のHPと引き換えに周囲の味方のHPを全回復":
    "revenantExpendOwnHPToFullyHealNearbyAllies",
  "【復讐者】アーツ発動時、ファミリーと味方を強化":
    "revenantStrengthensFamilyAndAlliesWhenUltimateArtActivated",
  "【復讐者】ファミリーと共闘中の間、自身を強化":
    "revenantPowerUpWhileFightingAlongsideFamily",
  "【陰者】アーツ発動時、自身が出血状態になり、攻撃力上昇":
    "recluseSufferBloodLossAndIncreaseAttackPower",
  "【陰者】アーツ発動時、最大HP上昇": "recluseActivatingUltimateArtRaisesMaxHP",
  "【陰者】属性痕を集めた時、「魔術の地」が発動":
    "recluseCollectingAffinityResidueActivatesTerraMagica",
  "【執行者】スキル中の攻撃力上昇、攻撃時にカット率低下":
    "executorCharacterSkillBoostsAttackButDrainsHP",
  "【執行者】アビリティ発動時、HPをゆっくりと回復":
    "executorSlowlyRestoreHPUponAbilityActivation",
  "【学者】スキルの進捗率の低下を抑制":
    "scholarPreventSlowingOfCharacterSkillProgress",
  "【学者】スキル使用時、対象に含まれた味方の攻撃力上昇":
    "scholarAlliesTargetedByCharacterSkillGainBoostedAttack",
  "【学者】スキルによる標本が増える度、ルーンを取得":
    "scholarEarnRunesForEachAdditionalSpecimenAcquiredWithCharacterSkill",
  "【学者】アーツでリンクした敵対象に、継続ダメージ":
    "scholarContinuousDamageInflictedOnTargetsThreadedByUltimateArt",
  "【学者】スキルを自身に使用時、FP消費軽減":
    "scholarReducedFpConsumptionWhenUsingCharacterSkillOnSelf",
  "【葬儀屋】アーツ発動時、攻撃力上昇":
    "undertakerActivatingUltimateArtIncreasesAttackPower",
  "【葬儀屋】アーツ発動時、触れた味方のHP回復":
    "undertakerContactWithAlliesRestoresTheirHpWhileUltimateArtIsActivated",
  "【葬儀屋】連撃の最終攻撃命中時、攻撃力上昇":
    "undertakerAttackPowerIncreasedByLandingTheFinalBlowOfAChainAttack",
  "【葬儀屋】祈祷を使用して、自身に補助効果発生時物理攻撃力上昇":
    "undertakerPhysicalAttacksBoostedWhileAssistEffectFromIncantationIsActiveForSelf",
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
  const enBlockEnd =
    jaStart === -1 ? i18nSourceText.lastIndexOf("};") : jaStart;

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

export function matchEffectKeyName(
  jpnName,
  jpnToEng,
  englishToEffectKeyName,
  overrides
) {
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
    .filter(
      (line) => line.length > 0 && !line.startsWith("//") && line !== "LENGTH"
    );
}

export function assignCategoriesAndRanks(
  genreOrder,
  skillsByGenre,
  jpnToEng,
  englishToEffectKeyName,
  overrides
) {
  const categoryOfKeyName = new Map();
  const rankOfKeyName = new Map();
  const unmatched = [];

  for (const genre of genreOrder) {
    skillsByGenre[genre].forEach((entry, index) => {
      const effectKeyName = matchEffectKeyName(
        entry.jpn,
        jpnToEng,
        englishToEffectKeyName,
        overrides
      );
      if (!effectKeyName) {
        unmatched.push(`${genre}: ${entry.jpn} (${entry.eng})`);
        return;
      }
      if (!categoryOfKeyName.has(effectKeyName)) {
        categoryOfKeyName.set(effectKeyName, genre);
        rankOfKeyName.set(effectKeyName, index);
      }
    });
  }

  return { categoryOfKeyName, rankOfKeyName, unmatched };
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

  const { categoryOfKeyName, rankOfKeyName, unmatched } =
    assignCategoriesAndRanks(
      skills.genre_order,
      skills.skills,
      jpnToEng,
      englishToEffectKeyName,
      MANUAL_EFFECT_KEY_OVERRIDES
    );

  let otherCount = 0;
  for (const keyName of allEffectKeyNames) {
    if (!categoryOfKeyName.has(keyName)) {
      categoryOfKeyName.set(keyName, OTHER_CATEGORY);
      rankOfKeyName.set(keyName, Number.MAX_SAFE_INTEGER);
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
    (keyName) =>
      `  [EffectKey.${keyName}]: ${JSON.stringify(categoryOfKeyName.get(keyName))},`
  );
  // EffectKey.LENGTH is a real member of the EffectKey enum type (a
  // sentinel, not a usable effect), so `Record<EffectKey, string>` requires
  // an entry for it too. It is never a valid effect key in practice (loops
  // over EffectKey always stop at `key < EffectKey.LENGTH`), so it's mapped
  // to the "other" bucket purely to satisfy the type.
  lines.push(`  [EffectKey.LENGTH]: ${JSON.stringify(OTHER_CATEGORY)},`);

  const rankLines = allEffectKeyNames.map(
    (keyName) =>
      `  [EffectKey.${keyName}]: ${rankOfKeyName.get(keyName) ?? Number.MAX_SAFE_INTEGER},`
  );
  rankLines.push(`  [EffectKey.LENGTH]: ${Number.MAX_SAFE_INTEGER},`);

  const output = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-effect-categories.mjs
import { EffectKey } from "./effectKeys";

export const effectCategoryOrder: string[] = ${JSON.stringify(genreOrder, null, 2)};

export const effectCategories: Record<EffectKey, string> = {
${lines.join("\n")}
};

export const effectCategoryRank: Record<EffectKey, number> = {
${rankLines.join("\n")}
};
`;

  writeFileSync(
    join(ROOT, "src/resources/effectCategories.ts"),
    output,
    "utf-8"
  );
  console.log(
    `Wrote ${allEffectKeyNames.length} entries to src/resources/effectCategories.ts`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
