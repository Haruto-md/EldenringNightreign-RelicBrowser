import type { EffectKey } from "../resources/effectKeys";
import { getEffectByKey } from "./DataUtils";
import type { Comparison, EffectFilterEntry } from "./EffectFilter";

export type EffectFilterPresetKind = "required" | "excluded";

export interface EffectFilterPresetEntry {
  effectKey: EffectKey;
  comparison: Comparison;
}

export interface EffectFilterPreset {
  id: string;
  name: string;
  kind: EffectFilterPresetKind;
  entries: EffectFilterPresetEntry[];
}

const STORAGE_KEY = "relicBrowser.effectFilterPresets";

function isValidPresetEntry(value: unknown): value is EffectFilterPresetEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.effectKey === "number" &&
    (candidate.comparison === "atLeast" || candidate.comparison === "atMost")
  );
}

function isValidPreset(value: unknown): value is EffectFilterPreset {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    (candidate.kind === "required" || candidate.kind === "excluded") &&
    Array.isArray(candidate.entries) &&
    candidate.entries.every(isValidPresetEntry)
  );
}

export function loadEffectFilterPresets(): EffectFilterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return parseEffectFilterPresetsJson(raw);
  } catch {
    return [];
  }
}

/**
 * Parses a JSON string (e.g. from an imported file) into valid presets,
 * dropping anything malformed rather than throwing - same tolerance as
 * `loadEffectFilterPresets` reading from localStorage, since an imported
 * file is just as untrusted as hand-edited storage.
 */
export function parseEffectFilterPresetsJson(json: string): EffectFilterPreset[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidPreset);
  } catch {
    return [];
  }
}

export function saveEffectFilterPresets(presets: EffectFilterPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore persistence errors (e.g. storage disabled/full)
  }
}

export function resolvePresetEntries(
  preset: EffectFilterPreset
): EffectFilterEntry[] {
  return preset.entries
    .map((entry) => {
      const effect = getEffectByKey(entry.effectKey);
      return effect ? { effect, comparison: entry.comparison } : undefined;
    })
    .filter((entry): entry is EffectFilterEntry => entry !== undefined);
}
