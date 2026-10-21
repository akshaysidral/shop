import { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

/** A number with a label and an icon, optionally a link (dashboards). */
export default function StatCard({ icon, label, value, to }: { icon: ReactNode; label: string; value: string | number; to?: string }) {
  const body = (
    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "primary.main", color: "#fff" }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </CardContent>
  );
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      {to ? <CardActionArea component={RouterLink} to={to} sx={{ height: "100%" }}>{body}</CardActionArea> : body}
    </Card>
  );
}
