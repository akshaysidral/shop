import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useAuth } from "../../AuthContext";
import type { Offer, Product, SellerEarnings, SellerLine } from "../../api";
import StatCard from "../../components/StatCard";
import { money, percent } from "../../format";
import { InventoryIcon, OfferIcon, PercentIcon, ShippingIcon, WalletIcon, WarningIcon } from "../../icons";
import { useFetch } from "../../useFetch";

export default function SellerHome() {
  const { user } = useAuth();
  const products = useFetch<Product[]>("/seller/products");
  const offers = useFetch<Offer[]>("/offers");
  const lines = useFetch<SellerLine[]>("/seller/orders");
  const earnings = useFetch<SellerEarnings>("/seller/earnings");

  const list = products.data ?? [];
  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Welcome, {user?.storeName ?? user?.email}</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Manage your catalogue, run festival offers and ship your orders.</Typography>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" } }}>
        <StatCard icon={<InventoryIcon />} label="Products" value={list.length} to="/seller/products" />
        <StatCard icon={<WarningIcon />} label="Low stock (5 or fewer)" value={list.filter((p) => p.stock <= 5).length} to="/seller/products" />
        <StatCard icon={<OfferIcon />} label="Live offers" value={(offers.data ?? []).filter((o) => o.status === "LIVE").length} to="/seller/offers" />
        <StatCard icon={<ShippingIcon />} label="Orders to ship" value={(lines.data ?? []).filter((l) => l.status === "PLACED").length} to="/seller/orders" />
        <StatCard icon={<PercentIcon />} label="Your commission rate" value={percent(earnings.data?.commissionPercent ?? user?.commissionPercent ?? 0)} to="/seller/earnings" />
        <StatCard icon={<WalletIcon />} label="Net earnings" value={money(earnings.data?.netEarnings ?? 0)} to="/seller/earnings" />
      </Box>
    </>
  );
}
