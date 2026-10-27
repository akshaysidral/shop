import { FormEvent, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "../../api";
import type { SellerSummary } from "../../api";
import Loading from "../../components/Loading";
import { money, percent } from "../../format";
import { PercentIcon } from "../../icons";
import { useFetch } from "../../useFetch";

export const PRESETS = [
  { label: "Preferred 3%", value: 3 },
  { label: "Standard 5%", value: 5 },
];

function RateDialog({ show, seller, onClose, onSaved }: {
  show: boolean; seller: SellerSummary | null; onClose: () => void; onSaved: () => void;
}) {
  const [value, setValue] = useState("5");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show || !seller) return;
    setError("");
    setValue(String(seller.commissionPercent));
  }, [show, seller]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!seller) return;
    const n = Number(value);
    if (value.trim() === "" || Number.isNaN(n) || n < 0 || n > 30) return setError("Enter a percentage from 0 to 30");
    setBusy(true);
    try {
      await api.put(`/admin/sellers/${seller.id}/commission`, { percent: n });
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Could not change the commission"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit} noValidate>
        <DialogTitle>Commission for {seller?.storeName ?? seller?.email}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="body2" color="text.secondary">
              This is the share of each sale Bazario keeps. It applies to new orders only; past orders keep their rate.
            </Typography>
            <Stack direction="row" spacing={1}>
              {PRESETS.map((p) => (
                <Button key={p.value} variant={Number(value) === p.value ? "contained" : "outlined"} onClick={() => setValue(String(p.value))}>
                  {p.label}
                </Button>
              ))}
            </Stack>
            <TextField id="commission" label="Commission %" type="number" value={value} onChange={(e) => setValue(e.target.value)}
                       slotProps={{ htmlInput: { min: 0, max: 30, step: "0.5" } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving..." : "Save rate"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Every seller, the percentage Bazario keeps from their sales (for example 3% or 5%) and what they have sold. */
export default function AdminSellers() {
  const sellers = useFetch<SellerSummary[]>("/admin/sellers");
  const [editing, setEditing] = useState<SellerSummary | null>(null);
  const rows = sellers.data ?? [];
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Sellers &amp; commission</Typography>
          <Typography variant="body2" color="text.secondary">
            Each seller pays a percentage of their sales: 5% as standard, 3% for preferred sellers, or any rate up to 30%.
          </Typography>
        </Box>
        <Chip color="primary" label={`Commission earned: ${money(totalCommission)}`} />
      </Box>
      {sellers.error && <Alert severity="error" sx={{ mb: 2 }}>{sellers.error}</Alert>}
      {sellers.loading ? <Loading /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Seller</TableCell><TableCell>Rate</TableCell><TableCell>Units sold</TableCell>
                <TableCell>Gross sales</TableCell><TableCell>Commission earned</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>No sellers yet.</TableCell></TableRow>
              )}
              {rows.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{s.storeName ?? s.email}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                  </TableCell>
                  <TableCell><Chip size="small" color={s.commissionPercent <= 3 ? "success" : "default"} label={percent(s.commissionPercent)} /></TableCell>
                  <TableCell>{s.unitsSold}</TableCell>
                  <TableCell>{money(s.grossSales)}</TableCell>
                  <TableCell>{money(s.commission)}</TableCell>
                  <TableCell align="right">
                    <IconButton aria-label={`Change commission for ${s.email}`} color="primary" onClick={() => setEditing(s)}><PercentIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <RateDialog show={editing !== null} seller={editing} onClose={() => setEditing(null)}
                  onSaved={() => { setEditing(null); sellers.reload(); }} />
    </>
  );
}
