import { describe, it, expect } from "vitest";
import {
  buildItemEngToJpnLookup,
  extractI18nEnglishItemStrings,
  buildJaEffectsPatch,
  buildJaItemsPatch,
  applyJaPatch,
} from "./generate-i18n-ja.mjs";

describe("buildItemEngToJpnLookup", () => {
  it("merges multiple eng-keyed sources, first source wins on conflict", () => {
    const lookup = buildItemEngToJpnLookup([
      { "Besmirched Frame": { jpn: "汚れた額" } },
      { "Besmirched Frame": { jpn: "SHOULD NOT WIN" }, "Silver Tear": { jpn: "銀の雫" } },
    ]);
    expect(lookup.get("Besmirched Frame")).toBe("汚れた額");
    expect(lookup.get("Silver Tear")).toBe("銀の雫");
    expect(lookup.size).toBe(2);
  });
});

describe("extractI18nEnglishItemStrings", () => {
  it("maps English item text to its i18n key from the en.items block", () => {
    const source = `
export const resources = {
  en: {
    translation: {
      items: {
        besmirchedFrame: "Besmirched Frame",
        silverTear: "Silver Tear",
      },
      effects: {
        [EffectKey.vigorPlus1]: "Vigor +1",
      },
    },
  },
  ja: {
    translation: {
      items: {},
      effects: {},
    },
  },
};
`;
    const map = extractI18nEnglishItemStrings(source);
    expect(map.get("Besmirched Frame")).toBe("besmirchedFrame");
    expect(map.get("Silver Tear")).toBe("silverTear");
    expect(map.size).toBe(2);
  });
});

describe("buildJaItemsPatch", () => {
  it("only patches items missing from ja.items, using the eng->jpn lookup", () => {
    const source = `
export const resources = {
  en: {
    translation: {
      items: {
        besmirchedFrame: "Besmirched Frame",
        silverTear: "Silver Tear",
      },
    },
  },
  ja: {
    translation: {
      items: {
        silverTear: "既存の翻訳",
      },
    },
  },
};
`;
    const { patch, unmatched } = buildJaItemsPatch(
      source,
      new Map([["Besmirched Frame", "汚れた額"]])
    );
    expect(patch.get("besmirchedFrame")).toBe("汚れた額");
    expect(patch.has("silverTear")).toBe(false); // already translated, left alone
    expect(unmatched).toEqual([]);
  });

  it("reports items with no eng->jpn match as unmatched", () => {
    const source = `
export const resources = {
  en: { translation: { items: { unknownItem: "Unknown Item" } } },
  ja: { translation: { items: {} } },
};
`;
    const { patch, unmatched } = buildJaItemsPatch(source, new Map());
    expect(patch.size).toBe(0);
    expect(unmatched).toEqual(["unknownItem: Unknown Item"]);
  });
});

describe("buildJaEffectsPatch", () => {
  it("resolves RelicHub skill entries to EffectKeys and skips already-translated keys", () => {
    const source = `
export const resources = {
  en: {
    translation: {
      effects: {
        [EffectKey.vigorPlus1]: "Vigor +1",
        [EffectKey.arcanePlus1]: "Arcane +1",
      },
    },
  },
  ja: {
    translation: {
      effects: {
        [EffectKey.vigorPlus1]: "既存の翻訳",
      },
    },
  },
};
`;
    const skillsJson = {
      genre_order: ["ステータス"],
      skills: {
        ステータス: [
          { jpn: "生命力+1", eng: "Vigor +1" },
          { jpn: "神秘+1", eng: "Arcane +1" },
        ],
      },
    };
    const demeritJson = { demerit_skills: [] };
    const { patch, unmatched } = buildJaEffectsPatch(source, skillsJson, demeritJson, {});
    expect(patch.get("arcanePlus1")).toBe("神秘+1");
    expect(patch.has("vigorPlus1")).toBe(false); // already translated
    expect(unmatched).toEqual([]);
  });
});

describe("applyJaPatch", () => {
  it("inserts new keys into ja.effects and ja.items, alphabetically, leaving existing entries untouched", () => {
    const source = `
export const resources = {
  en: {
    translation: {
      items: { besmirchedFrame: "Besmirched Frame" },
      effects: { [EffectKey.vigorPlus1]: "Vigor +1" },
    },
  },
  ja: {
    translation: {
      items: {},
      effects: {
        [EffectKey.vigorPlus1]: "既存の翻訳",
      },
    },
  },
};
`;
    const result = applyJaPatch(
      source,
      new Map([["arcanePlus1", "神秘+1"]]),
      new Map([["besmirchedFrame", "汚れた額"]])
    );
    expect(result).toContain('[EffectKey.arcanePlus1]: "神秘+1"');
    expect(result).toContain('[EffectKey.vigorPlus1]: "既存の翻訳"');
    expect(result).toContain('besmirchedFrame: "汚れた額"');
  });
});
