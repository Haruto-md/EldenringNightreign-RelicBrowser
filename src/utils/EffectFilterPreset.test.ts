import { afterEach, describe, expect, it } from "vitest";
import { getEffect } from "./DataUtils";
import type { EffectKey } from "../resources/effectKeys";
import {
  loadEffectFilterPresets,
  parseEffectFilterPresetsJson,
  resolvePresetEntries,
  saveEffectFilterPresets,
  type EffectFilterPreset,
} from "./EffectFilterPreset";

const STORAGE_KEY = "relicBrowser.effectFilterPresets";

afterEach(() => {
  localStorage.clear();
});

describe("loadEffectFilterPresets", () => {
  it("returns an empty array when nothing is stored", () => {
    expect(loadEffectFilterPresets()).toEqual([]);
  });

  it("returns [] for corrupted JSON instead of throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadEffectFilterPresets()).toEqual([]);
  });

  it("returns [] when the stored value isn't an array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(loadEffectFilterPresets()).toEqual([]);
  });

  it("filters out malformed entries but keeps valid ones", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "1",
          name: "Good",
          kind: "required",
          entries: [{ effectKey: 7000200, comparison: "atLeast" }],
        },
        {
          id: "2",
          name: "Bad, missing kind",
          entries: [{ effectKey: 7000200, comparison: "atLeast" }],
        },
        {
          id: "3",
          name: "Bad, missing comparison",
          kind: "required",
          entries: [{ effectKey: 7000200 }],
        },
        "not even an object",
      ])
    );
    const loaded = loadEffectFilterPresets();
    expect(loaded).toEqual([
      {
        id: "1",
        name: "Good",
        kind: "required",
        entries: [{ effectKey: 7000200, comparison: "atLeast" }],
      },
    ]);
  });
});

describe("saveEffectFilterPresets / loadEffectFilterPresets round-trip", () => {
  it("persists and reloads presets, including each entry's comparison", () => {
    const endurancePlus1 = getEffect(7000200);
    const arcanePlus1 = getEffect(7000700);
    const presets: EffectFilterPreset[] = [
      {
        id: "1",
        name: "Junk stats",
        kind: "required",
        entries: [
          { effectKey: endurancePlus1.key, comparison: "atMost" },
          { effectKey: arcanePlus1.key, comparison: "atLeast" },
        ],
      },
      {
        id: "2",
        name: "Keep these",
        kind: "excluded",
        entries: [{ effectKey: arcanePlus1.key, comparison: "atLeast" }],
      },
    ];
    saveEffectFilterPresets(presets);
    expect(loadEffectFilterPresets()).toEqual(presets);
  });
});

describe("resolvePresetEntries", () => {
  it("resolves entries to {effect, comparison}, dropping any effect that no longer exists", () => {
    const endurancePlus1 = getEffect(7000200);
    const preset: EffectFilterPreset = {
      id: "1",
      name: "Test",
      kind: "required",
      entries: [
        { effectKey: endurancePlus1.key, comparison: "atMost" },
        { effectKey: 999999999 as EffectKey, comparison: "atLeast" },
      ],
    };
    expect(resolvePresetEntries(preset)).toEqual([
      { effect: endurancePlus1, comparison: "atMost" },
    ]);
  });
});

describe("parseEffectFilterPresetsJson", () => {
  it("parses a valid exported array", () => {
    const presets: EffectFilterPreset[] = [
      {
        id: "1",
        name: "Exported",
        kind: "required",
        entries: [{ effectKey: 7000200 as EffectKey, comparison: "atLeast" }],
      },
    ];
    expect(parseEffectFilterPresetsJson(JSON.stringify(presets))).toEqual(
      presets
    );
  });

  it("returns [] for invalid JSON instead of throwing", () => {
    expect(parseEffectFilterPresetsJson("{not json")).toEqual([]);
  });

  it("returns [] when the top level isn't an array", () => {
    expect(parseEffectFilterPresetsJson(JSON.stringify({ not: "array" }))).toEqual(
      []
    );
  });

  it("drops malformed entries but keeps valid ones", () => {
    const json = JSON.stringify([
      {
        id: "1",
        name: "Good",
        kind: "required",
        entries: [{ effectKey: 7000200, comparison: "atLeast" }],
      },
      { id: "2", name: "Bad, missing entries" },
    ]);
    expect(parseEffectFilterPresetsJson(json)).toEqual([
      {
        id: "1",
        name: "Good",
        kind: "required",
        entries: [{ effectKey: 7000200, comparison: "atLeast" }],
      },
    ]);
  });
});
