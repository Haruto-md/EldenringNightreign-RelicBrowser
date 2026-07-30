import type { SelectedEffectEntry } from "../utils/ComboSearch";

export interface MustHaveEntry {
  effectKey: number;
  comparison: "atLeast" | "atMost";
  stacks: number;
}

function clampStacks(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(6, Math.max(1, Math.round(value)));
}

export function sanitizeMustHaves(value: unknown): MustHaveEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: MustHaveEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const effectKeyRaw = (entry as { effectKey?: unknown }).effectKey;
    const effectKey =
      typeof effectKeyRaw === "number" ? effectKeyRaw : Number(effectKeyRaw);
    if (!Number.isFinite(effectKey)) {
      continue;
    }
    // `stacks` is the current field name; `minStacks` is the legacy field
    // name from before the atLeast/atMost toggle existed. Prefer `stacks`
    // when present so this also round-trips newly-saved entries correctly.
    const stacksRaw =
      (entry as { stacks?: unknown }).stacks ??
      (entry as { minStacks?: unknown }).minStacks;
    const stacks = clampStacks(
      typeof stacksRaw === "number" ? stacksRaw : Number(stacksRaw)
    );
    const comparisonRaw = (entry as { comparison?: unknown }).comparison;
    const comparison: MustHaveEntry["comparison"] =
      comparisonRaw === "atMost" ? "atMost" : "atLeast";
    out.push({ effectKey, comparison, stacks });
  }
  return out;
}

export function mustHaveToEffectRange(
  entry: MustHaveEntry
): SelectedEffectEntry {
  return entry.comparison === "atMost"
    ? { effectKey: entry.effectKey, minStacks: 0, maxStacks: entry.stacks }
    : { effectKey: entry.effectKey, minStacks: entry.stacks, maxStacks: 6 };
}
