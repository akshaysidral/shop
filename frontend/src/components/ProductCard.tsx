import { useState } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { Product } from "../api";
import { useCart } from "../CartContext";
import { AddToCartIcon, SparkIcon } from "../icons";
import PriceTag from "./PriceTag";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }: { product: Product }) {
  const { add, lines } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = lines.find((l) => l.product.id === product.id)?.quantity ?? 0;
  const out = product.stock <= 0;
  const maxed = inCart >= product.stock;

  function onAdd() {
    add(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", transition: "transform .15s, box-shadow .15s",
                                   "&:hover": { transform: "translateY(-3px)", boxShadow: 6 } }}>
      <Box component={NextLink} href={`/product/${product.id}`} sx={{ position: "relative", display: "block", color: "inherit", textDecoration: "none", flexGrow: 1 }}>
        {product.discountPercent > 0 && (
          <Box component="span" sx={{ position: "absolute", top: 8, left: 8, zIndex: 1, bgcolor: "error.main", color: "#fff",
                                      fontWeight: 700, fontSize: "0.78rem", px: 1, py: 0.25, borderRadius: 99 }}>
            -{product.discountPercent}%
          </Box>
        )}
        <ProductImage name={product.name} src={product.imageUrl} />
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 500, minHeight: "2.6em", lineHeight: 1.3,
                                                              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {product.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Sold by {product.sellerName}</Typography>
          <PriceTag product={product} />
          {product.offerName && (
            <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "success.main", fontWeight: 600, mt: 0.5 }}>
              <SparkIcon sx={{ fontSize: 14 }} />{product.offerName}
            </Typography>
          )}
          {out && <Typography variant="caption" color="error" sx={{ display: "block", fontWeight: 600, mt: 0.5 }}>Currently unavailable</Typography>}
          {!out && product.stock <= 5 && (
            <Typography variant="caption" color="error" sx={{ display: "block", fontWeight: 600, mt: 0.5 }}>Only {product.stock} left</Typography>
          )}
        </CardContent>
      </Box>
      <CardActions sx={{ px: 2, pb: 2 }}>
        {out ? (
          <Button fullWidth variant="contained" disabled>Out of stock</Button>
        ) : (
          <Button fullWidth variant="contained" color="secondary" startIcon={<AddToCartIcon />} onClick={onAdd} disabled={maxed}>
            {justAdded ? "Added ✓" : maxed ? "Max in cart" : "Add to cart"}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
