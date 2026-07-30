import { Search } from "@mui/icons-material";
import { Box, Chip, InputAdornment, Typography } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  EffectType,
  isEffectKey,
  isMaxLevel,
  type Effect,
} from "../resources/effects";
import {
  effectCategories,
  effectCategoryOrder,
  effectCategoryRank,
} from "../resources/effectCategories";
import type { EffectKey } from "../resources/effectKeys";
import { getEffectByKey } from "../utils/DataUtils";

interface EffectsAutocompleteProps {
  onSearchChange: (searchTerm: string) => void;
  onChange?: (effectKey: Effect) => void;
  availableEffects: Effect[];
  placeholder: string;
  showOrBetterLabels?: boolean;
  clearOnSelect?: boolean;
  groupByCategory?: boolean;
  getLabel?: (effectKey: number) => string;
}

export function EffectsAutocomplete({
  onSearchChange,
  onChange,
  availableEffects,
  placeholder,
  showOrBetterLabels = false,
  clearOnSelect = false,
  groupByCategory = false,
  getLabel,
}: EffectsAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getOptionLabel = useCallback(
    (option: string) => {
      const effectKey = parseInt(option);
      if (isEffectKey(effectKey)) {
        const label = getLabel
          ? getLabel(effectKey)
          : t(`effects.${effectKey}`);
        const effect = getEffectByKey(effectKey);
        if (
          showOrBetterLabels &&
          effect !== undefined &&
          !isMaxLevel(effect) &&
          effect.stacks
        ) {
          return label + " (or better)";
        }
        return label;
      }
      return option;
    },
    [showOrBetterLabels, t, getLabel]
  );

  const categoryOf = useCallback((option: string) => {
    const effectKey = parseInt(option) as EffectKey;
    return (
      effectCategories[effectKey] ??
      effectCategoryOrder[effectCategoryOrder.length - 1]
    );
  }, []);

  const options = useMemo(() => {
    const keys = availableEffects.map((effect) => String(effect.key));
    if (!groupByCategory) {
      return keys;
    }
    const scoped =
      selectedCategory === null
        ? keys
        : keys.filter((key) => categoryOf(key) === selectedCategory);
    const orderIndex = new Map(
      effectCategoryOrder.map((category, index) => [category, index])
    );
    const rankOf = (option: string) => {
      const effectKey = parseInt(option) as EffectKey;
      return effectCategoryRank[effectKey] ?? Number.MAX_SAFE_INTEGER;
    };
    return [...scoped].sort((a, b) => {
      const categoryDiff =
        (orderIndex.get(categoryOf(a)) ?? 0) -
        (orderIndex.get(categoryOf(b)) ?? 0);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }
      return rankOf(a) - rankOf(b);
    });
  }, [availableEffects, groupByCategory, categoryOf, selectedCategory]);

  return (
    <Box sx={{ width: 350 }}>
      {groupByCategory && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "nowrap",
            overflowX: "auto",
            gap: 0.5,
            mb: 0.5,
            pb: 0.5,
            // Keep this a single compact row instead of wrapping to
            // several lines (which ate a lot of vertical space above the
            // input, repeated for every picker instance) - scroll
            // horizontally instead.
            scrollbarWidth: "thin",
          }}
        >
          <Chip
            label={t("allCategoriesChipLabel")}
            size="small"
            color={selectedCategory === null ? "primary" : "default"}
            onClick={() => setSelectedCategory(null)}
            sx={{ flexShrink: 0 }}
          />
          {effectCategoryOrder.map((category) => (
            <Chip
              key={category}
              label={category}
              size="small"
              color={selectedCategory === category ? "primary" : "default"}
              onClick={() =>
                setSelectedCategory((prev) =>
                  prev === category ? null : category
                )
              }
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Box>
      )}
      <Autocomplete
        disablePortal
        autoHighlight
        clearOnEscape
        options={options}
        groupBy={groupByCategory ? categoryOf : undefined}
        freeSolo
        value={null}
        inputValue={inputValue}
        onInputChange={(_e, value) => {
          setInputValue(value);
          onSearchChange(value);
        }}
        onChange={(_e, value) => {
          if (onChange === undefined || value === null) {
            return;
          }
          const effectKey = parseInt(value);
          if (isEffectKey(effectKey)) {
            const effect = getEffectByKey(effectKey);
            if (effect) {
              onChange(effect);
              if (clearOnSelect) {
                setInputValue("");
                onSearchChange("");
              }
            }
          }
        }}
        getOptionLabel={getOptionLabel}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            slotProps={{
              input: {
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          const debuff =
            getEffectByKey(parseInt(option))?.type === EffectType.Debuff;
          return (
            <Typography
              {...props}
              key={option}
              color={debuff ? "#76adde" : "text.primary"}
            >
              {getOptionLabel(option)}
            </Typography>
          );
        }}
      />
    </Box>
  );
}
