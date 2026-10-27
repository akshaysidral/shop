import { FormEvent, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import type { Category } from "../../api";
import CategoryIcon, { CATEGORY_ICON_KEYS, iconKey } from "../../components/CategoryIcon";
import Loading from "../../components/Loading";
import { AddIcon, DeleteIcon, EditIcon } from "../../icons";
import { useFetch } from "../../useFetch";

function CategoryDialog({ show, category, onClose, onSaved }: {
  show: boolean; category: Category | null; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(CATEGORY_ICON_KEYS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setError("");
    setName(category?.name ?? "");
    setIcon(category ? iconKey(category.icon) : CATEGORY_ICON_KEYS[0]);
  }, [show, category]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Name is required");
    setBusy(true);
    try {
      if (category) await api.put(`/categories/${category.id}`, { name: name.trim(), icon });
      else await api.post("/categories", { name: name.trim(), icon });
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Could not save the category"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField id="cat-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Typography variant="caption" color="text.secondary">Icon</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {CATEGORY_ICON_KEYS.map((k) => (
                <IconButton key={k} aria-label={`Icon ${k}`} aria-pressed={icon === k} color={icon === k ? "primary" : "default"}
                            sx={{ border: "1px solid", borderColor: icon === k ? "primary.main" : "divider" }} onClick={() => setIcon(k)}>
                  <CategoryIcon icon={k} />
                </IconButton>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function AdminCategories() {
  const cats = useFetch<Category[]>("/categories");
  const [modal, setModal] = useState<{ category: Category | null } | null>(null);
  const [msg, setMsg] = useState("");

  async function remove(c: Category) {
    if (!window.confirm(`Delete the category "${c.name}"?`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      cats.reload();
    } catch (e) {
      setMsg(errMsg(e, "Could not delete the category"));
    }
  }

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>Categories</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModal({ category: null })}>New category</Button>
      </Box>
      {msg && <Alert severity="error" onClose={() => setMsg("")} sx={{ mb: 2 }}>{msg}</Alert>}
      {cats.error && <Alert severity="error" sx={{ mb: 2 }}>{cats.error}</Alert>}
      {cats.loading ? <Loading /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>Category</TableCell><TableCell>Products</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {(cats.data ?? []).map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell><Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "primary.main" }}>
                    <CategoryIcon icon={c.icon} /><Typography color="text.primary">{c.name}</Typography></Box></TableCell>
                  <TableCell>{c.productCount}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <IconButton aria-label={`Edit ${c.name}`} color="primary" onClick={() => setModal({ category: c })}><EditIcon /></IconButton>
                    <IconButton aria-label={`Delete ${c.name}`} color="error" onClick={() => remove(c)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <CategoryDialog show={modal !== null} category={modal?.category ?? null} onClose={() => setModal(null)}
                      onSaved={() => { setModal(null); cats.reload(); }} />
    </>
  );
}
