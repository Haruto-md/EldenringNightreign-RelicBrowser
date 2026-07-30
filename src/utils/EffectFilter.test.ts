import { describe, expect, it } from "vitest";
import type { RelicSlot } from "../types/SaveFile";
import { getEffect } from "./DataUtils";
import {
  applyExcludedPreset,
  applyRequiredPreset,
  createEmptyEffectFilterGroup,
  createEmptyEffectFilterState,
  doesRelicMatchEffectFilter,
  flattenFilterEffects,
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
    expect(
      doesRelicMatchEffectFilter(relic, createEmptyEffectFilterState())
    ).toBe(true);
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
      excludedGroups: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });

  it("requires every group to match (AND)", () => {
    const relic = makeRelic([7000700]); // arcane +1 only, no endurance
    const filter: EffectFilterState = {
      groups: [
        { id: "g1", entries: [{ effect: arcanePlus1, comparison: "atLeast" }] },
        {
          id: "g2",
          entries: [{ effect: endurancePlus1, comparison: "atLeast" }],
        },
      ],
      excludedGroups: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(false);
  });

  it("two groups with the same OR options require two distinct matching effects, not one effect double-counted", () => {
    const overlappingFilter: EffectFilterState = {
      groups: [
        {
          id: "g1",
          entries: [
            { effect: endurancePlus1, comparison: "atLeast" },
            { effect: arcanePlus1, comparison: "atLeast" },
          ],
        },
        {
          id: "g2",
          entries: [
            { effect: endurancePlus1, comparison: "atLeast" },
            { effect: arcanePlus1, comparison: "atLeast" },
          ],
        },
      ],
      excludedGroups: [],
    };

    // Only one of the two options present - must not satisfy both groups
    // via the same single effect.
    const onlyEndurance = makeRelic([7000200]);
    expect(doesRelicMatchEffectFilter(onlyEndurance, overlappingFilter)).toBe(
      false
    );

    // Both options present as distinct effects - now each group can be
    // assigned its own effect.
    const both = makeRelic([7000200, 7000700]);
    expect(doesRelicMatchEffectFilter(both, overlappingFilter)).toBe(true);
  });

  it("atLeast matches an equal-or-higher level", () => {
    const relic = makeRelic([7000202]); // endurance +3
    expect(relic.effects[0][0]).toBe(endurancePlus3); // getEffect returns the shared singleton instance
    const filter: EffectFilterState = {
      groups: [
        {
          id: "g1",
          entries: [{ effect: endurancePlus2, comparison: "atLeast" }],
        },
      ],
      excludedGroups: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });

  it("atMost matches an equal-or-lower level and rejects higher", () => {
    const lowRelic = makeRelic([7000201]); // endurance +2
    const highRelic = makeRelic([7000202]); // endurance +3
    const filter: EffectFilterState = {
      groups: [
        {
          id: "g1",
          entries: [{ effect: endurancePlus2, comparison: "atMost" }],
        },
      ],
      excludedGroups: [],
    };
    expect(doesRelicMatchEffectFilter(lowRelic, filter)).toBe(true);
    expect(doesRelicMatchEffectFilter(highRelic, filter)).toBe(false);
  });

  it("ungrouped effects ignore comparison and match exactly", () => {
    const uniqueEffect = getEffect(999999); // no group/level defined
    const relic = makeRelic([7000200]);
    relic.effects = [[uniqueEffect]];
    const filter: EffectFilterState = {
      groups: [
        { id: "g1", entries: [{ effect: uniqueEffect, comparison: "atMost" }] },
      ],
      excludedGroups: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);

    const otherRelic = makeRelic([7000200]);
    expect(doesRelicMatchEffectFilter(otherRelic, filter)).toBe(false);
  });

  it("ignores groups with zero entries", () => {
    const relic = makeRelic([7000200]);
    const filter: EffectFilterState = {
      groups: [createEmptyEffectFilterGroup()],
      excludedGroups: [],
    };
    expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
  });

  describe("excludedGroups", () => {
    it("drops a relic matching any entry in an excluded group (OR within group)", () => {
      const relic = makeRelic([7000200], 7000700); // endurance+1 with arcane+1 as debuff slot
      const filter: EffectFilterState = {
        groups: [],
        excludedGroups: [
          {
            id: "e1",
            entries: [
              { effect: arcanePlus1, comparison: "atLeast" },
              { effect: getEffect(9999999), comparison: "atLeast" }, // some unrelated effect
            ],
          },
        ],
      };
      expect(doesRelicMatchEffectFilter(relic, filter)).toBe(false);
    });

    it("excludes a relic if it matches any one excluded group (OR across groups)", () => {
      const relic = makeRelic([7000700]); // arcane +1 only
      const filter: EffectFilterState = {
        groups: [],
        excludedGroups: [
          {
            id: "e1",
            entries: [{ effect: endurancePlus1, comparison: "atLeast" }],
          }, // doesn't match
          {
            id: "e2",
            entries: [{ effect: arcanePlus1, comparison: "atLeast" }],
          }, // matches
        ],
      };
      expect(doesRelicMatchEffectFilter(relic, filter)).toBe(false);
    });

    it("does not exclude a relic that matches none of the excluded groups", () => {
      const relic = makeRelic([7000700]); // arcane +1
      const filter: EffectFilterState = {
        groups: [],
        excludedGroups: [
          {
            id: "e1",
            entries: [{ effect: endurancePlus1, comparison: "atLeast" }],
          },
        ],
      };
      expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
    });

    it("exclusion respects atLeast (excludes equal-or-higher levels)", () => {
      const relic = makeRelic([7000202]); // endurance +3
      const filter: EffectFilterState = {
        groups: [],
        excludedGroups: [
          {
            id: "e1",
            entries: [{ effect: endurancePlus2, comparison: "atLeast" }],
          },
        ],
      };
      expect(doesRelicMatchEffectFilter(relic, filter)).toBe(false);
    });

    it("exclusion respects atMost (excludes equal-or-lower levels, not higher)", () => {
      const lowRelic = makeRelic([7000201]); // endurance +2
      const highRelic = makeRelic([7000202]); // endurance +3
      const filter: EffectFilterState = {
        groups: [],
        excludedGroups: [
          {
            id: "e1",
            entries: [{ effect: endurancePlus2, comparison: "atMost" }],
          },
        ],
      };
      expect(doesRelicMatchEffectFilter(lowRelic, filter)).toBe(false);
      expect(doesRelicMatchEffectFilter(highRelic, filter)).toBe(true);
    });

    it("ignores excluded groups with zero entries", () => {
      const relic = makeRelic([7000200]);
      const filter: EffectFilterState = {
        groups: [],
        excludedGroups: [createEmptyEffectFilterGroup()],
      };
      expect(doesRelicMatchEffectFilter(relic, filter)).toBe(true);
    });

    it("required groups still apply once exclusion has already passed", () => {
      const relic = makeRelic([7000700]); // arcane +1, no endurance
      const filter: EffectFilterState = {
        groups: [
          {
            id: "g1",
            entries: [{ effect: endurancePlus1, comparison: "atLeast" }],
          },
        ],
        excludedGroups: [
          {
            id: "e1",
            entries: [{ effect: getEffect(9999999), comparison: "atLeast" }],
          },
        ],
      };
      expect(doesRelicMatchEffectFilter(relic, filter)).toBe(false);
    });
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

describe("flattenFilterEffects", () => {
  it("collects every entry across multiple groups, deduplicated by effect, preserving comparison", () => {
    const groups = [
      {
        id: "g1",
        entries: [{ effect: endurancePlus1, comparison: "atMost" as const }],
      },
      {
        id: "g2",
        entries: [
          { effect: arcanePlus1, comparison: "atLeast" as const },
          { effect: endurancePlus1, comparison: "atLeast" as const }, // duplicate effect, first (atMost) wins
        ],
      },
    ];
    expect(flattenFilterEffects(groups)).toEqual([
      { effect: endurancePlus1, comparison: "atMost" },
      { effect: arcanePlus1, comparison: "atLeast" },
    ]);
  });

  it("returns [] for no groups", () => {
    expect(flattenFilterEffects([])).toEqual([]);
  });
});

describe("applyRequiredPreset", () => {
  it("appends a new OR-group of the preset's entries, preserving each entry's comparison", () => {
    const state: EffectFilterState = {
      groups: [
        {
          id: "old",
          entries: [{ effect: endurancePlus1, comparison: "atLeast" }],
        },
      ],
      excludedGroups: [],
    };
    const next = applyRequiredPreset(state, [
      { effect: endurancePlus2, comparison: "atMost" },
      { effect: arcanePlus1, comparison: "atLeast" },
    ]);
    expect(next.groups).toHaveLength(2);
    expect(next.groups[0]).toBe(state.groups[0]); // pre-existing group untouched
    expect(next.groups[1].entries).toEqual([
      { effect: endurancePlus2, comparison: "atMost" },
      { effect: arcanePlus1, comparison: "atLeast" },
    ]);
  });

  it("is a no-op for an empty entry list", () => {
    const state = createEmptyEffectFilterState();
    expect(applyRequiredPreset(state, [])).toBe(state);
  });

  it("leaves excludedGroups untouched", () => {
    const state: EffectFilterState = {
      groups: [],
      excludedGroups: [
        { id: "e1", entries: [{ effect: arcanePlus1, comparison: "atLeast" }] },
      ],
    };
    const next = applyRequiredPreset(state, [
      { effect: endurancePlus1, comparison: "atLeast" },
    ]);
    expect(next.excludedGroups).toBe(state.excludedGroups);
  });
});

describe("applyExcludedPreset", () => {
  it("appends a new OR-group to excludedGroups", () => {
    const state: EffectFilterState = {
      groups: [],
      excludedGroups: [
        { id: "e1", entries: [{ effect: arcanePlus1, comparison: "atLeast" }] },
      ],
    };
    const next = applyExcludedPreset(state, [
      { effect: endurancePlus1, comparison: "atLeast" },
    ]);
    expect(next.excludedGroups).toHaveLength(2);
    // ORs with the pre-existing excluded group: a relic matching either is dropped
    expect(doesRelicMatchEffectFilter(makeRelic([7000700]), next)).toBe(false);
    expect(doesRelicMatchEffectFilter(makeRelic([7000200]), next)).toBe(false);
    expect(doesRelicMatchEffectFilter(makeRelic([7000202]), next)).toBe(false); // endurance +3, atLeast +1
  });

  it("leaves groups untouched", () => {
    const state: EffectFilterState = {
      groups: [
        {
          id: "g1",
          entries: [{ effect: endurancePlus1, comparison: "atLeast" }],
        },
      ],
      excludedGroups: [],
    };
    const next = applyExcludedPreset(state, [
      { effect: arcanePlus1, comparison: "atLeast" },
    ]);
    expect(next.groups).toBe(state.groups);
  });
});
