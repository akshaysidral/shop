import { FormEvent, MouseEvent, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import NativeSelect from "@mui/material/NativeSelect";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useAuth } from "../AuthContext";
import { useCart } from "../CartContext";
import type { Category } from "../api";
import { AccountIcon, CartIcon, DashboardIcon, LogoutIcon, OrdersIcon, SearchIcon, StoreIcon } from "../icons";
import { brand } from "../theme";
import { useFetch } from "../useFetch";
import Logo from "./Logo";

export default function Header() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { user, logout, can } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const categories = useFetch<Category[]>("/categories");

  function search(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (cat) next.set("category", cat);
    const qs = next.toString();
    nav(qs ? `/?${qs}` : "/");
  }

  const go = (path: string) => { setAnchor(null); nav(path); };

  return (
    <AppBar position="sticky" elevation={2} sx={{ background: brand.gradient }}>
      <Container>
        <Toolbar disableGutters sx={{ gap: 2, flexWrap: { xs: "wrap", md: "nowrap" }, py: { xs: 1, md: 0 } }}>
          <Box component={RouterLink} to="/" aria-label="Bazario home" sx={{ textDecoration: "none" }}>
            <Logo light />
          </Box>

          <Paper component="form" role="search" onSubmit={search}
                 sx={{ display: "flex", alignItems: "center", flexGrow: 1, order: { xs: 3, md: 0 }, width: { xs: "100%", md: "auto" }, px: 0.5 }}>
            <NativeSelect
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              disableUnderline
              inputProps={{ "aria-label": "Search category" }}
              sx={{ minWidth: { xs: 100, md: 150 }, px: 1, fontSize: "0.9rem", borderRight: "1px solid #e0e0e0" }}
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
            <InputBase
              sx={{ flex: 1, px: 1.5 }}
              placeholder="Search for products"
              inputProps={{ "aria-label": "Search products" }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <IconButton type="submit" color="primary" aria-label="Search"><SearchIcon /></IconButton>
          </Paper>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
            {!user && (
              <Button component={RouterLink} to="/login" state={{ mode: "register", accountType: "SELLER" }} color="inherit" startIcon={<StoreIcon />}>
                Sell on Bazario
              </Button>
            )}
            {user ? (
              <>
                <Button color="inherit" startIcon={<AccountIcon />} aria-haspopup="menu"
                        onClick={(e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}>
                  {user.storeName ?? user.email.split("@")[0]}
                </Button>
                <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: "block" }}>
                    {user.roles.length ? user.roles.join(", ") : "Customer"}
                  </Typography>
                  <Divider />
                  <MenuItem onClick={() => go("/orders")}><ListItemIcon><OrdersIcon fontSize="small" /></ListItemIcon>My orders</MenuItem>
                  {can("PRODUCTS_CREATE") && <MenuItem onClick={() => go("/seller")}><ListItemIcon><StoreIcon fontSize="small" /></ListItemIcon>Seller Hub</MenuItem>}
                  {can("STATS_READ") && <MenuItem onClick={() => go("/admin")}><ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>Admin panel</MenuItem>}
                  <Divider />
                  <MenuItem onClick={() => { setAnchor(null); logout(); nav("/"); }}><ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <Button component={RouterLink} to="/login" variant="contained" color="inherit" sx={{ color: "primary.main", bgcolor: "#fff" }}>Login</Button>
            )}
            <IconButton component={RouterLink} to="/cart" color="inherit" aria-label="Cart">
              <Badge badgeContent={count} color="secondary"><CartIcon /></Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
