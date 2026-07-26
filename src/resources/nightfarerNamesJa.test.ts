import { describe, expect, it } from "vitest";
import { Nightfarer } from "../utils/Nightfarers";
import { nightfarerNamesJa } from "./nightfarerNamesJa";

describe("nightfarerNamesJa", () => {
  it("maps every Nightfarer to its RelicHub Japanese label", () => {
    expect(nightfarerNamesJa[Nightfarer.Wylder]).toBe("追跡者");
    expect(nightfarerNamesJa[Nightfarer.Revenant]).toBe("復讐者"); // misspelled JSON key
    expect(nightfarerNamesJa[Nightfarer.Executor]).toBe("執行者"); // misspelled JSON key
    expect(nightfarerNamesJa[Nightfarer.Duchess]).toBe("レディ");
  });

  it("has an entry for all 10 Nightfarers", () => {
    for (let nf = 0; nf < 10; nf++) {
      expect(nightfarerNamesJa[nf as Nightfarer]).toBeTruthy();
    }
  });
});
