import { describe, expect, it } from "vitest";
import type { RelicSlot } from "../types/SaveFile";
import { getEffect } from "./DataUtils";
import {
  createEmptyEffectFilterGroup,
  createEmptyEffectFilterState,
  doesRelicMatchEffectFilter,
  type EffectFilterState,
} from "./EffectFilter";

const endurancePlus1 = getEffect(7000200);
const endurancePlus2 = getEffect(7000201);
const endurancePlus3 = getEffect(7000202);
const arcanePlus1 = getEffect(7000700);

function makeRelic(effectIds: number[], debuffId?: number): RelicSlot {
  return {
    id: 1,
    itemId: 104,
    coordinates: [0, 0],
    coordinatesByColor: [0, 0],
    effects: effectIds.map((id, index) =>
      index === 0 && debuffId !== undefined
        ? [getEffect(id), getEffect(debuffId)]
        : [getEffect(id)]
    ),
  };
}

describe("doesRelicMatchEffectFilter", () => {
  it("matches everything when the filter is empty", () => {
    const relic = makeRelic([7000200]);
    expect(doesRelicMatchEffectFilter(relic, createEmptyEffectFilterState())).toBe(true);
  });

  it("matches a required group on any member (OR)", () => {
    const relic = makeRelic([7000700]); // arcane +1
    const filter: EffectFilterState = {
      groups: [
        {
          id: "g1",
          entries: [
            { effect: endurancePlus1, comparison: "atLeast" },
            { effect: arcanePlus1, comparison: "atLeast" },
          ],
        },
      ],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });

  it("requires every group to match (AND)", () => {
    const relic = makeRelic([7000700]); // arcane +1 only, no endurance
    const filter: EffectFilterState = {
      groups: [
        { id: "g1", entries: [{ effect: arcanePlus1, comparison: "atLeast" }] },
        { id: "g2", entries: [{ effect: endurancePlus1, comparison: "atLeast" }] },
      ],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(false);
  });

  it("atLeast matches an equal-or-higher level", () => {
    const relic = makeRelic([7000202]); // endurance +3
    const filter: EffectFilterState = {
      groups: [{ id: "g1", entries: [{ effect: endurancePlus2, comparison: "atLeast" }] }],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });

  it("atMost matches an equal-or-lower level and rejects higher", () => {
    const lowRelic = makeRelic([7000201]); // endurance +2
    const highRelic = makeRelic([7000202]); // endurance +3
    const filter: EffectFilterState = {
      groups: [{ id: "g1", entries: [{ effect: endurancePlus2, comparison: "atMost" }] }],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(lowRelic, filter)).toBe(true);
    expect(doesRelicMatchEffectFilter(highRelic, filter)).toBe(false);
  });

  it("ungrouped effects ignore comparison and match exactly", () => {
    const uniqueEffect = getEffect(999999); // no group/level defined
    const relic = makeRelic([7000200]);
    relic.effects = [[uniqueEffect]];
    const filter: EffectFilterState = {
      groups: [{ id: "g1", entries: [{ effect: uniqueEffect, comparison: "atMost" }] }],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);

    const otherRelic = makeRelic([7000200]);
    expect(doesRelicMatchEffectFilter(otherRelic, filter)).toBe(false);
  });

  it("drops a relic that has an excluded effect", () => {
    const relic = makeRelic([7000200], 7000700); // endurance+1 with arcane+1 as debuff slot
    const filter: EffectFilterState = {
      groups: [],
      excluded: [arcanePlus1],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(false);
  });

  it("exclusion is exact-match only (does not exclude higher levels)", () => {
    const relic = makeRelic([7000202]); // endurance +3
    const filter: EffectFilterState = {
      groups: [],
      excluded: [endurancePlus1], // excluding +1 specifically
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });

  it("ignores groups with zero entries", () => {
    const relic = makeRelic([7000200]);
    const filter: EffectFilterState = {
      groups: [createEmptyEffectFilterGroup()],
      excluded: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });
});

describe("createEmptyEffectFilterGroup", () => {
  it("creates distinct ids", () => {
    const a = createEmptyEffectFilterGroup();
    const b = createEmptyEffectFilterGroup();
    expect(a.id).not.toBe(b.id);
    expect(a.entries).toEqual([]);
  });
});
