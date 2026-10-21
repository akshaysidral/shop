import { FormEvent, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "../api";
import type { Offer, Product } from "../api";
import { AddIcon, DeleteIcon, EditIcon, PauseIcon, PlayIcon } from "../icons";
import { useFetch } from "../useFetch";
import Loading from "./Loading";
import SelectField from "./SelectField";
import StatusChip from "./StatusChip";

export const FESTIVALS = ["Diwali", "Holi", "Eid", "Christmas", "New Year", "Republic Day", "Independence Day",
  "Black Friday", "End of Season", "Custom"];

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO instant -> value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso: string | Date): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function OfferDialog({ show, offer, products, onClose, onSaved }: {
  show: boolean; offer: Offer | null; products: Product[]; onClose: () => void; onSaved: () => void;
}) {
  const [festival, setFestival] = useState("Custom");
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("10");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [appliesToAll, setAppliesToAll] = useState(true);
  const [active, setActive] = useState(true);
  const [picked, setPicked] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setError("");
    setFestival("Custom");
    if (offer) {
      setName(offer.name);
      setPercent(String(offer.discountPercent));
      setStartsAt(toLocalInput(offer.startsAt));
      setEndsAt(toLocalInput(offer.endsAt));
      setAppliesToAll(offer.appliesToAll);
      setActive(offer.active);
      setPicked(offer.productIds);
    } else {
      setName("");
      setPercent("10");
      setStartsAt(toLocalInput(new Date()));
      setEndsAt(toLocalInput(new Date(Date.now() + 7 * 24 * 3600 * 1000)));
      setAppliesToAll(true);
      setActive(true);
      setPicked([]);
    }
  }, [show, offer]);

  function chooseFestival(value: string) {
    setFestival(value);
    if (value !== "Custom") setName(`${value} Sale`);
  }

  const toggleProduct = (id: number) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const pct = Number(percent);
    const from = new Date(startsAt);
    const to = new Date(endsAt);
    if (!name.trim()) return setError("Give the offer a name");
    if (!Number.isInteger(pct) || pct < 1 || pct > 90) return setError("Discount must be a whole number from 1 to 90");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return setError("Choose a start and an end");
    if (to <= from) return setError("The end must be after the start");
    if (!appliesToAll && picked.length === 0) return setError("Choose at least one product, or apply to all");
    setBusy(true);
    const body = {
      name: name.trim(), discountPercent: pct, startsAt: from.toISOString(), endsAt: to.toISOString(),
      active, appliesToAll, productIds: appliesToAll ? [] : picked,
    };
    try {
      if (offer) await api.put(`/offers/${offer.id}`, body);
      else await api.post("/offers", body);
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Could not save the offer"));
    } finally {
      setBusy(false);
    }
  }

  const shrink = { inputLabel: { shrink: true } };
  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{offer ? "Edit offer" : "New festival offer"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <SelectField id="of-festival" label="Festival or occasion" size="medium" value={festival} onChange={chooseFestival}
                         options={FESTIVALS.map((f) => ({ value: f, label: f }))} />
            <Stack direction="row" spacing={2}>
              <TextField id="of-name" label="Offer name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
              <TextField id="of-percent" label="Discount %" type="number" sx={{ width: 140 }} value={percent}
                         onChange={(e) => setPercent(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 90 } }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField id="of-start" label="Starts" type="datetime-local" fullWidth value={startsAt} onChange={(e) => setStartsAt(e.target.value)} slotProps={shrink} />
              <TextField id="of-end" label="Ends" type="datetime-local" fullWidth value={endsAt} onChange={(e) => setEndsAt(e.target.value)} slotProps={shrink} />
            </Stack>
            <FormControlLabel control={<Switch checked={appliesToAll} onChange={(e) => setAppliesToAll(e.target.checked)} />} label="Apply to all my products" />
            {!appliesToAll && (
              <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 1, maxHeight: 180, overflowY: "auto" }}>
                {products.length === 0 && <Typography variant="body2" color="text.secondary">Add products first.</Typography>}
                {products.map((p) => (
                  <FormControlLabel key={p.id} sx={{ display: "flex" }} label={p.name}
                                    control={<Checkbox size="small" checked={picked.includes(p.id)} onChange={() => toggleProduct(p.id)} />} />
                ))}
              </Box>
            )}
            <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label="Active (untick to pause)" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving..." : "Save offer"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Sellers create and edit their own sales. Admins (admin=true) can only pause, resume or delete any sale. */
export default function OfferManager({ admin = false }: { admin?: boolean }) {
  const offers = useFetch<Offer[]>("/offers");
  const products = useFetch<Product[]>(admin ? null : "/seller/products");
  const [modal, setModal] = useState<{ offer: Offer | null } | null>(null);
  const [msg, setMsg] = useState("");

  async function toggle(o: Offer) {
    try {
      await api.put(`/offers/${o.id}`, {
        name: o.name, discountPercent: o.discountPercent, startsAt: o.startsAt, endsAt: o.endsAt,
        active: !o.active, appliesToAll: o.appliesToAll, productIds: o.productIds,
      });
      offers.reload();
    } catch (e) {
      setMsg(errMsg(e, "Could not update the offer"));
    }
  }

  async function remove(o: Offer) {
    if (!window.confirm(`Delete the offer "${o.name}"?`)) return;
    try {
      await api.delete(`/offers/${o.id}`);
      offers.reload();
    } catch (e) {
      setMsg(errMsg(e, "Could not delete the offer"));
    }
  }

  const rows = offers.data ?? [];
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>{admin ? "All offers" : "Festival offers"}</Typography>
          {!admin && (
            <Typography variant="body2" color="text.secondary">
              You decide the festival, the discount and the dates. Buyers see the sale price automatically.
            </Typography>
          )}
        </Box>
        {!admin && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModal({ offer: null })}>New offer</Button>}
      </Box>
      {msg && <Alert severity="error" onClose={() => setMsg("")} sx={{ mb: 2 }}>{msg}</Alert>}
      {offers.error && <Alert severity="error" sx={{ mb: 2 }}>{offers.error}</Alert>}
      {offers.loading ? <Loading /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Offer</TableCell>{admin && <TableCell>Seller</TableCell>}<TableCell>Discount</TableCell>
                <TableCell>Runs</TableCell><TableCell>Applies to</TableCell><TableCell>Status</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={admin ? 7 : 6} align="center" sx={{ py: 4, color: "text.secondary" }}>No offers yet.</TableCell></TableRow>
              )}
              {rows.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{o.name}</TableCell>
                  {admin && <TableCell>{o.sellerName}</TableCell>}
                  <TableCell><Chip size="small" color="error" label={`${o.discountPercent}% off`} /></TableCell>
                  <TableCell sx={{ fontSize: "0.8rem" }}>{new Date(o.startsAt).toLocaleString()}<br />to {new Date(o.endsAt).toLocaleString()}</TableCell>
                  <TableCell>{o.appliesToAll ? "All products" : `${o.productIds.length} product(s)`}</TableCell>
                  <TableCell><StatusChip status={o.status} /></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <IconButton aria-label={`${o.active ? "Pause" : "Resume"} ${o.name}`} onClick={() => toggle(o)}>
                      {o.active ? <PauseIcon /> : <PlayIcon />}
                    </IconButton>
                    {!admin && <IconButton aria-label={`Edit ${o.name}`} color="primary" onClick={() => setModal({ offer: o })}><EditIcon /></IconButton>}
                    <IconButton aria-label={`Delete ${o.name}`} color="error" onClick={() => remove(o)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {!admin && (
        <OfferDialog show={modal !== null} offer={modal?.offer ?? null} products={products.data ?? []}
                     onClose={() => setModal(null)} onSaved={() => { setModal(null); offers.reload(); }} />
      )}
    </>
  );
}
