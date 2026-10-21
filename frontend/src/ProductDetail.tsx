import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Product } from "./api";
import { BuyButton } from "./components/Buttons";
import Loading from "./components/Loading";
import PriceTag from "./components/PriceTag";
import ProductImage from "./components/ProductImage";
import SelectField from "./components/SelectField";
import { useCart } from "./CartContext";
import { AddToCartIcon, BoltIcon, SparkIcon } from "./icons";
import { useFetch } from "./useFetch";

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add } = useCart();
  const { data: product, loading, error } = useFetch<Product>(`/products/${id}`);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (loading) return <Loading />;
  if (error || !product) {
    return <Alert severity="warning">We could not find this product. <Link component={RouterLink} to="/">Back to shop</Link></Alert>;
  }

  const out = product.stock <= 0;
  const quantities = Array.from({ length: Math.min(product.stock, 10) }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

  return (
    <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" } }}>
      <ProductImage name={product.name} src={product.imageUrl} size="lg" />
      <Box>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1, fontSize: "0.85rem" }}>
          <Link component={RouterLink} to="/" underline="hover">Home</Link>
          {product.categoryId && (
            <Link component={RouterLink} to={`/?category=${product.categoryId}`} underline="hover">{product.categoryName}</Link>
          )}
          <Typography color="text.primary" variant="body2">{product.name}</Typography>
        </Breadcrumbs>

        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>{product.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Sold by <strong>{product.sellerName}</strong></Typography>
        <Box sx={{ my: 1 }}><PriceTag product={product} large /></Box>

        {product.offerName && (
          <Alert severity="warning" icon={<SparkIcon />} sx={{ display: "inline-flex", mb: 2 }}>
            <strong>{product.offerName}</strong>: {product.discountPercent}% off, applied automatically
          </Alert>
        )}

        {out ? (
          <Typography color="error" sx={{ fontWeight: 600, mb: 2 }}>Currently unavailable</Typography>
        ) : product.stock <= 5 ? (
          <Typography color="error" sx={{ fontWeight: 600, mb: 2 }}>Hurry, only {product.stock} left</Typography>
        ) : (
          <Typography color="success.main" sx={{ fontWeight: 600, mb: 2 }}>In stock</Typography>
        )}

        <Typography color="text.secondary" sx={{ mb: 2 }}>{product.description}</Typography>

        {!out && (
          <Box sx={{ maxWidth: 140, mb: 2 }}>
            <SelectField id="qty" label="Quantity" value={qty} onChange={(v) => setQty(Number(v))} options={quantities} />
          </Box>
        )}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <Button
            variant="contained" color="secondary" size="large" disabled={out} startIcon={<AddToCartIcon />}
            onClick={() => { add(product, qty); setAdded(true); window.setTimeout(() => setAdded(false), 1500); }}
          >
            {added ? "Added ✓" : "Add to cart"}
          </Button>
          <BuyButton variant="contained" size="large" disabled={out} startIcon={<BoltIcon />} onClick={() => { add(product, qty); nav("/cart"); }}>
            Buy now
          </BuyButton>
        </Box>
      </Box>
    </Paper>
  );
}
