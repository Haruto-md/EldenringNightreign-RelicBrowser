import { Search } from "@mui/icons-material";
import { InputAdornment, Typography } from "@mui/material";
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
import { effectCategories, effectCategoryOrder } from "../resources/effectCategories";
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

  const getOptionLabel = useCallback(
    (option: string) => {
      const effectKey = parseInt(option);
      if (isEffectKey(effectKey)) {
        const label = getLabel ? getLabel(effectKey) : t(`effects.${effectKey}`);
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
    return effectCategories[effectKey] ?? effectCategoryOrder[effectCategoryOrder.length - 1];
  }, []);

  const options = useMemo(() => {
    const keys = availableEffects.map((effect) => String(effect.key));
    if (!groupByCategory) {
      return keys;
    }
    const orderIndex = new Map(effectCategoryOrder.map((category, index) => [category, index]));
    return [...keys].sort(
      (a, b) => (orderIndex.get(categoryOf(a)) ?? 0) - (orderIndex.get(categoryOf(b)) ?? 0)
    );
  }, [availableEffects, groupByCategory, categoryOf]);

  return (
    <Autocomplete
      disablePortal
      autoHighlight
      clearOnEscape
      options={options}
      groupBy={groupByCategory ? categoryOf : undefined}
      freeSolo
      sx={{ width: 350 }}
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
  );
}
