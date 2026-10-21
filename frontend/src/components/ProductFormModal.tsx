import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { api, errMsg } from "../api";
import type { Category, Product } from "../api";
import SelectField from "./SelectField";

type Props = {
  show: boolean;
  product: Product | null;            // null = add a new product
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

const BLANK = { name: "", description: "", price: "", stock: "", categoryId: "", imageUrl: "" };

export default function ProductFormModal({ show, product, categories, onClose, onSaved }: Props) {
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setError("");
    setForm(product
      ? {
          name: product.name,
          description: product.description ?? "",
          price: String(product.price),
          stock: String(product.stock),
          categoryId: product.categoryId ? String(product.categoryId) : "",
          imageUrl: product.imageUrl ?? "",
        }
      : BLANK);
  }, [show, product]);

  const text = (k: keyof typeof BLANK) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim()) return setError("Name is required");
    if (!(price > 0)) return setError("Price must be greater than 0");
    if (form.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) return setError("Stock must be a whole number, 0 or more");
    setBusy(true);
    const body = {
      name: form.name.trim(),
      description: form.description,
      price,
      stock,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      imageUrl: form.imageUrl.trim() || null,
    };
    try {
      if (product) await api.put(`/products/${product.id}`, body);
      else await api.post("/products", body);
      onSaved();
    } catch (err) {
      setError(errMsg(err, "Could not save the product"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField id="pf-name" label="Name" value={form.name} onChange={text("name")} />
            <TextField id="pf-desc" label="Description" multiline minRows={3} value={form.description} onChange={text("description")} />
            <Stack direction="row" spacing={2}>
              <TextField id="pf-price" label="Price (INR)" type="number" fullWidth value={form.price} onChange={text("price")}
                         slotProps={{ htmlInput: { min: 0, step: "0.01" } }} />
              <TextField id="pf-stock" label="Stock" type="number" fullWidth value={form.stock} onChange={text("stock")}
                         slotProps={{ htmlInput: { min: 0, step: "1" } }} />
            </Stack>
            <SelectField id="pf-cat" label="Category" size="medium" value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })}
                         options={[{ value: "", label: "No category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
            <TextField id="pf-img" label="Image URL (optional)" placeholder="https://..." value={form.imageUrl} onChange={text("imageUrl")} />
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
