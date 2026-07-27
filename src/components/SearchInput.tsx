import TuneIcon from "@mui/icons-material/Tune";
import { Box, Chip, Collapse, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import React, { type Dispatch, type SetStateAction, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Effect } from "../resources/effects";
import {
  colorFilterOptions,
  type ColorFilterOption,
} from "../utils/ColorFilterOptions";
import type { EffectFilterState } from "../utils/EffectFilter";
import { AdvancedSearchPanel } from "./AdvancedSearchPanel";
import { EffectsAutocomplete } from "./EffectsAutocomplete";
import { RelicColorChip } from "./RelicColorChip";

interface SearchInputProps {
  onSearchChange: (searchTerm: string) => void;
  selectedColor: ColorFilterOption;
  onColorChange: (colorFilter: ColorFilterOption) => void;
  availableEffects: Effect[];
  filterSell: boolean;
  onFilterSellChange: Dispatch<SetStateAction<boolean>>;
  effectFilter: EffectFilterState;
  onEffectFilterChange: (filter: EffectFilterState) => void;
  countText?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearchChange,
  selectedColor,
  onColorChange,
  availableEffects,
  filterSell,
  onFilterSellChange,
  effectFilter,
  onEffectFilterChange,
  countText,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Box sx={{ py: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <EffectsAutocomplete
          onSearchChange={onSearchChange}
          availableEffects={availableEffects}
          placeholder={t("searchPlaceholder")}
        />

        <ToggleButtonGroup
          exclusive
          aria-label="Relic Color Filter"
          value={selectedColor}
          onChange={(_, newColor) => {
            if (newColor !== null) {
              onColorChange(newColor);
            }
          }}
        >
          {colorFilterOptions.map((option) => (
            <ToggleButton
              key={option.color}
              value={option}
              sx={{ textTransform: "none" }}
            >
              <RelicColorChip color={option.color} type={option.type} />
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButton
          value="check"
          selected={filterSell}
          onChange={() => onFilterSellChange((prevSelected) => !prevSelected)}
        >
          <Chip label={t("outclassedChipLabel")} size="small" />
        </ToggleButton>

        <ToggleButton
          value="advanced"
          selected={advancedOpen}
          onChange={() => setAdvancedOpen((prev) => !prev)}
          aria-label="Toggle advanced search"
        >
          <TuneIcon fontSize="small" />
        </ToggleButton>

        <Typography variant="caption" color="text.secondary">
          {countText}
        </Typography>
      </Box>

      <Collapse in={advancedOpen}>
        <Box sx={{ mt: 2 }}>
          <AdvancedSearchPanel
            availableEffects={availableEffects}
            effectFilter={effectFilter}
            onEffectFilterChange={onEffectFilterChange}
          />
        </Box>
      </Collapse>
    </Box>
  );
};
