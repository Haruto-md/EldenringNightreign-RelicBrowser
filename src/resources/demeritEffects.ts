// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-damage-multipliers.mjs
import { EffectKey } from "./effectKeys";

export interface DemeritEffect { key: EffectKey; jaName: string; }

export const demeritEffects: DemeritEffect[] = [
  { key: EffectKey.reducedVigorAndArcane, jaName: "生命力と神秘が低下" },
  { key: EffectKey.reducedStrengthAndIntelligence, jaName: "筋力と知力が低下" },
  { key: EffectKey.reducedDexterityAndFaith, jaName: "技量と信仰が低下" },
  { key: EffectKey.reducedIntelligenceAndDexterity, jaName: "知力と技量が低下" },
  { key: EffectKey.reducedFaithAndStrength, jaName: "信仰と筋力が低下" },
  { key: EffectKey.reducedRuneAcquisition, jaName: "取得ルーン減少" },
  { key: EffectKey.continuousHPLoss, jaName: "HP持続減少" },
  { key: EffectKey.allResistancesDown, jaName: "すべての状態異常耐性低下" },
  { key: EffectKey.reducedDamageNegationForFlaskUsages, jaName: "聖杯瓶使用時、カット率低下" },
  { key: EffectKey.repeatedEvasionsLowerDamageNegation, jaName: "回避直後、カット率低下" },
  { key: EffectKey.repeatedEvasionsLowerDamageNegation, jaName: "回避連続時、カット率低下" },
  { key: EffectKey.takingDamageCausesPoisonBuildup, jaName: "被ダメージ時、毒を蓄積" },
  { key: EffectKey.takingDamageCausesRotBuildup, jaName: "被ダメージ時、腐敗を蓄積" },
  { key: EffectKey.takingDamageCausesBloodLossBuildup, jaName: "被ダメージ時、出血を蓄積" },
  { key: EffectKey.takingDamageCausesFrostBuildup, jaName: "被ダメージ時、冷気を蓄積" },
  { key: EffectKey.takingDamageCausesSleepBuildup, jaName: "被ダメージ時、睡眠を蓄積" },
  { key: EffectKey.takingDamageCausesMadnessBuildup, jaName: "被ダメージ時、発狂を蓄積" },
  { key: EffectKey.takingDamageCausesDeathBuildup, jaName: "被ダメージ時、死を蓄積" },
  { key: EffectKey.reducedFlaskHPRestoration, jaName: "聖杯瓶の回復量低下" },
  { key: EffectKey.ultimateArtChargingImpaired, jaName: "アーツゲージ蓄積鈍化" },
  { key: EffectKey.lowerAttackWhenBelowMaxHP, jaName: "HP最大未満時、攻撃力低下" },
  { key: EffectKey.poisonBuildupWhenBelowMaxHP, jaName: "HP最大未満時、毒が蓄積" },
  { key: EffectKey.rotBuildupWhenBelowMaxHP, jaName: "HP最大未満時、腐敗が蓄積" },
  { key: EffectKey.nearDeathReducesMaxHP, jaName: "瀕死時、最大HP低下" },
];
