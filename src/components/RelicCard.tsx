import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import {
  Box,
  Card,
  CardContent,
  Chip,
  List,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { isSameGroupAndEqualOrBetter, type Effect } from "../resources/effects";
import {
  items,
  ItemType,
  uniqueItemIds,
  unsellableItemIds,
} from "../resources/items";
import type { RelicSlot } from "../types/SaveFile";
import { getEffectName, getItemName, getRelicColor } from "../utils/DataUtils";
import { getChipColor, type RelicSlotColor } from "../utils/RelicColor";
import { highlightSearchTerm } from "../utils/SearchUtils";
import { RelicColorChip } from "./RelicColorChip";
import { RelicComparisonModal } from "./RelicComparisonModal";

interface RelicCardProps {
  relic: RelicSlot;
  searchTerm: string;
  selectedColor: RelicSlotColor;
  highlightedEffects?: Effect[];
  coordinatesByColor: boolean;
  /**
   * When true, clicking the card toggles it in/out of the caller's selection
   * set. `onToggleSelect` takes the relic id (rather than being pre-bound per
   * card) so the same stable function reference can be passed to every card,
   * keeping the memo comparator below effective across re-renders.
   */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (relicId: number) => void;
}

const getBackgroundColor = (effectsCount: number) => {
  switch (effectsCount) {
    case 1:
      return "#494a4c";
    case 2:
      return "#3a4d5f";
    case 3:
      return "#3b3051";
    case 4:
      return "#00dd22";
    default:
      return "#000000";
  }
};

const RelicCardComponent: React.FC<RelicCardProps> = ({
  relic,
  searchTerm,
  selectedColor,
  highlightedEffects = [],
  coordinatesByColor,
  selectable = false,
  selected = false,
  onToggleSelect,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { itemId, effects } = relic;
  const itemName = getItemName(itemId);
  const itemColor = getRelicColor(itemId);
  const backgroundColor = getBackgroundColor(effects.length);
  const isUniqueRelic = uniqueItemIds.includes(itemId);
  const itemNameHighlight = highlightSearchTerm(itemName, searchTerm);
  const selectedChipColor = getChipColor(selectedColor);
  const itemType = items.get(itemId)?.type ?? ItemType.Relic;
  const { t } = useTranslation();

  const handleSellMeClick = (event: React.MouseEvent) => {
    // Don't let opening the comparison modal also toggle selection underneath it.
    event.stopPropagation();
    setModalOpen(true);
  };

  const handleCardClick = () => {
    if (selectable) {
      onToggleSelect?.(relic.id);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const tooltipContent = coordinatesByColor ? (
    <Typography component="span" variant="inherit">
      {t("coordinatesHelpPrefix")}
      <Typography
        color={selectedChipColor}
        fontWeight="bold"
        component="span"
        variant="inherit"
      >
        {t(`colors.${selectedColor}`)}
      </Typography>
      {t("coordinatesHelpMiddle")}
      <Typography
        color={itemType === ItemType.DeepRelic ? "#76adde" : "text.primary"}
        fontWeight="bold"
        component="span"
        variant="inherit"
      >
        {itemType === ItemType.DeepRelic ? t("depthsRelicLabel") : t("relicLabel")}
      </Typography>
      {t("coordinatesHelpSuffix")}
    </Typography>
  ) : (
    t("coordinatesHelpSimple")
  );

  const [row, column] = coordinatesByColor
    ? relic.coordinatesByColor
    : relic.coordinates;

  return (
    <Card
      variant="outlined"
      onClick={handleCardClick}
      aria-pressed={selectable ? selected : undefined}
      sx={{
        height: "100%",
        background: `radial-gradient(circle at 100% 100%, ${backgroundColor} 0%, #000000 130%)`,
        transition: "0.3s ease",
        overflow: "hidden",
        position: "relative",
        borderRadius: 3,
        ...(selectable && {
          cursor: "pointer",
          borderColor: selected ? "error.main" : "divider",
          borderWidth: selected ? 2 : 1,
          opacity: selected ? 1 : 0.55,
          "&:hover": {
            opacity: 1,
            borderColor: selected ? "error.main" : "text.secondary",
          },
        }),
      }}
    >
      {selectable && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            left: 4,
            zIndex: 1,
            display: "flex",
            color: selected ? "error.main" : "text.disabled",
            bgcolor: "rgba(0, 0, 0, 0.6)",
            borderRadius: "50%",
          }}
        >
          {selected ? (
            <CheckCircleIcon fontSize="small" />
          ) : (
            <RadioButtonUncheckedIcon fontSize="small" />
          )}
        </Box>
      )}
      <CardContent
        sx={{
          "&:last-child": {
            paddingBottom: 1,
          },
          p: 1,
          mb: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: 0,
              flexGrow: 1,
              fontSize: ".9rem",
              ...(isUniqueRelic
                ? {
                    color: "white",
                    fontWeight: "bold",
                    textShadow: "0 0 8px rgba(33, 150, 243, 0.8)",
                    padding: "8px 8px",
                    margin: "-8px -8px",
                  }
                : itemType === ItemType.DeepRelic
                  ? { color: "#457cacff" }
                  : {
                      color: "text.secondary",
                    }),
            }}
          >
            {itemNameHighlight.highlightedText}
          </Typography>
          {relic.redundant && !unsellableItemIds.includes(relic.itemId) && (
            <Chip
              label={t("sellChipLabel")}
              size="small"
              sx={{
                overflow: "clip",
                mr: 1,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "info.main",
                },
              }}
              onClick={handleSellMeClick}
            />
          )}
          <RelicColorChip color={itemColor} type={itemType} />
        </Box>

        <List sx={{ listStyleType: "disc", pl: 2, py: 0 }}>
          {effects.map(([effect, debuff], index) => {
            const effectName = getEffectName(effect);
            const effectHighlight = highlightSearchTerm(effectName, searchTerm);
            const highlightEffect =
              highlightedEffects.includes(effect) ||
              highlightedEffects.some((highlighted) =>
                isSameGroupAndEqualOrBetter(highlighted, effect)
              );

            const debuffName =
              debuff !== undefined ? getEffectName(debuff) : "";
            const debuffHighlight =
              debuff !== undefined
                ? highlightSearchTerm(debuffName, searchTerm)
                : undefined;
            const highlightDebuff =
              debuff !== undefined
                ? highlightedEffects.includes(debuff) ||
                  highlightedEffects.some((highlighted) =>
                    isSameGroupAndEqualOrBetter(highlighted, debuff)
                  )
                : false;

            return (
              <Box key={index} sx={{ mb: 0.5, display: "list-item" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      highlightedEffects.length === 0
                        ? "text.primary"
                        : highlightEffect
                          ? "success.main"
                          : "text.secondary",
                  }}
                >
                  {effectHighlight.highlightedText}
                </Typography>
                {debuffHighlight && (
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        highlightedEffects.length === 0
                          ? "#76adde"
                          : highlightDebuff
                            ? "success.main"
                            : "#76adde",
                    }}
                  >
                    {debuffHighlight.highlightedText}
                  </Typography>
                )}
              </Box>
            );
          })}
        </List>

        {/* Row and Column indices in lower right corner */}
        <Tooltip title={tooltipContent} placement="top" arrow>
          <Typography
            variant="caption"
            color={
              coordinatesByColor ? getChipColor(itemColor) : "text.disabled"
            }
            sx={{
              position: "absolute",
              bottom: 0,
              right: 3,
              cursor: "help",
            }}
          >
            {`Row ${row + 1}, Column ${column + 1}`}
          </Typography>
        </Tooltip>
      </CardContent>

      {/* Comparison Modal */}
      {relic.redundant && (
        <RelicComparisonModal
          open={modalOpen}
          onClose={handleModalClose}
          currentRelic={relic}
          equalOrBetterRelic={relic.redundant.relic}
          selectedColor={selectedColor}
        />
      )}
    </Card>
  );
};

export const RelicCard = React.memo(
  RelicCardComponent,
  (prevProps, nextProps) => {
    // If basic props changed, re-render
    if (
      prevProps.relic !== nextProps.relic ||
      prevProps.selectedColor !== nextProps.selectedColor ||
      prevProps.coordinatesByColor !== nextProps.coordinatesByColor ||
      prevProps.highlightedEffects !== nextProps.highlightedEffects ||
      prevProps.selectable !== nextProps.selectable ||
      prevProps.selected !== nextProps.selected ||
      prevProps.onToggleSelect !== nextProps.onToggleSelect
    ) {
      return false;
    }

    // If search term is the same, no re-render needed
    if (prevProps.searchTerm === nextProps.searchTerm) {
      return true;
    }

    // Check if highlighting results actually changed
    const { itemId, effects } = prevProps.relic;
    const itemName = getItemName(itemId);
    const prevItemHighlight = highlightSearchTerm(
      itemName,
      prevProps.searchTerm
    );
    const nextItemHighlight = highlightSearchTerm(
      itemName,
      nextProps.searchTerm
    );

    if (
      prevItemHighlight.hasMatch === true ||
      nextItemHighlight.hasMatch === true
    ) {
      return false;
    }

    // Check if any effect highlighting changed
    for (const [effect, debuff] of effects) {
      const effectName = getEffectName(effect);
      const prevEffectHighlight = highlightSearchTerm(
        effectName,
        prevProps.searchTerm
      );
      const nextEffectHighlight = highlightSearchTerm(
        effectName,
        nextProps.searchTerm
      );

      if (
        prevEffectHighlight.hasMatch === true ||
        nextEffectHighlight.hasMatch === true
      ) {
        return false;
      }

      if (debuff !== undefined) {
        const debuffName = getEffectName(debuff);
        const prevDebuffHighlight = highlightSearchTerm(
          debuffName,
          prevProps.searchTerm
        );
        const nextDebuffHighlight = highlightSearchTerm(
          debuffName,
          nextProps.searchTerm
        );

        if (
          prevDebuffHighlight.hasMatch === true ||
          nextDebuffHighlight.hasMatch === true
        ) {
          return false;
        }
      }
    }

    // No meaningful highlighting changes, skip re-render
    return true;
  }
);
