import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { SellerEarnings as Earnings, SellerLine } from "../../api";
import Loading from "../../components/Loading";
import StatCard from "../../components/StatCard";
import StatusChip from "../../components/StatusChip";
import { money, percent } from "../../format";
import { InventoryIcon, PaymentsIcon, PercentIcon, TrendIcon, WalletIcon } from "../../icons";
import { useFetch } from "../../useFetch";

/** What the seller sold, what Bazario keeps as commission, and what is left for the seller. */
export default function SellerEarnings() {
  const earnings = useFetch<Earnings>("/seller/earnings");
  const lines = useFetch<SellerLine[]>("/seller/orders");
  const e = earnings.data;
  const rows = (lines.data ?? []).filter((l) => l.status !== "CANCELLED");

  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Earnings and commission</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Bazario keeps a percentage of each sale. Your current rate applies to new orders; past orders keep the rate they were sold at.
      </Typography>
      {earnings.error && <Alert severity="error" sx={{ mb: 2 }}>{earnings.error}</Alert>}
      {earnings.loading && <Loading />}
      {e && (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" }, mb: 3 }}>
          <StatCard icon={<PercentIcon />} label="Your commission rate" value={percent(e.commissionPercent)} />
          <StatCard icon={<TrendIcon />} label="Gross sales" value={money(e.grossSales)} />
          <StatCard icon={<PaymentsIcon />} label="Commission paid" value={money(e.commission)} />
          <StatCard icon={<WalletIcon />} label="Net earnings" value={money(e.netEarnings)} />
          <StatCard icon={<PaymentsIcon />} label="Payable (delivered)" value={money(e.payable)} />
          <StatCard icon={<InventoryIcon />} label="Pending (not yet delivered)" value={money(e.pending)} />
        </Box>
      )}
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1 }}>Sales breakdown</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell><TableCell>Product</TableCell><TableCell>Qty</TableCell><TableCell>Sale</TableCell>
              <TableCell>Rate</TableCell><TableCell>Commission</TableCell><TableCell>You earn</TableCell><TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>No sales yet.</TableCell></TableRow>
            )}
            {rows.map((l) => (
              <TableRow key={l.itemId} hover>
                <TableCell>#{l.orderId}</TableCell>
                <TableCell>{l.productName}</TableCell>
                <TableCell>{l.quantity}</TableCell>
                <TableCell>{money(l.unitPrice * l.quantity)}</TableCell>
                <TableCell>{percent(l.commissionPercent)}</TableCell>
                <TableCell>{money(l.commission)}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{money(l.earning)}</TableCell>
                <TableCell><StatusChip status={l.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
