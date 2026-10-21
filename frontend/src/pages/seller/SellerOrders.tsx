import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "../../api";
import type { OrderStatus, SellerLine } from "../../api";
import Loading from "../../components/Loading";
import StatusChip from "../../components/StatusChip";
import { money, percent } from "../../format";
import { useFetch } from "../../useFetch";

const ACTIONS: Partial<Record<OrderStatus, { label: string; status: OrderStatus; color: "primary" | "success" | "error" }[]>> = {
  PLACED: [{ label: "Mark shipped", status: "SHIPPED", color: "primary" }, { label: "Cancel", status: "CANCELLED", color: "error" }],
  SHIPPED: [{ label: "Mark delivered", status: "DELIVERED", color: "success" }, { label: "Cancel", status: "CANCELLED", color: "error" }],
};

export default function SellerOrders() {
  const lines = useFetch<SellerLine[]>("/seller/orders");
  const [msg, setMsg] = useState("");

  async function move(l: SellerLine, status: OrderStatus) {
    if (status === "CANCELLED" && !window.confirm("Cancel this line? The stock goes back to your product.")) return;
    try {
      await api.patch(`/seller/orders/${l.orderId}/items/${l.itemId}/status`, { status });
      lines.reload();
    } catch (e) {
      setMsg(errMsg(e, "Could not update the order"));
    }
  }

  const rows = lines.data ?? [];
  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>Orders to ship</Typography>
      {msg && <Alert severity="error" onClose={() => setMsg("")} sx={{ mb: 2 }}>{msg}</Alert>}
      {lines.error && <Alert severity="error" sx={{ mb: 2 }}>{lines.error}</Alert>}
      {lines.loading ? <Loading /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell><TableCell>Product</TableCell><TableCell>Qty</TableCell><TableCell>Sale</TableCell>
                <TableCell>Commission</TableCell><TableCell>You earn</TableCell><TableCell>Buyer</TableCell><TableCell>Status</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>No orders yet.</TableCell></TableRow>
              )}
              {rows.map((l) => (
                <TableRow key={l.itemId} hover>
                  <TableCell>#{l.orderId}<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{new Date(l.createdAt).toLocaleDateString()}</Typography></TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{l.productName}</TableCell>
                  <TableCell>{l.quantity}</TableCell>
                  <TableCell>{money(l.unitPrice * l.quantity)}</TableCell>
                  <TableCell>{money(l.commission)} <Typography component="span" variant="caption" color="text.secondary">({percent(l.commissionPercent)})</Typography></TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{money(l.earning)}</TableCell>
                  <TableCell sx={{ fontSize: "0.85rem" }}>{l.buyer}</TableCell>
                  <TableCell><StatusChip status={l.status} /></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {(ACTIONS[l.status] ?? []).map((a) => (
                      <Button key={a.status} size="small" variant={a.status === "CANCELLED" ? "outlined" : "contained"} color={a.color}
                              sx={{ ml: 0.5 }} onClick={() => move(l, a.status)}>
                        {a.label}
                      </Button>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
