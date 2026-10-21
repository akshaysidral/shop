import { useId } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/** Bazario logo: a shopping bag with a saffron spark, plus the wordmark. */
export default function Logo({ size = 34, light = false, withText = true }: { size?: number; light?: boolean; withText?: boolean }) {
  const gid = `bz${useId().replace(/:/g, "")}`;
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Bazario logo">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4f46e5" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={`url(#${gid})`} stroke={light ? "rgba(255,255,255,0.55)" : "none"} strokeWidth="2" />
        <path d="M18 26h28l-2.5 22a4 4 0 0 1-4 3.5H24.5a4 4 0 0 1-4-3.5L18 26z" fill="#fff" />
        <path d="M25 26v-4a7 7 0 0 1 14 0v4" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M47 7l2.2 5.8L55 15l-5.8 2.2L47 23l-2.2-5.8L39 15l5.8-2.2z" fill="#ffb400" />
      </svg>
      {withText && (
        <Typography component="span" sx={{ fontWeight: 800, fontSize: "1.4rem", letterSpacing: -0.5, lineHeight: 1, color: light ? "#fff" : "#3730a3" }}>
          Bazario
        </Typography>
      )}
    </Box>
  );
}
