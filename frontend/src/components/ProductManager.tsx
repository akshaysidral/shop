import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "../api";
import type { Category, Product } from "../api";
import { AddIcon, DeleteIcon, EditIcon } from "../icons";
import { useFetch } from "../useFetch";
import Loading from "./Loading";
import PriceTag from "./PriceTag";
import ProductFormModal from "./ProductFormModal";
import ProductImage from "./ProductImage";

/** Table of products with add / edit / delete. `source` decides whose products: "/seller/products" or "/products". */
export default function ProductManager({ source, title, showSeller = false }: { source: string; title: string; showSeller?: boolean }) {
  const list = useFetch<Product[]>(source);
  const cats = useFetch<Category[]>("/categories");
  const [modal, setModal] = useState<{ product: Product | null } | null>(null);
  const [msg, setMsg] = useState("");

  async function remove(p: Product) {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      list.reload();
    } catch (e) {
      setMsg(errMsg(e, "Could not delete the product"));
    }
  }

  const rows = list.data ?? [];
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModal({ product: null })}>Add product</Button>
      </Box>
      {msg && <Alert severity="error" onClose={() => setMsg("")} sx={{ mb: 2 }}>{msg}</Alert>}
      {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
      {list.loading ? <Loading /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>{showSeller && <TableCell>Seller</TableCell>}
                <TableCell>Category</TableCell><TableCell>Price</TableCell><TableCell>Stock</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={showSeller ? 6 : 5} align="center" sx={{ py: 4, color: "text.secondary" }}>No products yet.</TableCell></TableRow>
              )}
              {rows.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <ProductImage name={p.name} src={p.imageUrl} size="sm" />
                      <Typography sx={{ fontWeight: 600 }}>{p.name}</Typography>
                    </Box>
                  </TableCell>
                  {showSeller && <TableCell>{p.sellerName}</TableCell>}
                  <TableCell>{p.categoryName ?? <Typography component="span" color="text.secondary">None</Typography>}</TableCell>
                  <TableCell><PriceTag product={p} /></TableCell>
                  <TableCell sx={p.stock <= 5 ? { color: "error.main", fontWeight: 600 } : undefined}>{p.stock}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <IconButton aria-label={`Edit ${p.name}`} color="primary" onClick={() => setModal({ product: p })}><EditIcon /></IconButton>
                    <IconButton aria-label={`Delete ${p.name}`} color="error" onClick={() => remove(p)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <ProductFormModal
        show={modal !== null}
        product={modal?.product ?? null}
        categories={cats.data ?? []}
        onClose={() => setModal(null)}
        onSaved={() => { setModal(null); list.reload(); }}
      />
    </>
  );
}
