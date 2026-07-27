import { Box, Button, Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RelicSlot } from "../types/SaveFile";
import { getItemName } from "../utils/DataUtils";
import {
  createDefaultSelection,
  getSellCandidates,
  toggleSelection,
} from "../utils/SellCandidates";

interface SellCandidatesPanelProps {
  relics: RelicSlot[];
  onSelectionChange: (selected: RelicSlot[]) => void;
}

export function SellCandidatesPanel({
  relics,
  onSelectionChange,
}: SellCandidatesPanelProps) {
  const { t } = useTranslation();
  const candidates = getSellCandidates(relics);
  const candidateIds = candidates.map((relic) => relic.id);
  const candidateIdsKey = candidateIds.join(",");

  const [selected, setSelected] = useState<Set<number>>(() =>
    createDefaultSelection(candidates)
  );
  const [syncedKey, setSyncedKey] = useState(candidateIdsKey);

  if (candidateIdsKey !== syncedKey) {
    setSyncedKey(candidateIdsKey);
    setSelected(createDefaultSelection(candidates));
  }

  useEffect(() => {
    onSelectionChange(candidates.filter((relic) => selected.has(relic.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, candidateIdsKey]);

  return (
    <Box component="section" aria-label="Sell candidates">
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">
          {t("sellCandidatesTitle", { count: candidates.length })}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => setSelected(new Set(candidateIds))}>
            {t("sellCandidatesSelectAll")}
          </Button>
          <Button size="small" onClick={() => setSelected(new Set())}>
            {t("sellCandidatesSelectNone")}
          </Button>
        </Stack>
      </Stack>
      <Stack>
        {candidates.map((relic) => (
          <FormControlLabel
            key={relic.id}
            control={
              <Checkbox
                checked={selected.has(relic.id)}
                onChange={() => setSelected((prev) => toggleSelection(prev, relic.id))}
              />
            }
            label={getItemName(relic.itemId)}
          />
        ))}
      </Stack>
    </Box>
  );
}
