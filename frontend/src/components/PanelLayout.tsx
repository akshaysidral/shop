import { ReactNode } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useAuth } from "../AuthContext";

export type PanelLink = { to: string; label: string; icon: ReactNode; end?: boolean; permission?: string };

/** Sidebar + content area shared by the Seller Hub and the Admin panel. */
export default function PanelLayout({ title, links, children }: { title: string; links: PanelLink[]; children: ReactNode }) {
  const { can } = useAuth();
  const pathname = usePathname();
  const selected = (l: PanelLink) => (l.end ? pathname === l.to : pathname === l.to || pathname.startsWith(l.to + "/"));

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "240px 1fr" } }}>
      <Paper variant="outlined" sx={{ alignSelf: "start" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, px: 2, pt: 1.5 }}>{title}</Typography>
        <List dense component="nav" aria-label={title}>
          {links.filter((l) => !l.permission || can(l.permission)).map((l) => (
            <ListItemButton key={l.to} component={NextLink} href={l.to} selected={selected(l)}>
              <ListItemIcon sx={{ minWidth: 36 }}>{l.icon}</ListItemIcon>
              <ListItemText primary={l.label} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}
