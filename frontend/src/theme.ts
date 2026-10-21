import { createTheme } from "@mui/material/styles";

/** Bazario brand colours. Change them here to rebrand the whole app. */
export const brand = {
  indigo: "#4338ca",
  indigoDark: "#3730a3",
  violet: "#7c3aed",
  saffron: "#ffb400",
  coral: "#ff6a3d",
  footer: "#1e1b4b",
  gradient: "linear-gradient(90deg, #4338ca 0%, #7c3aed 100%)",
  heroGradient: "linear-gradient(120deg, #4338ca 0%, #7c3aed 55%, #ff6a3d 100%)",
};

export const theme = createTheme({
  palette: {
    primary: { main: brand.indigo, dark: brand.indigoDark, contrastText: "#ffffff" },
    secondary: { main: brand.saffron, contrastText: "#1f1a00" },
    error: { main: "#e11d48" },
    background: { default: "#f4f3fb", paper: "#ffffff" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Roboto", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0 } },
  },
});
