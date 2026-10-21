import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Stats } from "../../api";
import Loading from "../../components/Loading";
import StatCard from "../../components/StatCard";
import { money } from "../../format";
import { BagIcon, InventoryIcon, OrdersIcon, PercentIcon, StoreIcon, TrendIcon, UsersIcon } from "../../icons";
import { useFetch } from "../../useFetch";

export default function AdminHome() {
  const { data, loading, error } = useFetch<Stats>("/admin/stats");
  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>Marketplace overview</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Loading />}
      {data && (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" } }}>
          <StatCard icon={<UsersIcon />} label="Users" value={data.users} />
          <StatCard icon={<BagIcon />} label="Buyers" value={data.buyers} />
          <StatCard icon={<StoreIcon />} label="Sellers" value={data.sellers} />
          <StatCard icon={<InventoryIcon />} label="Products" value={data.products} />
          <StatCard icon={<OrdersIcon />} label="Orders" value={data.orders} />
          <StatCard icon={<TrendIcon />} label="Gross sales (cancelled excluded)" value={money(data.revenue)} />
          <StatCard icon={<PercentIcon />} label="Commission earned" value={money(data.commission)} to="/admin/sellers" />
        </Box>
      )}
    </>
  );
}
