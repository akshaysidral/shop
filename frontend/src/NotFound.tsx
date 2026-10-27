import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function NotFound() {
  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      <Typography variant="h1" sx={{ fontWeight: 800, color: "text.disabled" }}>404</Typography>
      <Typography variant="h6" sx={{ mb: 2 }}>We could not find that page.</Typography>
      <Button component={NextLink} href="/" variant="contained">Back to shop</Button>
    </Box>
  );
}
