import { describe, it, expect } from "vitest";
import {
  buildJpnToEngLookup,
  extractEffectKeyNames,
  extractI18nEnglishEffectStrings,
  matchEffectKeyName,
} from "./generate-effect-categories.mjs";

describe("extractEffectKeyNames", () => {
  it("extracts member names in declaration order, excluding LENGTH", () => {
    const source = `export const enum EffectKey {
  vigorPlus1,
  vigorPlus2,
  // a comment line
  arcanePlus1,
  LENGTH,
}
`;
    expect(extractEffectKeyNames(source)).toEqual([
      "vigorPlus1",
      "vigorPlus2",
      "arcanePlus1",
    ]);
  });
});

describe("buildJpnToEngLookup", () => {
  it("maps jpn -> eng, first match wins", () => {
    const lookup = buildJpnToEngLookup([
      [{ jpn: "生命力+1", eng: "Vigor +1" }],
      [{ jpn: "生命力+1", eng: "SHOULD NOT WIN" }],
    ]);
    expect(lookup.get("生命力+1")).toBe("Vigor +1");
    expect(lookup.size).toBe(1);
  });

  it("skips entries missing jpn or eng", () => {
    const lookup = buildJpnToEngLookup([
      [{ jpn: "", eng: "x" }, { jpn: "y", eng: "" }],
    ]);
    expect(lookup.size).toBe(0);
  });
});

describe("extractI18nEnglishEffectStrings", () => {
  it("maps English text to EffectKey member name from the en: block", () => {
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
        [EffectKey.vigorPlus1]: "生命力+1",
      },
    },
  },
};
`;
    const map = extractI18nEnglishEffectStrings(source);
    expect(map.get("Vigor +1")).toBe("vigorPlus1");
    expect(map.get("Arcane +1")).toBe("arcanePlus1");
  });
});

describe("matchEffectKeyName", () => {
  const jpnToEng = new Map([["生命力+1", "Vigor +1"]]);
  const englishToEffectKeyName = new Map([["Vigor +1", "vigorPlus1"]]);

  it("resolves via the jpn -> eng -> EffectKey chain", () => {
    expect(matchEffectKeyName("生命力+1", jpnToEng, englishToEffectKeyName, {})).toBe(
      "vigorPlus1"
    );
  });

  it("prefers an explicit override", () => {
    expect(
      matchEffectKeyName("生命力+1", jpnToEng, englishToEffectKeyName, {
        "生命力+1": "someOverrideKey",
      })
    ).toBe("someOverrideKey");
  });

  it("returns undefined when the jpn name has no eng mapping", () => {
    expect(matchEffectKeyName("未知の効果", jpnToEng, englishToEffectKeyName, {})).toBeUndefined();
  });
});
