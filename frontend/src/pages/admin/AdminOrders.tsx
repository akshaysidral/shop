import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "../../api";
import type { Order, OrderStatus } from "../../api";
import Loading from "../../components/Loading";
import SelectField from "../../components/SelectField";
import StatusChip from "../../components/StatusChip";
import { money } from "../../format";
import { DeleteIcon } from "../../icons";
import { useFetch } from "../../useFetch";

const STATUSES: OrderStatus[] = ["PLACED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function AdminOrders() {
  const orders = useFetch<Order[]>("/orders/all");
  const [msg, setMsg] = useState("");

  async function setStatus(o: Order, status: OrderStatus) {
    try {
      await api.patch(`/orders/${o.id}/status`, { status });
      orders.reload();
    } catch (e) {
      setMsg(errMsg(e, "Could not update the order"));
    }
  }

  async function remove(o: Order) {
    if (!window.confirm(`Delete order #${o.id}? Stock for active lines is returned.`)) return;
    try {
      await api.delete(`/orders/${o.id}`);
      orders.reload();
    } catch (e) {
      setMsg(errMsg(e, "Could not delete the order"));
    }
  }

  const rows = orders.data ?? [];
  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>All orders</Typography>
      {msg && <Alert severity="error" onClose={() => setMsg("")} sx={{ mb: 2 }}>{msg}</Alert>}
      {orders.error && <Alert severity="error" sx={{ mb: 2 }}>{orders.error}</Alert>}
      {orders.loading && <Loading />}
      {!orders.loading && !orders.error && rows.length === 0 && <Alert severity="info">No orders yet.</Alert>}
      {rows.map((o) => (
        <Paper key={o.id} variant="outlined" sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 1, p: 2 }}>
            <Box>
              <Typography component="span" sx={{ fontWeight: 700 }}>Order #{o.id}</Typography>
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {o.userEmail} · {new Date(o.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <StatusChip status={o.status} />
              <Typography sx={{ fontWeight: 700 }}>{money(o.total)}</Typography>
              <SelectField id={`status-${o.id}`} label="Status" value={o.status} fullWidth={false} sx={{ width: 160 }}
                           onChange={(v) => setStatus(o, v as OrderStatus)} options={STATUSES.map((s) => ({ value: s, label: s }))} />
              <IconButton aria-label={`Delete order ${o.id}`} color="error" onClick={() => remove(o)}><DeleteIcon /></IconButton>
            </Box>
          </Box>
          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            {o.items.map((i) => (
              <Box key={i.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5, fontSize: "0.9rem" }}>
                <span>{i.name} x {i.quantity} <Typography component="span" variant="caption" color="text.secondary">· {i.sellerName}</Typography></span>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}><StatusChip status={i.status} /><span>{money(i.unitPrice * i.quantity)}</span></Box>
              </Box>
            ))}
          </Box>
        </Paper>
      ))}
    </>
  );
}
