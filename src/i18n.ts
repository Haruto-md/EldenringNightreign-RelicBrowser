import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { EffectKey } from "./resources/effectKeys";
import { Nightfarer } from "./utils/Nightfarers";
import { RelicSlotColor } from "./utils/RelicColor";

const resources = {
  en: {
    translation: {
      relicBrowserTab: "Relic Browser",
      character: "Character",
      searchPlaceholder: "Search relics by name or effect...",
      outclassedChipLabel: "COMPARE",
      noAdvancedFiltersActive: "No advanced filters active",
      filtersActiveCountSingular: "{{count}} filter active",
      filtersActiveCountPlural: "{{count}} filters active",
      clearAllButton: "Clear all",
      requiredGroupHint: "Required (each row: relic needs at least one)",
      addEffectPlaceholder: "Add effect...",
      addGroupButton: "Add group",
      excludedGroupHint: "Excluded (relic must have none of these)",
      addExcludedEffectPlaceholder: "Add excluded effect...",
      comparisonAtLeastTooltip: "This level or better (click to switch to 'or below')",
      comparisonAtMostTooltip: "This level or below (click to switch to 'or better')",
      depthsRelicLabel: "Depths Relic",
      relicLabel: "Relic",
      deepRelicsPlural: "deep relics",
      relicsPlural: "relics",
      noRelicsFoundTemplate: "No {{color}}{{type}} found.",
      coordinatesHelpPrefix: "These coordinates can be used to find the relic ingame when sorted by 'Order Found' and filtered by ",
      coordinatesHelpMiddle: " and type ",
      coordinatesHelpSuffix: ".",
      coordinatesHelpSimple: "These coordinates can be used to find the relic ingame when sorted by 'Order Found'.",
      outclassedText: "This relic is outclassed by a better relic.",
      duplicateText: "This relic is a duplicate.",
      relicComparisonTitle: "Relic Comparison",
      closeButton: "Close",
      showingAllRelicsTemplate:
        "Showing all {{normal}} relics and {{deep}} deep relics on character {{character}}",
      showingMatchingRelicsTemplate:
        "Showing {{normal}} matching relics and {{deep}} matching deep relics out of {{total}} on character {{character}}",

      selectionModeStart: "Select relics to sell",
      selectionModeStop: "Stop selecting",

      sellCandidatesTitle: "{{count}} selected - click any relic to add or remove it",
      sellCandidatesSelectAll: "Select all shown",
      sellCandidatesSelectNone: "Clear selection",
      copySellSequenceButton: "Copy sell sequence",
      copySellSequenceCopied: "Copied {{count}} relics to clipboard",
      copySellSequenceError: "Failed to copy to clipboard. Please try again.",

      nightfarers: {
        [Nightfarer.Wylder]: "Wylder",
        [Nightfarer.Guardian]: "Guardian",
        [Nightfarer.Ironeye]: "Ironeye",
        [Nightfarer.Duchess]: "Duchess",
        [Nightfarer.Raider]: "Raider",
        [Nightfarer.Revenant]: "Revenant",
        [Nightfarer.Recluse]: "Recluse",
        [Nightfarer.Executor]: "Executor",
        [Nightfarer.Scholar]: "Scholar",
        [Nightfarer.Undertaker]: "Undertaker",
      },

      colors: {
        [RelicSlotColor.Any]: "Any",
        [RelicSlotColor.Red]: "Red",
        [RelicSlotColor.Green]: "Green",
        [RelicSlotColor.Blue]: "Blue",
        [RelicSlotColor.Yellow]: "Yellow",
      },

      // Relics
      items: {
        besmirchedFrame: "Besmirched Frame",
        blackClawNecklace: "Black Claw Necklace",
        bladeOfNightFragment: "Blade of Night Fragment",
        blessedFlowers: "Blessed Flowers",
        blessedIronCoin: "Blessed Iron Coin",
        boneLikeStone: "Bone-Like Stone",
        crackedSealingWax: "Cracked Sealing Wax",
        crackedWitchsBrooch: "Cracked Witch's Brooch",
        crownMedal: "Crown Medal",
        darkNightOfTheBaron: "Dark Night of the Baron",
        darkNightOfTheBeast: "Dark Night of the Beast",
        darkNightOfTheChampion: "Dark Night of the Champion",
        darkNightOfTheDemon: "Dark Night of the Demon",
        darkNightOfTheFathom: "Dark Night of the Fathom",
        darkNightOfTheMiasma: "Dark Night of the Miasma",
        darkNightOfTheWise: "Dark Night of the Wise",
        delicateBurningScene: "Delicate Burning Scene",
        delicateDrizzlyScene: "Delicate Drizzly Scene",
        delicateLuminousScene: "Delicate Luminous Scene",
        delicateTranquilScene: "Delicate Tranquil Scene",
        edgeOfOrder: "Edge of Order",
        fellOmenFetish: "Fell Omen Fetish",
        fineArrowhead: "Fine Arrowhead",
        goldenDew: "Golden Dew",
        goldenShell: "Golden Shell",
        goldenSprout: "Golden Sprout",
        grandBurningScene: "Grand Burning Scene",
        grandDrizzlyScene: "Grand Drizzly Scene",
        grandLuminousScene: "Grand Luminous Scene",
        grandTranquilScene: "Grand Tranquil Scene",
        largeScenicFlatstone: "Large Scenic Flatstone",
        nightOfTheBaron: "Night of the Baron",
        nightOfTheBeast: "Night of the Beast",
        nightOfTheChampion: "Night of the Champion",
        nightOfTheDemon: "Night of the Demon",
        nightOfTheFathom: "Night of the Fathom",
        nightOfTheLord: "Night of the Lord",
        nightOfTheMiasma: "Night of the Miasma",
        nightOfTheWise: "Night of the Wise",
        nightShard: "Night Shard",
        oldPocketwatch: "Old Pocketwatch",
        oldPortrait: "Old Portrait",
        polishedBurningScene: "Polished Burning Scene",
        polishedDrizzlyScene: "Polished Drizzly Scene",
        polishedLuminousScene: "Polished Luminous Scene",
        polishedTranquilScene: "Polished Tranquil Scene",
        scenicFlatstone: "Scenic Flatstone",
        silverTear: "Silver Tear",
        slateWhetstone: "Slate Whetstone",
        smallMakeupBrush: "Small Makeup Brush",
        sovereignSigil: "Sovereign Sigil",
        stoneStake: "Stone Stake",
        theWyldersEarring: "The Wylder's Earring",
        theNightOfDregs: "The Night of Dregs",
        theWillOfTheBalancers: "The Will of the Balancers",
        thirdVolume: "Third Volume",
        tornBraidedCord: "Torn Braided Cord",
        vestigeOfNight: "Vestige of Night",
        witchsBrooch: "Witch's Brooch",
        cleansingTear: "Cleansing Tear",
        noteMyDearSuccessor: "Note My Dear Successor",
        deepDelicateBurningScene: "Deep Delicate Burning Scene",
        deepPolishedBurningScene: "Deep Polished Burning Scene",
        deepGrandBurningScene: "Deep Grand Burning Scene",
        deepDelicateDrizzlyScene: "Deep Delicate Drizzly Scene",
        deepPolishedDrizzlyScene: "Deep Polished Drizzly Scene",
        deepGrandDrizzlyScene: "Deep Grand Drizzly Scene",
        deepDelicateLuminousScene: "Deep Delicate Luminous Scene",
        deepPolishedLuminousScene: "Deep Polished Luminous Scene",
        deepGrandLuminousScene: "Deep Grand Luminous Scene",
        deepDelicateTranquilScene: "Deep Delicate Tranquil Scene",
        deepPolishedTranquilScene: "Deep Polished Tranquil Scene",
        deepGrandTranquilScene: "Deep Grand Tranquil Scene",
        theWillOfTheBalance: "The Will of the Balance",
        leatherMonocleCase: "Leather Monocle Case",
        glassNecklace: "Glass Necklace",
      },

      effects: {
        [EffectKey.duchessBecomeStealthyAfterCritFromBehind]:
          "[Duchess] Become difficult to spot and silence footsteps after landing critical from behind",
        [EffectKey.duchessCharacterSkillInflictsSleep]:
          "[Duchess] Character Skill inflicts sleep upon enemies",
        [EffectKey.duchessDaggerChainAttackReprises]:
          "[Duchess] Dagger chain attack reprises event upon nearby enemies",
        [EffectKey.duchessDefeatingEnemiesWhileArtActiveUpsAttack]:
          "[Duchess] Defeating enemies while Art is active ups attack power",
        [EffectKey.duchessDurationOfUltimateArtExtended]:
          "[Duchess] Duration of Ultimate Art extended",
        [EffectKey.duchessImprovedCharacterSkillAttackPower]:
          "[Duchess] Improved Character Skill Attack Power",
        [EffectKey.executorAttackPowerUpWhileUltimateArtActive]:
          "[Executor] Attack power up while Ultimate Art is active",
        [EffectKey.executorCharacterSkillBoostsAttackButDrainsHP]:
          "[Executor] Character Skill Boosts Attack but Attacking Drains HP",
        [EffectKey.executorImprovesEffectButLowersResistance]:
          "[Executor] Improves effect of ability but lowers resistance to status ailments",
        [EffectKey.executorRoaringRestoresHPWhileArtActive]:
          "[Executor] Roaring restores HP while Art is active",
        [EffectKey.executorUnlockingCursedSwordRestoresHP]:
          "[Executor] While Character Skill is active, unlocking use of cursed sword restores HP",
        [EffectKey.guardianBecomeTargetOfEnemyAggression]:
          "[Guardian] Become the target of enemy aggression when ability is activated",
        [EffectKey.guardianCharacterSkillInflictsHolyDamage]:
          "[Guardian] Character Skill inflicts Holy damage",
        [EffectKey.guardianCreatesWhirlwindWhenChargingHalberd]:
          "[Guardian] Creates whirlwind when charging halberd attacks",
        [EffectKey.guardianDamageNegationForAlliesImproved]:
          "[Guardian] Damage negation for allies improved when using Ultimate Art",
        [EffectKey.guardianImprovedCharacterSkillRange]:
          "[Guardian] Improved Character Skill range",
        [EffectKey.guardianIncreasedDurationForCharacterSkill]:
          "[Guardian] Increased duration for Character Skill",
        [EffectKey.guardianSuccessfulGuardsSendOutShockwaves]:
          "[Guardian] Successful guards send out shockwaves while ability is active",
        [EffectKey.guardianRestoresAlliesHPWhenCharacterSkillUsed]:
          "[Guardian] Restores allies' HP when Character Skill is used",
        [EffectKey.guardianSlowlyRestoresNearbyAlliesHP]:
          "[Guardian] Slowly restores nearby allies' HP while Art is active",
        [EffectKey.ironeyeAdditionalCharacterSkillUse]:
          "[Ironeye] +1 additional Character Skill use",
        [EffectKey.ironeyeArtChargeActivationAddsPoisonEffect]:
          "[Ironeye] Art Charge Activation Adds Poison Effect",
        [EffectKey.ironeyeBoostsThrustingCounterattacksAfterArt]:
          "[Ironeye] Boosts thrusting counterattacks after executing Art",
        [EffectKey.ironeyeExtendsDurationOfWeakPoint]:
          "[Ironeye] Extends duration of weak point",
        [EffectKey.raiderCharacterSkillDamageUp]:
          "[Raider] Character Skill damage up, damage negation impaired during use",
        [EffectKey.raiderDamageTakenWhileUsingCharacterSkillImprovesAttack]:
          "[Raider] Damage taken while using Character Skill improves attack power and stamina",
        [EffectKey.raiderDurationOfUltimateArtExtended]:
          "[Raider] Duration of Ultimate Art extended",
        [EffectKey.raiderPermanentlyIncreaseAttackPower]:
          "[Raider] Permanently increase attack power when performing Character Skill's final attack",
        [EffectKey.recluseActivatingUltimateArtRaisesMaxHP]:
          "[Recluse] Activating Ultimate Art raises Max HP",
        [EffectKey.recluseCollecting4AffinityResiduesImprovesAffinityAttackPower]:
          "[Recluse] Collecting 4 Affinity Residues Improves Affinity Attack Power",
        [EffectKey.recluseCollectingAffinityResidueActivatesTerraMagica]:
          "[Recluse] Collecting affinity residue activates Terra Magica",
        [EffectKey.recluseExtendsDurationOfBloodSigils]:
          "[Recluse] Extends duration of blood sigils",
        [EffectKey.recluseSufferBloodLossAndIncreaseAttackPower]:
          "[Recluse] Suffer blood loss and increase attack power upon Art activation",
        [EffectKey.revenantAbilityActivationChanceIncreased]:
          "[Revenant] Ability activation chance increased",
        [EffectKey.revenantExpendOwnHPToFullyHealNearbyAllies]:
          "[Revenant] Expend own HP to fully heal nearby allies when activating Art",
        [EffectKey.revenantPowerUpWhileFightingAlongsideFamily]:
          "[Revenant] Power up while fighting alongside family",
        [EffectKey.revenantStrengthensFamilyAndAlliesWhenUltimateArtActivated]:
          "[Revenant] Strengthens family and allies when Ultimate Art is activated",
        [EffectKey.revenantTriggerGhostflameExplosionDuringUltimateArtActivation]:
          "[Revenant] Trigger ghostflame explosion during Ultimate Art activation",
        [EffectKey.runes60kAtStart30kOnDeath]:
          "[Runes] 60k at start, 30k on death",
        [EffectKey.wylderAdditionalCharacterSkillUse]:
          "[Wylder] +1 additional Character Skill use",
        [EffectKey.wylderArtActivationSpreadsFireInArea]:
          "[Wylder] Art activation spreads fire in area",
        [EffectKey.wylderArtGaugeGreatlyFilledWhenAbilityActivated]:
          "[Wylder] Art gauge greatly filled when ability is activated",
        [EffectKey.wylderCharacterSkillInflictsBloodLoss]:
          "[Wylder] Character Skill inflicts Blood Loss",
        [EffectKey.wylderStandardAttacksEnhancedWithFieryFollowUpsWhenUsingCharacterSkill]:
          "[Wylder] Standard attacks enhanced with fiery follow-ups when using Character Skill (greatsword only)",
        [EffectKey.wylderImpairedDamageNegationImprovedAttackPowerStaminaAfterArtActivation]:
          "[Wylder] Impaired damage negation, improved attack power & stamina after Art activation",
        [EffectKey.wylderImprovedAttackPowerWhenAbilityActivated]:
          "[Wylder] Improved attack power when ability is activated",
        [EffectKey.wylderImprovedAttackPowerWhenCharacterSkillActivated]:
          "[Wylder] Improved attack power when Character Skill is activated",
        [EffectKey.wylderReducedCooldownTimeForCharacterSkill]:
          "[Wylder] Reduced cooldown time for Character Skill",
        [EffectKey.acidMistUponChargedThrust]: "Acid Mist upon Charged Thrust",
        [EffectKey.addFireToWeapon]: "Add Fire to Weapon",
        [EffectKey.addHolyToWeapon]: "Add Holy to Weapon",
        [EffectKey.addLightningToWeapon]: "Add Lightning to Weapon",
        [EffectKey.addMagicToWeapon]: "Add Magic to Weapon",
        [EffectKey.arcanePlus1]: "Arcane +1",
        [EffectKey.arcanePlus2]: "Arcane +2",
        [EffectKey.arcanePlus3]: "Arcane +3",
        [EffectKey.armamentDealsFireDamagePlus1AtStartOfExpedition]:
          "Armament deals fire damage +1 at start of expedition",
        [EffectKey.artGaugeChargedFromSuccessfulGuarding]:
          "Art gauge charged from successful guarding",
        [EffectKey.artGaugeFillsModeratelyUponCriticalHit]:
          "Art gauge fills moderately upon critical hit",
        [EffectKey.attackBoostDragons]: "Attack Boost [Dragons]",
        [EffectKey.attackBoostLifeformsBornOfFallingStars]:
          "Attack Boost [Lifeforms Born of Falling Stars]",
        [EffectKey.attackBoostThoseWhoLiveInDeath]:
          "Attack Boost [Those Who Live in Death]",
        [EffectKey.attackBoostFromNearbyAllies]:
          "Attack Boost from Nearby Allies",
        [EffectKey.attackPowerIncreasesAfterUsingGreaseItems]:
          "Attack power increases after using grease items",
        [EffectKey.attackPowerPermanentlyIncreasedForEachEvergaolPrisonerDefeated]:
          "Attack power permanently increased for each evergaol prisoner defeated",
        [EffectKey.attackPowerUpAfterDefeatingANightInvader]:
          "Attack power up after defeating a Night Invader",
        [EffectKey.attackPowerUpWhenFacingFrostbiteAfflictedEnemy]:
          "Attack power up when facing frostbite-afflicted enemy",
        [EffectKey.attackPowerUpWhenFacingPoisonAfflictedEnemy]:
          "Attack power up when facing poison-afflicted enemy",
        [EffectKey.attackPowerUpWhenFacingScarletRotAfflictedEnemy]:
          "Attack power up when facing scarlet rot-afflicted enemy",
        [EffectKey.attackPowerUpWhenFacingSleepAfflictedEnemy]:
          "Attack power up when facing sleep-afflicted enemy",
        [EffectKey.attackUpWhenWieldingTwoArmaments]:
          "Attack Up when Wielding Two Armaments",
        [EffectKey.attacksCreateMagicBurstsVersusSleepingEnemies]:
          "Attacks Create Magic Bursts Versus Sleeping Enemies",
        [EffectKey.attacksInflictBloodLoss]: "Attacks Inflict Blood Loss",
        [EffectKey.attacksInflictBloodLossPlus1]:
          "Attacks Inflict Blood Loss +1",
        [EffectKey.attacksInflictBloodLossPlus2]:
          "Attacks Inflict Blood Loss +2",
        [EffectKey.attacksInflictDeathBlight]: "Attacks Inflict Death Blight",
        [EffectKey.attacksInflictFrost]: "Attacks Inflict Frost",
        [EffectKey.attacksInflictFrostPlus1]: "Attacks Inflict Frost +1",
        [EffectKey.attacksInflictFrostPlus2]: "Attacks Inflict Frost +2",
        [EffectKey.attacksInflictFrostPlus3]: "Attacks Inflict Frost +3",
        [EffectKey.attacksInflictMadness]: "Attacks Inflict Madness",
        [EffectKey.attacksInflictPoison]: "Attacks Inflict Poison",
        [EffectKey.attacksInflictPoisonPlus1]: "Attacks Inflict Poison +1",
        [EffectKey.attacksInflictPoisonPlus2]: "Attacks Inflict Poison +2",
        [EffectKey.attacksInflictRot]: "Attacks Inflict Rot",
        [EffectKey.attacksInflictScarletRot]: "Attacks Inflict Scarlet Rot",
        [EffectKey.attacksInflictScarletRotPlus1]:
          "Attacks Inflict Scarlet Rot +1",
        [EffectKey.attacksInflictScarletRotPlus2]:
          "Attacks Inflict Scarlet Rot +2",
        [EffectKey.attacksInflictSleep]: "Attacks Inflict Sleep",
        [EffectKey.attacksInflictSleepPlus1]: "Attacks Inflict Sleep +1",
        [EffectKey.attacksInflictSleepPlus2]: "Attacks Inflict Sleep +2",
        [EffectKey.attacksInflictSleepPlus3]: "Attacks Inflict Sleep +3",
        [EffectKey.bewitchingBranchesInPossessionAtStartOfExpedition]:
          "Bewitching Branches in possession at start of expedition",
        [EffectKey.blackFlamesUponChargedSlash]:
          "Black Flames upon Charged Slash",
        [EffectKey.bloodLossCritThornsOfPunishment]:
          "Blood Loss Crit: Thorns of Punishment",
        [EffectKey.bloodLossInVicinityIncreasesAttackPower]:
          "Blood Loss in Vicinity Increases Attack Power",
        [EffectKey.bloodLossIncreasesAttackPower]:
          "Blood Loss Increases Attack Power",
        [EffectKey.bloodfliesUponPrecisionAiming]:
          "Bloodflies upon Precision Aiming",
        [EffectKey.boostsAttackPowerOfAddedAffinityAttacks]:
          "Boosts Attack Power of Added Affinity Attacks",
        [EffectKey.brokenStanceActivatesEndure]:
          "Broken Stance Activates Endure",
        [EffectKey.changedStrongAttacks]: "Changed Strong Attacks",
        [EffectKey.changesCompatibleArmamentsSkillToBloodBladeAtStartOfExpedition]:
          "Changes compatible armament's skill to Blood Blade at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToChillingMistAtStartOfExpedition]:
          "Changes compatible armament's skill to Chilling Mist at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToDeterminationAtStartOfExpedition]:
          "Changes compatible armament's skill to Determination at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToEndureAtStartOfExpedition]:
          "Changes compatible armament's skill to Endure at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToEruptionAtStartOfExpedition]:
          "Changes compatible armament's skill to Eruption at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToFlamingStrikeAtStartOfExpedition]:
          "Changes compatible armament's skill to Flaming Strike at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToGlintbladePhalanxAtStartOfExpedition]:
          "Changes compatible armament's skill to Glintblade Phalanx at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToGravitasAtStartOfExpedition]:
          "Changes compatible armament's skill to Gravitas at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToHoarfrostStompAtStartOfExpedition]:
          "Changes compatible armament's skill to Hoarfrost Stomp at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToLightningSlashAtStartOfExpedition]:
          "Changes compatible armament's skill to Lightning Slash at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToPoisonMothFlightAtStartOfExpedition]:
          "Changes compatible armament's skill to Poison Moth Flight at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToPoisonousMistAtStartOfExpedition]:
          "Changes compatible armament's skill to Poisonous Mist at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToPrayerfulStrikeAtStartOfExpedition]:
          "Changes compatible armament's skill to Prayerful Strike at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToQuickstepAtStartOfExpedition]:
          "Changes compatible armament's skill to Quickstep at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToRainOfArrowsAtStartOfExpedition]:
          "Changes compatible armament's skill to Rain of Arrows at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToSacredBladeAtStartOfExpedition]:
          "Changes compatible armament's skill to Sacred Blade at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToSeppukuAtStartOfExpedition]:
          "Changes compatible armament's skill to Seppuku at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToStormStompAtStartOfExpedition]:
          "Changes compatible armament's skill to Storm Stomp at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToThunderboltAtStartOfExpedition]:
          "Changes compatible armament's skill to Thunderbolt at start of expedition",
        [EffectKey.changesCompatibleArmamentsSkillToWhiteShadowsLureAtStartOfExpedition]:
          "Changes compatible armament's skill to White Shadow's Lure at start of expedition",
        [EffectKey.characterSkillCooldownReduction]:
          "Character Skill Cooldown Reduction",
        [EffectKey.characterSkillCooldownReductionPlus1]:
          "Character Skill Cooldown Reduction +1",
        [EffectKey.characterSkillCooldownReductionPlus2]:
          "Character Skill Cooldown Reduction +2",
        [EffectKey.characterSkillCooldownReductionPlus3]:
          "Character Skill Cooldown Reduction +3",
        [EffectKey.chargedThrustInvokesSleepMist]:
          "Charged Thrust Invokes Sleep Mist",
        [EffectKey.colossalArmamentsCoatedInRockWhenPerformingChargedAttacks]:
          "Colossal armaments are coated in rock when performing charged attacks",
        [EffectKey.communionGrantsAntiDragonEffect]:
          "Communion Grants Anti-Dragon Effect",
        [EffectKey.consecutiveGuardsHardenSkin]:
          "Consecutive Guards Harden Skin",
        [EffectKey.continuousHpRecovery]: "Continuous HP Recovery",
        [EffectKey.createsHolyGroundAtLowHP]: "Creates Holy Ground at Low HP",
        [EffectKey.criticalHitAddsLightningEffect]:
          "Critical Hit Adds Lightning Effect",
        [EffectKey.criticalHitBoostsStaminaRecoverySpeed]:
          "Critical Hit Boosts Stamina Recovery Speed",
        [EffectKey.criticalHitCreatesSleepMist]:
          "Critical Hit Creates Sleep Mist",
        [EffectKey.criticalHitFPRestoration]: "Critical Hit FP Restoration",
        [EffectKey.criticalHitHPRestoration]: "Critical Hit HP Restoration",
        [EffectKey.criticalHitsBoostAttackPower]:
          "Critical Hits Boost Attack Power",
        [EffectKey.criticalHitsDealHugeDamageOnPoisonedEnemies]:
          "Critical hits deal huge damage on poisoned enemies",
        [EffectKey.criticalHitsEarnRunes]: "Critical Hits Earn Runes",
        [EffectKey.criticalHitsInflictBloodLoss]:
          "Critical Hits Inflict Blood Loss",
        [EffectKey.crystalDartsInPossessionAtStartOfExpedition]:
          "Crystal Darts in possession at start of expedition",
        [EffectKey.crystalShardsUponMagicCriticalHit]:
          "Crystal Shards upon Magic Critical Hit",
        [EffectKey.damageBoostedAfterCriticalHit]:
          "Damage Boosted after Critical Hit",
        [EffectKey.darknessConcealsCasterWhileWalking]:
          "Darkness Conceals Caster While Walking",
        [EffectKey.deathCritHitCallsDeathLightning]:
          "Death Crit. Hit Calls Death Lightning",
        [EffectKey.defeatingEnemiesFillsMoreOfTheArtGauge]:
          "Defeating enemies fills more of the Art gauge",
        [EffectKey.defeatingEnemiesNearTotemStelaRestoresHP]:
          "Defeating enemies near Totem Stela restores HP",
        [EffectKey.defeatingEnemiesRestoresFP]: "Defeating Enemies Restores FP",
        [EffectKey.defeatingEnemiesRestoresHP]: "Defeating Enemies Restores HP",
        [EffectKey.defeatingEnemiesRestoresHPForAlliesButNotForSelf]:
          "Defeating enemies restores HP for allies but not for self",
        [EffectKey.defeatingGroupCallsVengefulSpirits]:
          "Defeating Group Calls Vengeful Spirits",
        [EffectKey.defeatingGroupFiresGoldenShockwave]:
          "Defeating Group Fires Golden Shockwave",
        [EffectKey.defeatingGroupReleasesMistOfCharm]:
          "Defeating Group Releases Mist of Charm",
        [EffectKey.defeatingGroupReleasesMistOfFrost]:
          "Defeating Group Releases Mist of Frost",
        [EffectKey.defeatingGroupSummonsWraiths]:
          "Defeating Group Summons Wraiths",
        [EffectKey.defeatingGroupUnleashesLightning]:
          "Defeating Group Unleashes Lightning",
        [EffectKey.dexterityPlus1]: "Dexterity +1",
        [EffectKey.dexterityPlus2]: "Dexterity +2",
        [EffectKey.dexterityPlus3]: "Dexterity +3",
        [EffectKey.dmgNegationUpWhileCastingSpells]:
          "Dmg Negation Up While Casting Spells",
        [EffectKey.dmgNegationUpWhileChargingAttacks]:
          "Dmg Negation Up while Charging Attacks",
        [EffectKey.drawEnemyAttentionWhileGuarding]:
          "Draw enemy attention while guarding",
        [EffectKey.endurancePlus1]: "Endurance +1",
        [EffectKey.endurancePlus2]: "Endurance +2",
        [EffectKey.endurancePlus3]: "Endurance +3",
        [EffectKey.extendedSpellDuration]: "Extended Spell Duration",
        [EffectKey.failingToCastSorceryRestoresFP]:
          "Failing to Cast Sorcery Restores FP",
        [EffectKey.faithPlus1]: "Faith +1",
        [EffectKey.faithPlus2]: "Faith +2",
        [EffectKey.faithPlus3]: "Faith +3",
        [EffectKey.fireAttackFollowsChargeAttacks]:
          "Fire Attack Follows Charge Attacks",
        [EffectKey.fireAttackPowerUp]: "Fire Attack Power Up",
        [EffectKey.fireAttackPowerUpPlus1]: "Fire Attack Power Up +1",
        [EffectKey.fireAttackPowerUpPlus2]: "Fire Attack Power Up +2",
        [EffectKey.fireCriticalHitGrantsMaxStaminaBoost]:
          "Fire Critical Hit Grants Max Stamina Boost",
        [EffectKey.fireDamageNegationUp]: "Fire Damage Negation Up",
        [EffectKey.fireGreaseInPossessionAtStartOfExpedition]:
          "Fire Grease in possession at start of expedition",
        [EffectKey.firePotsInPossessionAtStartOfExpedition]:
          "Fire Pots in possession at start of expedition",
        [EffectKey.flameOfFrenzyWhileWalking]: "Flame of Frenzy While Walking",
        [EffectKey.flaskAlsoHealsAllies]: "Flask Also Heals Allies",
        [EffectKey.flaskHealingAlsoRestoresFP]:
          "Flask Healing Also Restores FP",
        [EffectKey.fpRecoveryFromSuccessfulGuarding]:
          "FP Recovery From Successful Guarding",
        [EffectKey.fpRestorationUponAttacks]: "FP Restoration upon Attacks",
        [EffectKey.fpRestorationUponAxeAttacks]:
          "FP Restoration upon Axe Attacks",
        [EffectKey.fpRestorationUponBowAttacks]:
          "FP Restoration upon Bow Attacks",
        [EffectKey.fpRestorationUponClawAttacks]:
          "FP Restoration upon Claw Attacks",
        [EffectKey.fpRestorationUponColossalSwordAttacks]:
          "FP Restoration upon Colossal Sword Attacks",
        [EffectKey.fpRestorationUponColossalWeaponAttacks]:
          "FP Restoration upon Colossal Weapon Attacks",
        [EffectKey.fpRestorationUponCurvedGreatswordAttacks]:
          "FP Restoration upon Curved Greatsword Attacks",
        [EffectKey.fpRestorationUponCurvedSwordAttacks]:
          "FP Restoration upon Curved Sword Attacks",
        [EffectKey.fpRestorationUponDaggerAttacks]:
          "FP Restoration upon Dagger Attacks",
        [EffectKey.fpRestorationUponFistAttacks]:
          "FP Restoration upon Fist Attacks",
        [EffectKey.fpRestorationUponFlailAttacks]:
          "FP Restoration upon Flail Attacks",
        [EffectKey.fpRestorationUponGreatHammerAttacks]:
          "FP Restoration upon Great Hammer Attacks",
        [EffectKey.fpRestorationUponGreatSpearAttacks]:
          "FP Restoration upon Great Spear Attacks",
        [EffectKey.fpRestorationUponGreataxeAttacks]:
          "FP Restoration upon Greataxe Attacks",
        [EffectKey.fpRestorationUponGreatswordAttacks]:
          "FP Restoration upon Greatsword Attacks",
        [EffectKey.fpRestorationUponHalberdAttacks]:
          "FP Restoration upon Halberd Attacks",
        [EffectKey.fpRestorationUponHammerAttacks]:
          "FP Restoration upon Hammer Attacks",
        [EffectKey.fpRestorationUponHeavyThrustingSwordAttacks]:
          "FP Restoration upon Heavy Thrusting Sword Attacks",
        [EffectKey.fpRestorationUponKatanaAttacks]:
          "FP Restoration upon Katana Attacks",
        [EffectKey.fpRestorationUponPikeAttacks]:
          "FP Restoration upon Pike Attacks",
        [EffectKey.fpRestorationUponReaperAttacks]:
          "FP Restoration upon Reaper Attacks",
        [EffectKey.fpRestorationUponSpearAttacks]:
          "FP Restoration upon Spear Attacks",
        [EffectKey.fpRestorationUponStraightSwordAttacks]:
          "FP Restoration upon Straight Sword Attacks",
        [EffectKey.fpRestorationUponSuccessiveAttacks]:
          "FP Restoration upon Successive Attacks",
        [EffectKey.fpRestorationUponThrustingSwordAttacks]:
          "FP Restoration upon Thrusting Sword Attacks",
        [EffectKey.fpRestorationUponTwinbladeAttacks]:
          "FP Restoration upon Twinblade Attacks",
        [EffectKey.fpRestorationUponWhipAttacks]:
          "FP Restoration upon Whip Attacks",
        [EffectKey.frostbiteIncreasesAttackPower]:
          "Frostbite Increases Attack Power",
        [EffectKey.frostbiteProducesAMistOfFrost]:
          "Frostbite Produces a Mist of Frost",
        [EffectKey.gestureCrossedLegsBuildsUpMadness]:
          "Gesture Crossed Legs Builds Up Madness",
        [EffectKey.glintstoneScrapsInPossessionAtStartOfExpedition]:
          "Glintstone Scraps in possession at start of expedition",
        [EffectKey.gradualRestorationByFlask]: "Gradual Restoration by Flask",
        [EffectKey.gravityStoneChunksInPossessionAtStartOfExpedition]:
          "Gravity Stone Chunks in possession at start of expedition",
        [EffectKey.guardCounterIsGivenABoostBasedOnCurrentHP]:
          "Guard counter is given a boost based on current HP",
        [EffectKey.guardCountersActivateHolyAttacks]:
          "Guard Counters Activate Holy Attacks",
        [EffectKey.guardCountersCastLightPillar]:
          "Guard Counters Cast Light Pillar",
        [EffectKey.guardCountersLaunchSummoningAttack]:
          "Guard Counters Launch Summoning Attack",
        [EffectKey.guardingUpsAttackAndCastingSpeeds]:
          "Guarding Ups Attack & Casting Speeds",
        [EffectKey.holyAttackFollowsChargeAttacks]:
          "Holy Attack Follows Charge Attacks",
        [EffectKey.holyAttackPowerUp]: "Holy Attack Power Up",
        [EffectKey.holyAttackPowerUpPlus1]: "Holy Attack Power Up +1",
        [EffectKey.holyAttackPowerUpPlus2]: "Holy Attack Power Up +2",
        [EffectKey.holyDamageNegationUp]: "Holy Damage Negation Up",
        [EffectKey.holyGreaseInPossessionAtStartOfExpedition]:
          "Holy Grease in possession at start of expedition",
        [EffectKey.holyShockwaveUponChargedStrike]:
          "Holy Shockwave upon Charged Strike",
        [EffectKey.holyWaterPotsInPossessionAtStartOfExpedition]:
          "Holy Water Pots in possession at start of expedition",
        [EffectKey.hpRecoveryFromSuccessfulGuarding]:
          "HP Recovery from Successful Guarding",
        [EffectKey.hpRecoveryFromSuccessfulGuardingPlus]:
          "HP Recovery From Successful Guarding",
        [EffectKey.hpRestorationUponAttacks]: "HP Restoration upon Attacks",
        [EffectKey.hpRestorationUponAxeAttacks]:
          "HP Restoration upon Axe Attacks",
        [EffectKey.hpRestorationUponBowAttacks]:
          "HP Restoration upon Bow Attacks",
        [EffectKey.hpRestorationUponClawAttacks]:
          "HP Restoration upon Claw Attacks",
        [EffectKey.hpRestorationUponColossalSwordAttacks]:
          "HP Restoration upon Colossal Sword Attacks",
        [EffectKey.hpRestorationUponColossalWeaponAttacks]:
          "HP Restoration upon Colossal Weapon Attacks",
        [EffectKey.hpRestorationUponCurvedGreatswordAttacks]:
          "HP Restoration upon Curved Greatsword Attacks",
        [EffectKey.hpRestorationUponCurvedSwordAttacks]:
          "HP Restoration upon Curved Sword Attacks",
        [EffectKey.hpRestorationUponDaggerAttacks]:
          "HP Restoration upon Dagger Attacks",
        [EffectKey.hpRestorationUponFistAttacks]:
          "HP Restoration upon Fist Attacks",
        [EffectKey.hpRestorationUponFlailAttacks]:
          "HP Restoration upon Flail Attacks",
        [EffectKey.hpRestorationUponGreatHammerAttacks]:
          "HP Restoration upon Great Hammer Attacks",
        [EffectKey.hpRestorationUponGreatSpearAttacks]:
          "HP Restoration upon Great Spear Attacks",
        [EffectKey.hpRestorationUponGreataxeAttacks]:
          "HP Restoration upon Greataxe Attacks",
        [EffectKey.hpRestorationUponGreatswordAttacks]:
          "HP Restoration upon Greatsword Attacks",
        [EffectKey.hpRestorationUponHalberdAttacks]:
          "HP Restoration upon Halberd Attacks",
        [EffectKey.hpRestorationUponHammerAttacks]:
          "HP Restoration upon Hammer Attacks",
        [EffectKey.hpRestorationUponHeavyThrustingSwordAttacks]:
          "HP Restoration upon Heavy Thrusting Sword Attacks",
        [EffectKey.hpRestorationUponKatanaAttacks]:
          "HP Restoration upon Katana Attacks",
        [EffectKey.hpRestorationUponPikeAttacks]:
          "HP Restoration upon Pike Attacks",
        [EffectKey.hpRestorationUponReaperAttacks]:
          "HP Restoration upon Reaper Attacks",
        [EffectKey.hpRestorationUponSpearAttacks]:
          "HP Restoration upon Spear Attacks",
        [EffectKey.hpRestorationUponStraightSwordAttacks]:
          "HP Restoration upon Straight Sword Attacks",
        [EffectKey.hpRestorationUponSuccessiveAttacks]:
          "HP Restoration upon Successive Attacks",
        [EffectKey.hpRestorationUponThrustingCounterattack]:
          "HP Restoration upon Thrusting Counterattack",
        [EffectKey.hpRestorationUponThrustingSwordAttacks]:
          "HP Restoration upon Thrusting Sword Attacks",
        [EffectKey.hpRestorationUponTwinbladeAttacks]:
          "HP Restoration upon Twinblade Attacks",
        [EffectKey.hpRestorationUponWhipAttacks]:
          "HP Restoration upon Whip Attacks",
        [EffectKey.hpRestorationWithHeadShots]:
          "HP Restoration with Head Shots",
        [EffectKey.hpRestoredWhenUsingMedicinalBolusesEtc]:
          "HP restored when using medicinal boluses, etc.",
        [EffectKey.hugeRuneDiscountForShopPurchasesWhileOnExpedition]:
          "Huge rune discount for shop purchases while on expedition",
        [EffectKey.iceStormSurgeSprint]: "Ice Storm Surge Sprint",
        [EffectKey.iceStormUponChargedSlash]: "Ice Storm upon Charged Slash",
        [EffectKey.iceStormUponCriticalHitWithFrost]:
          "Ice Storm upon Critical Hit with Frost",
        [EffectKey.impairedDamageNegation]: "Impaired Damage Negation",
        [EffectKey.impairedPhysicalDamageNegation]:
          "Impaired Physical Damage Negation",
        [EffectKey.improvedAttackPowerAtFullHP]:
          "Improved Attack Power at Full HP",
        [EffectKey.improvedAttackPowerAtLowHP]:
          "Improved Attack Power at Low HP",
        [EffectKey.improvedAttackPowerWhenTwoHanding]:
          "Improved Attack Power when Two-Handing",
        [EffectKey.improvedAttackPowerWith3PlusAxesEquipped]:
          "Improved Attack Power with 3+ Axes Equipped",
        [EffectKey.improvedAttackPowerWith3PlusBowsEquipped]:
          "Improved Attack Power with 3+ Bows Equipped",
        [EffectKey.improvedAttackPowerWith3PlusClawsEquipped]:
          "Improved Attack Power with 3+ Claws Equipped",
        [EffectKey.improvedAttackPowerWith3PlusColossalSwordsEquipped]:
          "Improved Attack Power with 3+ Colossal Swords Equipped",
        [EffectKey.improvedAttackPowerWith3PlusColossalWeaponsEquipped]:
          "Improved Attack Power with 3+ Colossal Weapons Equipped",
        [EffectKey.improvedAttackPowerWith3PlusCurvedGreatswordsEquipped]:
          "Improved Attack Power with 3+ Curved Greatswords Equipped",
        [EffectKey.improvedAttackPowerWith3PlusCurvedSwordsEquipped]:
          "Improved Attack Power with 3+ Curved Swords Equipped",
        [EffectKey.improvedAttackPowerWith3PlusDaggersEquipped]:
          "Improved Attack Power with 3+ Daggers Equipped",
        [EffectKey.improvedAttackPowerWith3PlusFistsEquipped]:
          "Improved Attack Power with 3+ Fists Equipped",
        [EffectKey.improvedAttackPowerWith3PlusFlailsEquipped]:
          "Improved Attack Power with 3+ Flails Equipped",
        [EffectKey.improvedAttackPowerWith3PlusGreatHammersEquipped]:
          "Improved Attack Power with 3+ Great Hammers Equipped",
        [EffectKey.improvedAttackPowerWith3PlusGreatSpearsEquipped]:
          "Improved Attack Power with 3+ Great Spears Equipped",
        [EffectKey.improvedAttackPowerWith3PlusGreataxesEquipped]:
          "Improved Attack Power with 3+ Greataxes Equipped",
        [EffectKey.improvedAttackPowerWith3PlusGreatswordsEquipped]:
          "Improved Attack Power with 3+ Greatswords Equipped",
        [EffectKey.improvedAttackPowerWith3PlusHalberdsEquipped]:
          "Improved Attack Power with 3+ Halberds Equipped",
        [EffectKey.improvedAttackPowerWith3PlusHammersEquipped]:
          "Improved Attack Power with 3+ Hammers Equipped",
        [EffectKey.improvedAttackPowerWith3PlusHeavyThrustingSwordsEquipped]:
          "Improved Attack Power with 3+ Heavy Thrusting Swords Equipped",
        [EffectKey.improvedAttackPowerWith3PlusKatanaEquipped]:
          "Improved Attack Power with 3+ Katana Equipped",
        [EffectKey.improvedAttackPowerWith3PlusReapersEquipped]:
          "Improved Attack Power with 3+ Reapers Equipped",
        [EffectKey.improvedAttackPowerWith3PlusSpearsEquipped]:
          "Improved Attack Power with 3+ Spears Equipped",
        [EffectKey.improvedAttackPowerWith3PlusStraightSwordsEquipped]:
          "Improved Attack Power with 3+ Straight Swords Equipped",
        [EffectKey.improvedAttackPowerWith3PlusThrustingSwordsEquipped]:
          "Improved Attack Power with 3+ Thrusting Swords Equipped",
        [EffectKey.improvedAttackPowerWith3PlusTwinbladesEquipped]:
          "Improved Attack Power with 3+ Twinblades Equipped",
        [EffectKey.improvedAttackPowerWith3PlusWhipsEquipped]:
          "Improved Attack Power with 3+ Whips Equipped",
        [EffectKey.improvedAxeAttackPower]: "Improved Axe Attack Power",
        [EffectKey.improvedBestialIncantations]:
          "Improved Bestial Incantations",
        [EffectKey.improvedBloodLossAndFrostResistance]:
          "Improved Blood Loss & Frost Resistance",
        [EffectKey.improvedBloodLossResistance]:
          "Improved Blood Loss Resistance",
        [EffectKey.improvedBowAttackPower]: "Improved Bow Attack Power",
        [EffectKey.improvedCarianSwordSorcery]: "Improved Carian Sword Sorcery",
        [EffectKey.improvedChainAttackFinishers]:
          "Improved Chain Attack Finishers",
        [EffectKey.improvedChargeAttacks]: "Improved Charge Attacks",
        [EffectKey.improvedChargedIncantation]: "Improved Charged Incantation",
        [EffectKey.improvedChargedSkillAttackPower]:
          "Improved Charged Skill Attack Power",
        [EffectKey.improvedChargedSorceries]: "Improved Charged Sorceries",
        [EffectKey.improvedChargedSpellsAndSkills]:
          "Improved Charged Spells & Skills",
        [EffectKey.improvedClawAttackPower]: "Improved Claw Attack Power",
        [EffectKey.improvedColossalSwordAttackPower]:
          "Improved Colossal Sword Attack Power",
        [EffectKey.improvedColossalWeaponAttackPower]:
          "Improved Colossal Weapon Attack Power",
        [EffectKey.improvedCriticalHits]: "Improved Critical Hits",
        [EffectKey.improvedCriticalHitsPlus1]: "Improved Critical Hits +1",
        [EffectKey.improvedCrystalianSorcery]: "Improved Crystalian Sorcery",
        [EffectKey.improvedCurvedGreatswordAttackPower]:
          "Improved Curved Greatsword Attack Power",
        [EffectKey.improvedCurvedSwordAttackPower]:
          "Improved Curved Sword Attack Power",
        [EffectKey.improvedDaggerAttackPower]: "Improved Dagger Attack Power",
        [EffectKey.improvedDamageNegationAtFullHP]:
          "Improved Damage Negation at Full HP",
        [EffectKey.improvedDamageNegationAtLowHP]:
          "Improved Damage Negation at Low HP",
        [EffectKey.improvedDeathBlightResistance]:
          "Improved Death Blight Resistance",
        [EffectKey.improvedDexterity]: "Improved Dexterity",
        [EffectKey.improvedDodging]: "Improved Dodging",
        [EffectKey.improvedDragonCommunionIncantations]:
          "Improved Dragon Communion Incantations",
        [EffectKey.improvedDragonCultIncantations]:
          "Improved Dragon Cult Incantations",
        [EffectKey.improvedFireAttackPower]: "Improved Fire Attack Power",
        [EffectKey.improvedFireDamageNegation]: "Improved Fire Damage Negation",
        [EffectKey.improvedFistAttackPower]: "Improved Fist Attack Power",
        [EffectKey.improvedFlailAttackPower]: "Improved Flail Attack Power",
        [EffectKey.improvedFrenziedFlameIncantations]:
          "Improved Frenzied Flame Incantations",
        [EffectKey.improvedFrostResistance]: "Improved Frost Resistance",
        [EffectKey.improvedFundamentalistIncantations]:
          "Improved Fundamentalist Incantations",
        [EffectKey.improvedGiantsFlameIncantations]:
          "Improved Giants' Flame Incantations",
        [EffectKey.improvedGlintbladeSorcery]: "Improved Glintblade Sorcery",
        [EffectKey.improvedGodslayerIncantations]:
          "Improved Godslayer Incantations",
        [EffectKey.improvedGravitySorcery]: "Improved Gravity Sorcery",
        [EffectKey.improvedGreatHammerAttackPower]:
          "Improved Great Hammer Attack Power",
        [EffectKey.improvedGreatSpearAttackPower]:
          "Improved Great Spear Attack Power",
        [EffectKey.improvedGreataxeAttackPower]:
          "Improved Greataxe Attack Power",
        [EffectKey.improvedGreatswordAttackPower]:
          "Improved Greatsword Attack Power",
        [EffectKey.improvedGuardBreaking]: "Improved Guard Breaking",
        [EffectKey.improvedGuardCounters]: "Improved Guard Counters",
        [EffectKey.improvedGuardingAbility]: "Improved Guarding Ability",
        [EffectKey.improvedGuardingAbilityPlus1]:
          "Improved Guarding Ability +1",
        [EffectKey.improvedGuardingAbilityPlus2]:
          "Improved Guarding Ability +2",
        [EffectKey.improvedHalberdAttackPower]: "Improved Halberd Attack Power",
        [EffectKey.improvedHammerAttackPower]: "Improved Hammer Attack Power",
        [EffectKey.improvedHeavyThrustingSwordAttackPower]:
          "Improved Heavy Thrusting Sword Attack Power",
        [EffectKey.improvedHolyAttackPower]: "Improved Holy Attack Power",
        [EffectKey.improvedHolyDamageNegation]: "Improved Holy Damage Negation",
        [EffectKey.improvedIncantations]: "Improved Incantations",
        [EffectKey.improvedInitialStandardAttack]:
          "Improved Initial Standard Attack",
        [EffectKey.improvedInvisibilitySorcery]:
          "Improved Invisibility Sorcery",
        [EffectKey.improvedItemDiscovery]: "Improved Item Discovery",
        [EffectKey.improvedJumpAttacks]: "Improved Jump Attacks",
        [EffectKey.improvedKatanaAttackPower]: "Improved Katana Attack Power",
        [EffectKey.improvedLightningAttackPower]:
          "Improved Lightning Attack Power",
        [EffectKey.improvedLightningDamageNegation]:
          "Improved Lightning Damage Negation",
        [EffectKey.improvedMadnessResistance]: "Improved Madness Resistance",
        [EffectKey.improvedMagicAttackPower]: "Improved Magic Attack Power",
        [EffectKey.improvedMagicDamageNegation]:
          "Improved Magic Damage Negation",
        [EffectKey.improvedNightSorcery]: "Improved Night Sorcery",
        [EffectKey.improvedNonPhysicalAttackPower]:
          "Improved Non-Physical Attack Power",
        [EffectKey.improvedNonPhysicalDamageNegation]:
          "Improved Non-Physical Damage Negation",
        [EffectKey.improvedPerfumingArts]: "Improved Perfuming Arts",
        [EffectKey.improvedPhysicalAttackPower]:
          "Improved Physical Attack Power",
        [EffectKey.improvedPhysicalDamageNegation]:
          "Improved Physical Damage Negation",
        [EffectKey.improvedPikeAttackPower]: "Improved Pike Attack Power",
        [EffectKey.improvedPoise]: "Improved Poise",
        [EffectKey.improvedPoiseDamageNegationWhenKnockedBackByDamage]:
          "Improved Poise & Damage Negation When Knocked Back by Damage",
        [EffectKey.improvedPoiseNearTotemStela]:
          "Improved Poise Near Totem Stela",
        [EffectKey.improvedPoisonRotResistance]:
          "Improved Poison & Rot Resistance",
        [EffectKey.improvedPoisonResistance]: "Improved Poison Resistance",
        [EffectKey.improvedRangedWeaponAttacks]:
          "Improved Ranged Weapon Attacks",
        [EffectKey.improvedReaperAttackPower]: "Improved Reaper Attack Power",
        [EffectKey.improvedRoarAndBreathAttacks]:
          "Improved Roar & Breath Attacks",
        [EffectKey.improvedRotResistance]: "Improved Rot Resistance",
        [EffectKey.improvedSkillAttackPower]: "Improved Skill Attack Power",
        [EffectKey.improvedSleepMadnessResistance]:
          "Improved Sleep & Madness Resistance",
        [EffectKey.improvedSleepResistance]: "Improved Sleep Resistance",
        [EffectKey.improvedSorceries]: "Improved Sorceries",
        [EffectKey.improvedSpearAttackPower]: "Improved Spear Attack Power",
        [EffectKey.improvedSpellCastingSpeed]: "Improved Spell Casting Speed",
        [EffectKey.improvedStaminaRecovery]: "Improved Stamina Recovery",
        [EffectKey.improvedStaminaRecoveryPlus1]:
          "Improved stamina recovery +1",
        [EffectKey.improvedStanceBreaking]: "Improved Stance-Breaking",
        [EffectKey.improvedStanceBreakingWhenTwoHanding]:
          "Improved Stance-Breaking when Two-Handing",
        [EffectKey.improvedStanceBreakingWhenWieldingTwoArmaments]:
          "Improved Stance-Breaking when Wielding Two Armaments",
        [EffectKey.improvedStanceBreakingWithHeadShots]:
          "Improved Stance-Breaking with Head Shots",
        [EffectKey.improvedStonediggerSorcery]: "Improved Stonedigger Sorcery",
        [EffectKey.improvedStraightSwordAttackPower]:
          "Improved Straight Sword Attack Power",
        [EffectKey.improvedThornSorcery]: "Improved Thorn Sorcery",
        [EffectKey.improvedThrowingKnifeDamage]:
          "Improved Throwing Knife Damage",
        [EffectKey.improvedThrowingPotDamage]: "Improved Throwing Pot Damage",
        [EffectKey.improvedThrowingPots]: "Improved Throwing Pots",
        [EffectKey.improvedGlintstoneAndGravityStoneDamage]:
          "Improved Glintstone and Gravity Stone Damage",
        [EffectKey.improvedThrustingCounterattack]:
          "Improved Thrusting Counterattack",
        [EffectKey.improvedThrustingSwordAttackPower]:
          "Improved Thrusting Sword Attack Power",
        [EffectKey.improvedTwinbladeAttackPower]:
          "Improved Twinblade Attack Power",
        [EffectKey.improvedWhipAttackPower]: "Improved Whip Attack Power",
        [EffectKey.increasedMaximumFP]: "Increased Maximum FP",
        [EffectKey.increasedMaximumHP]: "Increased Maximum HP",
        [EffectKey.increasedMaximumStamina]: "Increased Maximum Stamina",
        [EffectKey.increasedRuneAcquisitionForSelfAndAllies]:
          "Increased rune acquisition for self and allies",
        [EffectKey.intelligencePlus1]: "Intelligence +1",
        [EffectKey.intelligencePlus2]: "Intelligence +2",
        [EffectKey.intelligencePlus3]: "Intelligence +3",
        [EffectKey.itemsConferEffectToAllNearbyAllies]:
          "Items confer effect to all nearby allies",
        [EffectKey.jumpingConjuresMagicProjectiles]:
          "Jumping Conjures Magic Projectiles",
        [EffectKey.lessLikelyToBeTargeted]: "Less Likely to Be Targeted",
        [EffectKey.lightningAttackPowerUp]: "Lightning Attack Power Up",
        [EffectKey.lightningAttackPowerUpPlus1]: "Lightning Attack Power Up +1",
        [EffectKey.lightningAttackPowerUpPlus2]: "Lightning Attack Power Up +2",
        [EffectKey.lightningCriticalHitImbuesArmament]:
          "Lightning Critical Hit Imbues Armament",
        [EffectKey.lightningDamageNegationUp]: "Lightning Damage Negation Up",
        [EffectKey.lightningFollowsChargeAttacks]:
          "Lightning Follows Charge Attacks",
        [EffectKey.lightningGreaseInPossessionAtStartOfExpedition]:
          "Lightning Grease in possession at start of expedition",
        [EffectKey.lightningPotsInPossessionAtStartOfExpedition]:
          "Lightning Pots in possession at start of expedition",
        [EffectKey.lightningUponChargedThrust]: "Lightning upon Charged Thrust",
        [EffectKey.lightningUponDodging]: "Lightning upon Dodging",
        [EffectKey.lightningUponPrecisionAiming]:
          "Lightning upon Precision Aiming",
        [EffectKey.lowHpCritHitFullyRestoresHP]:
          "Low HP Crit. Hit Fully Restores HP",
        [EffectKey.luringEnemiesUponChargedStrike]:
          "Luring Enemies upon Charged Strike",
        [EffectKey.madnessContinuallyRecoversFP]:
          "Madness Continually Recovers FP",
        [EffectKey.madnessCritHitFiresFrenziedFlame]:
          "Madness Crit. Hit Fires Frenzied Flame",
        [EffectKey.madnessIncreasesAttackPower]:
          "Madness Increases Attack Power",
        [EffectKey.madnessProducesAFlameOfFrenzy]:
          "Madness Produces a Flame of Frenzy",
        [EffectKey.magicAttackFollowsChargeAttacks]:
          "Magic Attack Follows Charge Attacks",
        [EffectKey.magicAttackPowerUp]: "Magic Attack Power Up",
        [EffectKey.magicAttackPowerUpPlus1]: "Magic Attack Power Up +1",
        [EffectKey.magicAttackPowerUpPlus2]: "Magic Attack Power Up +2",
        [EffectKey.magicBubblesUponChargedStrike]:
          "Magic Bubbles upon Charged Strike",
        [EffectKey.magicDamageNegationUp]: "Magic Damage Negation Up",
        [EffectKey.magicGreaseInPossessionAtStartOfExpedition]:
          "Magic Grease in possession at start of expedition",
        [EffectKey.magicPotsInPossessionAtStartOfExpedition]:
          "Magic Pots in possession at start of expedition",
        [EffectKey.magmaSurgeSprint]: "Magma Surge Sprint",
        [EffectKey.magmaUponChargedStrike]: "Magma upon Charged Strike",
        [EffectKey.magmaUponDefeatingMultipleEnemies]:
          "Magma upon Defeating Multiple Enemies",
        [EffectKey.magmaUponFireCriticalHit]: "Magma upon Fire Critical Hit",
        [EffectKey.manyPeriodicalGlintblades]: "Many Periodical Glintblades",
        [EffectKey.maxFpPermanentlyIncreasedAfterReleasingSorcerersRiseMechanism]:
          "Max FP permanently increased after releasing Sorcerer's Rise mechanism",
        [EffectKey.maxFpUpWith3PlusSacredSealsEquipped]:
          "Max FP Up with 3+ Sacred Seals Equipped",
        [EffectKey.maxFpUpWith3PlusStavesEquipped]:
          "Max FP Up with 3+ Staves Equipped",
        [EffectKey.maxHpUpWith3PlusGreatshieldsEquipped]:
          "Max HP Up with 3+ Greatshields Equipped",
        [EffectKey.maxHpUpWith3PlusMediumShieldsEquipped]:
          "Max HP Up with 3+ Medium Shields Equipped",
        [EffectKey.maxHpUpWith3PlusSmallShieldsEquipped]:
          "Max HP Up with 3+ Small Shields Equipped",
        [EffectKey.maximumHpDown]: "Maximum HP Down",
        [EffectKey.mindPlus1]: "Mind +1",
        [EffectKey.mindPlus2]: "Mind +2",
        [EffectKey.mindPlus3]: "Mind +3",
        [EffectKey.moreRunesFromDefeatedEnemies]:
          "More Runes From Defeated Enemies",
        [EffectKey.multiplePeriodicalGlintblades]:
          "Multiple Periodical Glintblades",
        [EffectKey.nearbyFrostbiteConcealsSelf]:
          "Nearby Frostbite Conceals Self",
        [EffectKey.noRuneLossOrLevelDownUponDeath]:
          "No Rune Loss or Level Down Upon Death",
        [EffectKey.parriesActivateGoldenRetaliation]:
          "Parries Activate Golden Retaliation",
        [EffectKey.partialHpRestorationUponPostDamageAttacks]:
          "Partial HP Restoration upon Post-Damage Attacks",
        [EffectKey.performingConsecutiveSuccessfulGuardsImprovesGuardAbilityAndDeflectsBigAttacks]:
          "Performing consecutive successful guards improves guard ability and deflects big attacks",
        [EffectKey.periodicalGiantGlintblades]: "Periodical Giant Glintblades",
        [EffectKey.pestThreadsUponChargedThrust]:
          "Pest Threads upon Charged Thrust",
        [EffectKey.phantomAttackUponChargedSlash]:
          "Phantom Attack upon Charged Slash",
        [EffectKey.phantomAttackUponChargedStrike]:
          "Phantom Attack upon Charged Strike",
        [EffectKey.phantomAttackUponChargedThrust]:
          "Phantom Attack upon Charged Thrust",
        [EffectKey.physicalAttackUp]: "Physical Attack Up",
        [EffectKey.physicalAttackUpPlus1]: "Physical Attack Up +1",
        [EffectKey.physicalAttackUpPlus2]: "Physical Attack Up +2",
        [EffectKey.physicalAttackUpPlus3]: "Physical Attack Up +3",
        [EffectKey.poisePlus1]: "Poise +1",
        [EffectKey.poisePlus2]: "Poise +2",
        [EffectKey.poisePlus3]: "Poise +3",
        [EffectKey.poisonAndRotImprovesAttackPower]:
          "Poison & Rot Improves Attack Power",
        [EffectKey.poisonAndRotInVicinityIncreasesAttackPower]:
          "Poison & Rot in Vicinity Increases Attack Power",
        [EffectKey.poisonIncreasesAttackPower]: "Poison Increases Attack Power",
        [EffectKey.poisonMistUponChargedThrust]:
          "Poison Mist upon Charged Thrust",
        [EffectKey.poisonMistUponPoisonCriticalHit]:
          "Poison Mist upon Poison Critical Hit",
        [EffectKey.poisonMistUponPrecisionAiming]:
          "Poison Mist upon Precision Aiming",
        [EffectKey.poisonProducesAMistOfPoison]:
          "Poison Produces a Mist of Poison",
        [EffectKey.poisonboneDartsInPossessionAtStartOfExpedition]:
          "Poisonbone Darts in possession at start of expedition",
        [EffectKey.powerOfDarkMoon]: "Power of Dark Moon",
        [EffectKey.powerOfDespair]: "Power of Despair",
        [EffectKey.powerOfDestinedDeath]: "Power of Destined Death",
        [EffectKey.powerOfDestruction]: "Power of Destruction",
        [EffectKey.powerOfFullMoon]: "Power of Full Moon",
        [EffectKey.powerOfHouseMarais]: "Power of House Marais",
        [EffectKey.powerOfNightAndFlame]: "Power of Night and Flame",
        [EffectKey.powerOfTheAncestralSpirit]: "Power of the Ancestral Spirit",
        [EffectKey.powerOfTheBlasphemous]: "Power of the Blasphemous",
        [EffectKey.powerOfTheBloodLord]: "Power of the Blood Lord",
        [EffectKey.powerOfTheDragonlord]: "Power of the Dragonlord",
        [EffectKey.powerOfTheFirstLord]: "Power of the First Lord",
        [EffectKey.powerOfTheFlyingDragon]: "Power of the Flying Dragon",
        [EffectKey.powerOfTheGeneral]: "Power of the General",
        [EffectKey.powerOfTheGiant]: "Power of the Giant",
        [EffectKey.powerOfTheGoldenLineage]: "Power of the Golden Lineage",
        [EffectKey.powerOfTheGoldenOrder]: "Power of the Golden Order",
        [EffectKey.powerOfTheGreatAncientDragon]:
          "Power of the Great Ancient Dragon",
        [EffectKey.powerOfTheGreaterWill]: "Power of the Greater Will",
        [EffectKey.powerOfTheLightlessVoid]: "Power of the Lightless Void",
        [EffectKey.powerOfTheOmenKing]: "Power of the Omen King",
        [EffectKey.powerOfTheQueen]: "Power of the Queen",
        [EffectKey.powerOfTheStarscourge]: "Power of the Starscourge",
        [EffectKey.powerOfTheUndefeated]: "Power of the Undefeated",
        [EffectKey.powerOfVengeance]: "Power of Vengeance",
        [EffectKey.projectileDamageDropOffReduced]:
          "Projectile Damage Drop-Off Reduced",
        [EffectKey.projectileDamageDropOffReducedPlus1]:
          "Projectile damage drop-off reduced +1",
        [EffectKey.projectilesLaunchedUponAttacks]:
          "Projectiles Launched upon Attacks",
        [EffectKey.projectilesUponChargedStrike]:
          "Projectiles upon Charged Strike",
        [EffectKey.raisedStaminaRecoveryForNearbyAlliesButNotForSelf]:
          "Raised stamina recovery for nearby allies, but not for self",
        [EffectKey.raisesMaximumFpPlus1]: "Raises maximum FP +1",
        [EffectKey.raisesNonPhysicalDamageNegationPlus1]:
          "Raises non-physical damage negation +1",
        [EffectKey.raisesPhysicalAttackPowerPlus1]:
          "Raises physical attack power +1",
        [EffectKey.raisesPhysicalDamageNegationPlus1]:
          "Raises physical damage negation +1",
        [EffectKey.raisesResistanceToAllAilments]:
          "Raises resistance to all ailments",
        [EffectKey.raisesSorceryIncantationPotency]:
          "Raises sorcery/incantation potency",
        [EffectKey.reducedSkillFpCost]: "Reduced Skill FP Cost",
        [EffectKey.reducedSpellFpCost]: "Reduced Spell FP Cost",
        [EffectKey.reducedStaminaConsumption]: "Reduced Stamina Consumption",
        [EffectKey.ringOfLightUponChargedSlash]:
          "Ring of Light upon Charged Slash",
        [EffectKey.roaringFlamesUponChargedSlash]:
          "Roaring Flames upon Charged Slash",
        [EffectKey.rotCriticalHitFiresPestThreads]:
          "Rot Critical Hit Fires Pest Threads",
        [EffectKey.rotMistUponPrecisionAiming]:
          "Rot Mist upon Precision Aiming",
        [EffectKey.rotProducesAMistOfScarletRot]:
          "Rot Produces a Mist of Scarlet Rot",
        [EffectKey.runeDiscountForShopPurchasesWhileOnExpedition]:
          "Rune discount for shop purchases while on expedition",
        [EffectKey.sacredOrderUponHolyCriticalHit]:
          "Sacred Order upon Holy Critical Hit",
        [EffectKey.savageFlamesRoarWhileWalking]:
          "Savage Flames Roar While Walking",
        [EffectKey.shieldGreaseInPossessionAtStartOfExpedition]:
          "Shield Grease in possession at start of expedition",
        [EffectKey.shieldingCreatesHolyGround]: "Shielding Creates Holy Ground",
        [EffectKey.shieldingImprovesDamageNegation]:
          "Shielding Improves Damage Negation",
        [EffectKey.shieldingInvokesIndomitableVow]:
          "Shielding Invokes Indomitable Vow",
        [EffectKey.shockwaveProducedFromSuccessfulGuarding]:
          "Shockwave Produced From Successful Guarding",
        [EffectKey.shockwaveUponChargedStrike]: "Shockwave upon Charged Strike",
        [EffectKey.skillActivationImprovesPoise]:
          "Skill Activation Improves Poise",
        [EffectKey.sleepIncreasesAttackPower]: "Sleep Increases Attack Power",
        [EffectKey.sleepProducesAMistOfSleep]: "Sleep Produces a Mist of Sleep",
        [EffectKey.slowlyRestoreHpForSelfAndNearbyAlliesWhenHpIsLow]:
          "Slowly restore HP for self and nearby allies when HP is low",
        [EffectKey.smallPouchInPossessionAtStartOfExpedition]:
          "Small Pouch in possession at start of expedition",
        [EffectKey.staminaRecoveryUponLandingAttacks]:
          "Stamina Recovery upon Landing Attacks",
        [EffectKey.staminaRecoveryUponLandingAttacksPlus1]:
          "Stamina Recovery upon Landing Attacks +1",
        [EffectKey.starlightShardsInPossessionAtStartOfExpedition]:
          "Starlight Shards in possession at start of expedition",
        [EffectKey.startingArmamentDealsFireDamage]:
          "Starting armament deals fire damage",
        [EffectKey.startingArmamentDealsHolyDamage]:
          "Starting armament deals holy damage",
        [EffectKey.startingArmamentDealsLightningDamage]:
          "Starting armament deals lightning damage",
        [EffectKey.startingArmamentDealsMagicDamage]:
          "Starting armament deals magic damage",
        [EffectKey.startingArmamentInflictsBloodLoss]:
          "Starting armament inflicts blood loss",
        [EffectKey.startingArmamentInflictsFrost]:
          "Starting armament inflicts frost",
        [EffectKey.startingArmamentInflictsPoison]:
          "Starting armament inflicts poison",
        [EffectKey.startingArmamentInflictsScarletRot]:
          "Starting armament inflicts scarlet rot",
        [EffectKey.stoneswordKeyInPossessionAtStartOfExpedition]:
          "Stonesword Key in possession at start of expedition",
        [EffectKey.stormOfRedLightningWhileWalking]:
          "Storm of Red Lightning While Walking",
        [EffectKey.strengthPlus1]: "Strength +1",
        [EffectKey.strengthPlus2]: "Strength +2",
        [EffectKey.strengthPlus3]: "Strength +3",
        [EffectKey.strongAttackCreatesWideWaveOfHeat]:
          "Strong Attack Creates Wide Wave of Heat",
        [EffectKey.strongAttacksImprovePoise]: "Strong Attacks Improve Poise",
        [EffectKey.strongJumpAttacksCreateShockwave]:
          "Strong Jump Attacks Create Shockwave",
        [EffectKey.successfulGuardingUpsDmgNegation]:
          "Successful Guarding Ups Dmg Negation",
        [EffectKey.successfulGuardingUpsPoise]: "Successful Guarding Ups Poise",
        [EffectKey.successiveAttackHpRestoration]:
          "Successive Attack HP Restoration",
        [EffectKey.successiveAttacksBoostAttackPower]:
          "Successive Attacks Boost Attack Power",
        [EffectKey.successiveAttacksNegateDamage]:
          "Successive Attacks Negate Damage",
        [EffectKey.suddenEnemyDeathUponAttacks]:
          "Sudden Enemy Death upon Attacks",
        [EffectKey.surgeSprintLandingsSplitEarth]:
          "Surge Sprint Landings Split Earth",
        [EffectKey.switchingWeaponsAddsAnAffinityAttack]:
          "Switching Weapons Adds an Affinity Attack",
        [EffectKey.switchingWeaponsBoostsAttackPower]:
          "Switching Weapons Boosts Attack Power",
        [EffectKey.takingAttacksImprovesAttackPower]:
          "Taking attacks improves attack power",
        [EffectKey.takingDamageBoostsDamageNegation]:
          "Taking Damage Boosts Damage Negation",
        [EffectKey.takingDamageRestoresFp]: "Taking Damage Restores FP",
        [EffectKey.theDuchessGrief]: "The Duchess' Grief",
        [EffectKey.theExecutorsGrief]: "The Executor's Grief",
        [EffectKey.theGuardiansGrief]: "The Guardian's Grief",
        [EffectKey.theIroneyesGrief]: "The Ironeye's Grief",
        [EffectKey.theRaidersGrief]: "The Raider's Grief",
        [EffectKey.theReclusesGrief]: "The Recluse's Grief",
        [EffectKey.theRevenantsGrief]: "The Revenant's Grief",
        [EffectKey.theWyldersGrief]: "The Wylder's Grief",
        [EffectKey.throwingDaggersInPossessionAtStartOfExpedition]:
          "Throwing Daggers in possession at start of expedition",
        [EffectKey.treasureMarkedUponMap]: "Treasure marked upon map",
        [EffectKey.ultimateArtAutoChargePlus1]: "Ultimate Art Auto Charge +1",
        [EffectKey.ultimateArtAutoChargePlus2]: "Ultimate Art Auto Charge +2",
        [EffectKey.ultimateArtAutoChargePlus3]: "Ultimate Art Auto Charge +3",
        [EffectKey.ultimateArtGaugeChargeSpeedUp]:
          "Ultimate Art Gauge Charge Speed Up",
        [EffectKey.viciousStarRainPoursWhileWalking]:
          "Vicious Star Rain Pours While Walking",
        [EffectKey.vigorPlus1]: "Vigor +1",
        [EffectKey.vigorPlus2]: "Vigor +2",
        [EffectKey.vigorPlus3]: "Vigor +3",
        [EffectKey.wraithCallingBellInPossessionAtStartOfExpedition]:
          "Wraith Calling Bell in possession at start of expedition",
        [EffectKey.wraithsWhileWalking]: "Wraiths While Walking",
        [EffectKey.continuousHPLoss]: "Continuous HP Loss",
        [EffectKey.characterSkillCooldownReductionPlus4]:
          "Character Skill Cooldown Reduction +4",
        [EffectKey.characterSkillCooldownReductionPlus5]:
          "Character Skill Cooldown Reduction +5",
        [EffectKey.ultimateArtAutoChargePlus4]: "Ultimate Art Auto Charge +4",
        [EffectKey.ultimateArtAutoChargePlus5]: "Ultimate Art Auto Charge +5",
        [EffectKey.poisePlus4]: "Poise +4",
        [EffectKey.poisePlus5]: "Poise +5",
        [EffectKey.physicalAttackUpPlus4]: "Physical Attack Up +4",
        [EffectKey.magicAttackPowerUpPlus3]: "Magic Attack Power Up +3",
        [EffectKey.magicAttackPowerUpPlus4]: "Magic Attack Power Up +4",
        [EffectKey.fireAttackPowerUpPlus3]: "Fire Attack Power Up +3",
        [EffectKey.fireAttackPowerUpPlus4]: "Fire Attack Power Up +4",
        [EffectKey.lightningAttackPowerUpPlus3]: "Lightning Attack Power Up +3",
        [EffectKey.lightningAttackPowerUpPlus4]: "Lightning Attack Power Up +4",
        [EffectKey.holyAttackPowerUpPlus3]: "Holy Attack Power Up +3",
        [EffectKey.holyAttackPowerUpPlus4]: "Holy Attack Power Up +4",
        [EffectKey.improvedMagicDamageNegationPlus1]:
          "Improved Magic Damage Negation +1",
        [EffectKey.improvedMagicDamageNegationPlus2]:
          "Improved Magic Damage Negation +2",
        [EffectKey.improvedFireDamageNegationPlus1]:
          "Improved Fire Damage Negation +1",
        [EffectKey.improvedFireDamageNegationPlus2]:
          "Improved Fire Damage Negation +2",
        [EffectKey.improvedLightningDamageNegationPlus1]:
          "Improved Lightning Damage Negation +1",
        [EffectKey.improvedLightningDamageNegationPlus2]:
          "Improved Lightning Damage Negation +2",
        [EffectKey.improvedHolyDamageNegationPlus1]:
          "Improved Holy Damage Negation +1",
        [EffectKey.improvedHolyDamageNegationPlus2]:
          "Improved Holy Damage Negation +2",
        [EffectKey.improvedPoisonResistancePlus1]:
          "Improved Poison Resistance +1",
        [EffectKey.improvedPoisonResistancePlus2]:
          "Improved Poison Resistance +2",
        [EffectKey.improvedBloodLossResistancePlus1]:
          "Improved Blood Loss Resistance +1",
        [EffectKey.improvedBloodLossResistancePlus2]:
          "Improved Blood Loss Resistance +2",
        [EffectKey.improvedSleepResistancePlus1]:
          "Improved Sleep Resistance +1",
        [EffectKey.improvedSleepResistancePlus2]:
          "Improved Sleep Resistance +2",
        [EffectKey.improvedDeathBlightResistancePlus1]:
          "Improved Death Blight Resistance +1",
        [EffectKey.improvedDeathBlightResistancePlus2]:
          "Improved Death Blight Resistance +2",
        [EffectKey.improvedRotResistancePlus1]: "Improved Rot Resistance +1",
        [EffectKey.improvedRotResistancePlus2]: "Improved Rot Resistance +2",
        [EffectKey.improvedFrostResistancePlus1]:
          "Improved Frost Resistance +1",
        [EffectKey.improvedFrostResistancePlus2]:
          "Improved Frost Resistance +2",
        [EffectKey.improvedMadnessResistancePlus1]:
          "Improved Madness Resistance +1",
        [EffectKey.improvedMadnessResistancePlus2]:
          "Improved Madness Resistance +2",
        [EffectKey.partialHPRestorationUponPostDamageAttacksPlus1]:
          "Partial HP Restoration upon Post-Damage Attacks +1",
        [EffectKey.partialHPRestorationUponPostDamageAttacksPlus2]:
          "Partial HP Restoration upon Post-Damage Attacks +2",
        [EffectKey.hpRestoredWhenUsingMedicinalBolusesEtcPlus1]:
          "HP restored when using medicinal boluses, etc. +1",
        [EffectKey.hpRestoredWhenUsingMedicinalBolusesEtcPlus2]:
          "HP restored when using medicinal boluses, etc. +2",
        [EffectKey.artGaugeChargedFromSuccessfulGuardingPlus1]:
          "Art gauge charged from successful guarding +1",
        [EffectKey.artGaugeChargedFromSuccessfulGuardingPlus2]:
          "Art gauge charged from successful guarding +2",
        [EffectKey.artGaugeFillsModeratelyUponCriticalHitPlus1]:
          "Art gauge fills moderately upon critical hit +1",
        [EffectKey.artGaugeFillsModeratelyUponCriticalHitPlus2]:
          "Art gauge fills moderately upon critical hit +2",
        [EffectKey.physicalAttackPowerIncreasesAfterUsingGreaseItemsPlus1]:
          "Physical attack power increases after using grease items +1",
        [EffectKey.physicalAttackPowerIncreasesAfterUsingGreaseItemsPlus2]:
          "Physical attack power increases after using grease items +2",
        [EffectKey.criticalHitBoostsStaminaRecoverySpeedPlus1]:
          "Critical Hit Boosts Stamina Recovery Speed +1",
        [EffectKey.improvedGuardCountersPlus1]: "Improved Guard Counters +1",
        [EffectKey.improvedGuardCountersPlus2]: "Improved Guard Counters +2",
        [EffectKey.improvedThrowingPotDamagePlus1]:
          "Improved Throwing Pot Damage +1",
        [EffectKey.improvedThrowingPotDamagePlus2]:
          "Improved Throwing Pot Damage +2",
        [EffectKey.improvedThrowingKnifeDamagePlus1]:
          "Improved Throwing Knife Damage +1",
        [EffectKey.improvedThrowingKnifeDamagePlus2]:
          "Improved Throwing Knife Damage +2",
        [EffectKey.improvedGlintstoneAndGravityStoneDamagePlus1]:
          "Improved Glintstone and Gravity Stone Damage +1",
        [EffectKey.improvedGlintstoneAndGravityStoneDamagePlus2]:
          "Improved Glintstone and Gravity Stone Damage +2",
        [EffectKey.improvedRoarAndBreathAttacksPlus1]:
          "Improved Roar & Breath Attacks +1",
        [EffectKey.improvedRoarAndBreathAttacksPlus2]:
          "Improved Roar & Breath Attacks +2",
        [EffectKey.improvedPerfumingArtsPlus1]: "Improved Perfuming Arts +1",
        [EffectKey.improvedPerfumingArtsPlus2]: "Improved Perfuming Arts +2",
        [EffectKey.maxHPIncreasedForEachGreatEnemyDefeatedAtAGreatChurch]:
          "Max HP increased for each great enemy defeated at a Great Church.",
        [EffectKey.runesAndItemDiscoveryIncreasedForEachGreatEnemyDefeatedAtAFort]:
          "Runes and Item Discovery increased for each great enemy defeated at a Fort",
        [EffectKey.arcaneIncreasedForEachGreatEnemyDefeatedAtARuin]:
          "Arcane increased for each great enemy defeated at a Ruin",
        [EffectKey.maxStaminaIncreasedForEachGreatEnemyDefeatedAtAGreatEncampment]:
          "Max stamina increased for each great enemy defeated at a Great Encampment",
        [EffectKey.defeatingEnemiesFillsMoreOfTheArtGaugePlus1]:
          "Defeating enemies fills more of the Art gauge +1",
        [EffectKey.defeatingEnemiesFillsMoreOfTheArtGaugePlus2]:
          "Defeating enemies fills more of the Art gauge +2",
        [EffectKey.hpRestorationUponThrustingCounterattackPlus1]:
          "HP Restoration upon Thrusting Counterattack +1",
        [EffectKey.hpRestorationUponThrustingCounterattackPlus2]:
          "HP Restoration upon Thrusting Counterattack +2",
        [EffectKey.attackPowerUpWhenFacingPoisonAfflictedEnemyPlus1]:
          "Attack power up when facing poison-afflicted enemy +1",
        [EffectKey.attackPowerUpWhenFacingPoisonAfflictedEnemyPlus2]:
          "Attack power up when facing poison-afflicted enemy +2",
        [EffectKey.attackPowerUpWhenFacingScarletRotAfflictedEnemyPlus1]:
          "Attack power up when facing scarlet rot-afflicted enemy +1",
        [EffectKey.attackPowerUpWhenFacingScarletRotAfflictedEnemyPlus2]:
          "Attack power up when facing scarlet rot-afflicted enemy +2",
        [EffectKey.attackPowerUpWhenFacingFrostbiteAfflictedEnemyPlus1]:
          "Attack power up when facing frostbite-afflicted enemy +1",
        [EffectKey.attackPowerUpWhenFacingFrostbiteAfflictedEnemyPlus2]:
          "Attack power up when facing frostbite-afflicted enemy +2",
        [EffectKey.guardianCharacterSkillBoostsDamageNegationOfNearbyAllies]:
          "[Guardian] Character Skill Boosts Damage Negation of Nearby Allies",
        [EffectKey.ironeyeCharacterSkillInflictsHeavyPoisonDamageOnPoisonedEnemies]:
          "[Ironeye] Character Skill Inflicts Heavy Poison Damage on Poisoned Enemies",
        [EffectKey.duchessUseCharacterSkillForBriefInvulnerability]:
          "[Duchess] Use Character Skill for Brief Invulnerability",
        [EffectKey.raiderHitWithCharacterSkillToReduceEnemyAttackPower]:
          "[Raider] Hit With Character Skill to Reduce Enemy Attack Power",
        [EffectKey.revenantIncreasedMaxFPUponAbilityActivation]:
          "[Revenant] Increased Max FP upon Ability Activation",
        [EffectKey.recluseCollectAffinityResiduesToNegateAffinity]:
          "[Recluse] Collect Affinity Residues to Negate Affinity",
        [EffectKey.executorSlowlyRestoreHPUponAbilityActivation]:
          "[Executor] Slowly Restore HP upon Ability Activation",
        [EffectKey.sleepInVicinityImprovesAttackPower]:
          "Sleep in Vicinity Improves Attack Power",
        [EffectKey.sleepInVicinityImprovesAttackPowerPlus1]:
          "Sleep in Vicinity Improves Attack Power +1",
        [EffectKey.sleepInVicinityImprovesAttackPowerPlus2]:
          "Sleep in Vicinity Improves Attack Power +2",
        [EffectKey.madnessInVicinityImprovesAttackPower]:
          "Madness in Vicinity Improves Attack Power",
        [EffectKey.madnessInVicinityImprovesAttackPowerPlus1]:
          "Madness in Vicinity Improves Attack Power +1",
        [EffectKey.madnessInVicinityImprovesAttackPowerPlus2]:
          "Madness in Vicinity Improves Attack Power +2",
        [EffectKey.reducedFPConsumption]: "Reduced FP Consumption",
        [EffectKey.reducedFPConsumptionPlus1]: "Reduced FP Consumption +1",
        [EffectKey.reducedFPConsumptionPlus2]: "Reduced FP Consumption +2",
        [EffectKey.improvedAffinityAttackPower]:
          "Improved Affinity Attack Power",
        [EffectKey.improvedAffinityAttackPowerPlus1]:
          "Improved Affinity Attack Power +1",
        [EffectKey.improvedAffinityAttackPowerPlus2]:
          "Improved Affinity Attack Power +2",
        [EffectKey.improvedPhysicalDamageNegationPlus1]:
          "Improved Physical Damage Negation +1",
        [EffectKey.improvedPhysicalDamageNegationPlus2]:
          "Improved Physical Damage Negation +2",
        [EffectKey.improvedAffinityDamageNegation]:
          "Improved Affinity Damage Negation",
        [EffectKey.improvedAffinityDamageNegationPlus1]:
          "Improved Affinity Damage Negation +1",
        [EffectKey.improvedAffinityDamageNegationPlus2]:
          "Improved Affinity Damage Negation +2",
        [EffectKey.improvedSorceriesPlus1]: "Improved Sorceries +1",
        [EffectKey.improvedSorceriesPlus2]: "Improved Sorceries +2",
        [EffectKey.improvedIncantationsPlus1]: "Improved Incantations +1",
        [EffectKey.improvedIncantationsPlus2]: "Improved Incantations +2",
        [EffectKey.improvedFlaskHPRestoration]: "Improved Flask HP Restoration",
        [EffectKey.crimsonspillCrystalTearInPossessionAtStartOfExpedition]:
          "Crimsonspill Crystal Tear in possession at start of expedition",
        [EffectKey.crimsonCrystalTearInPossessionAtStartOfExpedition]:
          "Crimson Crystal Tear in possession at start of expedition",
        [EffectKey.ceruleanCrystalTearInPossessionAtStartOfExpedition]:
          "Cerulean Crystal Tear in possession at start of expedition",
        [EffectKey.speckledHardtearInPossessionAtStartOfExpedition]:
          "Speckled Hardtear in possession at start of expedition",
        [EffectKey.crimsonBubbletearInPossessionAtStartOfExpedition]:
          "Crimson Bubbletear in possession at start of expedition",
        [EffectKey.opalineBubbletearInPossessionAtStartOfExpedition]:
          "Opaline Bubbletear in possession at start of expedition",
        [EffectKey.crimsonburstCrystalTearInPossessionAtStartOfExpedition]:
          "Crimsonburst Crystal Tear in possession at start of expedition",
        [EffectKey.greenburstCrystalTearInPossessionAtStartOfExpedition]:
          "Greenburst Crystal Tear in possession at start of expedition",
        [EffectKey.opalineHardtearInPossessionAtStartOfExpedition]:
          "Opaline Hardtear in possession at start of expedition",
        [EffectKey.thornyCrackedTearInPossessionAtStartOfExpedition]:
          "Thorny Cracked Tear in possession at start of expedition",
        [EffectKey.spikedCrackedTearInPossessionAtStartOfExpedition]:
          "Spiked Cracked Tear in possession at start of expedition",
        [EffectKey.windyCrystalTearInPossessionAtStartOfExpedition]:
          "Windy Crystal Tear in possession at start of expedition",
        [EffectKey.rupturedCrystalTearInPossessionAtStartOfExpedition]:
          "Ruptured Crystal Tear in possession at start of expedition",
        [EffectKey.leadenHardtearInPossessionAtStartOfExpedition]:
          "Leaden Hardtear in possession at start of expedition",
        [EffectKey.twiggyCrackedTearInPossessionAtStartOfExpedition]:
          "Twiggy Cracked Tear in possession at start of expedition",
        [EffectKey.crimsonwhorlBubbletearInPossessionAtStartOfExpedition]:
          "Crimsonwhorl Bubbletear in possession at start of expedition",
        [EffectKey.ceruleanHiddenTearInPossessionAtStartOfExpedition]:
          "Cerulean Hidden Tear in possession at start of expedition",
        [EffectKey.stonebarbCrackedTearInPossessionAtStartOfExpedition]:
          "Stonebarb Cracked Tear in possession at start of expedition",
        [EffectKey.flameShroudingCrackedTearInPossessionAtStartOfExpedition]:
          "Flame-Shrouding Cracked Tear in possession at start of expedition",
        [EffectKey.magicShroudingCrackedTearInPossessionAtStartOfExpedition]:
          "Magic-Shrouding Cracked Tear in possession at start of expedition",
        [EffectKey.lightningShroudingCrackedTearInPossessionAtStartOfExpedition]:
          "Lightning-Shrouding Cracked Tear in possession at start of expedition",
        [EffectKey.holyShroudingCrackedTearInPossessionAtStartOfExpedition]:
          "Holy-Shrouding Cracked Tear in possession at start of expedition",
        [EffectKey.upliftingAromaticInPossessionAtStartOfExpedition]:
          "Uplifting Aromatic in possession at start of expedition",
        [EffectKey.sparkAromaticInPossessionAtStartOfExpedition]:
          "Spark Aromatic in possession at start of expedition",
        [EffectKey.ironjarAromaticInPossessionAtStartOfExpedition]:
          "Ironjar Aromatic in possession at start of expedition",
        [EffectKey.bloodboilAromaticInPossessionAtStartOfExpedition]:
          "Bloodboil Aromatic in possession at start of expedition",
        [EffectKey.poisonSpraymistInPossessionAtStartOfExpedition]:
          "Poison Spraymist in possession at start of expedition",
        [EffectKey.acidSpraymistInPossessionAtStartOfExpedition]:
          "Acid Spraymist in possession at start of expedition",
        [EffectKey.dormantPowerHelpsDiscoverDaggers]:
          "Dormant Power Helps Discover Daggers",
        [EffectKey.dormantPowerHelpsDiscoverStraightSwords]:
          "Dormant Power Helps Discover Straight Swords",
        [EffectKey.dormantPowerHelpsDiscoverGreatswords]:
          "Dormant Power Helps Discover Greatswords",
        [EffectKey.dormantPowerHelpsDiscoverColossalSwords]:
          "Dormant Power Helps Discover Colossal Swords",
        [EffectKey.dormantPowerHelpsDiscoverCurvedSwords]:
          "Dormant Power Helps Discover Curved Swords",
        [EffectKey.dormantPowerHelpsDiscoverCurvedGreatswords]:
          "Dormant Power Helps Discover Curved Greatswords",
        [EffectKey.dormantPowerHelpsDiscoverKatana]:
          "Dormant Power Helps Discover Katana",
        [EffectKey.dormantPowerHelpsDiscoverTwinblades]:
          "Dormant Power Helps Discover Twinblades",
        [EffectKey.dormantPowerHelpsDiscoverThrustingSwords]:
          "Dormant Power Helps Discover Thrusting Swords",
        [EffectKey.dormantPowerHelpsDiscoverHeavyThrustingSwords]:
          "Dormant Power Helps Discover Heavy Thrusting Swords",
        [EffectKey.dormantPowerHelpsDiscoverAxes]:
          "Dormant Power Helps Discover Axes",
        [EffectKey.dormantPowerHelpsDiscoverGreataxes]:
          "Dormant Power Helps Discover Greataxes",
        [EffectKey.dormantPowerHelpsDiscoverHammers]:
          "Dormant Power Helps Discover Hammers",
        [EffectKey.dormantPowerHelpsDiscoverGreatHammers]:
          "Dormant Power Helps Discover Great Hammers",
        [EffectKey.dormantPowerHelpsDiscoverFlails]:
          "Dormant Power Helps Discover Flails",
        [EffectKey.dormantPowerHelpsDiscoverSpears]:
          "Dormant Power Helps Discover Spears",
        [EffectKey.dormantPowerHelpsDiscoverGreatSpears]:
          "Dormant Power Helps Discover Great Spears",
        [EffectKey.dormantPowerHelpsDiscoverHalberds]:
          "Dormant Power Helps Discover Halberds",
        [EffectKey.dormantPowerHelpsDiscoverReapers]:
          "Dormant Power Helps Discover Reapers",
        [EffectKey.dormantPowerHelpsDiscoverFists]:
          "Dormant Power Helps Discover Fists",
        [EffectKey.dormantPowerHelpsDiscoverClaws]:
          "Dormant Power Helps Discover Claws",
        [EffectKey.dormantPowerHelpsDiscoverWhips]:
          "Dormant Power Helps Discover Whips",
        [EffectKey.dormantPowerHelpsDiscoverColossalWeapons]:
          "Dormant Power Helps Discover Colossal Weapons",
        [EffectKey.dormantPowerHelpsDiscoverBows]:
          "Dormant Power Helps Discover Bows",
        [EffectKey.dormantPowerHelpsDiscoverGreatbows]:
          "Dormant Power Helps Discover Greatbows",
        [EffectKey.dormantPowerHelpsDiscoverCrossbows]:
          "Dormant Power Helps Discover Crossbows",
        [EffectKey.dormantPowerHelpsDiscoverBallistas]:
          "Dormant Power Helps Discover Ballistas",
        [EffectKey.dormantPowerHelpsDiscoverSmallShields]:
          "Dormant Power Helps Discover Small Shields",
        [EffectKey.dormantPowerHelpsDiscoverMediumShields]:
          "Dormant Power Helps Discover Medium Shields",
        [EffectKey.dormantPowerHelpsDiscoverGreatshields]:
          "Dormant Power Helps Discover Greatshields",
        [EffectKey.dormantPowerHelpsDiscoverStaves]:
          "Dormant Power Helps Discover Staves",
        [EffectKey.dormantPowerHelpsDiscoverSacredSeals]:
          "Dormant Power Helps Discover Sacred Seals",
        [EffectKey.dormantPowerHelpsDiscoverTorches]:
          "Dormant Power Helps Discover Torches",
        [EffectKey.wylderImprovedMindReducedVigor]:
          "[Wylder] Improved Mind, Reduced Vigor",
        [EffectKey.wylderImprovedIntelligenceAndFaithReducedStrengthAndDexterity]:
          "[Wylder] Improved Intelligence and Faith, Reduced Strength and Dexterity",
        [EffectKey.guardianImprovedStrengthAndDexterityReducedVigor]:
          "[Guardian] Improved Strength and Dexterity, Reduced Vigor",
        [EffectKey.guardianImprovedMindAndFaithReducedVigor]:
          "[Guardian] Improved Mind and Faith, Reduced Vigor",
        [EffectKey.ironeyeImprovedArcaneReducedDexterity]:
          "[Ironeye] Improved Arcane, Reduced Dexterity",
        [EffectKey.ironeyeImprovedVigorAndStrengthReducedDexterity]:
          "[Ironeye] Improved Vigor and Strength, Reduced Dexterity",
        [EffectKey.duchessImprovedVigorAndStrengthReducedMind]:
          "[Duchess] Improved Vigor and Strength, Reduced Mind",
        [EffectKey.duchessImprovedMindAndFaithReducedIntelligence]:
          "[Duchess] Improved Mind and Faith, Reduced Intelligence",
        [EffectKey.raiderImprovedMindAndIntelligenceReducedVigorAndEndurance]:
          "[Raider] Improved Mind and Intelligence, Reduced Vigor and Endurance",
        [EffectKey.raiderImprovedArcaneReducedVigor]:
          "[Raider] Improved Arcane, Reduced Vigor",
        [EffectKey.revenantImprovedVigorAndEnduranceReducedMind]:
          "[Revenant] Improved Vigor and Endurance, Reduced Mind",
        [EffectKey.revenantImprovedStrengthReducedFaith]:
          "[Revenant] Improved Strength, Reduced Faith",
        [EffectKey.recluseImprovedVigorEnduranceAndDexterityReducedIntelligenceAndFaith]:
          "[Recluse] Improved Vigor, Endurance, and Dexterity, Reduced Intelligence and Faith",
        [EffectKey.recluseImprovedIntelligenceAndFaithReducedMind]:
          "[Recluse] Improved Intelligence and Faith, Reduced Mind",
        [EffectKey.executorImprovedVigorAndEnduranceReducedArcane]:
          "[Executor] Improved Vigor and Endurance, Reduced Arcane",
        [EffectKey.executorImprovedDexterityAndArcaneReducedVigor]:
          "[Executor] Improved Dexterity and Arcane, Reduced Vigor",
        [EffectKey.reducedVigor]: "Reduced Vigor",
        [EffectKey.reducedEndurance]: "Reduced Endurance",
        [EffectKey.takingDamageCausesPoisonBuildup]:
          "Taking Damage Causes Poison Buildup",
        [EffectKey.takingDamageCausesRotBuildup]:
          "Taking Damage Causes Rot Buildup",
        [EffectKey.takingDamageCausesFrostBuildup]:
          "Taking Damage Causes Frost Buildup",
        [EffectKey.takingDamageCausesBloodLossBuildup]:
          "Taking Damage Causes Blood Loss Buildup",
        [EffectKey.takingDamageCausesMadnessBuildup]:
          "Taking Damage Causes Madness Buildup",
        [EffectKey.takingDamageCausesSleepBuildup]:
          "Taking Damage Causes Sleep Buildup",
        [EffectKey.takingDamageCausesDeathBuildup]:
          "Taking Damage Causes Death Buildup",
        [EffectKey.reducedStrengthAndIntelligence]:
          "Reduced Strength and Intelligence",
        [EffectKey.reducedDexterityAndFaith]: "Reduced Dexterity and Faith",
        [EffectKey.reducedIntelligenceAndDexterity]:
          "Reduced Intelligence and Dexterity",
        [EffectKey.reducedFaithAndStrength]: "Reduced Faith and Strength",
        [EffectKey.reducedVigorAndArcane]: "Reduced Vigor and Arcane",
        [EffectKey.reducedRuneAcquisition]: "Reduced Rune Acquisition",
        [EffectKey.reducedFlaskHPRestoration]: "Reduced Flask HP Restoration",
        [EffectKey.ultimateArtChargingImpaired]:
          "Ultimate Art Charging Impaired",
        [EffectKey.impairedAffinityDamageNegation]:
          "Impaired Affinity Damage Negation",
        [EffectKey.allResistancesDown]: "All Resistances Down",
        [EffectKey.surgeSprintingDrainsMoreStamina]:
          "Surge Sprinting Drains More Stamina",
        [EffectKey.increasedDrainOnStaminaForEvasion]:
          "Increased Drain on Stamina for Evasion",
        [EffectKey.moreDamageTakenAfterEvasion]:
          "More Damage Taken After Evasion",
        [EffectKey.repeatedEvasionsLowerDamageNegation]:
          "Repeated Evasions Lower Damage Negation",
        [EffectKey.reducedDamageNegationForFlaskUsages]:
          "Reduced Damage Negation for Flask Usages",
        [EffectKey.sleepBuildupForFlaskUsages]:
          "Sleep Buildup for Flask Usages",
        [EffectKey.madnessBuildupForFlaskUsages]:
          "Madness Buildup for Flask Usages",
        [EffectKey.lowerAttackWhenBelowMaxHP]: "Lower Attack When Below Max HP",
        [EffectKey.poisonBuildupWhenBelowMaxHP]:
          "Poison Buildup When Below Max HP",
        [EffectKey.rotBuildupWhenBelowMaxHP]: "Rot Buildup When Below Max HP",
        [EffectKey.maxHPReducesAttackPower]: "Max HP Reduces Attack Power",
        [EffectKey.nearDeathSpillsFlask]: "Near Death Spills Flask",
        [EffectKey.nearDeathReducesMaxHP]: "Near Death Reduces Max HP",
        [EffectKey.improvedGreatbowAttackPower]:
          "Improved Greatbow Attack Power",
        [EffectKey.improvedCrossbowAttackPower]:
          "Improved Crossbow Attack Power",
        [EffectKey.improvedBallistaAttackPower]:
          "Improved Ballista Attack Power",
        [EffectKey.hpRestorationUponGreatbowAttacks]:
          "HP Restoration upon Greatbow Attacks",
        [EffectKey.hpRestorationUponCrossbowAttacks]:
          "HP Restoration upon Crossbow Attacks",
        [EffectKey.hpRestorationUponBallistaAttacks]:
          "HP Restoration upon Ballista Attacks",
        [EffectKey.fpRestorationUponGreatbowAttacks]:
          "FP Restoration upon Greatbow Attacks",
        [EffectKey.fpRestorationUponCrossbowAttacks]:
          "FP Restoration upon Crossbow Attacks",
        [EffectKey.fpRestorationUponBallistaAttacks]:
          "FP Restoration upon Ballista Attacks",
        [EffectKey.reducedMaximumHP]: "Reduced Maximum HP",
        [EffectKey.reducedMaximumFP]: "Reduced Maximum FP",
        [EffectKey.reducedMaximumStamina]: "Reduced Maximum Stamina",
        [EffectKey.nightsTideDamageIncreased]: "Night's Tide Damage Increased",
        [EffectKey.damageIncreasedByNightsEncroachment]:
          "Damage Increased by Night's Encroachment",
        [EffectKey.slowerArtGaugeWhenBelowMaxHP]:
          "Slower Art Gauge When Below Max HP",
        [EffectKey.lowerStaminaImpairsDmgNegation]:
          "Lower Stamina Impairs Dmg Negation",
        [EffectKey.attacksImpairedOnOccasion]: "Attacks Impaired on Occasion",
        [EffectKey.ailmentsCauseIncreasedDamage]:
          "Ailments Cause Increased Damage",
        [EffectKey.nearDeathReducesArtGauge]: "Near Death Reduces Art Gauge",
        [EffectKey.allResistancesUp]: "All Resistances Up",
        [EffectKey.improvedSorceriesAndIncantations]:
          "Improved Sorceries & Incantations",
        [EffectKey.increasedSorceryAndIncantationDuration]:
          "Increased Sorcery & Incantation Duration",
        [EffectKey.scholarAlliesTargetedByCharacterSkillGainBoostedAttack]:
          "[Scholar] Allies Targeted by Character Skill gain boosted attack",
        [EffectKey.scholarReducedFpConsumptionWhenUsingCharacterSkillOnSelf]:
          "[Scholar] Reduced FP consumption when using Character Skill on self",
        [EffectKey.undertakerExecutingArtReadiesCharacterSkill]:
          "[Undertaker] Executing Art readies Character Skill",
        [EffectKey.greenspillCrystalTearInPossessionAtStartOfExpedition]:
          "Greenspill Crystal Tear in possession at start of expedition",
        [EffectKey.scholarImprovedMindReducedVigor]:
          "[Scholar] Improved Mind, Reduced Vigor",
        [EffectKey.scholarImprovedEnduranceAndDexterityReducedIntelligenceAndArcane]:
          "[Scholar] Improved Endurance and Dexterity, Reduced Intelligence and Arcane",
        [EffectKey.undertakerImprovedDexterityReducedVigorAndFaith]:
          "[Undertaker] Improved Dexterity, Reduced Vigor and Faith",
        [EffectKey.undertakerImprovedMindAndFaithReducedStrength]:
          "[Undertaker] Improved Mind and Faith, Reduced Strength",
        [EffectKey.continuousFpRecovery]: "Continuous FP Recovery",
        [EffectKey.improvedMeleeAttackPower]: "Improved Melee Attack Power",
        [EffectKey.scholarPreventSlowingOfCharacterSkillProgress]:
          "[Scholar] Prevent slowing of Character Skill Progress",
        [EffectKey.scholarContinuousDamageInflictedOnTargetsThreadedByUltimateArt]:
          "[Scholar] Continuous damage inflicted on targets threaded by Ultimate Art",
        [EffectKey.scholarEarnRunesForEachAdditionalSpecimenAcquiredWithCharacterSkill]:
          "[Scholar] Earn runes for each additional specimen acquired with Character Skill",
        [EffectKey.undertakerActivatingUltimateArtIncreasesAttackPower]:
          "[Undertaker] Activating Ultimate Art increases attack power",
        [EffectKey.undertakerAttackPowerIncreasedByLandingTheFinalBlowOfAChainAttack]:
          "[Undertaker] Attack power increased by landing the final blow of a chain attack",
        [EffectKey.undertakerPhysicalAttacksBoostedWhileAssistEffectFromIncantationIsActiveForSelf]:
          "[Undertaker] Physical attacks boosted while assist effect from incantation is active for self",
        [EffectKey.undertakerContactWithAlliesRestoresTheirHpWhileUltimateArtIsActivated]:
          "[Undertaker] Contact with allies restores their HP while Ultimate Art is activated",
        [EffectKey.statusAilmentGaugesSlowlyIncreaseAttackPower]:
          "Status Ailment Gauges Slowly Increase Attack Power",
        [EffectKey.occasionallyNullifyAttacksWhenDamageNegationsIsLowered]:
          "Occasionally Nullify Attacks When Damage Negation is Lowered",
        [EffectKey.attacksInflictRotWhenDamageIsTaken]:
          "Attacks Inflict Rot when Damage is Taken",
        [EffectKey.rotInVicinityCausesContinuousHpRecovery]:
          "Rot in Vicinity Causes Continuous HP Recovery",
        [EffectKey.changesCompatibleArmamentsSorceryToMagicGlintbladeAtStartOfExpedition]:
          "Changes compatible armament's sorcery to Magic Glintblade at start of expedition",
        [EffectKey.changesCompatibleArmamentsSorceryToCarianGreatswordAtStartOfExpedition]:
          "Changes compatible armament's sorcery to Carian Greatsword at start of expedition",
        [EffectKey.changesCompatibleArmamentsSorceryToNightShardAtStartOfExpedition]:
          "Changes compatible armament's sorcery to Night Shard at start of expedition",
        [EffectKey.changesCompatibleArmamentsSorceryToMagmaShotAtStartOfExpedition]:
          "Changes compatible armament's sorcery to Magma Shot at start of expedition",
        [EffectKey.changesCompatibleArmamentsSorceryToBriarsOfPunishmentAtStartOfExpedition]:
          "Changes compatible armament's sorcery to Briars of Punishment at start of expedition",
        [EffectKey.changesCompatibleArmamentsIncantationToWrathOfGoldAtStartOfExpedition]:
          "Changes compatible armament's incantation to Wrath of Gold at start of expedition",
        [EffectKey.changesCompatibleArmamentsIncantationToLightningSpearAtStartOfExpedition]:
          "Changes compatible armament's incantation to Lightning Spear at start of expedition",
        [EffectKey.changesCompatibleArmamentsIncantationToOFlameAtStartOfExpedition]:
          "Changes compatible armament's incantation to O, Flame! at start of expedition",
        [EffectKey.changesCompatibleArmamentsIncantationToBeastClawAtStartOfExpedition]:
          "Changes compatible armament's incantation to Beast Claw at start of expedition",
        [EffectKey.changesCompatibleArmamentsIncantationToDragonfireAtStartOfExpedition]:
          "Changes compatible armament's incantation to Dragonfire at start of expedition",
        [EffectKey.allResistanceUp]: "All Resistance Up",
        [EffectKey.runeOfTheStrong]: "Rune of the Strong",
      },
    },
  },

  ja: {
    translation: {
      relicBrowserTab: "リリックブラウザ",
      character: "キャラクター",
      searchPlaceholder: "リリック名または効果で検索...",
      outclassedChipLabel: "比較",
      noAdvancedFiltersActive: "詳細フィルターは未設定です",
      filtersActiveCountSingular: "{{count}}件のフィルターが有効",
      filtersActiveCountPlural: "{{count}}件のフィルターが有効",
      clearAllButton: "すべてクリア",
      requiredGroupHint: "必須条件（各行：いずれか1つを満たすリリック）",
      addEffectPlaceholder: "効果を追加...",
      addGroupButton: "条件グループを追加",
      excludedGroupHint: "除外条件（以下のいずれも持たないリリック）",
      addExcludedEffectPlaceholder: "除外する効果を追加...",
      comparisonAtLeastTooltip: "この数値以上（クリックで「以下」に切り替え）",
      comparisonAtMostTooltip: "この数値以下（クリックで「以上」に切り替え）",
      depthsRelicLabel: "深層遺物",
      relicLabel: "遺物",
      deepRelicsPlural: "深層遺物",
      relicsPlural: "遺物",
      noRelicsFoundTemplate: "該当する{{color}}{{type}}が見つかりません。",
      coordinatesHelpPrefix: "この座標は、ゲーム内で「発見順」で並び替え、色は",
      coordinatesHelpMiddle: "、種類は",
      coordinatesHelpSuffix: "で確認できます。",
      coordinatesHelpSimple: "この座標は、ゲーム内で「発見順」で並び替えると確認できます。",
      outclassedText: "このリリックはより優れたリリックにより不要になっています。",
      duplicateText: "このリリックは重複しています。",
      relicComparisonTitle: "リリック比較",
      closeButton: "閉じる",
      showingAllRelicsTemplate:
        "{{character}}の全{{normal}}件のリリックと{{deep}}件の深層遺物を表示中",
      showingMatchingRelicsTemplate:
        "{{character}}の全{{total}}件中、条件に一致する{{normal}}件のリリックと{{deep}}件の深層遺物を表示中",
      nightfarers: {
        [Nightfarer.Wylder]: "追跡者",
        [Nightfarer.Guardian]: "守護者",
        [Nightfarer.Ironeye]: "鉄の目",
        [Nightfarer.Duchess]: "レディ",
        [Nightfarer.Raider]: "無頼漢",
        [Nightfarer.Revenant]: "復讐者",
        [Nightfarer.Recluse]: "隠者",
        [Nightfarer.Executor]: "執行者",
        [Nightfarer.Scholar]: "学者",
        [Nightfarer.Undertaker]: "葬儀屋",
      },
      colors: {
        [RelicSlotColor.Any]: "任意",
        [RelicSlotColor.Red]: "赤",
        [RelicSlotColor.Green]: "緑",
        [RelicSlotColor.Blue]: "青",
        [RelicSlotColor.Yellow]: "黄",
      },
      items: {
        besmirchedFrame: "薄汚れたフレーム",
        blackClawNecklace: "黒爪の首飾り",
        bladeOfNightFragment: "夜の刃の欠片",
        blessedFlowers: "祝福された花",
        blessedIronCoin: "祝福された鉄貨",
        boneLikeStone: "骨のような石",
        cleansingTear: "清浄の雫",
        crackedSealingWax: "割れた封蝋",
        crackedWitchsBrooch: "砕けた魔女のブローチ",
        crownMedal: "頭冠のメダル",
        darkNightOfTheBaron: "爵の夜",
        darkNightOfTheBeast: "獣の夜",
        darkNightOfTheChampion: "狩人の夜",
        darkNightOfTheDemon: "魔の夜",
        darkNightOfTheFathom: "深海の夜",
        darkNightOfTheMiasma: "霞の夜",
        darkNightOfTheWise: "識の夜",
        deepDelicateBurningScene: "繊細な燃える昏景",
        deepDelicateDrizzlyScene: "繊細な滴る昏景",
        deepDelicateLuminousScene: "繊細な輝く昏景",
        deepDelicateTranquilScene: "繊細な静まる昏景",
        deepGrandBurningScene: "壮大な燃える昏景",
        deepGrandDrizzlyScene: "壮大な滴る昏景",
        deepGrandLuminousScene: "壮大な輝く昏景",
        deepGrandTranquilScene: "壮大な静まる昏景",
        deepPolishedBurningScene: "端正な燃える昏景",
        deepPolishedDrizzlyScene: "端正な滴る昏景",
        deepPolishedLuminousScene: "端正な輝く昏景",
        deepPolishedTranquilScene: "端正な静まる昏景",
        delicateBurningScene: "繊細な燃える景色",
        delicateDrizzlyScene: "繊細な滴る景色",
        delicateLuminousScene: "繊細な輝く景色",
        delicateTranquilScene: "繊細な静まる景色",
        edgeOfOrder: "聖律の刃",
        fellOmenFetish: "忌み鬼の呪物",
        fineArrowhead: "上質な矢尻",
        glassNecklace: "ガラスの首飾り",
        goldenDew: "金色の露",
        goldenShell: "黄金の殻",
        goldenSprout: "黄金の萌芽",
        grandBurningScene: "壮大な燃える景色",
        grandDrizzlyScene: "壮大な滴る景色",
        grandLuminousScene: "壮大な輝く景色",
        grandTranquilScene: "壮大な静まる景色",
        largeScenicFlatstone: "大きな景色の平石",
        leatherMonocleCase: "片眼鏡の革袋",
        nightOfTheBaron: "爵の夜",
        nightOfTheBeast: "獣の夜",
        nightOfTheChampion: "狩人の夜",
        nightOfTheDemon: "魔の夜",
        nightOfTheFathom: "深海の夜",
        nightOfTheLord: "王の夜",
        nightOfTheMiasma: "霞の夜",
        nightOfTheWise: "識の夜",
        nightShard: "夜のつぶて",
        noteMyDearSuccessor: "記録「後継者へ」",
        oldPocketwatch: "古びた懐中時計",
        oldPortrait: "古びたミニアチュール",
        polishedBurningScene: "端正な燃える景色",
        polishedDrizzlyScene: "端正な滴る景色",
        polishedLuminousScene: "端正な輝く景色",
        polishedTranquilScene: "端正な静まる景色",
        scenicFlatstone: "景色の平石",
        silverTear: "銀の雫",
        slateWhetstone: "にび色の砥石",
        smallMakeupBrush: "小さな化粧道具",
        sovereignSigil: "君主の印章",
        stoneStake: "石の杭",
        theNightOfDregs: "瓦礫の夜",
        theWillOfTheBalance: "安寧の遺志",
        theWillOfTheBalancers: "安寧者の遺志",
        theWyldersEarring: "追跡者の耳飾り",
        thirdVolume: "三冊目の本",
        tornBraidedCord: "ちぎれた組み紐",
        vestigeOfNight: "夜の痕跡",
        witchsBrooch: "魔女のブローチ",
      },
      effects: {
        [EffectKey.acidMistUponChargedThrust]: "刺突のタメ攻撃時、酸の霧が発生",
        [EffectKey.acidSpraymistInPossessionAtStartOfExpedition]: "出撃時に「酸の噴霧」を持つ",
        [EffectKey.addFireToWeapon]: "武器に炎属性を付加",
        [EffectKey.addHolyToWeapon]: "武器に聖属性を付加",
        [EffectKey.addLightningToWeapon]: "武器に雷属性を付加",
        [EffectKey.addMagicToWeapon]: "武器に魔力属性を付加",
        [EffectKey.ailmentsCauseIncreasedDamage]: "状態異常時、被ダメージ増加",
        [EffectKey.allResistancesDown]: "すべての状態異常耐性低下",
        [EffectKey.allResistancesUp]: "すべての状態異常耐性上昇",
        [EffectKey.allResistanceUp]: "すべての状態異常耐性上昇",
        [EffectKey.arcaneIncreasedForEachGreatEnemyDefeatedAtARuin]: "遺跡の強敵を倒す度、神秘上昇",
        [EffectKey.arcanePlus1]: "神秘+1",
        [EffectKey.arcanePlus2]: "神秘+2",
        [EffectKey.arcanePlus3]: "神秘+3",
        [EffectKey.armamentDealsFireDamagePlus1AtStartOfExpedition]: "出撃時の武器に炎攻撃力を付加+1",
        [EffectKey.artGaugeChargedFromSuccessfulGuarding]: "ガード成功時、アーツゲージ増加",
        [EffectKey.artGaugeChargedFromSuccessfulGuardingPlus1]: "ガード成功時、アーツゲージ増加+1",
        [EffectKey.artGaugeChargedFromSuccessfulGuardingPlus2]: "ガード成功時、アーツゲージ増加+2",
        [EffectKey.artGaugeFillsModeratelyUponCriticalHit]: "致命の一撃で、アーツゲージ増加",
        [EffectKey.artGaugeFillsModeratelyUponCriticalHitPlus1]: "致命の一撃で、アーツゲージ増加+1",
        [EffectKey.artGaugeFillsModeratelyUponCriticalHitPlus2]: "致命の一撃で、アーツゲージ増加+2",
        [EffectKey.attackBoostDragons]: "竜への攻撃力上昇",
        [EffectKey.attackBoostFromNearbyAllies]: "周囲に味方がいると、攻撃力上昇",
        [EffectKey.attackBoostLifeformsBornOfFallingStars]: "流星から生まれし者への攻撃力上昇",
        [EffectKey.attackBoostThoseWhoLiveInDeath]: "死の中に生きる者への攻撃力上昇",
        [EffectKey.attackPowerIncreasesAfterUsingGreaseItems]: "脂アイテム使用時、追加で物理攻撃力上昇",
        [EffectKey.attackPowerPermanentlyIncreasedForEachEvergaolPrisonerDefeated]: "封牢の囚を倒す度、攻撃力上昇",
        [EffectKey.attackPowerUpAfterDefeatingANightInvader]: "夜の侵入者を倒す度、攻撃力上昇",
        [EffectKey.attackPowerUpWhenFacingFrostbiteAfflictedEnemy]: "凍傷状態の敵に対する攻撃を強化",
        [EffectKey.attackPowerUpWhenFacingFrostbiteAfflictedEnemyPlus1]: "凍傷状態の敵に対する攻撃を強化+1",
        [EffectKey.attackPowerUpWhenFacingFrostbiteAfflictedEnemyPlus2]: "凍傷状態の敵に対する攻撃を強化+2",
        [EffectKey.attackPowerUpWhenFacingPoisonAfflictedEnemy]: "毒状態の敵に対する攻撃を強化",
        [EffectKey.attackPowerUpWhenFacingPoisonAfflictedEnemyPlus1]: "毒状態の敵に対する攻撃を強化+1",
        [EffectKey.attackPowerUpWhenFacingPoisonAfflictedEnemyPlus2]: "毒状態の敵に対する攻撃を強化+2",
        [EffectKey.attackPowerUpWhenFacingScarletRotAfflictedEnemy]: "腐敗状態の敵に対する攻撃を強化",
        [EffectKey.attackPowerUpWhenFacingScarletRotAfflictedEnemyPlus1]: "腐敗状態の敵に対する攻撃を強化+1",
        [EffectKey.attackPowerUpWhenFacingScarletRotAfflictedEnemyPlus2]: "腐敗状態の敵に対する攻撃を強化+2",
        [EffectKey.attackPowerUpWhenFacingSleepAfflictedEnemy]: "睡眠状態の敵に対する攻撃を強化",
        [EffectKey.attacksCreateMagicBurstsVersusSleepingEnemies]: "睡眠状態の敵への攻撃時、魔力の爆発が発生",
        [EffectKey.attacksImpairedOnOccasion]: "稀に攻撃性能が低下",
        [EffectKey.attacksInflictBloodLoss]: "攻撃に、出血の状態異常を付加",
        [EffectKey.attacksInflictBloodLossPlus1]: "攻撃に、出血の状態異常を付加+1",
        [EffectKey.attacksInflictBloodLossPlus2]: "攻撃に、出血の状態異常を付加+2",
        [EffectKey.attacksInflictDeathBlight]: "攻撃に、死の状態異常を付加",
        [EffectKey.attacksInflictFrost]: "攻撃に、凍傷の状態異常を付加",
        [EffectKey.attacksInflictFrostPlus1]: "攻撃に、凍傷の状態異常を付加+1",
        [EffectKey.attacksInflictFrostPlus2]: "攻撃に、凍傷の状態異常を付加+2",
        [EffectKey.attacksInflictFrostPlus3]: "攻撃に、凍傷の状態異常を付加+3",
        [EffectKey.attacksInflictMadness]: "攻撃に、発狂の状態異常を付加",
        [EffectKey.attacksInflictPoison]: "攻撃に、毒の状態異常を付加",
        [EffectKey.attacksInflictPoisonPlus1]: "攻撃に、毒の状態異常を付加+1",
        [EffectKey.attacksInflictPoisonPlus2]: "攻撃に、毒の状態異常を付加+2",
        [EffectKey.attacksInflictRot]: "攻撃に、腐敗の状態異常を付加",
        [EffectKey.attacksInflictRotWhenDamageIsTaken]: "被ダメージ時、腐敗の状態異常を付加",
        [EffectKey.attacksInflictScarletRot]: "攻撃に、腐敗の状態異常を付加",
        [EffectKey.attacksInflictScarletRotPlus1]: "攻撃に、腐敗の状態異常を付加+1",
        [EffectKey.attacksInflictScarletRotPlus2]: "攻撃に、腐敗の状態異常を付加+2",
        [EffectKey.attacksInflictSleep]: "攻撃に、睡眠の状態異常を付加",
        [EffectKey.attacksInflictSleepPlus1]: "攻撃に、睡眠の状態異常を付加+1",
        [EffectKey.attacksInflictSleepPlus2]: "攻撃に、睡眠の状態異常を付加+2",
        [EffectKey.attacksInflictSleepPlus3]: "攻撃に、睡眠の状態異常を付加+3",
        [EffectKey.attackUpWhenWieldingTwoArmaments]: "二刀持ち時、攻撃力上昇",
        [EffectKey.bewitchingBranchesInPossessionAtStartOfExpedition]: "出撃時に「誘惑の枝」を持つ",
        [EffectKey.blackFlamesUponChargedSlash]: "斬撃のタメ攻撃時、黒炎が発生",
        [EffectKey.bloodboilAromaticInPossessionAtStartOfExpedition]: "出撃時に「狂熱の香薬」を持つ",
        [EffectKey.bloodfliesUponPrecisionAiming]: "照準攻撃時、血蝿が発生",
        [EffectKey.bloodLossCritThornsOfPunishment]: "出血属性の致命の一撃時、罰の茨が発生",
        [EffectKey.bloodLossIncreasesAttackPower]: "出血状態で、攻撃力上昇",
        [EffectKey.bloodLossInVicinityIncreasesAttackPower]: "周囲で出血発生時、攻撃力上昇",
        [EffectKey.boostsAttackPowerOfAddedAffinityAttacks]: "属性攻撃力が付加された時、属性攻撃力上昇",
        [EffectKey.brokenStanceActivatesEndure]: "体勢を崩された時、「我慢」を発動",
        [EffectKey.ceruleanCrystalTearInPossessionAtStartOfExpedition]: "出撃時に「青色の結晶雫」を持つ",
        [EffectKey.ceruleanHiddenTearInPossessionAtStartOfExpedition]: "出撃時に「青色の秘雫」を持つ",
        [EffectKey.changedStrongAttacks]: "強攻撃の性能変化",
        [EffectKey.changesCompatibleArmamentsIncantationToBeastClawAtStartOfExpedition]: "出撃時の武器の祈祷を「獣爪」にする",
        [EffectKey.changesCompatibleArmamentsIncantationToDragonfireAtStartOfExpedition]: "出撃時の武器の祈祷を「竜炎」にする",
        [EffectKey.changesCompatibleArmamentsIncantationToLightningSpearAtStartOfExpedition]: "出撃時の武器の祈祷を「雷の槍」にする",
        [EffectKey.changesCompatibleArmamentsIncantationToOFlameAtStartOfExpedition]: "出撃時の武器の祈祷を「火よ！」にする",
        [EffectKey.changesCompatibleArmamentsIncantationToWrathOfGoldAtStartOfExpedition]: "出撃時の武器の祈祷を「黄金の怒り」にする",
        [EffectKey.changesCompatibleArmamentsSkillToBloodBladeAtStartOfExpedition]: "出撃時の武器の戦技を「血の刃」にする",
        [EffectKey.changesCompatibleArmamentsSkillToChillingMistAtStartOfExpedition]: "出撃時の武器の戦技を「冷気の霧」にする",
        [EffectKey.changesCompatibleArmamentsSkillToDeterminationAtStartOfExpedition]: "出撃時の武器の戦技を「デターミネーション」にする",
        [EffectKey.changesCompatibleArmamentsSkillToEndureAtStartOfExpedition]: "出撃時の武器の戦技を「我慢」にする",
        [EffectKey.changesCompatibleArmamentsSkillToEruptionAtStartOfExpedition]: "出撃時の武器の戦技を「溶岩噴火」にする",
        [EffectKey.changesCompatibleArmamentsSkillToFlamingStrikeAtStartOfExpedition]: "出撃時の武器の戦技を「炎撃」にする",
        [EffectKey.changesCompatibleArmamentsSkillToGlintbladePhalanxAtStartOfExpedition]: "出撃時の武器の戦技を「輝剣の円陣」にする",
        [EffectKey.changesCompatibleArmamentsSkillToGravitasAtStartOfExpedition]: "出撃時の武器の戦技を「グラビタス」にする",
        [EffectKey.changesCompatibleArmamentsSkillToHoarfrostStompAtStartOfExpedition]: "出撃時の武器の戦技を「霜踏み」にする",
        [EffectKey.changesCompatibleArmamentsSkillToLightningSlashAtStartOfExpedition]: "出撃時の武器の戦技を「雷撃斬」にする",
        [EffectKey.changesCompatibleArmamentsSkillToPoisonMothFlightAtStartOfExpedition]: "出撃時の武器の戦技を「毒蛾は二度舞う」にする",
        [EffectKey.changesCompatibleArmamentsSkillToPoisonousMistAtStartOfExpedition]: "出撃時の武器の戦技を「毒の霧」にする",
        [EffectKey.changesCompatibleArmamentsSkillToPrayerfulStrikeAtStartOfExpedition]: "出撃時の武器の戦技を「祈りの一撃」にする",
        [EffectKey.changesCompatibleArmamentsSkillToQuickstepAtStartOfExpedition]: "出撃時の武器の戦技を「クイックステップ」にする",
        [EffectKey.changesCompatibleArmamentsSkillToRainOfArrowsAtStartOfExpedition]: "出撃時の武器の戦技を「アローレイン」にする",
        [EffectKey.changesCompatibleArmamentsSkillToSacredBladeAtStartOfExpedition]: "出撃時の武器の戦技を「聖なる刃」にする",
        [EffectKey.changesCompatibleArmamentsSkillToSeppukuAtStartOfExpedition]: "出撃時の武器の戦技を「切腹」にする",
        [EffectKey.changesCompatibleArmamentsSkillToStormStompAtStartOfExpedition]: "出撃時の武器の戦技を「嵐脚」にする",
        [EffectKey.changesCompatibleArmamentsSkillToThunderboltAtStartOfExpedition]: "出撃時の武器の戦技を「落雷」にする",
        [EffectKey.changesCompatibleArmamentsSkillToWhiteShadowsLureAtStartOfExpedition]: "出撃時の武器の戦技を「白い影の誘い」にする",
        [EffectKey.changesCompatibleArmamentsSorceryToBriarsOfPunishmentAtStartOfExpedition]: "出撃時の武器の魔術を「罰の茨」にする",
        [EffectKey.changesCompatibleArmamentsSorceryToCarianGreatswordAtStartOfExpedition]: "出撃時の武器の魔術を「カーリアの大剣」にする",
        [EffectKey.changesCompatibleArmamentsSorceryToMagicGlintbladeAtStartOfExpedition]: "出撃時の武器の魔術を「魔術の輝剣」にする",
        [EffectKey.changesCompatibleArmamentsSorceryToMagmaShotAtStartOfExpedition]: "出撃時の武器の魔術を「溶岩弾」にする",
        [EffectKey.changesCompatibleArmamentsSorceryToNightShardAtStartOfExpedition]: "出撃時の武器の魔術を「夜のつぶて」にする",
        [EffectKey.characterSkillCooldownReduction]: "スキルクールタイム軽減",
        [EffectKey.characterSkillCooldownReductionPlus1]: "スキルクールタイム軽減+1",
        [EffectKey.characterSkillCooldownReductionPlus2]: "スキルクールタイム軽減+2",
        [EffectKey.characterSkillCooldownReductionPlus3]: "スキルクールタイム軽減+3",
        [EffectKey.characterSkillCooldownReductionPlus4]: "スキルクールタイム軽減+4",
        [EffectKey.characterSkillCooldownReductionPlus5]: "スキルクールタイム軽減+5",
        [EffectKey.chargedThrustInvokesSleepMist]: "刺突のタメ攻撃時、睡眠の霧が発生",
        [EffectKey.colossalArmamentsCoatedInRockWhenPerformingChargedAttacks]: "特大武器のタメ攻撃時、岩を纏う",
        [EffectKey.communionGrantsAntiDragonEffect]: "「交信」に、対竜効果を付加",
        [EffectKey.consecutiveGuardsHardenSkin]: "連続ガードで、肌が硬くなる",
        [EffectKey.continuousFpRecovery]: "FP持続回復",
        [EffectKey.continuousHPLoss]: "HP持続減少",
        [EffectKey.continuousHpRecovery]: "HP持続回復",
        [EffectKey.createsHolyGroundAtLowHP]: "HP低下時、聖なる地が発生",
        [EffectKey.crimsonBubbletearInPossessionAtStartOfExpedition]: "出撃時に「緋色の泡雫」を持つ",
        [EffectKey.crimsonburstCrystalTearInPossessionAtStartOfExpedition]: "出撃時に「緋湧きの結晶雫」を持つ",
        [EffectKey.crimsonCrystalTearInPossessionAtStartOfExpedition]: "出撃時に「緋色の結晶雫」を持つ",
        [EffectKey.crimsonspillCrystalTearInPossessionAtStartOfExpedition]: "出撃時に「緋溢れの結晶雫」を持つ",
        [EffectKey.crimsonwhorlBubbletearInPossessionAtStartOfExpedition]: "出撃時に「緋色渦の泡雫」を持つ",
        [EffectKey.criticalHitAddsLightningEffect]: "致命の一撃に、雷属性の効果を付加",
        [EffectKey.criticalHitBoostsStaminaRecoverySpeed]: "致命の一撃で、スタミナ回復速度上昇",
        [EffectKey.criticalHitBoostsStaminaRecoverySpeedPlus1]: "致命の一撃で、スタミナ回復速度上昇+1",
        [EffectKey.criticalHitCreatesSleepMist]: "致命の一撃時、睡眠の霧が発生",
        [EffectKey.criticalHitFPRestoration]: "致命の一撃で、FP回復",
        [EffectKey.criticalHitHPRestoration]: "致命の一撃で、HP回復",
        [EffectKey.criticalHitsBoostAttackPower]: "致命の一撃で、攻撃力上昇",
        [EffectKey.criticalHitsDealHugeDamageOnPoisonedEnemies]: "毒状態の敵への致命の一撃で、大ダメージ",
        [EffectKey.criticalHitsEarnRunes]: "致命の一撃で、ルーンを取得",
        [EffectKey.criticalHitsInflictBloodLoss]: "致命の一撃に、出血の状態異常を付加",
        [EffectKey.crystalDartsInPossessionAtStartOfExpedition]: "出撃時に「結晶投げ矢」を持つ",
        [EffectKey.crystalShardsUponMagicCriticalHit]: "魔力属性の致命の一撃時、結晶の欠片が発生",
        [EffectKey.damageBoostedAfterCriticalHit]: "致命の一撃後、ダメージ上昇",
        [EffectKey.damageIncreasedByNightsEncroachment]: "夜の侵食によるダメージ増加",
        [EffectKey.darknessConcealsCasterWhileWalking]: "歩行中、闇に紛れて自身の姿を隠す",
        [EffectKey.deathCritHitCallsDeathLightning]: "死属性の致命の一撃時、死の雷が発生",
        [EffectKey.defeatingEnemiesFillsMoreOfTheArtGauge]: "敵を倒した時、アーツゲージ増加",
        [EffectKey.defeatingEnemiesFillsMoreOfTheArtGaugePlus1]: "敵を倒した時、アーツゲージ増加+1",
        [EffectKey.defeatingEnemiesFillsMoreOfTheArtGaugePlus2]: "敵を倒した時、アーツゲージ増加+2",
        [EffectKey.defeatingEnemiesNearTotemStelaRestoresHP]: "トーテム・ステラの周囲で敵を倒した時、HP回復",
        [EffectKey.defeatingEnemiesRestoresFP]: "敵を倒すと、FP回復",
        [EffectKey.defeatingEnemiesRestoresHP]: "敵を倒すと、HP回復",
        [EffectKey.defeatingEnemiesRestoresHPForAlliesButNotForSelf]: "敵を倒した時、自身を除く周囲の味方のHPを回復",
        [EffectKey.defeatingGroupCallsVengefulSpirits]: "敵の集団を倒すと、怨霊が発生",
        [EffectKey.defeatingGroupFiresGoldenShockwave]: "敵の集団を倒すと、黄金の衝撃波が発生",
        [EffectKey.defeatingGroupReleasesMistOfCharm]: "敵の集団を倒すと、魅了の霧が発生",
        [EffectKey.defeatingGroupReleasesMistOfFrost]: "敵の集団を倒すと、冷気の霧が発生",
        [EffectKey.defeatingGroupSummonsWraiths]: "敵の集団を倒すと、怨霊を召喚",
        [EffectKey.defeatingGroupUnleashesLightning]: "敵の集団を倒すと、雷が発生",
        [EffectKey.dexterityPlus1]: "技量+1",
        [EffectKey.dexterityPlus2]: "技量+2",
        [EffectKey.dexterityPlus3]: "技量+3",
        [EffectKey.dmgNegationUpWhileCastingSpells]: "魔術／祈祷の詠唱中、カット率上昇",
        [EffectKey.dmgNegationUpWhileChargingAttacks]: "タメ攻撃中、カット率上昇",
        [EffectKey.dormantPowerHelpsDiscoverAxes]: "潜在する力から、斧を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverBallistas]: "潜在する力から、バリスタを見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverBows]: "潜在する力から、弓を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverClaws]: "潜在する力から、爪を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverColossalSwords]: "潜在する力から、特大剣を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverColossalWeapons]: "潜在する力から、特大武器を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverCrossbows]: "潜在する力から、クロスボウを見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverCurvedGreatswords]: "潜在する力から、大曲剣を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverCurvedSwords]: "潜在する力から、曲剣を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverDaggers]: "潜在する力から、短剣を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverFists]: "潜在する力から、拳を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverFlails]: "潜在する力から、フレイルを見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverGreataxes]: "潜在する力から、大斧を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverGreatbows]: "潜在する力から、大弓を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverGreatHammers]: "潜在する力から、大槌を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverGreatshields]: "潜在する力から、大盾を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverGreatSpears]: "潜在する力から、大槍を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverGreatswords]: "潜在する力から、大剣を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverHalberds]: "潜在する力から、斧槍を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverHammers]: "潜在する力から、槌を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverHeavyThrustingSwords]: "潜在する力から、重刺剣を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverKatana]: "潜在する力から、刀を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverMediumShields]: "潜在する力から、中盾を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverReapers]: "潜在する力から、鎌を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverSacredSeals]: "潜在する力から、聖印を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverSmallShields]: "潜在する力から、小盾を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverSpears]: "潜在する力から、槍を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverStaves]: "潜在する力から、杖を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverStraightSwords]: "潜在する力から、直剣を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverThrustingSwords]: "潜在する力から、刺剣を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverTorches]: "潜在する力から、松明を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverTwinblades]: "潜在する力から、両刃剣を見つけやすくなる",
        [EffectKey.dormantPowerHelpsDiscoverWhips]: "潜在する力から、鞭を見つけやすくなる",
        [EffectKey.drawEnemyAttentionWhileGuarding]: "ガード中、敵に狙われやすくなる",
        [EffectKey.duchessBecomeStealthyAfterCritFromBehind]: "【レディ】背後からの致命の一撃後、自身の姿を見え難くし、足音を消す",
        [EffectKey.duchessCharacterSkillInflictsSleep]: "【レディ】スキルに、睡眠の状態異常を付加",
        [EffectKey.duchessDaggerChainAttackReprises]: "【レディ】短剣による攻撃連続時、周囲の敵に、直近の出来事を再演",
        [EffectKey.duchessDefeatingEnemiesWhileArtActiveUpsAttack]: "【レディ】アーツ発動中、敵撃破で攻撃力上昇",
        [EffectKey.duchessDurationOfUltimateArtExtended]: "【レディ】アーツの効果時間延長",
        [EffectKey.duchessImprovedCharacterSkillAttackPower]: "【レディ】スキルのダメージ上昇",
        [EffectKey.duchessImprovedMindAndFaithReducedIntelligence]: "【レディ】精神力/信仰上昇、知力低下",
        [EffectKey.duchessImprovedVigorAndStrengthReducedMind]: "【レディ】生命力/筋力上昇、精神力低下",
        [EffectKey.duchessUseCharacterSkillForBriefInvulnerability]: "【レディ】スキル使用時、僅かに無敵",
        [EffectKey.endurancePlus1]: "持久力+1",
        [EffectKey.endurancePlus2]: "持久力+2",
        [EffectKey.endurancePlus3]: "持久力+3",
        [EffectKey.executorAttackPowerUpWhileUltimateArtActive]: "【執行者】アーツ発動中、攻撃力上昇",
        [EffectKey.executorCharacterSkillBoostsAttackButDrainsHP]: "【執行者】スキル中の攻撃力上昇、攻撃時にカット率低下",
        [EffectKey.executorImprovedDexterityAndArcaneReducedVigor]: "【執行者】技量/神秘上昇、生命力低下",
        [EffectKey.executorImprovedVigorAndEnduranceReducedArcane]: "【執行者】生命力/持久力上昇、神秘低下",
        [EffectKey.executorImprovesEffectButLowersResistance]: "【執行者】アビリティの効果上昇、状態異常耐性低下",
        [EffectKey.executorRoaringRestoresHPWhileArtActive]: "【執行者】アーツ発動中、咆哮でHP回復",
        [EffectKey.executorSlowlyRestoreHPUponAbilityActivation]: "【執行者】アビリティ発動時、HPをゆっくりと回復",
        [EffectKey.executorUnlockingCursedSwordRestoresHP]: "【執行者】スキル中、妖刀が解放状態になるとHP回復",
        [EffectKey.extendedSpellDuration]: "魔術／祈祷、効果時間延長",
        [EffectKey.failingToCastSorceryRestoresFP]: "魔術の詠唱失敗時、FP回復",
        [EffectKey.faithPlus1]: "信仰+1",
        [EffectKey.faithPlus2]: "信仰+2",
        [EffectKey.faithPlus3]: "信仰+3",
        [EffectKey.fireAttackFollowsChargeAttacks]: "タメ攻撃後、炎属性の追加攻撃が発生",
        [EffectKey.fireAttackPowerUp]: "炎攻撃力上昇",
        [EffectKey.fireAttackPowerUpPlus1]: "炎攻撃力上昇+1",
        [EffectKey.fireAttackPowerUpPlus2]: "炎攻撃力上昇+2",
        [EffectKey.fireAttackPowerUpPlus3]: "炎攻撃力上昇+3",
        [EffectKey.fireAttackPowerUpPlus4]: "炎攻撃力上昇+4",
        [EffectKey.fireCriticalHitGrantsMaxStaminaBoost]: "炎属性の致命の一撃で、最大スタミナ上昇",
        [EffectKey.fireDamageNegationUp]: "炎カット率上昇",
        [EffectKey.fireGreaseInPossessionAtStartOfExpedition]: "出撃時に「火脂」を持つ",
        [EffectKey.firePotsInPossessionAtStartOfExpedition]: "出撃時に「火炎壺」を持つ",
        [EffectKey.flameOfFrenzyWhileWalking]: "歩行中、狂い火が発生",
        [EffectKey.flameShroudingCrackedTearInPossessionAtStartOfExpedition]: "出撃時に「炎纏いの割れ雫」を持つ",
        [EffectKey.flaskAlsoHealsAllies]: "聖杯瓶の回復を、周囲の味方に分配",
        [EffectKey.flaskHealingAlsoRestoresFP]: "聖杯瓶のHP回復時、FPも回復",
        [EffectKey.fpRecoveryFromSuccessfulGuarding]: "ガード成功時、FPを回復",
        [EffectKey.fpRestorationUponAttacks]: "攻撃時、FP回復",
        [EffectKey.fpRestorationUponAxeAttacks]: "斧の攻撃でFP回復",
        [EffectKey.fpRestorationUponBallistaAttacks]: "バリスタの攻撃でFP回復",
        [EffectKey.fpRestorationUponBowAttacks]: "弓の攻撃でFP回復",
        [EffectKey.fpRestorationUponClawAttacks]: "爪の攻撃でFP回復",
        [EffectKey.fpRestorationUponColossalSwordAttacks]: "特大剣の攻撃でFP回復",
        [EffectKey.fpRestorationUponColossalWeaponAttacks]: "特大武器の攻撃でFP回復",
        [EffectKey.fpRestorationUponCrossbowAttacks]: "クロスボウの攻撃でFP回復",
        [EffectKey.fpRestorationUponCurvedGreatswordAttacks]: "大曲剣の攻撃でFP回復",
        [EffectKey.fpRestorationUponCurvedSwordAttacks]: "曲剣の攻撃でFP回復",
        [EffectKey.fpRestorationUponDaggerAttacks]: "短剣の攻撃でFP回復",
        [EffectKey.fpRestorationUponFistAttacks]: "拳の攻撃でFP回復",
        [EffectKey.fpRestorationUponFlailAttacks]: "フレイルの攻撃でFP回復",
        [EffectKey.fpRestorationUponGreataxeAttacks]: "大斧の攻撃でFP回復",
        [EffectKey.fpRestorationUponGreatbowAttacks]: "大弓の攻撃でFP回復",
        [EffectKey.fpRestorationUponGreatHammerAttacks]: "大槌の攻撃でFP回復",
        [EffectKey.fpRestorationUponGreatSpearAttacks]: "大槍の攻撃でFP回復",
        [EffectKey.fpRestorationUponGreatswordAttacks]: "大剣の攻撃でFP回復",
        [EffectKey.fpRestorationUponHalberdAttacks]: "斧槍の攻撃でFP回復",
        [EffectKey.fpRestorationUponHammerAttacks]: "槌の攻撃でFP回復",
        [EffectKey.fpRestorationUponHeavyThrustingSwordAttacks]: "重刺剣の攻撃でFP回復",
        [EffectKey.fpRestorationUponKatanaAttacks]: "刀の攻撃でFP回復",
        [EffectKey.fpRestorationUponPikeAttacks]: "パイクの攻撃でFP回復",
        [EffectKey.fpRestorationUponReaperAttacks]: "鎌の攻撃でFP回復",
        [EffectKey.fpRestorationUponSpearAttacks]: "槍の攻撃でFP回復",
        [EffectKey.fpRestorationUponStraightSwordAttacks]: "直剣の攻撃でFP回復",
        [EffectKey.fpRestorationUponSuccessiveAttacks]: "攻撃連続時、FP回復",
        [EffectKey.fpRestorationUponThrustingSwordAttacks]: "刺剣の攻撃でFP回復",
        [EffectKey.fpRestorationUponTwinbladeAttacks]: "両刃剣の攻撃でFP回復",
        [EffectKey.fpRestorationUponWhipAttacks]: "鞭の攻撃でFP回復",
        [EffectKey.frostbiteIncreasesAttackPower]: "凍傷状態で、攻撃力上昇",
        [EffectKey.frostbiteProducesAMistOfFrost]: "凍傷状態で、冷気の霧が発生",
        [EffectKey.gestureCrossedLegsBuildsUpMadness]: "ジェスチャー「あぐら」により、発狂が蓄積",
        [EffectKey.glintstoneScrapsInPossessionAtStartOfExpedition]: "出撃時に「屑輝石」を持つ",
        [EffectKey.gradualRestorationByFlask]: "聖杯瓶で、HPを徐々に回復",
        [EffectKey.gravityStoneChunksInPossessionAtStartOfExpedition]: "出撃時に「塊の重力石」を持つ",
        [EffectKey.greenburstCrystalTearInPossessionAtStartOfExpedition]: "出撃時に「緑湧きの結晶雫」を持つ",
        [EffectKey.greenspillCrystalTearInPossessionAtStartOfExpedition]: "出撃時に「緑溢れの結晶雫」を持つ",
        [EffectKey.guardCounterIsGivenABoostBasedOnCurrentHP]: "ガードカウンターに、自身の現在HPの一部を加える",
        [EffectKey.guardCountersActivateHolyAttacks]: "ガードカウンターに、聖属性攻撃力を付加",
        [EffectKey.guardCountersCastLightPillar]: "ガードカウンターで、光の柱が発生",
        [EffectKey.guardCountersLaunchSummoningAttack]: "ガードカウンターで、召喚の一撃が発生",
        [EffectKey.guardianBecomeTargetOfEnemyAggression]: "【守護者】アビリティ発動時、敵に狙われやすくなる",
        [EffectKey.guardianCharacterSkillBoostsDamageNegationOfNearbyAllies]: "【守護者】スキル使用時、周囲の味方のカット率上昇",
        [EffectKey.guardianCharacterSkillInflictsHolyDamage]: "【守護者】スキルに、聖攻撃力を付加",
        [EffectKey.guardianCreatesWhirlwindWhenChargingHalberd]: "【守護者】斧槍タメ攻撃時、つむじ風が発生",
        [EffectKey.guardianDamageNegationForAlliesImproved]: "【守護者】アーツ使用時、味方のカット率上昇",
        [EffectKey.guardianImprovedCharacterSkillRange]: "【守護者】スキルの範囲拡大",
        [EffectKey.guardianImprovedMindAndFaithReducedVigor]: "【守護者】精神力/信仰上昇、生命力低下",
        [EffectKey.guardianImprovedStrengthAndDexterityReducedVigor]: "【守護者】筋力/技量上昇、生命力低下",
        [EffectKey.guardianIncreasedDurationForCharacterSkill]: "【守護者】スキルの持続時間延長",
        [EffectKey.guardianRestoresAlliesHPWhenCharacterSkillUsed]: "【守護者】スキル使用時、味方のHPを回復",
        [EffectKey.guardianSlowlyRestoresNearbyAlliesHP]: "【守護者】アーツ発動時、周囲の味方HPを徐々に回復",
        [EffectKey.guardianSuccessfulGuardsSendOutShockwaves]: "【守護者】アビリティ発動中、ガード成功時、衝撃波が発生",
        [EffectKey.guardingUpsAttackAndCastingSpeeds]: "ガード中、攻撃速度と詠唱速度上昇",
        [EffectKey.holyAttackFollowsChargeAttacks]: "タメ攻撃後、聖属性の追加攻撃が発生",
        [EffectKey.holyAttackPowerUp]: "聖攻撃力上昇",
        [EffectKey.holyAttackPowerUpPlus1]: "聖攻撃力上昇+1",
        [EffectKey.holyAttackPowerUpPlus2]: "聖攻撃力上昇+2",
        [EffectKey.holyAttackPowerUpPlus3]: "聖攻撃力上昇+3",
        [EffectKey.holyAttackPowerUpPlus4]: "聖攻撃力上昇+4",
        [EffectKey.holyDamageNegationUp]: "聖カット率上昇",
        [EffectKey.holyGreaseInPossessionAtStartOfExpedition]: "出撃時に「聖脂」を持つ",
        [EffectKey.holyShockwaveUponChargedStrike]: "打撃のタメ攻撃時、聖属性の衝撃波が発生",
        [EffectKey.holyShroudingCrackedTearInPossessionAtStartOfExpedition]: "出撃時に「聖纏いの割れ雫」を持つ",
        [EffectKey.holyWaterPotsInPossessionAtStartOfExpedition]: "出撃時に「聖水壺」を持つ",
        [EffectKey.hpRecoveryFromSuccessfulGuarding]: "ガード成功時、HPを回復",
        [EffectKey.hpRecoveryFromSuccessfulGuardingPlus]: "ガード成功時、HPを回復",
        [EffectKey.hpRestorationUponAttacks]: "攻撃時、HP回復",
        [EffectKey.hpRestorationUponAxeAttacks]: "斧の攻撃でHP回復",
        [EffectKey.hpRestorationUponBallistaAttacks]: "バリスタの攻撃でHP回復",
        [EffectKey.hpRestorationUponBowAttacks]: "弓の攻撃でHP回復",
        [EffectKey.hpRestorationUponClawAttacks]: "爪の攻撃でHP回復",
        [EffectKey.hpRestorationUponColossalSwordAttacks]: "特大剣の攻撃でHP回復",
        [EffectKey.hpRestorationUponColossalWeaponAttacks]: "特大武器の攻撃でHP回復",
        [EffectKey.hpRestorationUponCrossbowAttacks]: "クロスボウの攻撃でHP回復",
        [EffectKey.hpRestorationUponCurvedGreatswordAttacks]: "大曲剣の攻撃でHP回復",
        [EffectKey.hpRestorationUponCurvedSwordAttacks]: "曲剣の攻撃でHP回復",
        [EffectKey.hpRestorationUponDaggerAttacks]: "短剣の攻撃でHP回復",
        [EffectKey.hpRestorationUponFistAttacks]: "拳の攻撃でHP回復",
        [EffectKey.hpRestorationUponFlailAttacks]: "フレイルの攻撃でHP回復",
        [EffectKey.hpRestorationUponGreataxeAttacks]: "大斧の攻撃でHP回復",
        [EffectKey.hpRestorationUponGreatbowAttacks]: "大弓の攻撃でHP回復",
        [EffectKey.hpRestorationUponGreatHammerAttacks]: "大槌の攻撃でHP回復",
        [EffectKey.hpRestorationUponGreatSpearAttacks]: "大槍の攻撃でHP回復",
        [EffectKey.hpRestorationUponGreatswordAttacks]: "大剣の攻撃でHP回復",
        [EffectKey.hpRestorationUponHalberdAttacks]: "斧槍の攻撃でHP回復",
        [EffectKey.hpRestorationUponHammerAttacks]: "槌の攻撃でHP回復",
        [EffectKey.hpRestorationUponHeavyThrustingSwordAttacks]: "重刺剣の攻撃でHP回復",
        [EffectKey.hpRestorationUponKatanaAttacks]: "刀の攻撃でHP回復",
        [EffectKey.hpRestorationUponPikeAttacks]: "パイクの攻撃でHP回復",
        [EffectKey.hpRestorationUponReaperAttacks]: "鎌の攻撃でHP回復",
        [EffectKey.hpRestorationUponSpearAttacks]: "槍の攻撃でHP回復",
        [EffectKey.hpRestorationUponStraightSwordAttacks]: "直剣の攻撃でHP回復",
        [EffectKey.hpRestorationUponSuccessiveAttacks]: "攻撃連続時、HP回復",
        [EffectKey.hpRestorationUponThrustingCounterattack]: "刺突カウンター発生時、HP回復",
        [EffectKey.hpRestorationUponThrustingCounterattackPlus1]: "刺突カウンター発生時、HP回復+1",
        [EffectKey.hpRestorationUponThrustingCounterattackPlus2]: "刺突カウンター発生時、HP回復+2",
        [EffectKey.hpRestorationUponThrustingSwordAttacks]: "刺剣の攻撃でHP回復",
        [EffectKey.hpRestorationUponTwinbladeAttacks]: "両刃剣の攻撃でHP回復",
        [EffectKey.hpRestorationUponWhipAttacks]: "鞭の攻撃でHP回復",
        [EffectKey.hpRestorationWithHeadShots]: "頭部攻撃時、HP回復",
        [EffectKey.hpRestoredWhenUsingMedicinalBolusesEtc]: "苔薬などのアイテム使用でHP回復",
        [EffectKey.hpRestoredWhenUsingMedicinalBolusesEtcPlus1]: "苔薬などのアイテム使用でHP回復+1",
        [EffectKey.hpRestoredWhenUsingMedicinalBolusesEtcPlus2]: "苔薬などのアイテム使用でHP回復+2",
        [EffectKey.hugeRuneDiscountForShopPurchasesWhileOnExpedition]: "出撃中、ショップでの購入に必要なルーンが大割引",
        [EffectKey.iceStormSurgeSprint]: "サージスプリント時、氷の嵐が発生",
        [EffectKey.iceStormUponChargedSlash]: "斬撃のタメ攻撃時、氷の嵐が発生",
        [EffectKey.iceStormUponCriticalHitWithFrost]: "凍傷状態の致命の一撃時、氷の嵐が発生",
        [EffectKey.impairedAffinityDamageNegation]: "属性カット率低下",
        [EffectKey.impairedDamageNegation]: "カット率低下",
        [EffectKey.impairedPhysicalDamageNegation]: "物理カット率低下",
        [EffectKey.improvedAffinityAttackPower]: "属性攻撃力上昇",
        [EffectKey.improvedAffinityAttackPowerPlus1]: "属性攻撃力上昇+1",
        [EffectKey.improvedAffinityAttackPowerPlus2]: "属性攻撃力上昇+2",
        [EffectKey.improvedAffinityDamageNegation]: "属性カット率上昇",
        [EffectKey.improvedAffinityDamageNegationPlus1]: "属性カット率上昇+1",
        [EffectKey.improvedAffinityDamageNegationPlus2]: "属性カット率上昇+2",
        [EffectKey.improvedAttackPowerAtFullHP]: "HP満タン時、攻撃力上昇",
        [EffectKey.improvedAttackPowerAtLowHP]: "HP低下時、攻撃力上昇",
        [EffectKey.improvedAttackPowerWhenTwoHanding]: "両手持ち時、攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusAxesEquipped]: "斧の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusBowsEquipped]: "弓の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusClawsEquipped]: "爪の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusColossalSwordsEquipped]: "特大剣の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusColossalWeaponsEquipped]: "特大武器の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusCurvedGreatswordsEquipped]: "大曲剣の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusCurvedSwordsEquipped]: "曲剣の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusDaggersEquipped]: "短剣の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusFistsEquipped]: "拳の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusFlailsEquipped]: "フレイルの武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusGreataxesEquipped]: "大斧の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusGreatHammersEquipped]: "大槌の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusGreatSpearsEquipped]: "大槍の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusGreatswordsEquipped]: "大剣の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusHalberdsEquipped]: "斧槍の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusHammersEquipped]: "槌の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusHeavyThrustingSwordsEquipped]: "重刺剣の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusKatanaEquipped]: "刀の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusReapersEquipped]: "鎌の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusSpearsEquipped]: "槍の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusStraightSwordsEquipped]: "直剣の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusThrustingSwordsEquipped]: "刺剣の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusTwinbladesEquipped]: "両刃剣の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAttackPowerWith3PlusWhipsEquipped]: "鞭の武器種を3つ以上装備していると攻撃力上昇",
        [EffectKey.improvedAxeAttackPower]: "斧の攻撃力上昇",
        [EffectKey.improvedBallistaAttackPower]: "バリスタの攻撃力上昇",
        [EffectKey.improvedBestialIncantations]: "獣の祈祷強化",
        [EffectKey.improvedBloodLossAndFrostResistance]: "出血/凍傷耐性上昇",
        [EffectKey.improvedBloodLossResistance]: "出血耐性上昇",
        [EffectKey.improvedBloodLossResistancePlus1]: "出血耐性上昇+1",
        [EffectKey.improvedBloodLossResistancePlus2]: "出血耐性上昇+2",
        [EffectKey.improvedBowAttackPower]: "弓の攻撃力上昇",
        [EffectKey.improvedCarianSwordSorcery]: "カーリアの剣の魔術強化",
        [EffectKey.improvedChainAttackFinishers]: "連撃の最終攻撃強化",
        [EffectKey.improvedChargeAttacks]: "タメ攻撃強化",
        [EffectKey.improvedChargedIncantation]: "祈祷のタメ攻撃強化",
        [EffectKey.improvedChargedSkillAttackPower]: "戦技のタメ攻撃力上昇",
        [EffectKey.improvedChargedSorceries]: "魔術のタメ攻撃強化",
        [EffectKey.improvedChargedSpellsAndSkills]: "魔術/祈祷/戦技のタメ攻撃強化",
        [EffectKey.improvedClawAttackPower]: "爪の攻撃力上昇",
        [EffectKey.improvedColossalSwordAttackPower]: "特大剣の攻撃力上昇",
        [EffectKey.improvedColossalWeaponAttackPower]: "特大武器の攻撃力上昇",
        [EffectKey.improvedCriticalHits]: "致命の一撃強化",
        [EffectKey.improvedCriticalHitsPlus1]: "致命の一撃強化+1",
        [EffectKey.improvedCrossbowAttackPower]: "クロスボウの攻撃力上昇",
        [EffectKey.improvedCrystalianSorcery]: "結晶人の魔術強化",
        [EffectKey.improvedCurvedGreatswordAttackPower]: "大曲剣の攻撃力上昇",
        [EffectKey.improvedCurvedSwordAttackPower]: "曲剣の攻撃力上昇",
        [EffectKey.improvedDaggerAttackPower]: "短剣の攻撃力上昇",
        [EffectKey.improvedDamageNegationAtFullHP]: "HP満タン時、カット率上昇",
        [EffectKey.improvedDamageNegationAtLowHP]: "HP低下時、カット率上昇",
        [EffectKey.improvedDeathBlightResistance]: "死耐性上昇",
        [EffectKey.improvedDeathBlightResistancePlus1]: "死耐性上昇+1",
        [EffectKey.improvedDeathBlightResistancePlus2]: "死耐性上昇+2",
        [EffectKey.improvedDexterity]: "技量上昇",
        [EffectKey.improvedDodging]: "回避性能強化",
        [EffectKey.improvedDragonCommunionIncantations]: "竜餐の祈祷強化",
        [EffectKey.improvedDragonCultIncantations]: "王都古竜信仰の祈祷強化",
        [EffectKey.improvedFireAttackPower]: "炎攻撃力上昇",
        [EffectKey.improvedFireDamageNegation]: "炎カット率上昇",
        [EffectKey.improvedFireDamageNegationPlus1]: "炎カット率上昇+1",
        [EffectKey.improvedFireDamageNegationPlus2]: "炎カット率上昇+2",
        [EffectKey.improvedFistAttackPower]: "拳の攻撃力上昇",
        [EffectKey.improvedFlailAttackPower]: "フレイルの攻撃力上昇",
        [EffectKey.improvedFlaskHPRestoration]: "聖杯瓶のHP回復量上昇",
        [EffectKey.improvedFrenziedFlameIncantations]: "狂い火の祈祷強化",
        [EffectKey.improvedFrostResistance]: "冷気耐性上昇",
        [EffectKey.improvedFrostResistancePlus1]: "冷気耐性上昇+1",
        [EffectKey.improvedFrostResistancePlus2]: "冷気耐性上昇+2",
        [EffectKey.improvedFundamentalistIncantations]: "黄金律原理主義の祈祷強化",
        [EffectKey.improvedGiantsFlameIncantations]: "巨人の火の祈祷強化",
        [EffectKey.improvedGlintbladeSorcery]: "輝剣の魔術強化",
        [EffectKey.improvedGlintstoneAndGravityStoneDamage]: "輝石/重力石ダメージ上昇",
        [EffectKey.improvedGlintstoneAndGravityStoneDamagePlus1]: "輝石/重力石ダメージ上昇+1",
        [EffectKey.improvedGlintstoneAndGravityStoneDamagePlus2]: "輝石/重力石ダメージ上昇+2",
        [EffectKey.improvedGodslayerIncantations]: "神狩りの祈祷強化",
        [EffectKey.improvedGravitySorcery]: "重力の魔術強化",
        [EffectKey.improvedGreataxeAttackPower]: "大斧の攻撃力上昇",
        [EffectKey.improvedGreatbowAttackPower]: "大弓の攻撃力上昇",
        [EffectKey.improvedGreatHammerAttackPower]: "大槌の攻撃力上昇",
        [EffectKey.improvedGreatSpearAttackPower]: "大槍の攻撃力上昇",
        [EffectKey.improvedGreatswordAttackPower]: "大剣の攻撃力上昇",
        [EffectKey.improvedGuardBreaking]: "ガード崩し性能上昇",
        [EffectKey.improvedGuardCounters]: "ガードカウンター強化",
        [EffectKey.improvedGuardCountersPlus1]: "ガードカウンター強化+1",
        [EffectKey.improvedGuardCountersPlus2]: "ガードカウンター強化+2",
        [EffectKey.improvedGuardingAbility]: "ガード性能上昇",
        [EffectKey.improvedGuardingAbilityPlus1]: "ガード性能上昇+1",
        [EffectKey.improvedGuardingAbilityPlus2]: "ガード性能上昇+2",
        [EffectKey.improvedHalberdAttackPower]: "斧槍の攻撃力上昇",
        [EffectKey.improvedHammerAttackPower]: "槌の攻撃力上昇",
        [EffectKey.improvedHeavyThrustingSwordAttackPower]: "重刺剣の攻撃力上昇",
        [EffectKey.improvedHolyAttackPower]: "聖攻撃力上昇",
        [EffectKey.improvedHolyDamageNegation]: "聖カット率上昇",
        [EffectKey.improvedHolyDamageNegationPlus1]: "聖カット率上昇+1",
        [EffectKey.improvedHolyDamageNegationPlus2]: "聖カット率上昇+2",
        [EffectKey.improvedIncantations]: "祈祷強化",
        [EffectKey.improvedIncantationsPlus1]: "祈祷強化+1",
        [EffectKey.improvedIncantationsPlus2]: "祈祷強化+2",
        [EffectKey.improvedInitialStandardAttack]: "通常攻撃の1段目強化",
        [EffectKey.improvedInvisibilitySorcery]: "不可視の魔術強化",
        [EffectKey.improvedItemDiscovery]: "アイテム発見力上昇",
        [EffectKey.improvedJumpAttacks]: "ジャンプ攻撃強化",
        [EffectKey.improvedKatanaAttackPower]: "刀の攻撃力上昇",
        [EffectKey.improvedLightningAttackPower]: "雷攻撃力上昇",
        [EffectKey.improvedLightningDamageNegation]: "雷カット率上昇",
        [EffectKey.improvedLightningDamageNegationPlus1]: "雷カット率上昇+1",
        [EffectKey.improvedLightningDamageNegationPlus2]: "雷カット率上昇+2",
        [EffectKey.improvedMadnessResistance]: "発狂耐性上昇",
        [EffectKey.improvedMadnessResistancePlus1]: "発狂耐性上昇+1",
        [EffectKey.improvedMadnessResistancePlus2]: "発狂耐性上昇+2",
        [EffectKey.improvedMagicAttackPower]: "魔力攻撃力上昇",
        [EffectKey.improvedMagicDamageNegation]: "魔力カット率上昇",
        [EffectKey.improvedMagicDamageNegationPlus1]: "魔力カット率上昇+1",
        [EffectKey.improvedMagicDamageNegationPlus2]: "魔力カット率上昇+2",
        [EffectKey.improvedMeleeAttackPower]: "近接攻撃力上昇",
        [EffectKey.improvedNightSorcery]: "夜の魔術強化",
        [EffectKey.improvedNonPhysicalAttackPower]: "非物理攻撃力上昇",
        [EffectKey.improvedNonPhysicalDamageNegation]: "非物理カット率上昇",
        [EffectKey.improvedPerfumingArts]: "調香術強化",
        [EffectKey.improvedPerfumingArtsPlus1]: "調香術強化+1",
        [EffectKey.improvedPerfumingArtsPlus2]: "調香術強化+2",
        [EffectKey.improvedPhysicalAttackPower]: "物理攻撃力上昇",
        [EffectKey.improvedPhysicalDamageNegation]: "物理カット率上昇",
        [EffectKey.improvedPhysicalDamageNegationPlus1]: "物理カット率上昇+1",
        [EffectKey.improvedPhysicalDamageNegationPlus2]: "物理カット率上昇+2",
        [EffectKey.improvedPikeAttackPower]: "パイクの攻撃力上昇",
        [EffectKey.improvedPoise]: "強靭度上昇",
        [EffectKey.improvedPoiseDamageNegationWhenKnockedBackByDamage]: "ダメージで吹き飛ばされた時、強靭度とカット率上昇",
        [EffectKey.improvedPoiseNearTotemStela]: "トーテム・ステラの周囲で、強靭度上昇",
        [EffectKey.improvedPoisonResistance]: "毒耐性上昇",
        [EffectKey.improvedPoisonResistancePlus1]: "毒耐性上昇+1",
        [EffectKey.improvedPoisonResistancePlus2]: "毒耐性上昇+2",
        [EffectKey.improvedPoisonRotResistance]: "毒/腐敗耐性上昇",
        [EffectKey.improvedRangedWeaponAttacks]: "遠距離武器の攻撃強化",
        [EffectKey.improvedReaperAttackPower]: "鎌の攻撃力上昇",
        [EffectKey.improvedRoarAndBreathAttacks]: "咆哮とブレス強化",
        [EffectKey.improvedRoarAndBreathAttacksPlus1]: "咆哮とブレス強化+1",
        [EffectKey.improvedRoarAndBreathAttacksPlus2]: "咆哮とブレス強化+2",
        [EffectKey.improvedRotResistance]: "腐敗耐性上昇",
        [EffectKey.improvedRotResistancePlus1]: "腐敗耐性上昇+1",
        [EffectKey.improvedRotResistancePlus2]: "腐敗耐性上昇+2",
        [EffectKey.improvedSkillAttackPower]: "戦技攻撃力上昇",
        [EffectKey.improvedSleepMadnessResistance]: "睡眠/発狂耐性上昇",
        [EffectKey.improvedSleepResistance]: "睡眠耐性上昇",
        [EffectKey.improvedSleepResistancePlus1]: "睡眠耐性上昇+1",
        [EffectKey.improvedSleepResistancePlus2]: "睡眠耐性上昇+2",
        [EffectKey.improvedSorceries]: "魔術強化",
        [EffectKey.improvedSorceriesAndIncantations]: "魔術/祈祷強化",
        [EffectKey.improvedSorceriesPlus1]: "魔術強化+1",
        [EffectKey.improvedSorceriesPlus2]: "魔術強化+2",
        [EffectKey.improvedSpearAttackPower]: "槍の攻撃力上昇",
        [EffectKey.improvedSpellCastingSpeed]: "魔術/祈祷の詠唱速度上昇",
        [EffectKey.improvedStaminaRecovery]: "スタミナ回復速度上昇",
        [EffectKey.improvedStaminaRecoveryPlus1]: "スタミナ回復速度上昇+1",
        [EffectKey.improvedStanceBreaking]: "体勢を崩す力上昇",
        [EffectKey.improvedStanceBreakingWhenTwoHanding]: "両手持ちの、体勢を崩す力上昇",
        [EffectKey.improvedStanceBreakingWhenWieldingTwoArmaments]: "二刀持ちの、体勢を崩す力上昇",
        [EffectKey.improvedStanceBreakingWithHeadShots]: "頭部攻撃の、体勢を崩す力上昇",
        [EffectKey.improvedStonediggerSorcery]: "石掘りの魔術強化",
        [EffectKey.improvedStraightSwordAttackPower]: "直剣の攻撃力上昇",
        [EffectKey.improvedThornSorcery]: "茨の魔術強化",
        [EffectKey.improvedThrowingKnifeDamage]: "投擲ナイフダメージ上昇",
        [EffectKey.improvedThrowingKnifeDamagePlus1]: "投擲ナイフダメージ上昇+1",
        [EffectKey.improvedThrowingKnifeDamagePlus2]: "投擲ナイフダメージ上昇+2",
        [EffectKey.improvedThrowingPotDamage]: "投擲壺ダメージ上昇",
        [EffectKey.improvedThrowingPotDamagePlus1]: "投擲壺ダメージ上昇+1",
        [EffectKey.improvedThrowingPotDamagePlus2]: "投擲壺ダメージ上昇+2",
        [EffectKey.improvedThrowingPots]: "投擲壺強化",
        [EffectKey.improvedThrustingCounterattack]: "刺突カウンター強化",
        [EffectKey.improvedThrustingSwordAttackPower]: "刺剣の攻撃力上昇",
        [EffectKey.improvedTwinbladeAttackPower]: "両刃剣の攻撃力上昇",
        [EffectKey.improvedWhipAttackPower]: "鞭の攻撃力上昇",
        [EffectKey.increasedDrainOnStaminaForEvasion]: "回避時のスタミナ消費増加",
        [EffectKey.increasedMaximumFP]: "最大FP上昇",
        [EffectKey.increasedMaximumHP]: "最大HP上昇",
        [EffectKey.increasedMaximumStamina]: "最大スタミナ上昇",
        [EffectKey.increasedRuneAcquisitionForSelfAndAllies]: "自身と味方の取得ルーン増加",
        [EffectKey.increasedSorceryAndIncantationDuration]: "魔術/祈祷、効果時間延長",
        [EffectKey.intelligencePlus1]: "知力+1",
        [EffectKey.intelligencePlus2]: "知力+2",
        [EffectKey.intelligencePlus3]: "知力+3",
        [EffectKey.ironeyeAdditionalCharacterSkillUse]: "【鉄の目】スキルの使用回数+1",
        [EffectKey.ironeyeArtChargeActivationAddsPoisonEffect]: "【鉄の目】アーツのタメ発動時、毒の状態異常を付加",
        [EffectKey.ironeyeBoostsThrustingCounterattacksAfterArt]: "【鉄の目】アーツ発動後、刺突カウンター強化",
        [EffectKey.ironeyeCharacterSkillInflictsHeavyPoisonDamageOnPoisonedEnemies]: "【鉄の目】スキルに毒の状態異常を付加して毒状態の敵に大ダメージ",
        [EffectKey.ironeyeExtendsDurationOfWeakPoint]: "【鉄の目】弱点の持続時間を延長させる",
        [EffectKey.ironeyeImprovedArcaneReducedDexterity]: "【鉄の目】神秘上昇、技量低下",
        [EffectKey.ironeyeImprovedVigorAndStrengthReducedDexterity]: "【鉄の目】生命力/筋力上昇、技量低下",
        [EffectKey.ironjarAromaticInPossessionAtStartOfExpedition]: "出撃時に「鉄壺の香薬」を持つ",
        [EffectKey.itemsConferEffectToAllNearbyAllies]: "アイテムの効果が周囲の味方にも発動",
        [EffectKey.jumpingConjuresMagicProjectiles]: "ジャンプ時、魔力の飛び道具が発生",
        [EffectKey.leadenHardtearInPossessionAtStartOfExpedition]: "出撃時に「鉛色の硬雫」を持つ",
        [EffectKey.lessLikelyToBeTargeted]: "敵に狙われにくくなる",
        [EffectKey.lightningAttackPowerUp]: "雷攻撃力上昇",
        [EffectKey.lightningAttackPowerUpPlus1]: "雷攻撃力上昇+1",
        [EffectKey.lightningAttackPowerUpPlus2]: "雷攻撃力上昇+2",
        [EffectKey.lightningAttackPowerUpPlus3]: "雷攻撃力上昇+3",
        [EffectKey.lightningAttackPowerUpPlus4]: "雷攻撃力上昇+4",
        [EffectKey.lightningCriticalHitImbuesArmament]: "雷属性の致命の一撃で、武器に雷属性を付加",
        [EffectKey.lightningDamageNegationUp]: "雷カット率上昇",
        [EffectKey.lightningFollowsChargeAttacks]: "タメ攻撃後、雷属性の追加攻撃が発生",
        [EffectKey.lightningGreaseInPossessionAtStartOfExpedition]: "出撃時に「雷脂」を持つ",
        [EffectKey.lightningPotsInPossessionAtStartOfExpedition]: "出撃時に「雷壺」を持つ",
        [EffectKey.lightningShroudingCrackedTearInPossessionAtStartOfExpedition]: "出撃時に「雷纏いの割れ雫」を持つ",
        [EffectKey.lightningUponChargedThrust]: "刺突のタメ攻撃時、雷が発生",
        [EffectKey.lightningUponDodging]: "回避時、雷が発生",
        [EffectKey.lightningUponPrecisionAiming]: "照準攻撃時、雷が発生",
        [EffectKey.lowerAttackWhenBelowMaxHP]: "HP最大未満時、攻撃力低下",
        [EffectKey.lowerStaminaImpairsDmgNegation]: "スタミナが低いほど、カット率低下",
        [EffectKey.lowHpCritHitFullyRestoresHP]: "HP低下時の致命の一撃で、HPを全回復",
        [EffectKey.luringEnemiesUponChargedStrike]: "打撃のタメ攻撃時、敵を引き寄せる",
        [EffectKey.madnessBuildupForFlaskUsages]: "聖杯瓶使用時、発狂が蓄積",
        [EffectKey.madnessContinuallyRecoversFP]: "発狂状態になると、FP持続回復",
        [EffectKey.madnessCritHitFiresFrenziedFlame]: "発狂属性の致命の一撃時、狂い火が発生",
        [EffectKey.madnessIncreasesAttackPower]: "発狂状態で、攻撃力上昇",
        [EffectKey.madnessInVicinityImprovesAttackPower]: "周囲で発狂発生時、攻撃力上昇",
        [EffectKey.madnessInVicinityImprovesAttackPowerPlus1]: "周囲で発狂発生時、攻撃力上昇+1",
        [EffectKey.madnessInVicinityImprovesAttackPowerPlus2]: "周囲で発狂発生時、攻撃力上昇+2",
        [EffectKey.madnessProducesAFlameOfFrenzy]: "発狂状態で、狂い火が発生",
        [EffectKey.magicAttackFollowsChargeAttacks]: "タメ攻撃後、魔力属性の追加攻撃が発生",
        [EffectKey.magicAttackPowerUp]: "魔力攻撃力上昇",
        [EffectKey.magicAttackPowerUpPlus1]: "魔力攻撃力上昇+1",
        [EffectKey.magicAttackPowerUpPlus2]: "魔力攻撃力上昇+2",
        [EffectKey.magicAttackPowerUpPlus3]: "魔力攻撃力上昇+3",
        [EffectKey.magicAttackPowerUpPlus4]: "魔力攻撃力上昇+4",
        [EffectKey.magicBubblesUponChargedStrike]: "打撃のタメ攻撃時、魔力の泡が発生",
        [EffectKey.magicDamageNegationUp]: "魔力カット率上昇",
        [EffectKey.magicGreaseInPossessionAtStartOfExpedition]: "出撃時に「魔力脂」を持つ",
        [EffectKey.magicPotsInPossessionAtStartOfExpedition]: "出撃時に「魔力壺」を持つ",
        [EffectKey.magicShroudingCrackedTearInPossessionAtStartOfExpedition]: "出撃時に「魔力纏いの割れ雫」を持つ",
        [EffectKey.magmaSurgeSprint]: "サージスプリント時、マグマが発生",
        [EffectKey.magmaUponChargedStrike]: "打撃のタメ攻撃時、マグマが発生",
        [EffectKey.magmaUponDefeatingMultipleEnemies]: "複数の敵を同時に倒すと、マグマが発生",
        [EffectKey.magmaUponFireCriticalHit]: "炎属性の致命の一撃時、マグマが発生",
        [EffectKey.manyPeriodicalGlintblades]: "一定間隔で、輝剣を大量に展開",
        [EffectKey.maxFpPermanentlyIncreasedAfterReleasingSorcerersRiseMechanism]: "魔術師塔の仕掛けが解除される度、最大FP上昇",
        [EffectKey.maxFpUpWith3PlusSacredSealsEquipped]: "聖印の武器種を3つ以上装備していると最大FP上昇",
        [EffectKey.maxFpUpWith3PlusStavesEquipped]: "杖の武器種を3つ以上装備していると最大FP上昇",
        [EffectKey.maxHPIncreasedForEachGreatEnemyDefeatedAtAGreatChurch]: "大教会の強敵を倒す度、最大HP上昇",
        [EffectKey.maxHPReducesAttackPower]: "最大HPが高いほど、攻撃力低下",
        [EffectKey.maxHpUpWith3PlusGreatshieldsEquipped]: "大盾の武器種を3つ以上装備していると最大HP上昇",
        [EffectKey.maxHpUpWith3PlusMediumShieldsEquipped]: "中盾の武器種を3つ以上装備していると最大HP上昇",
        [EffectKey.maxHpUpWith3PlusSmallShieldsEquipped]: "小盾の武器種を3つ以上装備していると最大HP上昇",
        [EffectKey.maximumHpDown]: "最大HP低下",
        [EffectKey.maxStaminaIncreasedForEachGreatEnemyDefeatedAtAGreatEncampment]: "大野営地の強敵を倒す度、最大スタミナ上昇",
        [EffectKey.mindPlus1]: "精神力+1",
        [EffectKey.mindPlus2]: "精神力+2",
        [EffectKey.mindPlus3]: "精神力+3",
        [EffectKey.moreDamageTakenAfterEvasion]: "回避後、被ダメージ増加",
        [EffectKey.moreRunesFromDefeatedEnemies]: "敵を倒した時の取得ルーン増加",
        [EffectKey.multiplePeriodicalGlintblades]: "一定間隔で、輝剣を複数展開",
        [EffectKey.nearbyFrostbiteConcealsSelf]: "周囲で凍傷状態の発生時、自身の姿を隠す",
        [EffectKey.nearDeathReducesArtGauge]: "瀕死時、アーツゲージ低下",
        [EffectKey.nearDeathReducesMaxHP]: "瀕死時、最大HP低下",
        [EffectKey.nearDeathSpillsFlask]: "瀕死時、聖杯瓶を落とす",
        [EffectKey.nightsTideDamageIncreased]: "夜の潮のダメージ増加",
        [EffectKey.noRuneLossOrLevelDownUponDeath]: "死亡時、ルーンとレベルを失わない",
        [EffectKey.occasionallyNullifyAttacksWhenDamageNegationsIsLowered]: "カット率低下時、稀に敵から受ける攻撃を無効化",
        [EffectKey.opalineBubbletearInPossessionAtStartOfExpedition]: "出撃時に「真珠色の泡雫」を持つ",
        [EffectKey.opalineHardtearInPossessionAtStartOfExpedition]: "出撃時に「真珠色の硬雫」を持つ",
        [EffectKey.parriesActivateGoldenRetaliation]: "パリィ発動時、黄金の反撃が発生",
        [EffectKey.partialHpRestorationUponPostDamageAttacks]: "被ダメージ後の攻撃でHPを一部回復",
        [EffectKey.partialHPRestorationUponPostDamageAttacksPlus1]: "被ダメージ後の攻撃でHPを一部回復+1",
        [EffectKey.partialHPRestorationUponPostDamageAttacksPlus2]: "被ダメージ後の攻撃でHPを一部回復+2",
        [EffectKey.performingConsecutiveSuccessfulGuardsImprovesGuardAbilityAndDeflectsBigAttacks]: "連続してガードに成功すると、ガード性能上昇、強力な攻撃を弾く",
        [EffectKey.periodicalGiantGlintblades]: "一定間隔で、巨大な輝剣を展開",
        [EffectKey.pestThreadsUponChargedThrust]: "刺突のタメ攻撃時、寄生虫の糸が発生",
        [EffectKey.phantomAttackUponChargedSlash]: "斬撃のタメ攻撃時、幻影の一撃が発生",
        [EffectKey.phantomAttackUponChargedStrike]: "打撃のタメ攻撃時、幻影の一撃が発生",
        [EffectKey.phantomAttackUponChargedThrust]: "刺突のタメ攻撃時、幻影の一撃が発生",
        [EffectKey.physicalAttackPowerIncreasesAfterUsingGreaseItemsPlus1]: "脂アイテム使用時、追加で物理攻撃力上昇+1",
        [EffectKey.physicalAttackPowerIncreasesAfterUsingGreaseItemsPlus2]: "脂アイテム使用時、追加で物理攻撃力上昇+2",
        [EffectKey.physicalAttackUp]: "物理攻撃力上昇",
        [EffectKey.physicalAttackUpPlus1]: "物理攻撃力上昇+1",
        [EffectKey.physicalAttackUpPlus2]: "物理攻撃力上昇+2",
        [EffectKey.physicalAttackUpPlus3]: "物理攻撃力上昇+3",
        [EffectKey.physicalAttackUpPlus4]: "物理攻撃力上昇+4",
        [EffectKey.poisePlus1]: "強靭度+1",
        [EffectKey.poisePlus2]: "強靭度+2",
        [EffectKey.poisePlus3]: "強靭度+3",
        [EffectKey.poisePlus4]: "強靭度+4",
        [EffectKey.poisePlus5]: "強靭度+5",
        [EffectKey.poisonAndRotImprovesAttackPower]: "毒/腐敗状態で、攻撃力上昇",
        [EffectKey.poisonAndRotInVicinityIncreasesAttackPower]: "周囲で毒／腐敗状態の発生時、攻撃力上昇",
        [EffectKey.poisonboneDartsInPossessionAtStartOfExpedition]: "出撃時に「骨の毒投げ矢」を持つ",
        [EffectKey.poisonBuildupWhenBelowMaxHP]: "HP最大未満時、毒が蓄積",
        [EffectKey.poisonIncreasesAttackPower]: "毒状態で、攻撃力上昇",
        [EffectKey.poisonMistUponChargedThrust]: "刺突のタメ攻撃時、毒の霧が発生",
        [EffectKey.poisonMistUponPoisonCriticalHit]: "毒属性の致命の一撃時、毒の霧が発生",
        [EffectKey.poisonMistUponPrecisionAiming]: "照準攻撃時、毒の霧が発生",
        [EffectKey.poisonProducesAMistOfPoison]: "毒状態で、毒の霧が発生",
        [EffectKey.poisonSpraymistInPossessionAtStartOfExpedition]: "出撃時に「毒の噴霧」を持つ",
        [EffectKey.powerOfDarkMoon]: "暗月の力",
        [EffectKey.powerOfDespair]: "絶望の力",
        [EffectKey.powerOfDestinedDeath]: "宿命の死の力",
        [EffectKey.powerOfDestruction]: "破壊の力",
        [EffectKey.powerOfFullMoon]: "満月の力",
        [EffectKey.powerOfHouseMarais]: "マレ家の力",
        [EffectKey.powerOfNightAndFlame]: "夜と炎の力",
        [EffectKey.powerOfTheAncestralSpirit]: "祖霊の力",
        [EffectKey.powerOfTheBlasphemous]: "冒涜の力",
        [EffectKey.powerOfTheBloodLord]: "血の君主の力",
        [EffectKey.powerOfTheDragonlord]: "竜王の力",
        [EffectKey.powerOfTheFirstLord]: "最初の王の力",
        [EffectKey.powerOfTheFlyingDragon]: "飛竜の力",
        [EffectKey.powerOfTheGeneral]: "将軍の力",
        [EffectKey.powerOfTheGiant]: "巨人の力",
        [EffectKey.powerOfTheGoldenLineage]: "黄金の血脈の力",
        [EffectKey.powerOfTheGoldenOrder]: "黄金律の力",
        [EffectKey.powerOfTheGreatAncientDragon]: "太古の竜の力",
        [EffectKey.powerOfTheGreaterWill]: "偉大なる意志の力",
        [EffectKey.powerOfTheLightlessVoid]: "無明の力",
        [EffectKey.powerOfTheOmenKing]: "忌み王の力",
        [EffectKey.powerOfTheQueen]: "女王の力",
        [EffectKey.powerOfTheStarscourge]: "星滅ぼしの力",
        [EffectKey.powerOfTheUndefeated]: "不敗の力",
        [EffectKey.powerOfVengeance]: "復讐の力",
        [EffectKey.projectileDamageDropOffReduced]: "飛び道具の減衰軽減",
        [EffectKey.projectileDamageDropOffReducedPlus1]: "飛び道具の減衰軽減+1",
        [EffectKey.projectilesLaunchedUponAttacks]: "攻撃時、飛び道具が発生",
        [EffectKey.projectilesUponChargedStrike]: "打撃のタメ攻撃時、飛び道具が発生",
        [EffectKey.raiderCharacterSkillDamageUp]: "【無頼漢】スキルのダメージ上昇、使用中はカット率低下",
        [EffectKey.raiderDamageTakenWhileUsingCharacterSkillImprovesAttack]: "【無頼漢】スキル中に攻撃を受けると攻撃力と最大スタミナ上昇",
        [EffectKey.raiderDurationOfUltimateArtExtended]: "【無頼漢】アーツの効果時間延長",
        [EffectKey.raiderHitWithCharacterSkillToReduceEnemyAttackPower]: "【無頼漢】スキル命中時、敵の攻撃力低下",
        [EffectKey.raiderImprovedArcaneReducedVigor]: "【無頼漢】神秘上昇、生命力低下",
        [EffectKey.raiderImprovedMindAndIntelligenceReducedVigorAndEndurance]: "【無頼漢】精神力/知力上昇、生命力/持久力低下",
        [EffectKey.raiderPermanentlyIncreaseAttackPower]: "【無頼漢】スキルの最終攻撃命中時、攻撃力が永続上昇",
        [EffectKey.raisedStaminaRecoveryForNearbyAlliesButNotForSelf]: "自身を除く、周囲の味方のスタミナ回復速度上昇",
        [EffectKey.raisesMaximumFpPlus1]: "最大FP上昇+1",
        [EffectKey.raisesNonPhysicalDamageNegationPlus1]: "非物理カット率上昇+1",
        [EffectKey.raisesPhysicalAttackPowerPlus1]: "物理攻撃力上昇+1",
        [EffectKey.raisesPhysicalDamageNegationPlus1]: "物理カット率上昇+1",
        [EffectKey.raisesResistanceToAllAilments]: "すべての状態異常耐性上昇",
        [EffectKey.raisesSorceryIncantationPotency]: "魔術/祈祷の威力上昇",
        [EffectKey.recluseActivatingUltimateArtRaisesMaxHP]: "【隠者】アーツ発動時、最大HP上昇",
        [EffectKey.recluseCollectAffinityResiduesToNegateAffinity]: "【隠者】属性痕を集めた時、対応する属性カット率上昇",
        [EffectKey.recluseCollecting4AffinityResiduesImprovesAffinityAttackPower]: "【隠者】属性痕を4つ集めた時、属性攻撃力上昇",
        [EffectKey.recluseCollectingAffinityResidueActivatesTerraMagica]: "【隠者】属性痕を集めた時、「魔術の地」が発動",
        [EffectKey.recluseExtendsDurationOfBloodSigils]: "【隠者】血の紋章の効果時間延長",
        [EffectKey.recluseImprovedIntelligenceAndFaithReducedMind]: "【隠者】知力/信仰上昇、精神力低下",
        [EffectKey.recluseImprovedVigorEnduranceAndDexterityReducedIntelligenceAndFaith]: "【隠者】生命力/持久力/技量上昇、知力/信仰低下",
        [EffectKey.recluseSufferBloodLossAndIncreaseAttackPower]: "【隠者】アーツ発動時、自身が出血状態になり、攻撃力上昇",
        [EffectKey.reducedDamageNegationForFlaskUsages]: "聖杯瓶使用時、カット率低下",
        [EffectKey.reducedDexterityAndFaith]: "技量と信仰低下",
        [EffectKey.reducedEndurance]: "持久力低下",
        [EffectKey.reducedFaithAndStrength]: "信仰と筋力低下",
        [EffectKey.reducedFlaskHPRestoration]: "聖杯瓶のHP回復量低下",
        [EffectKey.reducedFPConsumption]: "消費FP軽減",
        [EffectKey.reducedFPConsumptionPlus1]: "消費FP軽減+1",
        [EffectKey.reducedFPConsumptionPlus2]: "消費FP軽減+2",
        [EffectKey.reducedIntelligenceAndDexterity]: "知力と技量低下",
        [EffectKey.reducedMaximumFP]: "最大FP低下",
        [EffectKey.reducedMaximumHP]: "最大HP低下",
        [EffectKey.reducedMaximumStamina]: "最大スタミナ低下",
        [EffectKey.reducedRuneAcquisition]: "取得ルーン減少",
        [EffectKey.reducedSkillFpCost]: "戦技の消費FP軽減",
        [EffectKey.reducedSpellFpCost]: "魔術/祈祷の消費FP軽減",
        [EffectKey.reducedStaminaConsumption]: "スタミナ消費軽減",
        [EffectKey.reducedStrengthAndIntelligence]: "筋力と知力低下",
        [EffectKey.reducedVigor]: "生命力低下",
        [EffectKey.reducedVigorAndArcane]: "生命力と神秘低下",
        [EffectKey.repeatedEvasionsLowerDamageNegation]: "連続回避でカット率低下",
        [EffectKey.revenantAbilityActivationChanceIncreased]: "【復讐者】アビリティの発動確率上昇",
        [EffectKey.revenantExpendOwnHPToFullyHealNearbyAllies]: "【復讐者】アーツ発動時、自身のHPと引き換えに周囲の味方のHPを全回復",
        [EffectKey.revenantImprovedStrengthReducedFaith]: "【復讐者】筋力上昇、信仰低下",
        [EffectKey.revenantImprovedVigorAndEnduranceReducedMind]: "【復讐者】生命力/持久力上昇、精神力低下",
        [EffectKey.revenantIncreasedMaxFPUponAbilityActivation]: "【復讐者】アビリティ発動時、最大FP上昇",
        [EffectKey.revenantPowerUpWhileFightingAlongsideFamily]: "【復讐者】ファミリーと共闘中の間、自身を強化",
        [EffectKey.revenantStrengthensFamilyAndAlliesWhenUltimateArtActivated]: "【復讐者】アーツ発動時、ファミリーと味方を強化",
        [EffectKey.revenantTriggerGhostflameExplosionDuringUltimateArtActivation]: "【復讐者】アーツ発動時、霊炎の爆発を発生",
        [EffectKey.ringOfLightUponChargedSlash]: "斬撃のタメ攻撃時、光の輪が発生",
        [EffectKey.roaringFlamesUponChargedSlash]: "斬撃のタメ攻撃時、猛る炎が発生",
        [EffectKey.rotBuildupWhenBelowMaxHP]: "HP最大未満時、腐敗が蓄積",
        [EffectKey.rotCriticalHitFiresPestThreads]: "腐敗属性の致命の一撃時、寄生虫の糸が発生",
        [EffectKey.rotInVicinityCausesContinuousHpRecovery]: "周囲で腐敗状態の発生時、HP持続回復",
        [EffectKey.rotMistUponPrecisionAiming]: "照準攻撃時、腐敗の霧が発生",
        [EffectKey.rotProducesAMistOfScarletRot]: "腐敗状態で、腐敗の霧が発生",
        [EffectKey.runeDiscountForShopPurchasesWhileOnExpedition]: "出撃中、ショップでの購入に必要なルーンが割引",
        [EffectKey.runeOfTheStrong]: "強者のルーン",
        [EffectKey.runes60kAtStart30kOnDeath]: "出撃時のルーン所持数60000、死亡時30000を保持",
        [EffectKey.runesAndItemDiscoveryIncreasedForEachGreatEnemyDefeatedAtAFort]: "小砦の強敵を倒す度、取得ルーン増加、発見力上昇",
        [EffectKey.rupturedCrystalTearInPossessionAtStartOfExpedition]: "出撃時に「破裂した結晶雫」を持つ",
        [EffectKey.sacredOrderUponHolyCriticalHit]: "聖属性の致命の一撃時、聖なる秩序が発生",
        [EffectKey.savageFlamesRoarWhileWalking]: "歩行中、猛る炎が発生",
        [EffectKey.scholarAlliesTargetedByCharacterSkillGainBoostedAttack]: "【学者】スキル使用時、対象に含まれた味方の攻撃力上昇",
        [EffectKey.scholarContinuousDamageInflictedOnTargetsThreadedByUltimateArt]: "【学者】アーツでリンクした敵対象に、継続ダメージ",
        [EffectKey.scholarEarnRunesForEachAdditionalSpecimenAcquiredWithCharacterSkill]: "【学者】スキルによる標本が増える度、ルーンを取得",
        [EffectKey.scholarImprovedEnduranceAndDexterityReducedIntelligenceAndArcane]: "【学者】持久力/技量上昇、知力/神秘低下",
        [EffectKey.scholarImprovedMindReducedVigor]: "【学者】精神力上昇、生命力低下",
        [EffectKey.scholarPreventSlowingOfCharacterSkillProgress]: "【学者】スキルの進捗率の低下を抑制",
        [EffectKey.scholarReducedFpConsumptionWhenUsingCharacterSkillOnSelf]: "【学者】スキルを自身に使用時、FP消費軽減",
        [EffectKey.shieldGreaseInPossessionAtStartOfExpedition]: "出撃時に「盾脂」を持つ",
        [EffectKey.shieldingCreatesHolyGround]: "シールド展開時、聖なる地が発生",
        [EffectKey.shieldingImprovesDamageNegation]: "シールド展開時、カット率上昇",
        [EffectKey.shieldingInvokesIndomitableVow]: "シールド展開時、「不屈の誓い」が発動",
        [EffectKey.shockwaveProducedFromSuccessfulGuarding]: "ガード成功時、衝撃波が発生",
        [EffectKey.shockwaveUponChargedStrike]: "打撃のタメ攻撃時、衝撃波が発生",
        [EffectKey.skillActivationImprovesPoise]: "スキル発動時、強靭度上昇",
        [EffectKey.sleepBuildupForFlaskUsages]: "聖杯瓶使用時、睡眠が蓄積",
        [EffectKey.sleepIncreasesAttackPower]: "睡眠状態で、攻撃力上昇",
        [EffectKey.sleepInVicinityImprovesAttackPower]: "周囲で睡眠発生時、攻撃力上昇",
        [EffectKey.sleepInVicinityImprovesAttackPowerPlus1]: "周囲で睡眠発生時、攻撃力上昇+1",
        [EffectKey.sleepInVicinityImprovesAttackPowerPlus2]: "周囲で睡眠発生時、攻撃力上昇+2",
        [EffectKey.sleepProducesAMistOfSleep]: "睡眠状態で、睡眠の霧が発生",
        [EffectKey.slowerArtGaugeWhenBelowMaxHP]: "HP最大未満時、アーツゲージ蓄積速度低下",
        [EffectKey.slowlyRestoreHpForSelfAndNearbyAlliesWhenHpIsLow]: "HP低下時、周囲の味方を含めHPをゆっくりと回復",
        [EffectKey.smallPouchInPossessionAtStartOfExpedition]: "出撃時に「小さなポーチ」を持つ",
        [EffectKey.sparkAromaticInPossessionAtStartOfExpedition]: "出撃時に「火花の香り」を持つ",
        [EffectKey.speckledHardtearInPossessionAtStartOfExpedition]: "出撃時に「斑彩色の硬雫」を持つ",
        [EffectKey.spikedCrackedTearInPossessionAtStartOfExpedition]: "出撃時に「大棘の割れ雫」を持つ",
        [EffectKey.staminaRecoveryUponLandingAttacks]: "攻撃命中時、スタミナ回復",
        [EffectKey.staminaRecoveryUponLandingAttacksPlus1]: "攻撃命中時、スタミナ回復+1",
        [EffectKey.starlightShardsInPossessionAtStartOfExpedition]: "出撃時に「星光の欠片」を持つ",
        [EffectKey.startingArmamentDealsFireDamage]: "出撃時の武器に炎攻撃力を付加",
        [EffectKey.startingArmamentDealsHolyDamage]: "出撃時の武器に聖攻撃力を付加",
        [EffectKey.startingArmamentDealsLightningDamage]: "出撃時の武器に雷攻撃力を付加",
        [EffectKey.startingArmamentDealsMagicDamage]: "出撃時の武器に魔力攻撃力を付加",
        [EffectKey.startingArmamentInflictsBloodLoss]: "出撃時の武器に出血の状態異常を付加",
        [EffectKey.startingArmamentInflictsFrost]: "出撃時の武器に冷気の状態異常を付加",
        [EffectKey.startingArmamentInflictsPoison]: "出撃時の武器に毒の状態異常を付加",
        [EffectKey.startingArmamentInflictsScarletRot]: "出撃時の武器に腐敗の状態異常を付加",
        [EffectKey.statusAilmentGaugesSlowlyIncreaseAttackPower]: "状態異常ゲージがある時、徐々に攻撃力上昇",
        [EffectKey.stonebarbCrackedTearInPossessionAtStartOfExpedition]: "出撃時に「岩棘の割れ雫」を持つ",
        [EffectKey.stoneswordKeyInPossessionAtStartOfExpedition]: "出撃時に「石剣の鍵」を持つ",
        [EffectKey.stormOfRedLightningWhileWalking]: "歩行中、紅い雷の嵐が発生",
        [EffectKey.strengthPlus1]: "筋力+1",
        [EffectKey.strengthPlus2]: "筋力+2",
        [EffectKey.strengthPlus3]: "筋力+3",
        [EffectKey.strongAttackCreatesWideWaveOfHeat]: "強攻撃時、熱波が広範囲に発生",
        [EffectKey.strongAttacksImprovePoise]: "強攻撃時、強靭度上昇",
        [EffectKey.strongJumpAttacksCreateShockwave]: "ジャンプ強攻撃時、衝撃波が発生",
        [EffectKey.successfulGuardingUpsDmgNegation]: "ガード成功時、カット率上昇",
        [EffectKey.successfulGuardingUpsPoise]: "ガード成功時、強靭度上昇",
        [EffectKey.successiveAttackHpRestoration]: "攻撃連続時、HP回復",
        [EffectKey.successiveAttacksBoostAttackPower]: "攻撃連続時、攻撃力上昇",
        [EffectKey.successiveAttacksNegateDamage]: "攻撃連続時、カット率上昇",
        [EffectKey.suddenEnemyDeathUponAttacks]: "攻撃時、稀に敵を即死させる",
        [EffectKey.surgeSprintingDrainsMoreStamina]: "サージスプリント時、スタミナ消費増加",
        [EffectKey.surgeSprintLandingsSplitEarth]: "サージスプリント着地時、大地を割る",
        [EffectKey.switchingWeaponsAddsAnAffinityAttack]: "武器の持ち替え時、いずれかの属性攻撃力を付加",
        [EffectKey.switchingWeaponsBoostsAttackPower]: "武器の持ち替え時、物理攻撃力上昇",
        [EffectKey.takingAttacksImprovesAttackPower]: "攻撃を受けると攻撃力上昇",
        [EffectKey.takingDamageBoostsDamageNegation]: "被ダメージ時、カット率上昇",
        [EffectKey.takingDamageCausesBloodLossBuildup]: "被ダメージ時、出血が蓄積",
        [EffectKey.takingDamageCausesDeathBuildup]: "被ダメージ時、死が蓄積",
        [EffectKey.takingDamageCausesFrostBuildup]: "被ダメージ時、凍傷が蓄積",
        [EffectKey.takingDamageCausesMadnessBuildup]: "被ダメージ時、発狂が蓄積",
        [EffectKey.takingDamageCausesPoisonBuildup]: "被ダメージ時、毒が蓄積",
        [EffectKey.takingDamageCausesRotBuildup]: "被ダメージ時、腐敗が蓄積",
        [EffectKey.takingDamageCausesSleepBuildup]: "被ダメージ時、睡眠が蓄積",
        [EffectKey.takingDamageRestoresFp]: "被ダメージ時、FP回復",
        [EffectKey.theDuchessGrief]: "レディの嘆き",
        [EffectKey.theExecutorsGrief]: "執行者の嘆き",
        [EffectKey.theGuardiansGrief]: "守護者の嘆き",
        [EffectKey.theIroneyesGrief]: "鉄の目の嘆き",
        [EffectKey.theRaidersGrief]: "無頼漢の嘆き",
        [EffectKey.theReclusesGrief]: "隠者の嘆き",
        [EffectKey.theRevenantsGrief]: "復讐者の嘆き",
        [EffectKey.theWyldersGrief]: "追跡者の嘆き",
        [EffectKey.thornyCrackedTearInPossessionAtStartOfExpedition]: "出撃時に「連棘の割れ雫」を持つ",
        [EffectKey.throwingDaggersInPossessionAtStartOfExpedition]: "出撃時に「スローイングダガー」を持つ",
        [EffectKey.treasureMarkedUponMap]: "埋もれ宝の位置を地図に表示",
        [EffectKey.twiggyCrackedTearInPossessionAtStartOfExpedition]: "出撃時に「細枝の割れ雫」を持つ",
        [EffectKey.ultimateArtAutoChargePlus1]: "アーツゲージ自然蓄積+1",
        [EffectKey.ultimateArtAutoChargePlus2]: "アーツゲージ自然蓄積+2",
        [EffectKey.ultimateArtAutoChargePlus3]: "アーツゲージ自然蓄積+3",
        [EffectKey.ultimateArtAutoChargePlus4]: "アーツゲージ自然蓄積+4",
        [EffectKey.ultimateArtAutoChargePlus5]: "アーツゲージ自然蓄積+5",
        [EffectKey.ultimateArtChargingImpaired]: "アーツゲージ蓄積量低下",
        [EffectKey.ultimateArtGaugeChargeSpeedUp]: "アーツゲージ蓄積速度上昇",
        [EffectKey.undertakerActivatingUltimateArtIncreasesAttackPower]: "【葬儀屋】アーツ発動時、攻撃力上昇",
        [EffectKey.undertakerAttackPowerIncreasedByLandingTheFinalBlowOfAChainAttack]: "【葬儀屋】連撃の最終攻撃命中時、攻撃力上昇",
        [EffectKey.undertakerContactWithAlliesRestoresTheirHpWhileUltimateArtIsActivated]: "【葬儀屋】アーツ発動時、触れた味方のHP回復",
        [EffectKey.undertakerExecutingArtReadiesCharacterSkill]: "【葬儀屋】アーツ発動後、スキル再使用可能",
        [EffectKey.undertakerImprovedDexterityReducedVigorAndFaith]: "【葬儀屋】技量上昇、生命力/信仰低下",
        [EffectKey.undertakerImprovedMindAndFaithReducedStrength]: "【葬儀屋】精神力/信仰上昇、筋力低下",
        [EffectKey.undertakerPhysicalAttacksBoostedWhileAssistEffectFromIncantationIsActiveForSelf]: "【葬儀屋】祈祷を使用して、自身に補助効果発生時物理攻撃力上昇",
        [EffectKey.upliftingAromaticInPossessionAtStartOfExpedition]: "出撃時に「高揚の香り」を持つ",
        [EffectKey.viciousStarRainPoursWhileWalking]: "歩行中、凶星の雨が降り注ぐ",
        [EffectKey.vigorPlus1]: "生命力+1",
        [EffectKey.vigorPlus2]: "生命力+2",
        [EffectKey.vigorPlus3]: "生命力+3",
        [EffectKey.windyCrystalTearInPossessionAtStartOfExpedition]: "出撃時に「風の結晶雫」を持つ",
        [EffectKey.wraithCallingBellInPossessionAtStartOfExpedition]: "出撃時に「呪霊喚びの鈴」を持つ",
        [EffectKey.wraithsWhileWalking]: "歩行中、怨霊が発生",
        [EffectKey.wylderAdditionalCharacterSkillUse]: "【追跡者】スキルの使用回数+1",
        [EffectKey.wylderArtActivationSpreadsFireInArea]: "【追跡者】アーツ発動時、周囲を延焼",
        [EffectKey.wylderArtGaugeGreatlyFilledWhenAbilityActivated]: "【追跡者】アビリティ発動時、アーツゲージ増加",
        [EffectKey.wylderCharacterSkillInflictsBloodLoss]: "【追跡者】スキルに、出血の状態異常を付加",
        [EffectKey.wylderImpairedDamageNegationImprovedAttackPowerStaminaAfterArtActivation]: "【追跡者】アーツ発動後、カット率低下、攻撃力/最大スタミナ上昇",
        [EffectKey.wylderImprovedAttackPowerWhenAbilityActivated]: "【追跡者】アビリティ発動時、攻撃力上昇",
        [EffectKey.wylderImprovedAttackPowerWhenCharacterSkillActivated]: "【追跡者】スキル発動時、攻撃力上昇",
        [EffectKey.wylderImprovedIntelligenceAndFaithReducedStrengthAndDexterity]: "【追跡者】知力/信仰上昇、筋力/技量低下",
        [EffectKey.wylderImprovedMindReducedVigor]: "【追跡者】精神力上昇、生命力低下",
        [EffectKey.wylderReducedCooldownTimeForCharacterSkill]: "【追跡者】スキルのクールタイム軽減",
        [EffectKey.wylderStandardAttacksEnhancedWithFieryFollowUpsWhenUsingCharacterSkill]: "【追跡者】スキル使用時、通常攻撃で炎を纏った追撃を行う（大剣のみ）",
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ja",
    fallbackLng: "en",

    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
