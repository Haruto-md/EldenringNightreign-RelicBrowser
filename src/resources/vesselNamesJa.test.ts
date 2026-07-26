import { describe, expect, it } from "vitest";
import { vesselNamesJa } from "./vesselNamesJa";

describe("vesselNamesJa", () => {
  it("maps every entry to a non-empty Japanese string", () => {
    for (const [englishName, jaName] of Object.entries(vesselNamesJa)) {
      expect(typeof jaName).toBe("string");
      expect(jaName.length).toBeGreaterThan(0);
      expect(jaName).not.toBe(englishName);
    }
  });

  it("does not swap Wylder's Chalice and Wylder's Urn (0<->2 index swap guard)", () => {
    // src/utils/Vessels.ts: wylderVessels[0] = "Wylder's Chalice" (slots
    // Red,Yellow,Any,Red,Blue,Green), wylderVessels[2] = "Wylder's Urn"
    // (slots Red,Red,Blue,Red,Red,Blue).
    // RelicHub/data/vessels.json wylder.vessels[0] (n1..d3: R,R,B,R,R,B) is
    // the Urn's signature, and vessels.json wylder.vessels[2] (n1..d3:
    // R,Y,ALL,R,B,G) is the Chalice's signature -- the two sources list
    // Chalice/Urn in swapped order. A naive positional match would give the
    // Chalice the Urn's name and vice versa.
    expect(vesselNamesJa["Wylder's Chalice"]).toBe("追跡者の高杯");
    expect(vesselNamesJa["Wylder's Urn"]).toBe("追跡者の器");
  });

  it("does not emit a wrong name for vessels with no unique signature match (falls back to English)", () => {
    // These two previously had no signature match at all and were resolved
    // via positional-index fallback (scripts/generate-damage-multipliers.mjs
    // Task 2). That fallback has been removed: a vessel with no unique
    // signature match must simply be absent from vesselNamesJa (so callers
    // fall back to the English name), never assigned an unverified guess.
    expect(vesselNamesJa["Sealed Guardian's Urn"]).toBeUndefined();
    expect(vesselNamesJa["Forgotten Undertaker's Goblet"]).toBeUndefined();
  });
});
