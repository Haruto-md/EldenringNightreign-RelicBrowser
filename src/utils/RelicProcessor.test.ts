import { describe, expect, it } from "vitest";
import type { RelicSlot } from "../types/SaveFile";
import { getEffect, getRelicColor } from "./DataUtils";
import { RelicSlotColor } from "./RelicColor";
import { findBetterRelic, sortRelicsByColor } from "./RelicProcessor";

describe("Relic Processor Functions", () => {
  describe("findBetterRelic", () => {
    it("should return a better relic", () => {
      const relic: RelicSlot = {
        id: 1,
        effects: [[getEffect(7000201)]],
        itemId: 104,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const betterRelic: RelicSlot = {
        id: 2,
        effects: [[getEffect(7000202)]],
        itemId: 107,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const redundant = findBetterRelic(relic, [relic, betterRelic]);
      expect(redundant?.relic).toBeDefined();
      expect(redundant?.outclassed).toBe(true);
    });

    it("should return an equal relic", () => {
      const relic: RelicSlot = {
        id: 1,
        effects: [[getEffect(7000201)]],
        itemId: 104,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const betterRelic: RelicSlot = {
        id: 2,
        effects: [[getEffect(7000202)]],
        itemId: 107,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const equalRelic: RelicSlot = {
        id: 4,
        effects: [[getEffect(7000201)]],
        itemId: 107,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const redundant = findBetterRelic(relic, [
        relic,
        equalRelic,
        betterRelic,
      ]);
      expect(redundant?.relic).toBeDefined();
      expect(redundant?.outclassed).toBe(false);
    });

    it("should not return any relic if colors are different", () => {
      const relic: RelicSlot = {
        id: 1,
        effects: [[getEffect(7000201)]],
        itemId: 104,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const betterRelicWithDifferentColor: RelicSlot = {
        id: 3,
        effects: [[getEffect(7000202)]],
        itemId: 1005100,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };

      expect(getRelicColor(relic.itemId)).not.toBe(
        getRelicColor(betterRelicWithDifferentColor.itemId)
      );

      const relicsByColor = sortRelicsByColor([
        relic,
        betterRelicWithDifferentColor,
      ]);
      const redundant = findBetterRelic(
        relic,
        relicsByColor[RelicSlotColor.Red]
      );
      expect(redundant).toBeUndefined();
    });

    it("should not treat a relic as redundant when the only equal-or-better relic adds a demerit it doesn't have", () => {
      const relic: RelicSlot = {
        id: 1,
        effects: [[getEffect(7000201)]],
        itemId: 104,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const relicWithDemerit: RelicSlot = {
        id: 2,
        effects: [[getEffect(7000201), getEffect(6840000)]],
        itemId: 107,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const redundant = findBetterRelic(relic, [relic, relicWithDemerit]);
      expect(redundant).toBeUndefined();
    });

    it("should mark a relic with a demerit as outclassed by an otherwise identical relic without it", () => {
      const relicWithDemerit: RelicSlot = {
        id: 1,
        effects: [[getEffect(7000201), getEffect(6840000)]],
        itemId: 104,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const cleanRelic: RelicSlot = {
        id: 2,
        effects: [[getEffect(7000201)]],
        itemId: 107,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const redundant = findBetterRelic(relicWithDemerit, [
        relicWithDemerit,
        cleanRelic,
      ]);
      expect(redundant?.relic).toBe(cleanRelic);
      expect(redundant?.outclassed).toBe(true);
    });

    it("should not treat two relics with different demerits on the same effect as redundant", () => {
      const relicA: RelicSlot = {
        id: 1,
        effects: [[getEffect(7000201), getEffect(6840000)]],
        itemId: 104,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const relicB: RelicSlot = {
        id: 2,
        effects: [[getEffect(7000201), getEffect(6830400)]],
        itemId: 107,
        coordinates: [0, 0],
        coordinatesByColor: [0, 0],
      };
      const redundant = findBetterRelic(relicA, [relicA, relicB]);
      expect(redundant).toBeUndefined();
    });
  });
});
