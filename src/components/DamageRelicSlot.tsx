import { Box, Card, CardContent, List, Typography, useTheme } from "@mui/material";
import type { EffectKey } from "../resources/effectKeys";
import type { RelicSlot } from "../types/SaveFile";
import { getItemName, getRelicColor } from "../utils/DataUtils";
import { effectNameJa } from "../utils/effectNameJa";
import { RelicColorChip } from "./RelicColorChip";
import { items, ItemType } from "../resources/items";

export interface DamageRelicSlotProps {
  relic: RelicSlot | undefined;
  isDeep: boolean;
  highlightedEffectKeys: ReadonlySet<EffectKey>;
}

export function DamageRelicSlot(props: DamageRelicSlotProps) {
  const { relic, highlightedEffectKeys } = props;
  const theme = useTheme();

  if (!relic) {
    return (
      <Card
        variant="outlined"
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.palette.action.disabledBackground,
          opacity: 0.6,
        }}
      >
        <CardContent sx={{ textAlign: "center", p: 1 }}>
          <Typography variant="body2" color="textSecondary">
            空き
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const itemName = getItemName(relic.itemId);
  const itemColor = getRelicColor(relic.itemId);
  const itemType = items.get(relic.itemId)?.type ?? ItemType.Relic;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        borderRadius: 1,
      }}
    >
      <CardContent
        sx={{
          "&:last-child": {
            paddingBottom: 1,
          },
          p: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Item name and color chip */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
            gap: 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: 0,
              flexGrow: 1,
              fontSize: ".85rem",
              color: itemType === ItemType.DeepRelic ? "#457cacff" : "text.secondary",
              fontWeight: "500",
            }}
          >
            {itemName}
          </Typography>
          <RelicColorChip color={itemColor} type={itemType} />
        </Box>

        {/* Effects list */}
        <List sx={{ listStyleType: "disc", pl: 2, py: 0, flex: 1 }}>
          {relic.effects.map(([effect, debuff], index) => {
            const effectKey = effect.key;
            const isHighlighted = highlightedEffectKeys.has(effectKey);

            const effectLabel = effectNameJa(effectKey);

            return (
              <Box key={index} sx={{ mb: 0.5, display: "list-item" }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: ".8rem",
                    fontWeight: isHighlighted ? "bold" : "normal",
                    color: isHighlighted
                      ? theme.palette.primary.main
                      : "text.primary",
                    transition: "color 0.2s ease, font-weight 0.2s ease",
                  }}
                >
                  {effectLabel}
                </Typography>
                {debuff && (
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: ".8rem",
                      color: "#76adde",
                    }}
                  >
                    {effectNameJa(debuff.key)}
                  </Typography>
                )}
              </Box>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}
