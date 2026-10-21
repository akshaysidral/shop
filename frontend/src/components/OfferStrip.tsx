import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { ActiveOffer } from "../api";
import { SparkIcon } from "../icons";
import { useFetch } from "../useFetch";

/** Festival sales running right now, set by sellers. Hidden when there are none. */
export default function OfferStrip() {
  const { data } = useFetch<ActiveOffer[]>("/offers/active");
  const offers = (data ?? []).slice(0, 4);
  if (offers.length === 0) return null;
  return (
    <Paper variant="outlined" sx={{ mb: 2, px: 2, py: 1, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 3, rowGap: 0.5,
                                    background: "linear-gradient(90deg, #fff4d6, #ffe7c2)", borderColor: "#ffd68a" }}>
      <Typography sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.5, color: "#8a5a00" }}>
        <SparkIcon fontSize="small" />Sales on now
      </Typography>
      {offers.map((o, i) => (
        <Box key={`${o.name}-${i}`} sx={{ fontSize: "0.9rem" }}>
          <strong>{o.name}</strong>: {o.discountPercent}% off{o.appliesToAll ? " everything" : ""} at {o.sellerName}
          <Typography component="span" variant="caption" color="text.secondary"> (ends {new Date(o.endsAt).toLocaleDateString()})</Typography>
        </Box>
      ))}
    </Paper>
  );
}
