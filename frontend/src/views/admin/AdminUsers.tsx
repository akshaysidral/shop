import { FormEvent, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "../../api";
import type { Me, Role } from "../../api";
import { useAuth } from "../../AuthContext";
import Loading from "../../components/Loading";
import { percent } from "../../format";
import { DeleteIcon, SecurityIcon } from "../../icons";
import { useFetch } from "../../useFetch";

function RolesDialog({ show, user, roles, onClose, onSaved }: {
  show: boolean; user: Me | null; roles: Role[]; onClose: () => void; onSaved: () => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show || !user) return;
    setError("");
    setPicked(roles.filter((r) => user.roles.includes(r.name)).map((r) => r.id));
  }, [show, user, roles]);

  const toggle = (id: number) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await api.put(`/users/${user.id}/roles`, { roleIds: picked });
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Could not change the roles"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>Roles for {user?.email}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            You can only add or remove roles whose permissions you hold yourself.
          </Typography>
          {roles.map((r) => (
            <FormControlLabel key={r.id} sx={{ display: "flex" }}
                              control={<Checkbox checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />}
                              label={<span><strong>{r.name}</strong> <Typography component="span" variant="caption" color="text.secondary">{r.description}</Typography></span>} />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving..." : "Save roles"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

const ROLE_COLOR = (r: string): "error" | "warning" | "primary" => (r === "ADMIN" ? "error" : r === "SELLER" ? "warning" : "primary");

export default function AdminUsers() {
  const { user: me } = useAuth();
  const users = useFetch<Me[]>("/users");
  const roles = useFetch<Role[]>("/roles");
  const [editing, setEditing] = useState<Me | null>(null);
  const [msg, setMsg] = useState("");

  async function remove(u: Me) {
    if (!window.confirm(`Delete the user ${u.email}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      users.reload();
    } catch (e) {
      setMsg(errMsg(e, "Could not delete the user"));
    }
  }

  return (
    <>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>Users</Typography>
      {msg && <Alert severity="error" onClose={() => setMsg("")} sx={{ mb: 2 }}>{msg}</Alert>}
      {users.error && <Alert severity="error" sx={{ mb: 2 }}>{users.error}</Alert>}
      {users.loading ? <Loading /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>User</TableCell><TableCell>Store</TableCell><TableCell>Commission</TableCell><TableCell>Roles</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {(users.data ?? []).map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{u.email}</TableCell>
                  <TableCell>{u.storeName ?? "-"}</TableCell>
                  <TableCell>{u.commissionPercent == null ? "-" : percent(u.commissionPercent)}</TableCell>
                  <TableCell>
                    {u.roles.length === 0 && <Typography variant="caption" color="text.secondary">No roles</Typography>}
                    {u.roles.map((r) => <Chip key={r} size="small" color={ROLE_COLOR(r)} label={r} sx={{ mr: 0.5 }} />)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <IconButton aria-label={`Roles for ${u.email}`} color="primary" onClick={() => setEditing(u)}><SecurityIcon /></IconButton>
                    <IconButton aria-label={`Delete ${u.email}`} color="error" disabled={u.id === me?.id} onClick={() => remove(u)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <RolesDialog show={editing !== null} user={editing} roles={roles.data ?? []} onClose={() => setEditing(null)}
                   onSaved={() => { setEditing(null); users.reload(); }} />
    </>
  );
}
