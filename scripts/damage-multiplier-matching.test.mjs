import { describe, it, expect } from "vitest";
import { buildEngToJpnLookup } from "./damage-multiplier-matching.mjs";

describe("buildEngToJpnLookup", () => {
  it("maps eng -> jpn, first match wins", () => {
    const m = buildEngToJpnLookup([
      [{ jpn: "物理攻撃力上昇", eng: "Physical Attack Up" }],
      [{ jpn: "SHOULD NOT WIN", eng: "Physical Attack Up" }],
    ]);
    expect(m.get("Physical Attack Up")).toBe("物理攻撃力上昇");
    expect(m.size).toBe(1);
  });
  it("skips entries missing jpn or eng", () => {
    expect(buildEngToJpnLookup([[{ jpn: "", eng: "x" }, { jpn: "y", eng: "" }]]).size).toBe(0);
  });
});
