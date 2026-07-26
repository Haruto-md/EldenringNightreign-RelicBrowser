import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import {
  buildJpnToEngLookup,
  extractI18nEnglishEffectStrings,
  matchEffectKeyName,
} from "./generate-effect-categories.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Wording-drift entries this script's matching couldn't resolve automatically,
// filled in iteratively from this script's console output (jpn -> EffectKey name).
// Distinct from generate-effect-categories.mjs's MANUAL_EFFECT_KEY_OVERRIDES:
// that table is about RelicHub skill -> category, this one is about RelicHub
// skill -> the specific EffectKey this i18n generator should attach the jpn text to.
export const MANUAL_JA_EFFECT_OVERRIDES = {};

export function buildItemEngToJpnLookup(itemSourceLists) {
  const lookup = new Map();
  for (const source of itemSourceLists) {
    for (const [engName, entry] of Object.entries(source)) {
      if (engName && entry?.jpn && !lookup.has(engName)) {
        lookup.set(engName, entry.jpn);
      }
    }
  }
  return lookup;
}

export function extractI18nEnglishItemStrings(i18nSourceText) {
  const itemsMarker = "items: {";
  const start = i18nSourceText.indexOf(itemsMarker);
  if (start === -1) {
    throw new Error("Could not locate 'items:' block in i18n source");
  }
  const end = i18nSourceText.indexOf("\n      },", start);
  const block = i18nSourceText.slice(start, end);
  const map = new Map();
  const pattern = /(\w+):\s*"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(block)) !== null) {
    const [, keyName, englishText] = match;
    if (!map.has(englishText)) {
      map.set(englishText, keyName);
    }
  }
  return map;
}

function extractExistingJaKeys(i18nSourceText, blockLabel) {
  const jaStart = i18nSourceText.indexOf("\n  ja:");
  if (jaStart === -1) {
    throw new Error("Could not locate 'ja:' block in i18n source");
  }
  const jaBlock = i18nSourceText.slice(jaStart);
  const { openBrace, closeBrace } = findBlock(jaBlock, blockLabel);
  const inner = jaBlock.slice(openBrace + 1, closeBrace);
  const keys = new Set();
  if (blockLabel === "effects") {
    for (const m of inner.matchAll(/\[EffectKey\.(\w+)\]:/g)) {
      keys.add(m[1]);
    }
  } else {
    for (const m of inner.matchAll(/(\w+):\s*"/g)) {
      keys.add(m[1]);
    }
  }
  return keys;
}

export function buildJaEffectsPatch(i18nSourceText, skillsJson, demeritJson, overrides) {
  const jpnToEng = buildJpnToEngLookup([
    ...Object.values(skillsJson.skills),
    demeritJson.demerit_skills,
  ]);
  const englishToEffectKeyName = extractI18nEnglishEffectStrings(i18nSourceText);
  const existingJaKeys = extractExistingJaKeys(i18nSourceText, "effects");

  const patch = new Map();
  const unmatched = [];

  const allEntries = [
    ...Object.values(skillsJson.skills).flat(),
    ...demeritJson.demerit_skills,
  ];
  for (const entry of allEntries) {
    const effectKeyName = matchEffectKeyName(
      entry.jpn,
      jpnToEng,
      englishToEffectKeyName,
      overrides
    );
    if (!effectKeyName) {
      unmatched.push(`${entry.jpn} (${entry.eng})`);
      continue;
    }
    if (existingJaKeys.has(effectKeyName)) {
      continue;
    }
    if (!patch.has(effectKeyName)) {
      patch.set(effectKeyName, entry.jpn);
    }
  }
  return { patch, unmatched };
}

export function buildJaItemsPatch(i18nSourceText, itemEngToJpn) {
  const englishToItemKeyName = extractI18nEnglishItemStrings(i18nSourceText);
  const existingJaKeys = extractExistingJaKeys(i18nSourceText, "items");

  const patch = new Map();
  const unmatched = [];

  for (const [englishText, keyName] of englishToItemKeyName) {
    if (existingJaKeys.has(keyName)) {
      continue;
    }
    const jpn = itemEngToJpn.get(englishText);
    if (!jpn) {
      unmatched.push(`${keyName}: ${englishText}`);
      continue;
    }
    patch.set(keyName, jpn);
  }
  return { patch, unmatched };
}

// Finds a `label: { ... }` block by counting braces from the first `{`
// after `label:`, so it works whether the block is empty (`items: {}`),
// single-line, or already spread across many lines.
function findBlock(text, label) {
  const marker = `${label}: {`;
  const markerStart = text.indexOf(marker);
  if (markerStart === -1) {
    throw new Error(`Could not find '${label}:' block`);
  }
  const openBrace = markerStart + marker.length - 1;
  let depth = 0;
  let i = openBrace;
  for (; i < text.length; i++) {
    if (text[i] === "{") {
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        break;
      }
    }
  }
  return { start: markerStart, openBrace, closeBrace: i };
}

function rebuildBlock(text, label, patch, formatEntry) {
  if (patch.size === 0) {
    return text;
  }
  const { start, openBrace, closeBrace } = findBlock(text, label);
  const existingEntries = text.slice(openBrace + 1, closeBrace).trim();
  const newLines = [...patch.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `        ${formatEntry(key, value)}`);
  const body = [existingEntries, newLines.join("\n")].filter(Boolean).join("\n");
  const rebuilt = `${label}: {\n${body}\n      }`;
  return text.slice(0, start) + rebuilt + text.slice(closeBrace + 1);
}

export function applyJaPatch(i18nSourceText, effectsPatch, itemsPatch) {
  const jaStart = i18nSourceText.indexOf("\n  ja:");
  const before = i18nSourceText.slice(0, jaStart);
  let jaBlock = i18nSourceText.slice(jaStart);

  jaBlock = rebuildBlock(
    jaBlock,
    "items",
    itemsPatch,
    (key, value) => `${key}: ${JSON.stringify(value)},`
  );
  jaBlock = rebuildBlock(
    jaBlock,
    "effects",
    effectsPatch,
    (key, value) => `[EffectKey.${key}]: ${JSON.stringify(value)},`
  );

  return before + jaBlock;
}

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf-8"));
}

function main() {
  const skillsJson = loadJson("RelicHub/data/skills.json");
  const demeritJson = loadJson("RelicHub/data/demerit.json");
  const itemsKnowledge = loadJson("RelicHub/data/items_knowledge.json");
  const specialItems = loadJson("RelicHub/data/special_items.json");
  const i18nSource = readFileSync(join(ROOT, "src/i18n.ts"), "utf-8");

  const itemEngToJpn = buildItemEngToJpnLookup([itemsKnowledge.items, specialItems]);

  const { patch: effectsPatch, unmatched: unmatchedEffects } = buildJaEffectsPatch(
    i18nSource,
    skillsJson,
    demeritJson,
    MANUAL_JA_EFFECT_OVERRIDES
  );
  const { patch: itemsPatch, unmatched: unmatchedItems } = buildJaItemsPatch(
    i18nSource,
    itemEngToJpn
  );

  const updated = applyJaPatch(i18nSource, effectsPatch, itemsPatch);
  writeFileSync(join(ROOT, "src/i18n.ts"), updated, "utf-8");

  console.log(`Added ${effectsPatch.size} ja.effects entries, ${itemsPatch.size} ja.items entries.`);
  if (unmatchedEffects.length > 0) {
    console.warn(
      `\n${unmatchedEffects.length} RelicHub skill/demerit entries could not be matched to an EffectKey:\n` +
        unmatchedEffects.map((e) => `  - ${e}`).join("\n")
    );
  }
  if (unmatchedItems.length > 0) {
    console.warn(
      `\n${unmatchedItems.length} en.items entries have no RelicHub jpn match:\n` +
        unmatchedItems.map((e) => `  - ${e}`).join("\n")
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
