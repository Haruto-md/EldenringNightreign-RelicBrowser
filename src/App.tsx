import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { Route, Routes, useNavigate } from "react-router-dom";
import { FileUploader } from "./components/FileUploader";
import { Footer } from "./components/Footer";
import { RelicsPage } from "./components/RelicsPage";
import { useSaveFile } from "./hooks/useSaveFile";
import { theme } from "./theme";

function App() {
  const navigate = useNavigate();
  const {
    saveFileData,
    loading,
    error,
    loadSaveFile,
    selectSlot,
    searchTerm,
    setSearchTerm,
    matchingRelicsCount,
    setMatchingRelicsCount,
    clearSaveFile,
  } = useSaveFile();

  const handleLoadSaveFile = (file: File) => {
    loadSaveFile(file);
    navigate("/relics");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        component="main"
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Routes>
            <Route
              path="/"
              element={
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileUploader
                    onFileSelect={handleLoadSaveFile}
                    loading={loading}
                    hasFile={false}
                  />
                </Box>
              }
            />
            <Route
              path="/relics"
              element={
                <RelicsPage
                  saveFileData={saveFileData}
                  loading={loading}
                  error={error}
                  selectSlot={selectSlot}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  matchingRelicsCount={matchingRelicsCount}
                  handleMatchingRelicsCountChange={setMatchingRelicsCount}
                  clearSaveFile={clearSaveFile}
                  onChangeSaveFile={loadSaveFile}
                />
              }
            />
          </Routes>

          <Footer />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
