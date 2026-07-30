import type {
  BND4Entry,
  CharacterSlot,
  EffectWithOptionalDebuff,
  RelicSlot,
} from "../types/SaveFile";
import { getEffect, getRelicColor } from "./DataUtils";
import { RelicSlotColor, type RelicColor } from "./RelicColor";

export class RelicParser {
  /**
   * Finds the offset of a hex pattern in data
   */
  private static findHexOffset(
    data: Uint8Array,
    hexPattern: string,
    offset = 0
  ): number | null {
    try {
      const pattern = hexPattern.replace(/\s+/g, "").toLowerCase();
      const patternBytes = new Uint8Array(
        pattern.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );

      const start = Math.max(0, Math.min(offset, data.length));
      for (let i = start; i <= data.length - patternBytes.length; i++) {
        let match = true;
        for (let j = 0; j < patternBytes.length; j++) {
          if (data[i + j] !== patternBytes[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          return i;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to find hex pattern:", error);
      return null;
    }
  }

  /**
   * Reads a little-endian integer from bytes
   */
  private static readIntLE(bytes: Uint8Array): number {
    let result = 0;
    for (let i = 0; i < bytes.length; i++) {
      result |= bytes[i] << (8 * i);
    }
    return result;
  }

  /**
   * Parses relics from the save data
   */
  private static parseRelics(
    currentEntry: Uint8Array,
    patternOffsetStart: number,
    patternOffsetEnd: number,
    sortKeyLookupEnd?: number
  ): RelicSlot[] {
    const foundSlots: RelicSlot[] = [];
    const currentEntryOffset = currentEntry.slice(
      patternOffsetStart,
      patternOffsetEnd
    );

    const getSlotSize = (b4: number): number | null => {
      switch (b4) {
        case 0xc0:
          return 80;
        case 0x90:
          return 16;
        case 0x80:
          return 80;
        default:
          return null;
      }
    };

    const validB3Values = new Set([0x80, 0x83, 0x81, 0x82, 0x84, 0x85]);
    const validB4Values = new Set([0x80, 0x90, 0xc0]);

    // Find alignment point by scanning for valid slots
    const isValidSlotStart = (
      pos: number
    ): { valid: boolean; slotSize: number | null } => {
      if (pos + 4 > currentEntryOffset.length) {
        return { valid: false, slotSize: null };
      }

      const b3 = currentEntryOffset[pos + 2];
      const b4 = currentEntryOffset[pos + 3];

      if (validB3Values.has(b3) && validB4Values.has(b4)) {
        const slotSize = getSlotSize(b4);
        if (slotSize && pos + slotSize <= currentEntryOffset.length) {
          return { valid: true, slotSize };
        }
      }
      return { valid: false, slotSize: null };
    };

    // Find the first valid slot
    let startOffset: number | null = null;
    for (let i = 0; i < currentEntryOffset.length - 8; i++) {
      const { valid, slotSize: firstSlotSize } = isValidSlotStart(i);
      if (valid && firstSlotSize) {
        // Check if the next position after this slot also starts a valid slot
        const nextPos = i + firstSlotSize;
        const { valid: validNext } = isValidSlotStart(nextPos);

        // Or check if it's an empty slot
        const isEmptyNext =
          nextPos + 8 <= currentEntryOffset.length &&
          currentEntryOffset
            .slice(nextPos, nextPos + 8)
            .every((byte, idx) => (idx < 4 ? byte === 0x00 : byte === 0xff));

        if (validNext || isEmptyNext) {
          startOffset = i;
          break;
        }
      }
    }

    if (startOffset === null) {
      console.error("[ERROR] No valid slot alignment found.");
      return [];
    }

    // Process all slots from alignment with variable slot sizes
    let i = startOffset;

    while (i < currentEntryOffset.length - 4) {
      // Check if this is a valid slot
      if (i + 4 <= currentEntryOffset.length) {
        const b3 = currentEntryOffset[i + 2];
        const b4 = currentEntryOffset[i + 3];

        if (validB3Values.has(b3) && validB4Values.has(b4)) {
          const slotSize = getSlotSize(b4);

          if (slotSize && i + slotSize <= currentEntryOffset.length) {
            if (b4 === 0xc0) {
              const slotData = currentEntryOffset.slice(i, i + slotSize);
              const idBytes = slotData.slice(0, 4);
              const id = this.readIntLE(idBytes) >>> 0;

              // Extract item ID (bytes 4-6)
              const itemIdBytes = slotData.slice(4, 7);
              const itemId = this.readIntLE(itemIdBytes);

              // Extract effect IDs
              const effectKeys = [
                slotData.slice(16, 20),
                slotData.slice(20, 24),
                slotData.slice(24, 28),
                slotData.slice(28, 32),
              ].map(this.readIntLE);
              const debuffKeys = [
                slotData.slice(56, 60),
                slotData.slice(60, 64),
                slotData.slice(64, 68),
                slotData.slice(68, 72),
              ].map(this.readIntLE);

              const effects = effectKeys
                .filter((id) => id !== -1)
                .map((effectKey, index) => {
                  const debuffKey = debuffKeys[index];
                  if (debuffKey !== -1) {
                    return [
                      getEffect(effectKey),
                      getEffect(debuffKey),
                    ] as EffectWithOptionalDebuff;
                  }
                  return [getEffect(effectKey)] as EffectWithOptionalDebuff;
                });

              const slotInfo: RelicSlot = {
                id,
                itemId,
                effects,
                idBytes,
                // coordinates will be set later
                coordinates: [0, 0],
                coordinatesByColor: [0, 0],
                byteOffset: patternOffsetStart + i,
                slotSize,
              };
              foundSlots.push(slotInfo);
            }

            i += slotSize;
            continue;
          }
        }
      }

      // Check for empty slots
      if (i + 8 <= currentEntryOffset.length) {
        const emptyPattern = currentEntryOffset.slice(i, i + 8);
        const isEmptySlot =
          emptyPattern.slice(0, 4).every((b) => b === 0x00) &&
          emptyPattern.slice(4, 8).every((b) => b === 0xff);

        if (isEmptySlot) {
          i += 8; // Empty slots are typically 8 bytes
          continue;
        }
      }

      // If we reach here, this position doesn't match any known pattern
      i += 1;
    }

    // Use the sortKeyLookupEnd if provided, otherwise fall back to patternOffsetEnd
    const sortKeyStart = sortKeyLookupEnd ?? patternOffsetEnd;
    const validSlots: RelicSlot[] = [];

    for (const slot of foundSlots) {
      if (!slot.idBytes) {
        console.error(`Slot ${slot.id} has no ID bytes, skipping`);
        continue;
      }

      const hexPattern = Array.from(slot.idBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .concat("01000000");
      const sortKeyOffset = this.findHexOffset(
        currentEntry,
        hexPattern,
        sortKeyStart
      );
      if (sortKeyOffset !== null) {
        const sortKeyBytes = currentEntry.slice(
          sortKeyOffset + 8,
          sortKeyOffset + 10
        );
        slot.sortKey = this.readIntLE(sortKeyBytes);
        // Byte at +12 (2 bytes past the sortKey field, after a 2-byte gap)
        // is 0x01 only for the one relic that was favorited in-game, 0x00
        // otherwise - confirmed by diffing paired save files with a single
        // relic's favorite toggled and comparing this same id+sortKey
        // lookup record across saves.
        slot.favorite = currentEntry[sortKeyOffset + 12] === 0x01;
        validSlots.push(slot as RelicSlot);
      } else {
        // maybe the relic was sold?!
        // console.warn(`Sort key for slot ${slot.id} not found`);
      }
    }

    foundSlots.length = 0;
    foundSlots.push(...validSlots);

    // Sort relics by sort key
    foundSlots.sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0));

    return foundSlots;
  }

  /**
   * `relics` arrives already sorted into a single combined "Order Found"
   * sequence (parseCharacterSlot sorts by sortKey before calling this), and
   * normal and deep relics are displayed together in that same combined
   * grid whenever no type filter is active (see RelicDisplay/RelicBrowser).
   * So `coordinates` must be one continuous index across all of `relics`,
   * not restarted per relic type - restarting per type previously produced
   * duplicate "Row 1, Column 1" positions for unrelated relics shown on the
   * same grid.
   */
  public static setCoordinates(relics: RelicSlot[]): RelicSlot[] {
    const relicsByColor: Record<RelicColor, RelicSlot[]> = {
      [RelicSlotColor.Red]: relics.filter(
        (r) => getRelicColor(r.itemId) === RelicSlotColor.Red
      ),
      [RelicSlotColor.Blue]: relics.filter(
        (r) => getRelicColor(r.itemId) === RelicSlotColor.Blue
      ),
      [RelicSlotColor.Yellow]: relics.filter(
        (r) => getRelicColor(r.itemId) === RelicSlotColor.Yellow
      ),
      [RelicSlotColor.Green]: relics.filter(
        (r) => getRelicColor(r.itemId) === RelicSlotColor.Green
      ),
    };

    for (let i = 0; i < relics.length; i++) {
      // 8 per row
      const relic = relics[i];
      const row = Math.floor(i / 8);
      const column = i % 8;
      const coordinates: [number, number] = [row, column];

      const color = getRelicColor(relic.itemId);
      const index = relicsByColor[color].indexOf(relic);
      const rowByColor = Math.floor(index / 8);
      const columnByColor = index % 8;
      const coordinatesByColor: [number, number] = [rowByColor, columnByColor];

      relic.coordinates = coordinates;
      relic.coordinatesByColor = coordinatesByColor;
    }

    return relics;
  }

  /**
   * The equipped-vessel-slot table lives in the character's own entry (the
   * same entry its relics are parsed from), as two parallel 6-slot arrays
   * 128 bytes apart: an itemId array (uint32 LE per slot, 0xffffffff when
   * empty) and, 128 bytes later, a "handle" array (uint32 LE per slot,
   * 0x00000000 when empty) whose value is byte-identical to the equipped
   * relic's own `id`/`idBytes` in *this same save* - unlike `id` itself,
   * which is regenerated on every save and unusable across saves, this
   * lets us resolve the exact relic instance within one parse. A fixed
   * marker immediately follows both arrays and anchors them without
   * depending on inventory size shifting absolute offsets. Found by
   * diffing paired save files (nothing equipped vs specific relics
   * equipped) and confirmed on multiple independent save files - matching
   * by itemId alone (no handle) produced ~10% false positives whenever the
   * player owned multiple relics of the same type.
   */
  private static readonly EQUIP_MARKER = "e903 00b0 0300 0000";
  private static readonly EQUIP_ITEM_ARRAY_OFFSET = -156;
  private static readonly EQUIP_HANDLE_ARRAY_OFFSET = -28;
  private static readonly EQUIP_SLOT_COUNT = 6;
  private static readonly EQUIP_SLOT_SIZE = 4;

  /**
   * Marks `relics` whose `id` matches an equipped-slot handle as
   * `equipped`, cross-checking each match's `itemId` against the parallel
   * itemId array as a safety net against a coincidental handle collision.
   */
  private static markEquippedRelics(
    currentEntry: Uint8Array,
    relics: RelicSlot[]
  ): void {
    const markerOffset = this.findHexOffset(currentEntry, this.EQUIP_MARKER);
    if (markerOffset === null) {
      return;
    }

    const itemBase = markerOffset + this.EQUIP_ITEM_ARRAY_OFFSET;
    const handleBase = markerOffset + this.EQUIP_HANDLE_ARRAY_OFFSET;
    const relicsById = new Map(relics.map((relic) => [relic.id, relic]));

    for (let slot = 0; slot < this.EQUIP_SLOT_COUNT; slot++) {
      const handleBytes = currentEntry.slice(
        handleBase + slot * this.EQUIP_SLOT_SIZE,
        handleBase + slot * this.EQUIP_SLOT_SIZE + this.EQUIP_SLOT_SIZE
      );
      if (handleBytes.length < this.EQUIP_SLOT_SIZE) {
        continue;
      }
      const handle = this.readIntLE(handleBytes) >>> 0;
      if (handle === 0 || handle === 0xffffffff) {
        continue;
      }

      const relic = relicsById.get(handle);
      if (!relic) {
        continue;
      }

      const itemIdBytes = currentEntry.slice(
        itemBase + slot * this.EQUIP_SLOT_SIZE,
        itemBase + slot * this.EQUIP_SLOT_SIZE + 3
      );
      if (itemIdBytes.length < 3) {
        continue;
      }
      if (this.readIntLE(itemIdBytes) !== relic.itemId) {
        continue;
      }

      relic.equipped = true;
    }
  }

  private static readonly PRESET_RECORD_SIZE = 80;
  private static readonly PRESET_HANDLE_SLOT_COUNT = 6;
  private static readonly PRESET_HANDLE_SLOT_SIZE = 4;
  private static readonly PRESET_MIN_RUN_RECORDS = 3;

  /**
   * Marks `relics` referenced by any saved preset (not just the active
   * vessel `markEquippedRelics` covers) as `equipped` - the sell screen
   * treats "used in a preset" the same as "currently equipped": both make
   * a relic unsellable in-game.
   *
   * Presets are a fixed-size array (up to 100 records) immediately after
   * the relic list: each record is a 6-slot relic handle array (24 bytes),
   * an 8-byte hash/timestamp, and a UTF-16LE name, for a fixed 80 bytes per
   * record - found by diffing paired saves before/after creating and
   * deleting single presets and reading the resulting byte-level change.
   * Unlike the active vessel there's no fixed marker anchoring the array
   * (presets have no equivalent of EQUIP_MARKER), so its start is found by
   * scanning forward from the end of the relic list for runs of
   * 80-byte-spaced windows whose handles resolve against this save's own
   * relics. Stray leftover bytes elsewhere in the buffer can coincidentally
   * look similar (confirmed on a real save), so among all such runs the
   * earliest (lowest-offset) one of a plausible minimum length is used -
   * the real array is always written before any leftover/backup data.
   * Empty (unused) preset slots are bridged rather than treated as
   * run-breaks, since a real array can have unused records in the middle.
   */
  private static markPresetRelics(
    currentEntry: Uint8Array,
    relics: RelicSlot[]
  ): void {
    const relicsById = new Map(relics.map((relic) => [relic.id, relic]));
    const maxRelicEnd = relics.reduce(
      (max, relic) => Math.max(max, (relic.byteOffset ?? 0) + (relic.slotSize ?? 0)),
      0
    );

    const readHandle = (offset: number): number | null => {
      if (offset + this.PRESET_HANDLE_SLOT_SIZE > currentEntry.length) {
        return null;
      }
      return (
        this.readIntLE(
          currentEntry.slice(offset, offset + this.PRESET_HANDLE_SLOT_SIZE)
        ) >>> 0
      );
    };

    const classifyWindow = (base: number): "valid" | "empty" | "invalid" => {
      if (base + this.PRESET_RECORD_SIZE > currentEntry.length) {
        return "invalid";
      }
      let validCount = 0;
      for (let slot = 0; slot < this.PRESET_HANDLE_SLOT_COUNT; slot++) {
        const handle = readHandle(base + slot * this.PRESET_HANDLE_SLOT_SIZE);
        if (handle === null) {
          return "invalid";
        }
        if (handle === 0 || handle === 0xffffffff) {
          continue;
        }
        if (!relicsById.has(handle)) {
          return "invalid";
        }
        validCount++;
      }
      return validCount > 0 ? "valid" : "empty";
    };
    const isPlausible = (base: number) => classifyWindow(base) !== "invalid";

    const seeds: number[] = [];
    for (
      let base = maxRelicEnd;
      base + this.PRESET_RECORD_SIZE <= currentEntry.length;
      base += this.PRESET_HANDLE_SLOT_SIZE
    ) {
      if (classifyWindow(base) === "valid") {
        seeds.push(base);
      }
    }

    const seedSet = new Set(seeds);
    const runSeedsByStart = new Map<number, number[]>();
    const runStartBySeed = new Map<number, number>();
    for (const seed of seeds) {
      if (runStartBySeed.has(seed)) {
        continue;
      }
      let start = seed;
      while (isPlausible(start - this.PRESET_RECORD_SIZE)) {
        start -= this.PRESET_RECORD_SIZE;
      }
      if (!runSeedsByStart.has(start)) {
        const runSeeds: number[] = [];
        for (let cur = start; isPlausible(cur); cur += this.PRESET_RECORD_SIZE) {
          if (seedSet.has(cur)) {
            runSeeds.push(cur);
          }
        }
        runSeedsByStart.set(start, runSeeds);
      }
      for (const runSeed of runSeedsByStart.get(start)!) {
        runStartBySeed.set(runSeed, start);
      }
    }

    const eligibleRuns = [...runSeedsByStart.entries()]
      .filter(([, runSeeds]) => runSeeds.length >= this.PRESET_MIN_RUN_RECORDS)
      .sort((a, b) => a[0] - b[0]);
    const chosenSeeds = eligibleRuns[0]?.[1] ?? [];

    for (const base of chosenSeeds) {
      for (let slot = 0; slot < this.PRESET_HANDLE_SLOT_COUNT; slot++) {
        const handle = readHandle(base + slot * this.PRESET_HANDLE_SLOT_SIZE);
        if (handle === null || handle === 0 || handle === 0xffffffff) {
          continue;
        }
        const relic = relicsById.get(handle);
        if (relic) {
          relic.equipped = true;
        }
      }
    }
  }

  public static getNames(bnd4Entry: BND4Entry): Uint8Array<ArrayBuffer>[] {
    const namesEntry = bnd4Entry.cleanData;
    const names: Uint8Array<ArrayBuffer>[] = [];
    let searchOffset = 0;

    for (let i = 0; i < 10; i++) {
      const patternOffset = this.findHexOffset(
        namesEntry,
        "27 00 00 46 41 43 45",
        searchOffset
      );
      if (patternOffset === null) {
        break;
      }

      searchOffset = patternOffset + 7;
      const nameOffset = patternOffset - 51;
      const nameTerminatorOffset = this.findHexOffset(
        namesEntry,
        "00 00",
        nameOffset
      );
      if (nameTerminatorOffset === null) {
        break;
      }

      const nameBytes = namesEntry.slice(nameOffset, nameTerminatorOffset + 1);
      names.push(nameBytes);
    }

    return names;
  }

  /**
   * Parses every character slot in a decrypted save file, attaching the BND4
   * entry each slot was parsed out of directly to the slot.
   *
   * Slots whose entry fails to parse are skipped, so the returned array can
   * be shorter than `bnd4Entries` - which is exactly why the owning entry
   * travels with the slot instead of being looked up by array position.
   */
  public static parseCharacterSlots(bnd4Entries: BND4Entry[]): CharacterSlot[] {
    const slots: CharacterSlot[] = [];
    const names = this.getNames(bnd4Entries[10]);

    for (let i = 0; i < names.length; i++) {
      const entry = bnd4Entries[i];
      if (entry === undefined) {
        console.error(`No BND4 entry for character slot ${i}, skipping`);
        continue;
      }
      try {
        const parsed = this.parseCharacterSlot(names[i], entry);
        slots.push({ ...parsed, entry });
      } catch (err) {
        console.error(`Error parsing slot ${i}:`, err);
      }
    }

    return slots;
  }

  /**
   * Main function to parse a character slot and extract relics
   */
  public static parseCharacterSlot(
    nameBytes: Uint8Array<ArrayBuffer>,
    currentEntry: BND4Entry
  ): { name: string | null; relics: RelicSlot[] } {
    const decoder = new TextDecoder("utf-16le");
    const name = decoder.decode(nameBytes);

    // Find pattern boundaries for relic parsing
    const fixedPatternOffset = this.findHexOffset(
      currentEntry.cleanData,
      Array.from(nameBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );

    if (fixedPatternOffset === null) {
      console.warn(
        "Character name not found in data, results may be unreliable"
      );
      return {
        name,
        relics: [],
      };
    }

    // Find the end pattern like in Python code
    const hexPatternEnd = "ffffffff"; // "FF FF FF FF" pattern
    const searchStartPosition = fixedPatternOffset + 1000;

    if (searchStartPosition >= currentEntry.cleanData.length) {
      console.log("Search start position beyond section data.");
      return {
        name,
        relics: [],
      };
    }

    const fixedPatternOffsetEnd = this.findHexOffset(
      currentEntry.cleanData,
      hexPatternEnd,
      searchStartPosition
    );

    if (fixedPatternOffsetEnd === null) {
      console.log("End pattern not found");
      return {
        name,
        relics: [],
      };
    }

    // Parse relics using the same parameters as Python version. Start the
    // scan window at 0, not some small positive offset - a save file has
    // been found where a real relic's slot begins at absolute offset 24,
    // which a previous, larger start offset (32) silently excluded from
    // the scan entirely (not a slot-validity rejection - the byte simply
    // wasn't in the scanned window), dropping one relic and shifting every
    // later relic's "Order Found" position by one.
    const baseRelics = this.parseRelics(
      currentEntry.cleanData,
      0,
      fixedPatternOffset - 100,
      fixedPatternOffsetEnd
    );

    const relics = this.setCoordinates(baseRelics);
    this.markEquippedRelics(currentEntry.cleanData, relics);
    this.markPresetRelics(currentEntry.cleanData, relics);

    return {
      name,
      relics,
    };
  }
}
