import type { MatchMode, SelectedEffectEntry } from "../utils/ComboSearch";

export type { MatchMode };

export interface MustHaveEntry {
  effectKey: number;
  minStacks: number;
  maxStacks: number;
  matchMode: MatchMode;
}

function clampStacks(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(6, Math.max(0, Math.round(value)));
}

function sanitizeMatchMode(value: unknown): MatchMode {
  return value === "exact" || value === "higherOrEqual" || value === "lowerOrEqual"
    ? value
    : "higherOrEqual";
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

    const minStacksRaw = (entry as { minStacks?: unknown }).minStacks;
    const maxStacksRaw = (entry as { maxStacks?: unknown }).maxStacks;
    const comparisonRaw = (entry as { comparison?: unknown }).comparison;
    const stacksRaw = (entry as { stacks?: unknown }).stacks;

    let minStacks: number;
    let maxStacks: number;
    if (comparisonRaw === "atLeast" || comparisonRaw === "atMost") {
      // Legacy shape: a single `stacks` number plus an atLeast/atMost
      // direction. atLeast N -> [N, 6], atMost N -> [0, N]. Always
      // migrates to matchMode "higherOrEqual" below, since the old code
      // had no concept of match direction and always matched same-group
      // equal-or-higher tiers.
      const stacks = clampStacks(
        typeof stacksRaw === "number" ? stacksRaw : Number(stacksRaw)
      );
      minStacks = comparisonRaw === "atLeast" ? stacks : 0;
      maxStacks = comparisonRaw === "atLeast" ? 6 : stacks;
    } else if (
      maxStacksRaw !== undefined ||
      minStacksRaw !== undefined ||
      stacksRaw !== undefined
    ) {
      // New shape (or the oldest legacy shapes: a bare `minStacks` with no
      // comparison field at all, or an even older bare `stacks` with no
      // comparison/minStacks/maxStacks field at all, both treated the same
      // as atLeast).
      if (minStacksRaw === undefined && stacksRaw !== undefined) {
        const stacks = clampStacks(
          typeof stacksRaw === "number" ? stacksRaw : Number(stacksRaw)
        );
        minStacks = stacks;
        maxStacks = 6;
      } else {
        minStacks = clampStacks(
          typeof minStacksRaw === "number"
            ? minStacksRaw
            : Number(minStacksRaw)
        );
        // Legacy bare-`minStacks` entries of 0 (no `comparison` field) now
        // migrate to [0, 6] — "no constraint" under the new model — rather
        // than the pre-0-era implicit floor of 1, since 0 is now a valid,
        // representable, meaningful value.
        maxStacks =
          maxStacksRaw === undefined
            ? 6
            : clampStacks(
                typeof maxStacksRaw === "number"
                  ? maxStacksRaw
                  : Number(maxStacksRaw)
              );
      }
    } else {
      continue;
    }

    if (minStacks > maxStacks) {
      maxStacks = minStacks;
    }

    const matchMode = sanitizeMatchMode(
      (entry as { matchMode?: unknown }).matchMode
    );

    out.push({ effectKey, minStacks, maxStacks, matchMode });
  }
  return out;
}

export function mustHaveToEffectRange(
  entry: MustHaveEntry
): SelectedEffectEntry {
  return {
    effectKey: entry.effectKey,
    minStacks: entry.minStacks,
    maxStacks: entry.maxStacks,
    matchMode: entry.matchMode,
  };
}
