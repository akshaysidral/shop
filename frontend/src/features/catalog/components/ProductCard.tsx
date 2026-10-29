import { useState } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { Product } from "../../../api";
import { useCart } from "../../../CartContext";
import { AddToCartIcon, SparkIcon } from "../../../icons";
import PriceTag from "../../../components/PriceTag";
import ProductImage from "../../../components/ProductImage";
import styles from "./ProductCard.module.css";

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
    <Card variant="outlined" className={styles.card} sx={{ "&:hover": { boxShadow: 6 } }}>
      <Box component={NextLink} href={`/product/${product.id}`} className={styles.productLink}>
        {product.discountPercent > 0 && (
          <Box component="span" className={styles.discountBadge}>
            -{product.discountPercent}%
          </Box>
        )}
        <ProductImage name={product.name} src={product.imageUrl} />
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle1" component="h3" className={styles.productName}>
            {product.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" className={styles.sellerName}>Sold by {product.sellerName}</Typography>
          <PriceTag product={product} />
          {product.offerName && (
            <Typography variant="caption" className={styles.offerName}>
              <SparkIcon sx={{ fontSize: 14 }} />{product.offerName}
            </Typography>
          )}
          {out && <Typography variant="caption" color="error" className={styles.stockMessage}>Currently unavailable</Typography>}
          {!out && product.stock <= 5 && (
            <Typography variant="caption" color="error" className={styles.stockMessage}>Only {product.stock} left</Typography>
          )}
        </CardContent>
      </Box>
      <CardActions className={styles.actions}>
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
