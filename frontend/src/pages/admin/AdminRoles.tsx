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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "../../api";
import type { Role } from "../../api";
import Loading from "../../components/Loading";
import { AddIcon, DeleteIcon, EditIcon } from "../../icons";
import { useFetch } from "../../useFetch";

/** ROLES_READ, ROLES_CREATE ... -> { ROLES: [...], PRODUCTS: [...] } for tidy checkbox groups. */
export function groupPermissions(perms: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const p of perms) {
    const key = p.split("_")[0];
    out[key] = out[key] ?? [];
    out[key].push(p);
  }
  return out;
}

function RoleDialog({ show, role, allPermissions, onClose, onSaved }: {
  show: boolean; role: Role | null; allPermissions: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setError("");
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setPerms(role?.permissions ?? []);
  }, [show, role]);

  const toggle = (p: string) => setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body = { name: name.trim(), description, permissions: perms };
    try {
      if (role) await api.put(`/roles/${role.id}`, body);
      else await api.post("/roles", body);
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Could not save the role"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="md">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{role ? `Edit ${role.name}` : "New role"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField id="role-name" label="Name (UPPER_SNAKE_CASE)" fullWidth value={name} disabled={!!role?.builtIn}
                         onChange={(e) => setName(e.target.value.toUpperCase())} />
              <TextField id="role-desc" label="Description" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
            </Stack>
            <Typography variant="body2" color="text.secondary">You can only grant permissions you hold yourself.</Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" } }}>
              {Object.entries(groupPermissions(allPermissions)).map(([g, list]) => (
                <Box key={g}>
                  <Typography variant="overline" sx={{ fontWeight: 700 }}>{g}</Typography>
                  {list.map((p) => (
                    <FormControlLabel key={p} sx={{ display: "flex" }} label={<Typography variant="body2">{p}</Typography>}
                                      control={<Checkbox size="small" checked={perms.includes(p)} onChange={() => toggle(p)} />} />
                  ))}
                </Box>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving..." : "Save role"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function AdminRoles() {
  const roles = useFetch<Role[]>("/roles");
  const permissions = useFetch<string[]>("/permissions");
  const [modal, setModal] = useState<{ role: Role | null } | null>(null);
  const [msg, setMsg] = useState("");

  async function remove(r: Role) {
    if (!window.confirm(`Delete the role ${r.name}?`)) return;
    try {
      await api.delete(`/roles/${r.id}`);
      roles.reload();
    } catch (e) {
      setMsg(errMsg(e, "Could not delete the role"));
    }
  }

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Roles &amp; permissions</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModal({ role: null })}>New role</Button>
      </Box>
      {msg && <Alert severity="error" onClose={() => setMsg("")} sx={{ mb: 2 }}>{msg}</Alert>}
      {roles.error && <Alert severity="error" sx={{ mb: 2 }}>{roles.error}</Alert>}
      {roles.loading ? <Loading /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>Role</TableCell><TableCell>Permissions</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {(roles.data ?? []).map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{r.name} {r.builtIn && <Chip size="small" label="built-in" />}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 480 }}>
                    {r.permissions.length === 0 && <Typography variant="caption" color="text.secondary">No special permissions</Typography>}
                    {r.permissions.map((p) => <Chip key={p} size="small" variant="outlined" label={p} sx={{ mr: 0.5, mb: 0.5 }} />)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <IconButton aria-label={`Edit ${r.name}`} color="primary" disabled={r.name === "ADMIN"} onClick={() => setModal({ role: r })}><EditIcon /></IconButton>
                    <IconButton aria-label={`Delete ${r.name}`} color="error" disabled={r.builtIn} onClick={() => remove(r)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <RoleDialog show={modal !== null} role={modal?.role ?? null} allPermissions={permissions.data ?? []}
                  onClose={() => setModal(null)} onSaved={() => { setModal(null); roles.reload(); }} />
    </>
  );
}
