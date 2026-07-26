import i18n from "../i18n";
import type { EffectKey } from "../resources/effectKeys";
import { effectNamesJa } from "../resources/effectNamesJa";

/**
 * Japanese effect name with guaranteed fallback.
 * Uses the generated RelicHub-derived map; falls back to the app's English
 * i18n effect name so the return is always a non-empty string.
 */
export function effectNameJa(key: EffectKey): string {
  const ja = effectNamesJa[key];
  if (ja) {
    return ja;
  }
  return i18n.t(`effects.${key}`, { defaultValue: `Effect ${key}` });
}
