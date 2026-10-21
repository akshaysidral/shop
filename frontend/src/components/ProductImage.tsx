import { useState } from "react";
import Box from "@mui/material/Box";

// Sellers can give an image URL. Without one (or if it fails to load) we draw a coloured tile with the initial.
const GRADIENTS: [string, string][] = [
  ["#667eea", "#764ba2"], ["#f6a365", "#fd7e5a"], ["#43cea2", "#185a9d"],
  ["#ff758c", "#ff7eb3"], ["#4facfe", "#00c6fb"], ["#a18cd1", "#fbc2eb"],
];

function pick(name: string): [string, string] {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

const SIZES = {
  sm: { width: 72, height: 72, flex: "none", fontSize: 28, borderRadius: 1 },
  md: { width: "100%", aspectRatio: "4 / 3", fontSize: 56 },
  lg: { width: "100%", aspectRatio: "1 / 1", fontSize: 128, borderRadius: 2 },
} as const;

export default function ProductImage({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const [from, to] = pick(name);
  const showImage = !!src && !failed;
  return (
    <Box
      data-testid="product-image"
      aria-hidden={showImage ? undefined : true}
      sx={{
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        color: "rgba(255,255,255,0.92)", fontWeight: 700, userSelect: "none",
        background: showImage ? undefined : `linear-gradient(135deg, ${from}, ${to})`,
        ...SIZES[size],
      }}
    >
      {showImage
        ? <img src={src ?? ""} alt={name} loading="lazy" onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : name.charAt(0).toUpperCase()}
    </Box>
  );
}
