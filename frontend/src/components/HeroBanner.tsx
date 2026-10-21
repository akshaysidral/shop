import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { brand } from "../theme";

// Edit the text or gradient here (gradient colours live in theme.ts).
export default function HeroBanner() {
  return (
    <Box sx={{ background: brand.heroGradient, color: "#fff", borderRadius: 3, p: { xs: 3, md: 5 }, mb: 2, minHeight: 200,
               display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start" }}>
      <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 600 }}>Welcome to Bazario</Typography>
      <Typography variant="h3" component="h1" sx={{ fontWeight: 800, fontSize: { xs: "2rem", md: "2.8rem" } }}>
        Shop. Sell. Celebrate.
      </Typography>
      <Typography sx={{ mt: 1, mb: 2, fontSize: "1.15rem" }}>
        Browse by category, grab festival deals from sellers you can trust.
      </Typography>
      <Button href="#products" variant="contained" color="secondary" size="large">Start shopping</Button>
    </Box>
  );
}
