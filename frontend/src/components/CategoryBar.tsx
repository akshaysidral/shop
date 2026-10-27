import { ReactNode } from "react";
import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import type { Category } from "../api";
import { AppsIcon } from "../icons";
import { useFetch } from "../useFetch";
import CategoryIcon from "./CategoryIcon";

function Chip({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <ButtonBase
      component={NextLink}
      href={href}
      aria-current={active ? "page" : undefined}
      sx={{ flexDirection: "column", gap: 0.25, minWidth: 88, px: 1, py: 0.75, borderRadius: 2, color: active ? "primary.dark" : "text.primary",
            bgcolor: active ? "#e4e1fb" : "transparent", boxShadow: active ? "inset 0 -3px 0 #4338ca" : "none",
            "&:hover": { bgcolor: "#eeedfb" }, "& svg": { color: "primary.main" } }}
    >
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 500, textAlign: "center" }}>{label}</Typography>
    </ButtonBase>
  );
}

/** Flipkart/Amazon-style row of category shortcuts under the header. Hidden on seller and admin pages. */
export default function CategoryBar() {
  const { data } = useFetch<Category[]>("/categories");
  const params = useSearchParams();
  const pathname = usePathname();
  const active = params.get("category");
  if (pathname.startsWith("/admin") || pathname.startsWith("/seller")) return null;

  return (
    <Box component="nav" aria-label="Categories" sx={{ bgcolor: "background.paper", borderBottom: "1px solid #e6e4f5" }}>
      <Container>
        <Box sx={{ display: "flex", gap: 1, overflowX: "auto", py: 1 }}>
          <Chip href="/" label="All" icon={<AppsIcon />} active={!active} />
          {(data ?? []).map((c) => (
            <Chip key={c.id} href={`/?category=${c.id}`} label={c.name} icon={<CategoryIcon icon={c.icon} />} active={active === String(c.id)} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
