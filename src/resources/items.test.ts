import { describe, expect, it } from "vitest";
import i18n from "../i18n";
import { items, unsellableItemIds } from "./items";

describe("items", () => {
  it("should have English translations for all item keys", () => {
    const uniqueKeys = new Set<string>();
    for (const item of items.values()) {
      uniqueKeys.add(item.key);
    }

    const missingTranslations: string[] = [];
    for (const key of uniqueKeys) {
      const translationKey = `items.${key}`;
      const translation = i18n.t(translationKey, { lng: "en" });

      // If translation equals the key, it means no translation was found
      if (translation === translationKey) {
        missingTranslations.push(key);
      }
    }

    expect(
      missingTranslations,
      `Missing English translations for item keys: ${missingTranslations.join(", ")}`
    ).toHaveLength(0);
  });
});

describe("unsellableItemIds", () => {
  // These shop-purchased "grand" tier Scenic Flatstone ids were missing
  // from an earlier hand-curated version of this list (only their
  // "delicate"/"polished" siblings were covered) - regression test for
  // deriving the list from itemsArray instead.
  it("includes every 1000-1999 shop-origin id for all 12 Scene items, not just the ones from the original hand-curated list", () => {
    const previouslyMissingIds = [
      1300, 1650, 1660, 1710, 1720, 1850, 1860, 1900, // grandBurningScene
      1610, 1680, 1700, 1730, 1820, 1830, 1870, // grandDrizzlyScene
      1600, 1630, 1670, 1740, 1800, 1890, 1920, // grandLuminousScene
      1310, 1620, 1640, 1690, 1750, 1880, // grandTranquilScene
    ];
    for (const id of previouslyMissingIds) {
      expect(unsellableItemIds, `id ${id} should be unsellable`).toContain(id);
    }
  });
});
