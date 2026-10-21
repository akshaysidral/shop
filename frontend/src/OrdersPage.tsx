import { Link as RouterLink } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Order } from "./api";
import Loading from "./components/Loading";
import ProductImage from "./components/ProductImage";
import StatusChip from "./components/StatusChip";
import { money } from "./format";
import { useFetch } from "./useFetch";

export default function OrdersPage() {
  const loggedIn = !!localStorage.getItem("token");
  const { data, loading, error } = useFetch<Order[]>(loggedIn ? "/orders" : null);
  const orders = data ?? [];

  if (!loggedIn) {
    return <Alert severity="info">Please <Link component={RouterLink} to="/login" state={{ from: "/orders" }}>login</Link> to see your orders.</Alert>;
  }
  if (loading) return <Loading />;
  if (error) return <Alert severity="error">Could not load your orders.</Alert>;

  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>My orders</Typography>
      {orders.length === 0 && (
        <Alert severity="info">You have no orders yet. <Link component={RouterLink} to="/">Start shopping</Link></Alert>
      )}
      {orders.map((o) => (
        <Paper key={o.id} variant="outlined" sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 1, p: 2 }}>
            <Box>
              <Typography component="span" sx={{ fontWeight: 700 }}>Order #{o.id}</Typography>
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>{new Date(o.createdAt).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <StatusChip status={o.status} />
              <Typography sx={{ fontWeight: 700 }}>{money(o.total)}</Typography>
            </Box>
          </Box>
          <Divider />
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {o.items.map((i) => (
              <Box key={i.id} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <ProductImage name={i.name} size="sm" />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{i.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Qty {i.quantity} x {money(i.unitPrice)}{i.sellerName ? ` · Sold by ${i.sellerName}` : ""}
                  </Typography>
                </Box>
                <StatusChip status={i.status} />
                <Typography sx={{ minWidth: 80, textAlign: "right" }}>{money(i.unitPrice * i.quantity)}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      ))}
    </>
  );
}
