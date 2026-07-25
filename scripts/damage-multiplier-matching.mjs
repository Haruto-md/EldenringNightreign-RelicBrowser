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
