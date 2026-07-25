# Damage Ranking Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "Damage Ranking" tab to Relic Browser that scores and sorts the current character slot's relics by a damage multiplier computed from their effects, using scoring data ported from RelicHub.

**Architecture:** An offline generator script reads RelicHub's `calc_data.json` / `skills.json` / `deep.json` / `demerit.json`, matches each effect to the existing `EffectKey` enum via English translation strings, and emits a committed `src/resources/damageMultipliers.ts` resource. A static taxonomy file (`src/resources/damageCategories.ts`) defines the selectable attack categories, elements, schools, and toggle groups. A pure calculation module combines these to score relics. A new tab component (mirroring Combo Finder's existing UI patterns) exposes the selection controls and a sorted, virtualized relic list.

**Tech Stack:** TypeScript, React 19, MUI, Vitest, plain Node ESM (`.mjs`) for the one-time generator script — no new dependencies.

## Global Constraints

- The 5 RelicHub effects with `multiplier: null` (`target: "特殊処理"`) are permanently excluded — they must never appear as a selectable effect or checkbox.
- Matching RelicHub effect names to `EffectKey` must go through **English** strings only (`RelicHub eng field` ↔ `src/i18n.ts` `en` translation block). The `ja` block is missing 371 of 850 keys and must not be used for matching.
- `RelicHub/` is a reference-only, read-only data source. Nothing under `RelicHub/` is imported at runtime by the app — only the offline generator script (run manually, output committed) reads it.
- No new npm dependencies. The generator script uses only Node's built-in `fs`/`path` and plain ESM syntax (`.mjs` extension, runs regardless of `"type": "module"` in `package.json`).
- Follow existing patterns: Combo Finder's Nightfarer-selector + per-Nightfarer `localStorage` settings pattern (`src/components/ComboFinder.tsx`), and existing test conventions (pure-logic unit tests via Vitest in `*.test.ts`; no component tests exist in this codebase and none are added here).

---

### Task 1: Damage multiplier data — generator script and generated resource

**Files:**
- Create: `scripts/damage-multiplier-matching.mjs`
- Create: `scripts/damage-multiplier-matching.test.mjs`
- Create: `scripts/generate-damage-multipliers.mjs`
- Create (generated, committed): `src/resources/damageMultipliers.ts`

**Interfaces:**
- Consumes: `RelicHub/data/calc_data.json` (`DAMAGE_MAP`, `ALL_ATK_GROUPS`), `RelicHub/data/skills.json`, `RelicHub/data/deep.json`, `RelicHub/data/demerit.json`, and the raw text of `src/i18n.ts`.
- Produces (for Tasks 3 and 5): `src/resources/damageMultipliers.ts` exporting
  ```ts
  export interface DamageMultiplierEntry {
    multiplier: number;
    bucket?: string;
    conditionalGroup?: string;
    nightfarer?: Nightfarer;
  }
  export const damageMultipliers: Partial<Record<EffectKey, DamageMultiplierEntry>>;
  ```

- [ ] **Step 1: Write the failing test for the pure matching helpers**

Create `scripts/damage-multiplier-matching.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import {
  buildJpnToEngLookup,
  extractI18nEnglishEffectStrings,
  matchEffectKeyName,
} from "./damage-multiplier-matching.mjs";

describe("buildJpnToEngLookup", () => {
  it("merges multiple source lists, first match wins", () => {
    const lookup = buildJpnToEngLookup([
      [{ jpn: "近接攻撃力上昇", eng: "Improved Melee Attack Power" }],
      [{ jpn: "近接攻撃力上昇", eng: "SHOULD NOT WIN" }],
      [{ jpn: "大剣の攻撃力上昇", eng: "Improved Greatsword Attack Power" }],
    ]);
    expect(lookup.get("近接攻撃力上昇")).toBe("Improved Melee Attack Power");
    expect(lookup.get("大剣の攻撃力上昇")).toBe(
      "Improved Greatsword Attack Power"
    );
    expect(lookup.size).toBe(2);
  });

  it("skips entries missing jpn or eng", () => {
    const lookup = buildJpnToEngLookup([
      [{ jpn: "", eng: "Nothing" }, { jpn: "Something", eng: "" }],
    ]);
    expect(lookup.size).toBe(0);
  });
});

describe("extractI18nEnglishEffectStrings", () => {
  const fixture = `
const resources = {
  en: {
    translation: {
      effects: {
        [EffectKey.physicalAttackUp]: "Physical Attack Up",
        [EffectKey.improvedGreatswordAttackPower]: "Improved Greatsword Attack Power",
      },
    },
  },
  ja: {
    translation: {
      effects: {
        [EffectKey.physicalAttackUp]: "物理攻撃力上昇",
      },
    },
  },
};
`;

  it("extracts only English-block entries, keyed by English string", () => {
    const map = extractI18nEnglishEffectStrings(fixture);
    expect(map.get("Physical Attack Up")).toBe("physicalAttackUp");
    expect(map.get("Improved Greatsword Attack Power")).toBe(
      "improvedGreatswordAttackPower"
    );
    expect(map.size).toBe(2);
  });

  it("throws if it cannot locate the en/ja block boundary", () => {
    expect(() => extractI18nEnglishEffectStrings("no blocks here")).toThrow();
  });
});

describe("matchEffectKeyName", () => {
  const jpnToEng = new Map([["近接攻撃力上昇", "Improved Melee Attack Power"]]);
  const englishToKeyName = new Map([
    ["Improved Melee Attack Power", "improvedMeleeAttackPower"],
  ]);

  it("resolves via jpn -> eng -> EffectKey chain", () => {
    expect(
      matchEffectKeyName("近接攻撃力上昇", jpnToEng, englishToKeyName, {})
    ).toBe("improvedMeleeAttackPower");
  });

  it("prefers a manual override when present", () => {
    expect(
      matchEffectKeyName("近接攻撃力上昇", jpnToEng, englishToKeyName, {
        近接攻撃力上昇: "someOverrideKey",
      })
    ).toBe("someOverrideKey");
  });

  it("returns undefined when no eng translation is found", () => {
    expect(
      matchEffectKeyName("未知の効果", jpnToEng, englishToKeyName, {})
    ).toBeUndefined();
  });

  it("returns undefined when eng translation has no matching EffectKey", () => {
    const jpnToEng2 = new Map([["何か", "Some Untranslated Thing"]]);
    expect(
      matchEffectKeyName("何か", jpnToEng2, englishToKeyName, {})
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/damage-multiplier-matching.test.mjs`
Expected: FAIL — `Cannot find module './damage-multiplier-matching.mjs'` (the module doesn't exist yet).

- [ ] **Step 3: Implement the pure matching helpers**

Create `scripts/damage-multiplier-matching.mjs`:

```js
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
  const jaStart = i18nSourceText.indexOf(jaMarker);
  if (enStart === -1 || jaStart === -1 || jaStart <= enStart) {
    throw new Error(
      "Could not locate 'en:' / 'ja:' translation block boundaries in i18n source"
    );
  }
  const enBlock = i18nSourceText.slice(enStart, jaStart);
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run scripts/damage-multiplier-matching.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/damage-multiplier-matching.mjs scripts/damage-multiplier-matching.test.mjs
git commit -m "feat: add pure matching helpers for RelicHub damage data"
```

- [ ] **Step 6: Write the generator script with the full bucket/character tables**

Create `scripts/generate-damage-multipliers.mjs`:

```js
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  buildJpnToEngLookup,
  extractI18nEnglishEffectStrings,
  matchEffectKeyName,
} from "./damage-multiplier-matching.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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
const MANUAL_EFFECT_KEY_OVERRIDES = {};

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
}

main();
```

- [ ] **Step 7: Run the generator**

Run: `node scripts/generate-damage-multipliers.mjs`

Expected: Either `Wrote <N> entries to src/resources/damageMultipliers.ts` (success), or an `ERROR: N DAMAGE_MAP entries could not be matched` / `ERROR: N universal entries have no BUCKET_MAP mapping` message listing the exact unmatched Japanese names.

If entries are unmatched: open `src/resources/effectKeys.ts` and search (by meaning) for the corresponding key — e.g. for `【執行者】スキル中の攻撃力上昇、攻撃時にカット率低下` look near `executorCharacterSkillBoostsAttackButDrainsHP`. Add `"<jpn name>": "<effectKeyName>"` to `MANUAL_EFFECT_KEY_OVERRIDES` in `scripts/generate-damage-multipliers.mjs` and re-run. Repeat until the script succeeds with 141 entries written (146 total minus the 5 null-multiplier entries).

- [ ] **Step 8: Verify the generated file compiles**

Run: `npm run type-check`
Expected: PASS, no errors in `src/resources/damageMultipliers.ts`.

- [ ] **Step 9: Commit**

```bash
git add scripts/generate-damage-multipliers.mjs src/resources/damageMultipliers.ts
git commit -m "feat: generate damage multiplier data from RelicHub"
```

---

### Task 2: Damage category taxonomy

**Files:**
- Create: `src/resources/damageCategories.ts`
- Test: `src/resources/damageCategories.test.ts`

**Interfaces:**
- Consumes: nothing (static data only).
- Produces (for Tasks 3 and 5):
  ```ts
  export interface PrimaryCategory {
    id: string;
    bucket: string;
    labelKey: string;
    weaponOnly: boolean;
    hasSchools?: "sorcery" | "incantation";
  }
  export const primaryCategories: PrimaryCategory[];

  export interface SchoolOption { id: string; bucket: string; labelKey: string; }
  export const sorcerySchools: SchoolOption[];
  export const incantationSchools: SchoolOption[];

  export type DamageElementId = "physical" | "magic" | "fire" | "lightning" | "holy";
  export interface DamageElementOption { id: DamageElementId; bucket: string; labelKey: string; }
  export const damageElements: DamageElementOption[];

  export interface SituationalModifier { id: string; bucket: string; labelKey: string; ironeyeOnly?: boolean; }
  export const situationalModifiers: SituationalModifier[];

  export interface ConditionalGroupOption { id: string; labelKey: string; }
  export const conditionalGroups: ConditionalGroupOption[];
  ```

- [ ] **Step 1: Write the failing test**

Create `src/resources/damageCategories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  conditionalGroups,
  damageElements,
  incantationSchools,
  primaryCategories,
  situationalModifiers,
  sorcerySchools,
} from "./damageCategories";

describe("damageCategories", () => {
  it("has exactly 31 primary categories (24 weapons + 4 items + sorcery + incantation + roar) with unique ids", () => {
    expect(primaryCategories.length).toBe(31);
    expect(new Set(primaryCategories.map((c) => c.id)).size).toBe(31);
  });

  it("marks exactly the 24 weapon categories as weaponOnly", () => {
    expect(primaryCategories.filter((c) => c.weaponOnly).length).toBe(24);
  });

  it("has exactly one sorcery and one incantation primary category with hasSchools set", () => {
    expect(primaryCategories.filter((c) => c.hasSchools === "sorcery").length).toBe(1);
    expect(primaryCategories.filter((c) => c.hasSchools === "incantation").length).toBe(1);
  });

  it("has 7 sorcery schools and 7 incantation schools with unique buckets", () => {
    expect(sorcerySchools.length).toBe(7);
    expect(incantationSchools.length).toBe(7);
    expect(new Set(sorcerySchools.map((s) => s.bucket)).size).toBe(7);
    expect(new Set(incantationSchools.map((s) => s.bucket)).size).toBe(7);
  });

  it("has 5 damage elements", () => {
    expect(damageElements.length).toBe(5);
    expect(damageElements.map((e) => e.id).sort()).toEqual([
      "fire",
      "holy",
      "lightning",
      "magic",
      "physical",
    ]);
  });

  it("has 6 situational modifiers, exactly one restricted to Ironeye", () => {
    expect(situationalModifiers.length).toBe(6);
    expect(situationalModifiers.filter((m) => m.ironeyeOnly).length).toBe(1);
  });

  it("has 9 conditional groups matching RelicHub's GROUP_ORDER", () => {
    expect(conditionalGroups.map((g) => g.id)).toEqual([
      "onTakingDamage",
      "onWeaponSwitch",
      "onAffinityApplied",
      "onGreaseItemUse",
      "againstStatusAffectedEnemies",
      "onNearbyStatusProc",
      "threeOrMoreOfWeaponType",
      "characterExclusive",
      "other",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/resources/damageCategories.test.ts`
Expected: FAIL — cannot find module `./damageCategories`.

- [ ] **Step 3: Implement the taxonomy data**

Create `src/resources/damageCategories.ts`:

```ts
export interface PrimaryCategory {
  id: string;
  bucket: string;
  labelKey: string;
  weaponOnly: boolean;
  hasSchools?: "sorcery" | "incantation";
}

const weaponCategory = (id: string, weaponSlug: string): PrimaryCategory => ({
  id: `weapon:${weaponSlug}`,
  bucket: `weapon:${weaponSlug}`,
  labelKey: `damageRanking.categories.weapon.${weaponSlug}`,
  weaponOnly: true,
});

export const primaryCategories: PrimaryCategory[] = [
  weaponCategory("Dagger", "dagger"),
  weaponCategory("Straight Sword", "straightSword"),
  weaponCategory("Greatsword", "greatsword"),
  weaponCategory("Colossal Sword", "colossalSword"),
  weaponCategory("Thrusting Sword", "thrustingSword"),
  weaponCategory("Heavy Thrusting Sword", "heavyThrustingSword"),
  weaponCategory("Curved Sword", "curvedSword"),
  weaponCategory("Curved Greatsword", "curvedGreatsword"),
  weaponCategory("Katana", "katana"),
  weaponCategory("Twinblade", "twinblade"),
  weaponCategory("Axe", "axe"),
  weaponCategory("Greataxe", "greataxe"),
  weaponCategory("Hammer", "hammer"),
  weaponCategory("Flail", "flail"),
  weaponCategory("Great Hammer", "greatHammer"),
  weaponCategory("Colossal Weapon", "colossalWeapon"),
  weaponCategory("Spear", "spear"),
  weaponCategory("Great Spear", "greatSpear"),
  weaponCategory("Halberd", "halberd"),
  weaponCategory("Reaper", "reaper"),
  weaponCategory("Whip", "whip"),
  weaponCategory("Fist", "fist"),
  weaponCategory("Claw", "claw"),
  weaponCategory("Bow", "bow"),
  {
    id: "thrownPot",
    bucket: "thrownPot",
    labelKey: "damageRanking.categories.thrownPot",
    weaponOnly: false,
  },
  {
    id: "thrownKnife",
    bucket: "thrownKnife",
    labelKey: "damageRanking.categories.thrownKnife",
    weaponOnly: false,
  },
  {
    id: "glintstoneGravityItem",
    bucket: "glintstoneGravityItem",
    labelKey: "damageRanking.categories.glintstoneGravityItem",
    weaponOnly: false,
  },
  {
    id: "perfumeBottle",
    bucket: "perfumeBottle",
    labelKey: "damageRanking.categories.perfumeBottle",
    weaponOnly: false,
  },
  {
    id: "sorcery",
    bucket: "sorceryGeneric",
    labelKey: "damageRanking.categories.sorcery",
    weaponOnly: false,
    hasSchools: "sorcery",
  },
  {
    id: "incantation",
    bucket: "incantationGeneric",
    labelKey: "damageRanking.categories.incantation",
    weaponOnly: false,
    hasSchools: "incantation",
  },
  {
    id: "roarAndBreath",
    bucket: "roarAndBreath",
    labelKey: "damageRanking.categories.roarAndBreath",
    weaponOnly: false,
  },
];

export interface SchoolOption {
  id: string;
  bucket: string;
  labelKey: string;
}

export const sorcerySchools: SchoolOption[] = [
  { id: "glintblade", bucket: "sorcerySchool:glintblade", labelKey: "damageRanking.sorcerySchools.glintblade" },
  { id: "stonedigger", bucket: "sorcerySchool:stonedigger", labelKey: "damageRanking.sorcerySchools.stonedigger" },
  { id: "carianSword", bucket: "sorcerySchool:carianSword", labelKey: "damageRanking.sorcerySchools.carianSword" },
  { id: "invisibility", bucket: "sorcerySchool:invisibility", labelKey: "damageRanking.sorcerySchools.invisibility" },
  { id: "crystalian", bucket: "sorcerySchool:crystalian", labelKey: "damageRanking.sorcerySchools.crystalian" },
  { id: "gravity", bucket: "sorcerySchool:gravity", labelKey: "damageRanking.sorcerySchools.gravity" },
  { id: "thorn", bucket: "sorcerySchool:thorn", labelKey: "damageRanking.sorcerySchools.thorn" },
];

export const incantationSchools: SchoolOption[] = [
  { id: "fundamentalist", bucket: "incantationSchool:fundamentalist", labelKey: "damageRanking.incantationSchools.fundamentalist" },
  { id: "dragonCult", bucket: "incantationSchool:dragonCult", labelKey: "damageRanking.incantationSchools.dragonCult" },
  { id: "giantsFlame", bucket: "incantationSchool:giantsFlame", labelKey: "damageRanking.incantationSchools.giantsFlame" },
  { id: "godslayer", bucket: "incantationSchool:godslayer", labelKey: "damageRanking.incantationSchools.godslayer" },
  { id: "bestial", bucket: "incantationSchool:bestial", labelKey: "damageRanking.incantationSchools.bestial" },
  { id: "frenziedFlame", bucket: "incantationSchool:frenziedFlame", labelKey: "damageRanking.incantationSchools.frenziedFlame" },
  { id: "dragonCommunion", bucket: "incantationSchool:dragonCommunion", labelKey: "damageRanking.incantationSchools.dragonCommunion" },
];

export type DamageElementId = "physical" | "magic" | "fire" | "lightning" | "holy";

export interface DamageElementOption {
  id: DamageElementId;
  bucket: string;
  labelKey: string;
}

export const damageElements: DamageElementOption[] = [
  { id: "physical", bucket: "element:physical", labelKey: "damageRanking.elements.physical" },
  { id: "magic", bucket: "element:magic", labelKey: "damageRanking.elements.magic" },
  { id: "fire", bucket: "element:fire", labelKey: "damageRanking.elements.fire" },
  { id: "lightning", bucket: "element:lightning", labelKey: "damageRanking.elements.lightning" },
  { id: "holy", bucket: "element:holy", labelKey: "damageRanking.elements.holy" },
];

export interface SituationalModifier {
  id: string;
  bucket: string;
  labelKey: string;
  ironeyeOnly?: boolean;
}

export const situationalModifiers: SituationalModifier[] = [
  { id: "weaponSkill", bucket: "weaponSkill", labelKey: "damageRanking.situationalModifiers.weaponSkill" },
  { id: "normalAttackFirstHit", bucket: "normalAttackFirstHit", labelKey: "damageRanking.situationalModifiers.normalAttackFirstHit" },
  { id: "criticalHit", bucket: "criticalHit", labelKey: "damageRanking.situationalModifiers.criticalHit" },
  { id: "criticalHitPlus1", bucket: "criticalHitPlus1", labelKey: "damageRanking.situationalModifiers.criticalHitPlus1" },
  { id: "guardCounter", bucket: "guardCounter", labelKey: "damageRanking.situationalModifiers.guardCounter" },
  { id: "ironeyeThrustCounter", bucket: "ironeyeThrustCounter", labelKey: "damageRanking.situationalModifiers.ironeyeThrustCounter", ironeyeOnly: true },
];

export interface ConditionalGroupOption {
  id: string;
  labelKey: string;
}

export const conditionalGroups: ConditionalGroupOption[] = [
  { id: "onTakingDamage", labelKey: "damageRanking.conditionalGroups.onTakingDamage" },
  { id: "onWeaponSwitch", labelKey: "damageRanking.conditionalGroups.onWeaponSwitch" },
  { id: "onAffinityApplied", labelKey: "damageRanking.conditionalGroups.onAffinityApplied" },
  { id: "onGreaseItemUse", labelKey: "damageRanking.conditionalGroups.onGreaseItemUse" },
  { id: "againstStatusAffectedEnemies", labelKey: "damageRanking.conditionalGroups.againstStatusAffectedEnemies" },
  { id: "onNearbyStatusProc", labelKey: "damageRanking.conditionalGroups.onNearbyStatusProc" },
  { id: "threeOrMoreOfWeaponType", labelKey: "damageRanking.conditionalGroups.threeOrMoreOfWeaponType" },
  { id: "characterExclusive", labelKey: "damageRanking.conditionalGroups.characterExclusive" },
  { id: "other", labelKey: "damageRanking.conditionalGroups.other" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/resources/damageCategories.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/resources/damageCategories.ts src/resources/damageCategories.test.ts
git commit -m "feat: add damage ranking category taxonomy"
```

---

### Task 3: Damage score calculation engine

**Files:**
- Create: `src/utils/DamageRanking.ts`
- Test: `src/utils/DamageRanking.test.ts`

**Interfaces:**
- Consumes:
  - `damageMultipliers: Partial<Record<EffectKey, DamageMultiplierEntry>>` from `../resources/damageMultipliers` (Task 1)
  - `primaryCategories`, `sorcerySchools`, `incantationSchools`, `damageElements`, `situationalModifiers`, `DamageElementId` from `../resources/damageCategories` (Task 2)
  - `Nightfarer` from `./Nightfarers`
  - `RelicSlot`, `EffectWithOptionalDebuff` from `../types/SaveFile`
  - `EffectKey` from `../resources/effectKeys`
- Produces (for Task 5):
  ```ts
  export interface DamageRankingSelection {
    nightfarer: Nightfarer;
    primaryCategoryId: string;
    schoolId?: string;
    element: DamageElementId;
    enabledSituationalModifiers: ReadonlySet<string>;
    enabledConditionalGroups: ReadonlySet<string>;
  }
  export function getContributingEffectKeys(relic: RelicSlot, selection: DamageRankingSelection): EffectKey[];
  export function calculateDamageScore(relic: RelicSlot, selection: DamageRankingSelection): number;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/utils/DamageRanking.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EffectKey } from "../resources/effectKeys";
import type { RelicSlot } from "../types/SaveFile";
import {
  calculateDamageScore,
  getContributingEffectKeys,
  type DamageRankingSelection,
} from "./DamageRanking";
import { Nightfarer } from "./Nightfarers";

function relicWithKeys(...keys: EffectKey[]): RelicSlot {
  return {
    id: 0,
    itemId: 0,
    effects: keys.map((key) => [{ key }] as [{ key: EffectKey }]),
    coordinates: [0, 0],
    coordinatesByColor: [0, 0],
  } as RelicSlot;
}

const baseSelection: DamageRankingSelection = {
  nightfarer: Nightfarer.Wylder,
  primaryCategoryId: "weapon:greatsword",
  element: "physical",
  enabledSituationalModifiers: new Set(),
  enabledConditionalGroups: new Set(),
};

describe("getContributingEffectKeys / calculateDamageScore", () => {
  it("includes melee, weapon-specific, and element multipliers for a matching weapon build", () => {
    const relic = relicWithKeys(
      EffectKey.improvedMeleeAttackPower,
      EffectKey.improvedGreatswordAttackPower,
      EffectKey.physicalAttackUp
    );
    const contributing = getContributingEffectKeys(relic, baseSelection);
    expect(contributing.sort()).toEqual(
      [
        EffectKey.improvedMeleeAttackPower,
        EffectKey.improvedGreatswordAttackPower,
        EffectKey.physicalAttackUp,
      ].sort()
    );
    expect(calculateDamageScore(relic, baseSelection)).toBeCloseTo(
      1.05 * 1.09 * 1.04,
      5
    );
  });

  it("excludes a weapon-specific multiplier for a different weapon category", () => {
    const relic = relicWithKeys(EffectKey.improvedGreatswordAttackPower);
    const differentWeapon: DamageRankingSelection = {
      ...baseSelection,
      primaryCategoryId: "weapon:dagger",
    };
    expect(getContributingEffectKeys(relic, differentWeapon)).toEqual([]);
    expect(calculateDamageScore(relic, differentWeapon)).toBe(1);
  });

  it("excludes a conditional-group effect unless its group is enabled", () => {
    const relic = relicWithKeys(EffectKey.attackUpWhenTakingAttacks);
    expect(getContributingEffectKeys(relic, baseSelection)).toEqual([]);

    const withGroupEnabled: DamageRankingSelection = {
      ...baseSelection,
      enabledConditionalGroups: new Set(["onTakingDamage"]),
    };
    expect(getContributingEffectKeys(relic, withGroupEnabled)).toEqual([
      EffectKey.attackUpWhenTakingAttacks,
    ]);
  });

  it("excludes a Nightfarer-exclusive effect for a non-matching Nightfarer", () => {
    const relic = relicWithKeys(
      EffectKey.ironeyeBoostsThrustingCounterattacksAfterArt
    );
    const wylderIronEyeBuild: DamageRankingSelection = {
      ...baseSelection,
      enabledSituationalModifiers: new Set(["ironeyeThrustCounter"]),
    };
    expect(getContributingEffectKeys(relic, wylderIronEyeBuild)).toEqual([]);

    const ironeyeBuild: DamageRankingSelection = {
      ...wylderIronEyeBuild,
      nightfarer: Nightfarer.Ironeye,
    };
    expect(getContributingEffectKeys(relic, ironeyeBuild)).toEqual([
      EffectKey.ironeyeBoostsThrustingCounterattacksAfterArt,
    ]);
  });

  it("includes affinity attack up automatically for non-physical elements", () => {
    const relic = relicWithKeys(EffectKey.improvedAffinityAttackPower);
    const fireBuild: DamageRankingSelection = { ...baseSelection, element: "fire" };
    expect(getContributingEffectKeys(relic, fireBuild)).toEqual([
      EffectKey.improvedAffinityAttackPower,
    ]);
    expect(getContributingEffectKeys(relic, baseSelection)).toEqual([]);
  });

  it("scores a relic with no applicable effects as the baseline 1", () => {
    const relic = relicWithKeys(EffectKey.vigorPlus1);
    expect(calculateDamageScore(relic, baseSelection)).toBe(1);
  });
});
```

Note: this test references `EffectKey.attackUpWhenTakingAttacks` and `EffectKey.improvedAffinityAttackPower` as illustrative names — if Task 1's generator log (or a search of `src/resources/effectKeys.ts`) shows different actual member names for "攻撃を受けると攻撃力上昇" and "属性攻撃力上昇", update these two references in this test to match before running it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/DamageRanking.test.ts`
Expected: FAIL — cannot find module `./DamageRanking`.

- [ ] **Step 3: Implement the calculation engine**

Create `src/utils/DamageRanking.ts`:

```ts
import type { DamageElementId } from "../resources/damageCategories";
import {
  damageElements,
  incantationSchools,
  primaryCategories,
  sorcerySchools,
} from "../resources/damageCategories";
import { damageMultipliers } from "../resources/damageMultipliers";
import type { EffectKey } from "../resources/effectKeys";
import type { RelicSlot } from "../types/SaveFile";
import { Nightfarer } from "./Nightfarers";

export interface DamageRankingSelection {
  nightfarer: Nightfarer;
  primaryCategoryId: string;
  schoolId?: string;
  element: DamageElementId;
  enabledSituationalModifiers: ReadonlySet<string>;
  enabledConditionalGroups: ReadonlySet<string>;
}

function getActiveBuckets(selection: DamageRankingSelection): Set<string> {
  const active = new Set<string>();
  const category = primaryCategories.find(
    (c) => c.id === selection.primaryCategoryId
  );
  if (!category) {
    return active;
  }
  active.add(category.bucket);

  if (category.weaponOnly) {
    active.add("melee");
    for (const modifier of [
      "weaponSkill",
      "normalAttackFirstHit",
      "criticalHit",
      "criticalHitPlus1",
      "guardCounter",
      "ironeyeThrustCounter",
    ] as const) {
      if (selection.enabledSituationalModifiers.has(modifier)) {
        active.add(modifier);
      }
    }
    if (selection.primaryCategoryId === "weapon:katana") {
      active.add("executorKatanaBoost");
    }
  }

  if (category.hasSchools === "sorcery") {
    const school = sorcerySchools.find((s) => s.id === selection.schoolId);
    if (school) {
      active.add(school.bucket);
    }
  }
  if (category.hasSchools === "incantation") {
    const school = incantationSchools.find((s) => s.id === selection.schoolId);
    if (school) {
      active.add(school.bucket);
    }
  }

  const elementDef = damageElements.find((e) => e.id === selection.element);
  if (elementDef) {
    active.add(elementDef.bucket);
    if (selection.element !== "physical") {
      active.add("affinityAttackUp");
    }
  }

  active.add("recluseLandOfSorcery");

  return active;
}

function relicEffectKeys(relic: RelicSlot): EffectKey[] {
  return relic.effects.flatMap(([effect, debuff]) =>
    debuff !== undefined ? [effect.key, debuff.key] : [effect.key]
  );
}

export function getContributingEffectKeys(
  relic: RelicSlot,
  selection: DamageRankingSelection
): EffectKey[] {
  const activeBuckets = getActiveBuckets(selection);
  const contributing: EffectKey[] = [];

  for (const key of relicEffectKeys(relic)) {
    const entry = damageMultipliers[key];
    if (!entry) {
      continue;
    }
    if (entry.nightfarer !== undefined && entry.nightfarer !== selection.nightfarer) {
      continue;
    }
    if (entry.conditionalGroup !== undefined) {
      if (selection.enabledConditionalGroups.has(entry.conditionalGroup)) {
        contributing.push(key);
      }
      continue;
    }
    if (entry.bucket !== undefined && activeBuckets.has(entry.bucket)) {
      contributing.push(key);
    }
  }

  return contributing;
}

export function calculateDamageScore(
  relic: RelicSlot,
  selection: DamageRankingSelection
): number {
  let score = 1;
  for (const key of getContributingEffectKeys(relic, selection)) {
    const entry = damageMultipliers[key];
    if (entry) {
      score *= entry.multiplier;
    }
  }
  return score;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/DamageRanking.test.ts`
Expected: PASS (6 tests). If any test referencing `EffectKey.attackUpWhenTakingAttacks` / `EffectKey.improvedAffinityAttackPower` fails because those exact member names don't exist, search `src/resources/effectKeys.ts` for the real names (meaning: "on taking an attack, attack power increases" / "improved affinity attack power") and update the test file, then re-run.

- [ ] **Step 5: Commit**

```bash
git add src/utils/DamageRanking.ts src/utils/DamageRanking.test.ts
git commit -m "feat: add damage score calculation engine"
```

---

### Task 4: i18n strings for the Damage Ranking tab

**Files:**
- Modify: `src/i18n.ts:118` (English `effects` block start — insert a new `damageRanking` object as a sibling near the top of `en.translation`, e.g. right after the existing `nightfarers` block)
- Modify: `src/i18n.ts:1573` (Japanese `translation` block — insert the matching `damageRanking` object as a sibling of `ja.translation`'s `nightfarers` block)

**Interfaces:**
- Consumes: nothing.
- Produces (for Task 5): `t("damageRanking.<key>")` translation strings for every key referenced by `labelKey` values in Task 2's `src/resources/damageCategories.ts`, plus the additional UI labels listed below.

- [ ] **Step 1: Add the English `damageRanking` block**

In `src/i18n.ts`, inside `en.translation` (the object that already contains `nightfarers: { ... }`), add a new top-level sibling key:

```ts
      damageRanking: {
        tabLabel: "Damage Ranking",
        nightfarerLabel: "Nightfarer",
        categoryLabel: "Attack Category",
        elementLabel: "Damage Element",
        schoolLabel: "School",
        situationalModifiersLabel: "Situational Modifiers",
        conditionalEffectsLabel: "Conditional Effects",
        scoreLabel: "Score",
        categories: {
          weapon: {
            dagger: "Dagger",
            straightSword: "Straight Sword",
            greatsword: "Greatsword",
            colossalSword: "Colossal Sword",
            thrustingSword: "Thrusting Sword",
            heavyThrustingSword: "Heavy Thrusting Sword",
            curvedSword: "Curved Sword",
            curvedGreatsword: "Curved Greatsword",
            katana: "Katana",
            twinblade: "Twinblade",
            axe: "Axe",
            greataxe: "Greataxe",
            hammer: "Hammer",
            flail: "Flail",
            greatHammer: "Great Hammer",
            colossalWeapon: "Colossal Weapon",
            spear: "Spear",
            greatSpear: "Great Spear",
            halberd: "Halberd",
            reaper: "Reaper",
            whip: "Whip",
            fist: "Fist",
            claw: "Claw",
            bow: "Bow",
          },
          thrownPot: "Thrown Pot",
          thrownKnife: "Thrown Knife",
          glintstoneGravityItem: "Glintstone / Gravity Stone Item",
          perfumeBottle: "Perfume Bottle",
          sorcery: "Sorcery",
          incantation: "Incantation",
          roarAndBreath: "Roar & Breath",
        },
        sorcerySchools: {
          glintblade: "Glintblade Sorcery",
          stonedigger: "Stonedigger Sorcery",
          carianSword: "Carian Sword Sorcery",
          invisibility: "Invisibility Sorcery",
          crystalian: "Crystalian Sorcery",
          gravity: "Gravity Sorcery",
          thorn: "Thorn Sorcery",
        },
        incantationSchools: {
          fundamentalist: "Fundamentalist Incantations",
          dragonCult: "Dragon Cult Incantations",
          giantsFlame: "Giants' Flame Incantations",
          godslayer: "Godslayer Incantations",
          bestial: "Bestial Incantations",
          frenziedFlame: "Frenzied Flame Incantations",
          dragonCommunion: "Dragon Communion Incantations",
        },
        elements: {
          physical: "Physical",
          magic: "Magic",
          fire: "Fire",
          lightning: "Lightning",
          holy: "Holy",
        },
        situationalModifiers: {
          weaponSkill: "Weapon Skill",
          normalAttackFirstHit: "Normal Attack (1st Hit)",
          criticalHit: "Critical Hit",
          criticalHitPlus1: "Critical Hit +1",
          guardCounter: "Guard Counter",
          ironeyeThrustCounter: "Thrusting Counter (Ironeye)",
        },
        conditionalGroups: {
          onTakingDamage: "On Taking Damage",
          onWeaponSwitch: "On Weapon Switch",
          onAffinityApplied: "On Affinity Applied",
          onGreaseItemUse: "On Grease Item Use",
          againstStatusAffectedEnemies: "Against Status-Afflicted Enemies",
          onNearbyStatusProc: "On Nearby Status Proc",
          threeOrMoreOfWeaponType: "3+ of a Weapon Type Equipped",
          characterExclusive: "Character-Exclusive",
          other: "Other",
        },
      },
```

- [ ] **Step 2: Add the matching Japanese `damageRanking` block**

In `src/i18n.ts`, inside `ja.translation` (the sibling object further down that also has its own `nightfarers: { ... }`), add:

```ts
      damageRanking: {
        tabLabel: "ダメージランキング",
        nightfarerLabel: "キャラクター",
        categoryLabel: "攻撃カテゴリ",
        elementLabel: "属性",
        schoolLabel: "系統",
        situationalModifiersLabel: "状況別修正",
        conditionalEffectsLabel: "条件付き効果",
        scoreLabel: "スコア",
        categories: {
          weapon: {
            dagger: "短剣",
            straightSword: "直剣",
            greatsword: "大剣",
            colossalSword: "特大剣",
            thrustingSword: "刺剣",
            heavyThrustingSword: "重刺剣",
            curvedSword: "曲剣",
            curvedGreatsword: "大曲剣",
            katana: "刀",
            twinblade: "両刃剣",
            axe: "斧",
            greataxe: "大斧",
            hammer: "槌",
            flail: "フレイル",
            greatHammer: "大槌",
            colossalWeapon: "特大武器",
            spear: "槍",
            greatSpear: "大槍",
            halberd: "斧槍",
            reaper: "鎌",
            whip: "鞭",
            fist: "拳",
            claw: "爪",
            bow: "弓",
          },
          thrownPot: "投擲壺",
          thrownKnife: "投擲ナイフ",
          glintstoneGravityItem: "輝石・重力石アイテム",
          perfumeBottle: "調香瓶",
          sorcery: "魔術",
          incantation: "祈祷",
          roarAndBreath: "咆哮とブレス",
        },
        sorcerySchools: {
          glintblade: "輝剣の魔術",
          stonedigger: "石掘りの魔術",
          carianSword: "カーリアの剣の魔術",
          invisibility: "不可視の魔術",
          crystalian: "結晶人の魔術",
          gravity: "重力の魔術",
          thorn: "茨の魔術",
        },
        incantationSchools: {
          fundamentalist: "黄金律原理主義の祈祷",
          dragonCult: "王都古竜信仰の祈祷",
          giantsFlame: "巨人の火の祈祷",
          godslayer: "神狩りの祈祷",
          bestial: "獣の祈祷",
          frenziedFlame: "狂い火の祈祷",
          dragonCommunion: "竜餐の祈祷",
        },
        elements: {
          physical: "物理",
          magic: "魔力",
          fire: "炎",
          lightning: "雷",
          holy: "聖",
        },
        situationalModifiers: {
          weaponSkill: "戦技",
          normalAttackFirstHit: "通常攻撃1段目",
          criticalHit: "致命の一撃",
          criticalHitPlus1: "致命の一撃+1",
          guardCounter: "ガードカウンター",
          ironeyeThrustCounter: "刺突カウンター（鉄の目）",
        },
        conditionalGroups: {
          onTakingDamage: "被ダメージ時",
          onWeaponSwitch: "武器持ち替え時",
          onAffinityApplied: "属性付与時",
          onGreaseItemUse: "脂アイテム使用時",
          againstStatusAffectedEnemies: "状態異常の敵への攻撃",
          onNearbyStatusProc: "周囲の状態異常発生時",
          threeOrMoreOfWeaponType: "武器種3種以上装備",
          characterExclusive: "キャラクター固有",
          other: "その他",
        },
      },
```

- [ ] **Step 3: Verify the project still type-checks and existing i18n tests still pass**

Run: `npm run type-check && npx vitest run src/resources/effects.test.ts`
Expected: PASS. (This does not add any new `EffectKey` entries, so `effects.test.ts`'s translation-completeness check is unaffected.)

- [ ] **Step 4: Commit**

```bash
git add src/i18n.ts
git commit -m "feat: add translations for the Damage Ranking tab"
```

---

### Task 5: Damage Ranking tab component

**Files:**
- Create: `src/components/DamageRanking.tsx`

**Interfaces:**
- Consumes:
  - `Nightfarer`, `nightfarers`, `isNightfarer` from `../utils/Nightfarers`
  - `primaryCategories`, `sorcerySchools`, `incantationSchools`, `damageElements`, `situationalModifiers`, `conditionalGroups`, `DamageElementId` from `../resources/damageCategories` (Task 2)
  - `calculateDamageScore`, `getContributingEffectKeys`, `DamageRankingSelection` from `../utils/DamageRanking` (Task 3)
  - `CharacterSlot`, `RelicSlot` from `../types/SaveFile`
  - `RelicCard` from `./RelicCard` (props: `relic`, `searchTerm`, `selectedColor`, `highlightedEffects`, `coordinatesByColor` — see `src/components/RelicCard.tsx:26-32`)
  - `getEffectByKey`, `getRelicColor` from `../utils/DataUtils`
  - `useVirtualizer` from `@tanstack/react-virtual`
- Produces (for Task 6): `export function DamageRanking(props: DamageRankingProps): JSX.Element` where
  ```ts
  interface DamageRankingProps {
    currentSlot: CharacterSlot;
  }
  ```

- [ ] **Step 1: Implement the component**

Create `src/components/DamageRanking.tsx`:

```tsx
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  conditionalGroups,
  damageElements,
  incantationSchools,
  primaryCategories,
  situationalModifiers,
  sorcerySchools,
  type DamageElementId,
} from "../resources/damageCategories";
import type { CharacterSlot, RelicSlot } from "../types/SaveFile";
import { getEffectByKey, getRelicColor } from "../utils/DataUtils";
import {
  calculateDamageScore,
  getContributingEffectKeys,
  type DamageRankingSelection,
} from "../utils/DamageRanking";
import { isNightfarer, Nightfarer, nightfarers } from "../utils/Nightfarers";
import { RelicSlotColor } from "../utils/RelicColor";

const SELECTED_NIGHTFARER_STORAGE_KEY = "damageRanking:selectedNightfarer:v1";
const SETTINGS_STORAGE_KEY = "damageRanking:settings:v1";

interface StoredSettings {
  primaryCategoryId: string;
  schoolId?: string;
  element: DamageElementId;
  enabledSituationalModifiers: string[];
  enabledConditionalGroups: string[];
}

function defaultSettings(): StoredSettings {
  return {
    primaryCategoryId: primaryCategories[0].id,
    element: "physical",
    enabledSituationalModifiers: [],
    enabledConditionalGroups: [],
  };
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaultSettings();
    }
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    const base = defaultSettings();
    return {
      primaryCategoryId:
        typeof parsed.primaryCategoryId === "string"
          ? parsed.primaryCategoryId
          : base.primaryCategoryId,
      schoolId: typeof parsed.schoolId === "string" ? parsed.schoolId : undefined,
      element:
        parsed.element === "physical" ||
        parsed.element === "magic" ||
        parsed.element === "fire" ||
        parsed.element === "lightning" ||
        parsed.element === "holy"
          ? parsed.element
          : base.element,
      enabledSituationalModifiers: Array.isArray(parsed.enabledSituationalModifiers)
        ? parsed.enabledSituationalModifiers.filter((v): v is string => typeof v === "string")
        : [],
      enabledConditionalGroups: Array.isArray(parsed.enabledConditionalGroups)
        ? parsed.enabledConditionalGroups.filter((v): v is string => typeof v === "string")
        : [],
    };
  } catch {
    return defaultSettings();
  }
}

interface DamageRankingProps {
  currentSlot: CharacterSlot;
}

export function DamageRanking({ currentSlot }: DamageRankingProps) {
  const { t } = useTranslation();

  const [nightfarer, setNightfarer] = useState<Nightfarer>(() => {
    try {
      const raw = localStorage.getItem(SELECTED_NIGHTFARER_STORAGE_KEY);
      if (raw) {
        const parsed = parseInt(raw, 10);
        if (isNightfarer(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return Nightfarer.Wylder;
  });

  const [settings, setSettings] = useState<StoredSettings>(loadSettings);

  const persist = (next: StoredSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleNightfarerChange = (event: SelectChangeEvent<number>) => {
    const value = Number(event.target.value);
    if (isNightfarer(value)) {
      setNightfarer(value);
      try {
        localStorage.setItem(SELECTED_NIGHTFARER_STORAGE_KEY, String(value));
      } catch {
        // ignore
      }
    }
  };

  const category = primaryCategories.find((c) => c.id === settings.primaryCategoryId);
  const schoolOptions =
    category?.hasSchools === "sorcery"
      ? sorcerySchools
      : category?.hasSchools === "incantation"
        ? incantationSchools
        : [];

  const selection: DamageRankingSelection = useMemo(
    () => ({
      nightfarer,
      primaryCategoryId: settings.primaryCategoryId,
      schoolId: settings.schoolId,
      element: settings.element,
      enabledSituationalModifiers: new Set(settings.enabledSituationalModifiers),
      enabledConditionalGroups: new Set(settings.enabledConditionalGroups),
    }),
    [nightfarer, settings]
  );

  const rankedRelics = useMemo(() => {
    return [...currentSlot.relics].sort(
      (a, b) => calculateDamageScore(b, selection) - calculateDamageScore(a, selection)
    );
  }, [currentSlot.relics, selection]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rankedRelics.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
  });

  const toggleSetMember = (
    field: "enabledSituationalModifiers" | "enabledConditionalGroups",
    id: string
  ) => {
    const current = new Set(settings[field]);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    persist({ ...settings, [field]: [...current] });
  };

  const getScore = (relic: RelicSlot) => calculateDamageScore(relic, selection);
  const getHighlighted = (relic: RelicSlot) =>
    getContributingEffectKeys(relic, selection)
      .map((key) => getEffectByKey(key))
      .filter((effect): effect is NonNullable<typeof effect> => effect !== undefined);

  return (
    <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
      <Box sx={{ width: 320, p: 2, overflowY: "auto", flexShrink: 0 }}>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="damage-ranking-nightfarer-label">
            {t("damageRanking.nightfarerLabel")}
          </InputLabel>
          <Select<number>
            labelId="damage-ranking-nightfarer-label"
            value={nightfarer}
            label={t("damageRanking.nightfarerLabel")}
            onChange={handleNightfarerChange}
          >
            {Object.values(Nightfarer)
              .filter((v): v is Nightfarer => typeof v === "number")
              .map((nf) => (
                <MenuItem key={nf} value={nf}>
                  {t(`nightfarers.${nf}`, { defaultValue: nightfarers[nf].name })}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="damage-ranking-category-label">
            {t("damageRanking.categoryLabel")}
          </InputLabel>
          <Select
            labelId="damage-ranking-category-label"
            value={settings.primaryCategoryId}
            label={t("damageRanking.categoryLabel")}
            onChange={(e) =>
              persist({ ...settings, primaryCategoryId: e.target.value, schoolId: undefined })
            }
          >
            {primaryCategories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {t(c.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {schoolOptions.length > 0 && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel id="damage-ranking-school-label">
              {t("damageRanking.schoolLabel")}
            </InputLabel>
            <Select
              labelId="damage-ranking-school-label"
              value={settings.schoolId ?? ""}
              label={t("damageRanking.schoolLabel")}
              onChange={(e) => persist({ ...settings, schoolId: e.target.value || undefined })}
            >
              <MenuItem value="">—</MenuItem>
              {schoolOptions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {t(s.labelKey)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="damage-ranking-element-label">
            {t("damageRanking.elementLabel")}
          </InputLabel>
          <Select
            labelId="damage-ranking-element-label"
            value={settings.element}
            label={t("damageRanking.elementLabel")}
            onChange={(e) =>
              persist({ ...settings, element: e.target.value as DamageElementId })
            }
          >
            {damageElements.map((el) => (
              <MenuItem key={el.id} value={el.id}>
                {t(el.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {category?.weaponOnly && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">
              {t("damageRanking.situationalModifiersLabel")}
            </Typography>
            {situationalModifiers
              .filter((m) => !m.ironeyeOnly || nightfarer === Nightfarer.Ironeye)
              .map((m) => (
                <FormControlLabel
                  key={m.id}
                  control={
                    <Checkbox
                      checked={settings.enabledSituationalModifiers.includes(m.id)}
                      onChange={() => toggleSetMember("enabledSituationalModifiers", m.id)}
                    />
                  }
                  label={t(m.labelKey)}
                />
              ))}
          </Box>
        )}

        <Box>
          <Typography variant="subtitle2">
            {t("damageRanking.conditionalEffectsLabel")}
          </Typography>
          {conditionalGroups.map((g) => (
            <FormControlLabel
              key={g.id}
              control={
                <Checkbox
                  checked={settings.enabledConditionalGroups.includes(g.id)}
                  onChange={() => toggleSetMember("enabledConditionalGroups", g.id)}
                />
              }
              label={t(g.labelKey)}
            />
          ))}
        </Box>
      </Box>

      <Box ref={parentRef} sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
        <Box style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const relic = rankedRelics[virtualRow.index];
            return (
              <Box
                key={relic.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                  {t("damageRanking.scoreLabel")}: {getScore(relic).toFixed(3)}
                </Typography>
                <RelicCardWithHighlight relic={relic} highlightedEffects={getHighlighted(relic)} />
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function RelicCardWithHighlight({
  relic,
  highlightedEffects,
}: {
  relic: RelicSlot;
  highlightedEffects: ReturnType<typeof getEffectByKey>[];
}) {
  const RelicCardLazy = require("./RelicCard").RelicCard;
  return (
    <RelicCardLazy
      relic={relic}
      searchTerm=""
      selectedColor={getRelicColor(relic.itemId) as RelicSlotColor}
      highlightedEffects={highlightedEffects.filter((e) => e !== undefined)}
      coordinatesByColor={false}
    />
  );
}
```

- [ ] **Step 2: Fix the `RelicCard` import**

The `require(...)` above is a placeholder to keep the diff readable during review — replace it with a normal static import before running anything. Remove the `RelicCardWithHighlight` wrapper entirely and use `RelicCard` directly:

At the top of `src/components/DamageRanking.tsx`, add:

```ts
import { RelicCard } from "./RelicCard";
```

Delete the `RelicCardWithHighlight` function, and in the virtualized row, replace the `<RelicCardWithHighlight ... />` usage with:

```tsx
<RelicCard
  relic={relic}
  searchTerm=""
  selectedColor={getRelicColor(relic.itemId) as RelicSlotColor}
  highlightedEffects={getHighlighted(relic).filter((e) => e !== undefined)}
  coordinatesByColor={false}
/>
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS. Fix any type errors (e.g. `Object.values(Nightfarer)` on a `const enum` doesn't work at runtime — if type-check or a later manual smoke test reveals this, replace the Nightfarer `<Select>` options with `Object.keys(nightfarers).map(Number)` instead, which iterates the `nightfarers` const object's numeric keys and works correctly with `const enum` values).

- [ ] **Step 4: Commit**

```bash
git add src/components/DamageRanking.tsx
git commit -m "feat: add Damage Ranking tab component"
```

---

### Task 6: Wire the tab into RelicsPage

**Files:**
- Modify: `src/components/RelicsPage.tsx:10-13` (the `TabIndex` enum)
- Modify: `src/components/RelicsPage.tsx:1-8` (imports)
- Modify: `src/components/RelicsPage.tsx:112-136` (the `Tabs`/tab-content JSX)

**Interfaces:**
- Consumes: `DamageRanking` component from `./DamageRanking` (Task 5), props `{ currentSlot: CharacterSlot }`.
- Produces: nothing further downstream — this is the final integration point.

- [ ] **Step 1: Add the new tab index and import**

In `src/components/RelicsPage.tsx`, change:

```ts
const enum TabIndex {
  RelicBrowser,
  ComboFinder,
}
```

to:

```ts
const enum TabIndex {
  RelicBrowser,
  ComboFinder,
  DamageRanking,
}
```

and add the import alongside the existing component imports:

```ts
import { DamageRanking } from "./DamageRanking";
```

- [ ] **Step 2: Add the tab button and tab content**

In the `<Tabs>` block, change:

```tsx
<Tabs value={tab} onChange={(_e, value) => setTab(value)} centered>
  <Tab value={TabIndex.RelicBrowser} label="Relic Browser" />
  <Tab value={TabIndex.ComboFinder} label="Combo Finder" />
</Tabs>
```

to:

```tsx
<Tabs value={tab} onChange={(_e, value) => setTab(value)} centered>
  <Tab value={TabIndex.RelicBrowser} label="Relic Browser" />
  <Tab value={TabIndex.ComboFinder} label="Combo Finder" />
  <Tab value={TabIndex.DamageRanking} label={t("damageRanking.tabLabel")} />
</Tabs>
```

and after the existing `{tab === TabIndex.ComboFinder && (...)}` block, add:

```tsx
{tab === TabIndex.DamageRanking && <DamageRanking currentSlot={currentSlot} />}
```

- [ ] **Step 3: Type-check and run the full test suite**

Run: `npm run type-check && npm run test -- --run`
Expected: PASS — all existing tests plus the new ones from Tasks 1–3.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open the local URL, load the demo data (or a save file), navigate to the new "Damage Ranking" tab (label may show as `damageRanking.tabLabel` if translations didn't load — confirm it renders "Damage Ranking" / "ダメージランキング" instead). Select a Nightfarer and a weapon category (e.g. Greatsword), confirm the relic list re-sorts and each relic shows a numeric score. Toggle a conditional-effects checkbox and confirm scores change for relics with that effect.

- [ ] **Step 5: Commit**

```bash
git add src/components/RelicsPage.tsx
git commit -m "feat: wire Damage Ranking tab into RelicsPage"
```

---

## Self-Review

**Spec coverage:** All design-doc sections are covered — data layer/matching (Task 1), calculation logic (Tasks 2–3), UI tab/left panel/right panel (Tasks 5–6), i18n (Task 4). The 5 "特殊処理" effects are excluded in Task 1 Step 6 (`if (data.multiplier === null) continue`). Conditional-group checkboxes (Task 5) and Nightfarer-exclusive gating (Task 3) match the approved design.

**Placeholder scan:** Task 5 Step 1 intentionally includes a `require(...)` placeholder with an explicit fix in Step 2 — this is a deliberate two-step within one task (write, then immediately correct before running anything), not an unresolved TODO; Step 2's replacement code is complete and shown in full. No other placeholders remain.

**Type consistency:** `DamageRankingSelection` (Task 3) is used identically in Task 5. `DamageMultiplierEntry` (Task 1) fields (`multiplier`, `bucket`, `conditionalGroup`, `nightfarer`) are consumed with matching names in Task 3. `PrimaryCategory`/`SchoolOption`/`DamageElementOption`/`SituationalModifier`/`ConditionalGroupOption` (Task 2) field names (`id`, `bucket`, `labelKey`, `weaponOnly`, `hasSchools`, `ironeyeOnly`) are used consistently in Tasks 3 and 5.
