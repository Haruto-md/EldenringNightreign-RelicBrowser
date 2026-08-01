import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  attackModes,
  damageElements,
  incantationSchools,
  primaryCategories,
  sorcerySchools,
  type PrimaryCategory,
} from "../resources/damageCategories";
import { EffectKey } from "../resources/effectKeys";
import { nightfarerNamesJa } from "../resources/nightfarerNamesJa";
import { vesselNamesJa } from "../resources/vesselNamesJa";
import { items, ItemType } from "../resources/items";
import type { CharacterSlot } from "../types/SaveFile";
import {
  cancelCurrentSearch,
  searchDamageCombinations,
  type ComboSearchProgress,
  type ComboSearchResult,
  type SelectedEffectEntry,
} from "../utils/ComboSearch";
import {
  buildDamageMultiplierArray,
  type DamageProfileSelection,
} from "../utils/DamageMultiplierArray";
import { effectNameJa } from "../utils/effectNameJa";
import { getEffectByKey } from "../utils/DataUtils";
import { getChipColor, RelicSlotColor } from "../utils/RelicColor";
import { isNightfarer, Nightfarer, nightfarers } from "../utils/Nightfarers";
import { DamageRelicSlot } from "./DamageRelicSlot";
import {
  mustHaveToEffectRange,
  sanitizeMustHaves,
  type MatchMode,
  type MustHaveEntry,
} from "./DamageOptimizer.mustHave";
import { EffectsAutocomplete } from "./EffectsAutocomplete";

// Persistent storage keys
const SETTINGS_STORAGE_KEY = "damageOpt:settings:v2";
const SELECTED_NIGHTFARER_STORAGE_KEY = "damageOpt:selectedNightfarer:v1";

const STACKS_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

const DEFAULT_ELEMENT = "physical" as const;
const DEFAULT_PRIMARY_CATEGORY_ID = primaryCategories[0]?.id ?? "weapon:dagger";

// Japanese labels ------------------------------------------------------

const weaponCategoryLabels: Record<string, string> = {
  "weapon:dagger": "短剣",
  "weapon:straightSword": "直剣",
  "weapon:greatsword": "大剣",
  "weapon:colossalSword": "特大剣",
  "weapon:thrustingSword": "突剣",
  "weapon:heavyThrustingSword": "重突剣",
  "weapon:curvedSword": "曲剣",
  "weapon:curvedGreatsword": "曲大剣",
  "weapon:katana": "刀",
  "weapon:twinblade": "双剣",
  "weapon:axe": "斧",
  "weapon:greataxe": "大斧",
  "weapon:hammer": "槌",
  "weapon:flail": "フレイル",
  "weapon:greatHammer": "大槌",
  "weapon:colossalWeapon": "特大武器",
  "weapon:spear": "槍",
  "weapon:greatSpear": "大槍",
  "weapon:halberd": "斧槍",
  "weapon:reaper": "大鎌",
  "weapon:whip": "鞭",
  "weapon:fist": "拳",
  "weapon:claw": "爪",
  "weapon:bow": "弓",
};

const nonWeaponCategoryLabels: Record<string, string> = {
  sorcery: "魔術",
  incantation: "祈祷",
  thrownPot: "投擲壺",
  thrownKnife: "投擲ナイフ",
  glintstoneGravityItem: "グリンストーン重力",
  perfumeBottle: "香水瓶",
  roarAndBreath: "咆哮とブレス",
};

const primaryCategoryLabels: Record<string, string> = {
  ...weaponCategoryLabels,
  ...nonWeaponCategoryLabels,
};

function primaryCategoryLabel(cat: PrimaryCategory): string {
  return primaryCategoryLabels[cat.id] ?? cat.id;
}

const sorcerySchoolLabels: Record<string, string> = {
  glintblade: "輝剣の魔術",
  stonedigger: "削岩の魔術",
  carianSword: "カーリア流剣術",
  invisibility: "隠密の魔術",
  crystalian: "結晶人の魔術",
  gravity: "重力の魔術",
  thorn: "荊の魔術",
};

const incantationSchoolLabels: Record<string, string> = {
  fundamentalist: "原始信仰",
  dragonCult: "竜信仰",
  giantsFlame: "巨人の火",
  godslayer: "神殺し",
  bestial: "獣性",
  frenziedFlame: "狂い火",
  dragonCommunion: "竜の交わり",
};

const elementLabels: Record<string, string> = {
  physical: "物理",
  magic: "魔力",
  fire: "炎",
  lightning: "雷",
  holy: "聖",
};

const attackModeLabels: Record<string, string> = {
  weaponSkill: "戦技",
  normalAttackFirstHit: "通常攻撃1段目",
  criticalHit: "致命の一撃",
  guardCounter: "ガードカウンター",
};

// Settings ---------------------------------------------------------------

type DamageOptElement = "physical" | "magic" | "fire" | "lightning" | "holy";

interface DamageOptSettings {
  primaryCategoryId: string;
  schoolId?: string;
  // null = 無属性 (no element specified), explicitly chosen by the user.
  // Distinct from "key absent" (JSON.stringify drops undefined properties, so
  // it can't round-trip through localStorage the way null can) — absent/
  // invalid still falls back to DEFAULT_ELEMENT.
  element: DamageOptElement | null;
  enabledAttackModes: string[];
  mustHaves: MustHaveEntry[];
  disabledVessels: string[];
  // When true (default), only relics carrying an effect that boosts damage
  // (>1.0x) or is named by a must-have are considered as search candidates,
  // so every result clears the 1.0x bar. Turning this off widens the
  // candidate pool to every relic of a usable color, at the cost of a slower
  // search, so combinations that don't clear 1.0x can show up too.
  restrictToScoringRelics: boolean;
}

function createDefaultSettings(): DamageOptSettings {
  return {
    primaryCategoryId: DEFAULT_PRIMARY_CATEGORY_ID,
    schoolId: undefined,
    element: DEFAULT_ELEMENT,
    enabledAttackModes: [],
    mustHaves: [],
    disabledVessels: [],
    restrictToScoringRelics: true,
  };
}

function createInitialSettings(): Record<Nightfarer, DamageOptSettings> {
  const out = {} as Record<Nightfarer, DamageOptSettings>;
  Object.keys(nightfarers).forEach((key) => {
    const nf = Number(key) as Nightfarer;
    out[nf] = createDefaultSettings();
  });
  return out;
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((v): v is string => typeof v === "string");
}

function loadSettingsFromStorage(): Record<Nightfarer, DamageOptSettings> {
  const base = createInitialSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return base;
    }
    const parsed = JSON.parse(raw) as Partial<
      Record<Nightfarer, Partial<DamageOptSettings>>
    >;
    Object.keys(base).forEach((key) => {
      const nf = Number(key) as Nightfarer;
      const val = parsed?.[nf];
      if (!val || typeof val !== "object") {
        return;
      }
      const current = base[nf];
      if (typeof val.primaryCategoryId === "string") {
        current.primaryCategoryId = val.primaryCategoryId;
      }
      if (typeof val.schoolId === "string") {
        current.schoolId = val.schoolId;
      }
      if (val.element === null) {
        current.element = null;
      } else if (
        typeof val.element === "string" &&
        ["physical", "magic", "fire", "lightning", "holy"].includes(
          val.element
        )
      ) {
        current.element = val.element as DamageOptSettings["element"];
      }
      current.enabledAttackModes = sanitizeStringArray(
        val.enabledAttackModes
      );
      current.mustHaves = sanitizeMustHaves(val.mustHaves);
      current.disabledVessels = sanitizeStringArray(val.disabledVessels);
      current.restrictToScoringRelics =
        typeof val.restrictToScoringRelics === "boolean"
          ? val.restrictToScoringRelics
          : true;
    });
    return base;
  } catch {
    return createInitialSettings();
  }
}

function saveSettingsToStorage(
  settings: Record<Nightfarer, DamageOptSettings>
): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore persistence errors (e.g. storage disabled/full)
  }
}

interface DamageOptimizerProps {
  currentSlot: CharacterSlot;
}

export function DamageOptimizer(props: DamageOptimizerProps) {
  const { currentSlot } = props;

  const [selectedNightfarer, setSelectedNightfarer] = useState<Nightfarer>(
    () => {
      try {
        const raw = localStorage.getItem(SELECTED_NIGHTFARER_STORAGE_KEY);
        if (raw) {
          const int = parseInt(raw, 10);
          if (isNightfarer(int)) {
            return int;
          }
        }
      } catch {
        // ignore
      }
      return Nightfarer.Wylder;
    }
  );

  const [settings, setSettings] = useState<
    Record<Nightfarer, DamageOptSettings>
  >(() => loadSettingsFromStorage());

  // Vessel selection is rarely touched, so keep it collapsed by default to
  // leave more room for the (potentially long) 条件 list above it.
  const [vesselSectionOpen, setVesselSectionOpen] = useState(false);

  useEffect(() => {
    saveSettingsToStorage(settings);
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SELECTED_NIGHTFARER_STORAGE_KEY,
        String(selectedNightfarer)
      );
    } catch {
      // ignore
    }
  }, [selectedNightfarer]);

  const current = settings[selectedNightfarer];

  const updateCurrent = useCallback(
    (updater: (s: DamageOptSettings) => DamageOptSettings) => {
      setSettings((prev) => ({
        ...prev,
        [selectedNightfarer]: updater(prev[selectedNightfarer]),
      }));
    },
    [selectedNightfarer]
  );

  const primaryCategory = useMemo(
    () =>
      primaryCategories.find((c) => c.id === current.primaryCategoryId) ??
      primaryCategories[0],
    [current.primaryCategoryId]
  );

  const showSchool = primaryCategory?.hasSchools !== undefined;
  const schoolOptions = useMemo(() => {
    if (primaryCategory?.hasSchools === "sorcery") {
      return sorcerySchools;
    }
    if (primaryCategory?.hasSchools === "incantation") {
      return incantationSchools;
    }
    return [];
  }, [primaryCategory]);
  const schoolLabels =
    primaryCategory?.hasSchools === "sorcery"
      ? sorcerySchoolLabels
      : incantationSchoolLabels;

  const showAttackModes = primaryCategory?.id.startsWith("weapon:") ?? false;

  // Must-have options are the effects actually present on the player's own
  // relics, NOT the full effect enum. effectsArray contains
  // non-relic effects too — e.g. innate character passives such as
  // raiderPermanentlyIncreaseAttackPower — which can never appear on a relic and
  // so must not be offerable as a must-have.
  const mustHaveOptions = useMemo(() => {
    const owned = currentSlot.relics.flatMap((relic) =>
      relic.effects.flatMap(([effect, debuff]) =>
        debuff !== undefined ? [effect, debuff] : [effect]
      )
    );
    const unique = owned.filter(
      (effect, index, arr) =>
        arr.findIndex((e) => e.key === effect.key) === index
    );
    return unique.filter((e) => {
      const nf = "nightfarer" in e ? e.nightfarer : undefined;
      return nf === undefined || nf === selectedNightfarer;
    });
  }, [currentSlot.relics, selectedNightfarer]);

  const handlePrimaryCategoryChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const id = event.target.value;
      updateCurrent((s) => ({
        ...s,
        primaryCategoryId: id,
        schoolId: undefined,
      }));
    },
    [updateCurrent]
  );

  const handleSchoolChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const id = event.target.value;
      updateCurrent((s) => ({ ...s, schoolId: id || undefined }));
    },
    [updateCurrent]
  );

  const handleElementChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const el = event.target.value;
      updateCurrent((s) => ({
        ...s,
        element: el === "" ? null : (el as DamageOptElement),
      }));
    },
    [updateCurrent]
  );

  const toggleAttackMode = useCallback(
    (modeId: string) => {
      updateCurrent((s) => {
        const has = s.enabledAttackModes.includes(modeId);
        return {
          ...s,
          enabledAttackModes: has
            ? s.enabledAttackModes.filter((m) => m !== modeId)
            : [...s.enabledAttackModes, modeId],
        };
      });
    },
    [updateCurrent]
  );

  const addMustHave = useCallback(
    (effectKey: EffectKey) => {
      updateCurrent((s) => {
        if (s.mustHaves.some((m) => m.effectKey === effectKey)) {
          return s;
        }
        const effect = getEffectByKey(effectKey);
        return {
          ...s,
          mustHaves: [
            ...s.mustHaves,
            {
              effectKey,
              minStacks: 1,
              maxStacks: 6,
              matchMode: effect?.group !== undefined ? "higherOrEqual" : "exact",
            },
          ],
        };
      });
    },
    [updateCurrent]
  );

  const removeMustHave = useCallback(
    (effectKey: number) => {
      updateCurrent((s) => ({
        ...s,
        mustHaves: s.mustHaves.filter((m) => m.effectKey !== effectKey),
      }));
    },
    [updateCurrent]
  );

  const setMustHaveMinStacks = useCallback(
    (effectKey: number, minStacks: number) => {
      updateCurrent((s) => ({
        ...s,
        mustHaves: s.mustHaves.map((m) =>
          m.effectKey === effectKey
            ? { ...m, minStacks, maxStacks: Math.max(m.maxStacks, minStacks) }
            : m
        ),
      }));
    },
    [updateCurrent]
  );

  const setMustHaveMaxStacks = useCallback(
    (effectKey: number, maxStacks: number) => {
      updateCurrent((s) => ({
        ...s,
        mustHaves: s.mustHaves.map((m) =>
          m.effectKey === effectKey
            ? { ...m, maxStacks, minStacks: Math.min(m.minStacks, maxStacks) }
            : m
        ),
      }));
    },
    [updateCurrent]
  );

  const setMustHaveMatchMode = useCallback(
    (effectKey: number, matchMode: MatchMode) => {
      updateCurrent((s) => ({
        ...s,
        mustHaves: s.mustHaves.map((m) =>
          m.effectKey === effectKey ? { ...m, matchMode } : m
        ),
      }));
    },
    [updateCurrent]
  );

  const toggleRestrictToScoringRelics = useCallback(() => {
    updateCurrent((s) => ({
      ...s,
      restrictToScoringRelics: !s.restrictToScoringRelics,
    }));
  }, [updateCurrent]);

  const toggleVessel = useCallback(
    (vesselId: string) => {
      updateCurrent((s) => {
        const has = s.disabledVessels.includes(vesselId);
        return {
          ...s,
          disabledVessels: has
            ? s.disabledVessels.filter((v) => v !== vesselId)
            : [...s.disabledVessels, vesselId],
        };
      });
    },
    [updateCurrent]
  );

  // Damage profile selection derived from current settings
  const selection: DamageProfileSelection = useMemo(
    () => ({
      nightfarer: selectedNightfarer,
      primaryCategoryId: current.primaryCategoryId,
      schoolId: current.schoolId,
      element: current.element ?? undefined,
      enabledAttackModes: new Set(current.enabledAttackModes),
    }),
    [selectedNightfarer, current]
  );

  const multiplierArray = useMemo(
    () => buildDamageMultiplierArray(selection),
    [selection]
  );

  const highlightedEffectKeys = useMemo(() => {
    const set = new Set<EffectKey>();
    for (let i = 0; i < multiplierArray.length; i++) {
      if (multiplierArray[i] > 1) {
        set.add(i as EffectKey);
      }
    }
    // Also highlight must-have effects (they may carry no damage multiplier but
    // are the reason a combination was returned).
    for (const mh of current.mustHaves) {
      set.add(mh.effectKey as EffectKey);
    }
    return set;
  }, [multiplierArray, current.mustHaves]);

  const nightfarerData = nightfarers[selectedNightfarer];

  const enabledVessels = useMemo(
    () =>
      nightfarerData.vessels.filter(
        (v) => !current.disabledVessels.includes(v.name)
      ),
    [nightfarerData, current.disabledVessels]
  );

  // Search state
  const [searchResults, setSearchResults] = useState<ComboSearchResult | null>(
    null
  );
  const [progress, setProgress] = useState<ComboSearchProgress | null>(null);
  const runIdRef = useRef(0);

  const performSearch = useCallback(async () => {
    const myRunId = ++runIdRef.current;

    if (enabledVessels.length === 0) {
      setProgress(null);
      setSearchResults(null);
      return;
    }

    setProgress({
      totalCombinationsChecked: 0,
      availableRelicsCount: 0,
      stage: "main",
    });

    try {
      const normalRelics = currentSlot.relics.filter(
        (r) => items.get(r.itemId)?.type !== ItemType.DeepRelic
      );
      const deepRelics = currentSlot.relics.filter(
        (r) => items.get(r.itemId)?.type === ItemType.DeepRelic
      );

      const effectRanges: SelectedEffectEntry[] =
        current.mustHaves.map(mustHaveToEffectRange);

      const result = await searchDamageCombinations(
        selectedNightfarer,
        normalRelics,
        deepRelics,
        enabledVessels,
        multiplierArray,
        [],
        effectRanges,
        current.restrictToScoringRelics,
        (p: ComboSearchProgress) => {
          if (myRunId === runIdRef.current) {
            setProgress(p);
          }
        }
      );

      if (myRunId === runIdRef.current) {
        setSearchResults(result);
        setProgress({
          totalCombinationsChecked: result.totalCombinationsChecked,
          availableRelicsCount: result.availableRelicsCount,
          stage: "done",
        });
      }
    } catch (error) {
      if (myRunId === runIdRef.current) {
        if (error instanceof Error && error.message !== "Search cancelled") {
          console.error("Damage search failed:", error);
        }
        setProgress(null);
        setSearchResults(null);
      }
    }
  }, [
    selectedNightfarer,
    currentSlot.relics,
    enabledVessels,
    multiplierArray,
    current.mustHaves,
    current.restrictToScoringRelics,
  ]);

  useEffect(() => {
    return () => {
      cancelCurrentSearch();
    };
  }, []);

  // Virtualization
  const resultsParentRef = useRef<HTMLDivElement | null>(null);
  const resultsCount = searchResults?.combinations.length ?? 0;
  const resultsVirtualizer = useVirtualizer({
    count: resultsCount,
    getScrollElement: () => resultsParentRef.current,
    estimateSize: () => 300,
    overscan: 6,
  });

  const isSearching = progress?.stage === "main";

  return (
    <Box
      sx={{
        display: "flex",
        pt: 3,
        px: 3,
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Left panel: controls */}
      <Box
        sx={{
          width: "420px",
          flexShrink: 0,
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          pr: 2,
          pt: 1,
        }}
      >
        {/* Fixed build-config header: stays visible while 条件/聖杯 scroll below */}
        <Stack spacing={1} sx={{ flexShrink: 0 }}>
          <Stack direction="row" spacing={1}>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <InputLabel id="damage-opt-nightfarer-label">
                キャラクター
              </InputLabel>
              <Select
                labelId="damage-opt-nightfarer-label"
                label="キャラクター"
                value={String(selectedNightfarer)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (isNightfarer(v)) {
                    setSelectedNightfarer(v);
                  }
                }}
              >
                {Object.keys(nightfarers).map((key) => {
                  const k = Number(key) as Nightfarer;
                  return (
                    <MenuItem key={key} value={String(k)}>
                      {nightfarerNamesJa[k]}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <InputLabel id="damage-opt-primary-category-label">
                攻撃カテゴリ
              </InputLabel>
              <Select
                labelId="damage-opt-primary-category-label"
                label="攻撃カテゴリ"
                value={current.primaryCategoryId}
                onChange={handlePrimaryCategoryChange}
              >
                {primaryCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {primaryCategoryLabel(cat)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={1}>
            {showSchool && (
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <InputLabel id="damage-opt-school-label">系統</InputLabel>
                <Select
                  labelId="damage-opt-school-label"
                  label="系統"
                  value={current.schoolId ?? ""}
                  onChange={handleSchoolChange}
                >
                  <MenuItem value="">なし</MenuItem>
                  {schoolOptions.map((school) => (
                    <MenuItem key={school.id} value={school.id}>
                      {schoolLabels[school.id] ?? school.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <InputLabel id="damage-opt-element-label">属性</InputLabel>
              <Select
                labelId="damage-opt-element-label"
                label="属性"
                value={current.element ?? ""}
                onChange={handleElementChange}
              >
                <MenuItem value="">無属性</MenuItem>
                {damageElements.map((el) => (
                  <MenuItem key={el.id} value={el.id}>
                    {elementLabels[el.id] ?? el.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {showAttackModes && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                攻撃手段
              </Typography>
              <Stack>
                {attackModes.map((mode) => (
                  <FormControlLabel
                    key={mode.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={current.enabledAttackModes.includes(
                          mode.id
                        )}
                        onChange={() => toggleAttackMode(mode.id)}
                      />
                    }
                    label={attackModeLabels[mode.id] ?? mode.id}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>

        <Divider sx={{ my: 1.5, flexShrink: 0 }} />

        {/* Scrollable: 条件 (long list) + 聖杯 (rarely touched, collapsed by default) */}
        <Box sx={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {/* Fixed: 条件 header and search box */}
          <Box sx={{ flexShrink: 0, pr: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              条件
            </Typography>
            <EffectsAutocomplete
              onSearchChange={() => {}}
              onChange={(effect) => addMustHave(effect.key)}
              availableEffects={mustHaveOptions}
              placeholder="効果を検索..."
              getLabel={(key) => effectNameJa(key)}
              clearOnSelect
              groupByCategory
            />
          </Box>

          {/* Scrollable: must-have condition cards */}
          {current.mustHaves.length > 0 && (
            <Stack spacing={1} sx={{ mt: 1, flexGrow: 1, minHeight: 0, overflowY: "auto", pr: 1 }}>
              {current.mustHaves.map((mustHave) => {
                const effect = getEffectByKey(mustHave.effectKey as EffectKey);
                const hasGroup = effect?.group !== undefined;
                return (
                  <Card
                    key={mustHave.effectKey}
                    elevation={2}
                    sx={{ flexShrink: 0 }}
                  >
                    <CardContent
                      sx={{ px: 1.5, py: 0.5, "&:last-child": { paddingBottom: 0.5 } }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ mb: 0.5 }}
                      >
                        {effectNameJa(mustHave.effectKey as EffectKey)}
                      </Typography>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="flex-end"
                        spacing={1}
                      >
                        {hasGroup ? (
                          <FormControl size="small" sx={{ minWidth: 90 }}>
                            <Select
                              value={mustHave.matchMode}
                              onChange={(e) =>
                                setMustHaveMatchMode(
                                  mustHave.effectKey,
                                  e.target.value as MatchMode
                                )
                              }
                              sx={{ fontSize: "0.875rem" }}
                              aria-label="マッチモード"
                            >
                              <MenuItem value="exact" sx={{ fontSize: "0.875rem", py: 0.5 }}>一致</MenuItem>
                              <MenuItem value="higherOrEqual" sx={{ fontSize: "0.875rem", py: 0.5 }}>上位</MenuItem>
                              <MenuItem value="lowerOrEqual" sx={{ fontSize: "0.875rem", py: 0.5 }}>下位</MenuItem>
                            </Select>
                          </FormControl>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ flexGrow: 1 }}
                          >
                            {/* nothing */}
                          </Typography>
                        )}
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          個数
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                          <Select
                            value={String(mustHave.minStacks)}
                            onChange={(e) =>
                              setMustHaveMinStacks(
                                mustHave.effectKey,
                                Number(e.target.value)
                              )
                            }
                            sx={{ fontSize: "0.875rem" }}
                            aria-label="最小スタック数"
                          >
                            {STACKS_OPTIONS.map((n) => (
                              <MenuItem key={n} value={String(n)} sx={{ fontSize: "0.875rem", py: 0.5 }}>
                                {n}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary">
                          〜
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                          <Select
                            value={String(mustHave.maxStacks)}
                            onChange={(e) =>
                              setMustHaveMaxStacks(
                                mustHave.effectKey,
                                Number(e.target.value)
                              )
                            }
                            sx={{ fontSize: "0.875rem" }}
                            aria-label="最大スタック数"
                          >
                            {STACKS_OPTIONS.map((n) => (
                              <MenuItem key={n} value={String(n)} sx={{ fontSize: "0.875rem", py: 0.5 }}>
                                {n}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <IconButton
                          size="small"
                          aria-label="削除"
                          onClick={() => removeMustHave(mustHave.effectKey)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* Fixed footer, below the scroll area: rarely touched, so it never
            competes with 条件 for scroll space and is always reachable
            without scrolling past a long condition list. */}
        <Box sx={{ flexShrink: 0, pt: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ cursor: "pointer" }}
            onClick={() => setVesselSectionOpen((prev) => !prev)}
          >
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 0 }}>
              聖杯
            </Typography>
            {current.disabledVessels.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                （{current.disabledVessels.length}件除外中）
              </Typography>
            )}
            <IconButton
              size="small"
              aria-label={vesselSectionOpen ? "聖杯を閉じる" : "聖杯を開く"}
              sx={{
                ml: "auto",
                transform: vesselSectionOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          </Stack>
          {vesselSectionOpen && (
            <Stack gap={0.5} sx={{ maxHeight: 240, overflowY: "auto" }}>
              {nightfarerData.vessels.map((vessel) => {
                const disabled = current.disabledVessels.includes(
                  vessel.name
                );
                return (
                  <Card
                    key={vessel.name}
                    onClick={() => toggleVessel(vessel.name)}
                    elevation={disabled ? 1 : 2}
                    sx={{ cursor: "pointer", flexShrink: 0 }}
                  >
                    <CardContent
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        "&:last-child": { paddingBottom: 0.5 },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          fontWeight="bold"
                          color={disabled ? "text.disabled" : "text.primary"}
                          variant="body2"
                          sx={{ mb: 0.5 }}
                        >
                          {vesselNamesJa[vessel.name] ?? vessel.name}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {vessel.slots.map((color, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              color={getChipColor(color)}
                              variant="filled"
                              sx={{
                                height: 20,
                                fontSize: "0.7rem",
                              }}
                              label={
                                color === RelicSlotColor.Red
                                  ? "赤"
                                  : color === RelicSlotColor.Blue
                                  ? "青"
                                  : color === RelicSlotColor.Yellow
                                  ? "黄"
                                  : color === RelicSlotColor.Green
                                  ? "緑"
                                  : "全"
                              }
                            />
                          ))}
                        </Box>
                      </Box>
                      <Checkbox checked={!disabled} size="small" sx={{ flexShrink: 0 }} />
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* Right panel: results */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pl: 3,
        }}
      >
        <Box sx={{ mb: 2, flexShrink: 0 }}>
          <Button
            variant="contained"
            onClick={() => performSearch()}
            disabled={isSearching || enabledVessels.length === 0}
            fullWidth
            sx={{ mb: 1 }}
          >
            {isSearching ? "検索中..." : "検索"}
          </Button>
          <LinearProgress
            variant={isSearching ? "indeterminate" : "determinate"}
            color={isSearching ? "primary" : "success"}
            value={100}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isSearching ? (
              progress !== null && progress.totalCombinationsChecked > 0 ? (
                `検索中... ${progress.totalCombinationsChecked.toLocaleString()}件チェック済み`
              ) : (
                "検索中..."
              )
            ) : progress?.stage === "done" && searchResults !== null ? (
              `${progress.totalCombinationsChecked.toLocaleString()}件の組み合わせを${searchResults.searchTime}msでチェックしました。`
            ) : (
              <>&nbsp;</>
            )}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={!current.restrictToScoringRelics}
                onChange={toggleRestrictToScoringRelics}
                size="small"
              />
            }
            label="ダメージ倍率が1倍以下の遺物も候補に含める（検索が遅くなります）"
          />
        </Box>

        {searchResults && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              flex: 1,
              overflow: "hidden",
            }}
          >
            {searchResults.combinations.length === 0 ? (
              <Alert severity="info">結果がありません</Alert>
            ) : (
              <Box
                ref={resultsParentRef}
                sx={{ flex: 1, minHeight: 0, overflow: "auto" }}
              >
                <Box
                  sx={{
                    height: resultsVirtualizer.getTotalSize(),
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {resultsVirtualizer.getVirtualItems().map((virtualRow) => {
                    const combo =
                      searchResults.combinations[virtualRow.index];
                    return (
                      <Box
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={resultsVirtualizer.measureElement}
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <Box sx={{ pb: 2 }}>
                          <Card elevation={2}>
                            <CardContent>
                              <Typography fontWeight="bold" gutterBottom>
                                {vesselNamesJa[combo.vessel.name] ??
                                  combo.vessel.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                gutterBottom
                              >
                                {`ダメージ倍率 ×${combo.points.toFixed(2)}（+${((combo.points - 1) * 100).toFixed(0)}%）`}
                              </Typography>

                              <Box
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(3, 1fr)",
                                  gap: 2,
                                }}
                              >
                                {combo.relicCombination.map((relic, index) => (
                                  <DamageRelicSlot
                                    key={relic?.id ?? index}
                                    relic={relic}
                                    isDeep={index >= 3}
                                    highlightedEffectKeys={
                                      highlightedEffectKeys
                                    }
                                  />
                                ))}
                              </Box>
                            </CardContent>
                          </Card>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
