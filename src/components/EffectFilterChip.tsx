import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { EffectFilterEntry } from "../utils/EffectFilter";

interface EffectFilterChipProps {
  entry: EffectFilterEntry;
  onToggleComparison?: () => void;
  onRemove: () => void;
}

export function EffectFilterChip({
  entry,
  onToggleComparison,
  onRemove,
}: EffectFilterChipProps) {
  const { t } = useTranslation();
  const label = t(`effects.${entry.effect.key}`);
  const showToggle = onToggleComparison !== undefined && entry.effect.group !== undefined;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <IconButton size="small" onClick={onRemove} sx={{ p: 0.25 }} aria-label={`Remove ${label}`}>
        <CloseIcon fontSize="inherit" />
      </IconButton>
      {showToggle && (
        <Tooltip
          title={
            entry.comparison === "atLeast"
              ? t("comparisonAtLeastTooltip")
              : t("comparisonAtMostTooltip")
          }
        >
          <IconButton size="small" onClick={onToggleComparison} sx={{ p: 0.25 }}>
            {entry.comparison === "atLeast" ? (
              <KeyboardArrowUpIcon fontSize="inherit" />
            ) : (
              <KeyboardArrowDownIcon fontSize="inherit" />
            )}
          </IconButton>
        </Tooltip>
      )}
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}
