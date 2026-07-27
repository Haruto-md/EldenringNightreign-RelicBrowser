import {
  Alert,
  AppBar,
  Box,
  CircularProgress,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import { Clear } from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { SaveFileData } from "../types/SaveFile";
import { CharacterSlotSelect } from "./CharacterSlotSelect";
import { DamageOptimizer } from "./DamageOptimizer";
import { RelicBrowser } from "./RelicBrowser";

const enum TabIndex {
  RelicBrowser,
  DamageOptimizer,
}

interface RelicsPageProps {
  saveFileData: SaveFileData | null;
  loading: boolean;
  error: string | null;
  selectSlot: (index: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  matchingRelicsCount: number;
  handleMatchingRelicsCountChange: (count: number) => void;
  clearSaveFile: () => void;
}

export function RelicsPage({
  saveFileData,
  loading,
  error,
  selectSlot,
  searchTerm,
  setSearchTerm,
  handleMatchingRelicsCountChange,
  clearSaveFile,
}: RelicsPageProps) {
  const currentSlot = saveFileData?.slots[saveFileData.currentSlot];
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [tab, setTab] = useState(TabIndex.RelicBrowser);

  // Clear save file when component unmounts (leaving /relics route)
  useEffect(() => {
    return () => {
      clearSaveFile();
    };
  }, [clearSaveFile]);

  // Navigate to home if no save file data
  useEffect(() => {
    if (!loading && !saveFileData) {
      navigate("/");
    }
  }, [saveFileData, loading, navigate]);

  const availableEffects = useMemo(() => {
    if (!currentSlot) {
      return [];
    }
    const effects = currentSlot?.relics.flatMap((relic) =>
      relic.effects.flatMap(([effect, debuff]) =>
        debuff !== undefined ? [effect, debuff] : [effect]
      )
    );
    const uniqueEffects = effects.filter(
      (effect, index, arr) =>
        arr.findIndex((e) => e.key === effect.key) === index
    );
    uniqueEffects.sort((a, b) =>
      t(`effects.${a.key}`).localeCompare(t(`effects.${b.key}`))
    );
    return uniqueEffects;
  }, [currentSlot, t]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }} role="alert">
        {error}
      </Alert>
    );
  }

  if (loading || currentSlot === undefined) {
    return (
      <Box
        sx={{ display: "flex", justifyContent: "center", my: 4 }}
        role="status"
        aria-label="Loading"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!saveFileData) {
    // Navigation is handled by useEffect above
    return null;
  }

  return (
    <>
      <AppBar position="static" elevation={24}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1,
          }}
        >
          <Box sx={{ minWidth: 0, flexShrink: 0 }}>
            {saveFileData.slots.length > 1 && (
              <CharacterSlotSelect
                slots={saveFileData.slots}
                value={saveFileData.currentSlot}
                onChange={selectSlot}
                label={t("character")}
              />
            )}
          </Box>
          <Tabs
            value={tab}
            onChange={(_e, value) => setTab(value)}
            centered
            sx={{ flexGrow: 1 }}
          >
            <Tab value={TabIndex.RelicBrowser} label={t("relicBrowserTab")} />
            <Tab value={TabIndex.DamageOptimizer} label="ダメージ最適化" />
          </Tabs>
          <Tooltip title="Close Save File">
            <IconButton
              onClick={() => navigate("/")}
              aria-label="Close Save File"
              color="inherit"
            >
              <Clear />
            </IconButton>
          </Tooltip>
        </Box>
      </AppBar>
      {tab === TabIndex.RelicBrowser && (
        <RelicBrowser
          availableEffects={availableEffects}
          currentSlot={currentSlot}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleMatchingRelicsCountChange={handleMatchingRelicsCountChange}
        />
      )}
      {tab === TabIndex.DamageOptimizer && (
        <DamageOptimizer currentSlot={currentSlot} />
      )}
    </>
  );
}
