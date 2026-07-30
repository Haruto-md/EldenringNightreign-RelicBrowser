import { Box, Typography } from "@mui/material";
import packageJson from "../../package.json";

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        py: 1,
        px: 2,
        textAlign: "right",
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Typography
        sx={{
          color: "text.secondary",
          fontSize: "0.75rem",
        }}
      >
        v{packageJson.version}
      </Typography>
    </Box>
  );
}
