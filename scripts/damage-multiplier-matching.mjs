export function buildJpnToEngLookup(sourceLists) {
  const lookup = new Map();
  for (const list of sourceLists) {
    for (const entry of list) {
      if (entry.jpn && entry.eng && !lookup.has(entry.jpn)) {
        lookup.set(entry.jpn, entry.eng);
      }
    }
  }
  return lookup;
}

export function buildEngToJpnLookup(sourceLists) {
  const lookup = new Map();
  for (const list of sourceLists) {
    for (const entry of list) {
      if (entry.jpn && entry.eng && !lookup.has(entry.eng)) {
        lookup.set(entry.eng, entry.jpn);
      }
    }
  }
  return lookup;
}

export function extractI18nEnglishEffectStrings(i18nSourceText) {
  const enMarker = "\n  en:";
  const jaMarker = "\n  ja:";
  const enStart = i18nSourceText.indexOf(enMarker);
  if (enStart === -1) {
    throw new Error(
      "Could not locate 'en:' translation block in i18n source"
    );
  }

  const jaStart = i18nSourceText.indexOf(jaMarker);
  const enBlockEnd = jaStart === -1 ? i18nSourceText.lastIndexOf("};") : jaStart;

  const enBlock = i18nSourceText.slice(enStart, enBlockEnd);
  const map = new Map();
  const pattern = /\[EffectKey\.(\w+)\]:\s*"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(enBlock)) !== null) {
    const [, effectKeyName, englishText] = match;
    if (!map.has(englishText)) {
      map.set(englishText, effectKeyName);
    }
  }
  return map;
}

// RelicSlotColor enum numbers (must match src/utils/RelicColor.ts):
// Any=0, Red=1, Blue=2, Yellow=3, Green=4.
const COLOR_NAME_TO_NUMBER = { Any: 0, Red: 1, Blue: 2, Yellow: 3, Green: 4 };

function parseVesselEntries(blockText) {
  const vessels = [];
  const entryPattern = /\{\s*name:\s*"([^"]+)",\s*slots:\s*\[([\s\S]*?)\]/g;
  let match;
  while ((match = entryPattern.exec(blockText)) !== null) {
    const [, name, slotsText] = match;
    const slots = slotsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const colorMatch = s.match(/RelicSlotColor\.(\w+)/);
        if (!colorMatch || !(colorMatch[1] in COLOR_NAME_TO_NUMBER)) {
          throw new Error(`Could not parse vessel slot color: "${s}"`);
        }
        return COLOR_NAME_TO_NUMBER[colorMatch[1]];
      });
    vessels.push({ name, slots });
  }
  return vessels;
}

// Parses src/utils/Vessels.ts as text (not imported as an ES module — it uses
// `const enum`s that Node's TypeScript type-stripping cannot execute, and
// extensionless relative imports Node's ESM loader cannot resolve) and
// returns { [exportName]: Array<{ name, slots: number[] }> } for every
// `export const XVessels: Vessel[] = [...]` array, with `...anyoneVessels`
// spreads expanded inline.
export function extractVesselArrays(vesselsSourceText) {
  const arrayPattern = /export const (\w+): Vessel\[\] = \[([\s\S]*?)\n\] as const;/g;
  const rawBlocks = new Map();
  let match;
  while ((match = arrayPattern.exec(vesselsSourceText)) !== null) {
    rawBlocks.set(match[1], match[2]);
  }

  const anyoneBlock = rawBlocks.get("anyoneVessels");
  if (!anyoneBlock) {
    throw new Error("Could not find anyoneVessels array in Vessels.ts source");
  }
  const anyoneVessels = parseVesselEntries(anyoneBlock);

  const result = {};
  for (const [exportName, blockText] of rawBlocks) {
    if (exportName === "anyoneVessels") continue;
    const vessels = parseVesselEntries(blockText);
    if (blockText.includes("...anyoneVessels")) {
      vessels.push(...anyoneVessels);
    }
    result[exportName] = vessels;
  }
  return result;
}

export function matchEffectKeyName(
  jpnName,
  jpnToEng,
  englishToEffectKeyName,
  overrides
) {
  if (overrides[jpnName]) {
    return overrides[jpnName];
  }
  const eng = jpnToEng.get(jpnName);
  if (!eng) {
    return undefined;
  }
  // Try exact match first
  let result = englishToEffectKeyName.get(eng);
  if (result) {
    return result;
  }
  // Fallback to case-insensitive match
  const engLower = eng.toLowerCase();
  for (const [key, value] of englishToEffectKeyName) {
    if (key.toLowerCase() === engLower) {
      return value;
    }
  }
  return undefined;
}
