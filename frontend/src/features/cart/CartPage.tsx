import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "../../api";
import { BuyButton } from "../../components/Buttons";
import PriceTag from "../../components/PriceTag";
import ProductImage from "../../components/ProductImage";
import { useCart } from "../../CartContext";
import { AddIcon, DeleteIcon, EmptyCartIcon, RemoveIcon } from "../../icons";
import { money } from "../../format";

export default function CartPage() {
  const { lines, setQty, remove, clear, total, count } = useCart();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const listTotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const savings = listTotal - total;

  async function checkout() {
    if (!localStorage.getItem("token")) return router.push("/login?from=%2Fcart");
    setBusy(true);
    try {
      await api.post("/orders", { items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })) });
      clear();
      router.push("/orders");
    } catch (e) {
      setMsg(errMsg(e, "Checkout failed"));
    } finally {
      setBusy(false);
    }
  }

  if (lines.length === 0) {
    return (
      <Paper variant="outlined" sx={{ textAlign: "center", py: 8 }}>
        <EmptyCartIcon sx={{ fontSize: 64, color: "text.disabled" }} />
        <Typography variant="h5" component="h1" sx={{ mt: 1 }}>Your cart is empty</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Add items to it now.</Typography>
        <Button component={NextLink} href="/" variant="contained">Shop now</Button>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" } }}>
      <Paper variant="outlined">
        <Typography variant="h6" component="h1" sx={{ fontWeight: 700, p: 2 }}>My Cart ({count})</Typography>
        <Divider />
        <List disablePadding>
          {lines.map((l) => (
            <ListItem key={l.product.id} divider sx={{ gap: 2, alignItems: "center" }}>
              <ProductImage name={l.product.name} src={l.product.imageUrl} size="sm" />
              <Box sx={{ flexGrow: 1 }}>
                <Link component={NextLink} href={`/product/${l.product.id}`} underline="hover" sx={{ fontWeight: 600 }}>{l.product.name}</Link>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Sold by {l.product.sellerName}</Typography>
                <PriceTag product={l.product} />
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                <Box role="group" aria-label={`Quantity for ${l.product.name}`} sx={{ display: "flex", alignItems: "center" }}>
                  <IconButton size="small" aria-label="Decrease quantity" onClick={() => setQty(l.product.id, l.quantity - 1)}><RemoveIcon fontSize="small" /></IconButton>
                  <Typography component="span" sx={{ minWidth: 28, textAlign: "center" }} data-testid={`qty-${l.product.id}`}>{l.quantity}</Typography>
                  <IconButton size="small" aria-label="Increase quantity" disabled={l.quantity >= l.product.stock}
                              onClick={() => setQty(l.product.id, l.quantity + 1)}><AddIcon fontSize="small" /></IconButton>
                </Box>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => remove(l.product.id)}>Remove</Button>
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, alignSelf: "start", position: { md: "sticky" }, top: 88 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Price details</Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          <span>Price ({count} {count === 1 ? "item" : "items"})</span><span>{money(listTotal)}</span>
        </Box>
        {savings > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", color: "success.main", mt: 1 }}>
            <span>Offer discount</span><span>- {money(savings)}</span>
          </Box>
        )}
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.15rem", mb: 1 }}>
          <span>Total amount</span><span>{money(total)}</span>
        </Box>
        {savings > 0 && <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>You will save {money(savings)} on this order</Typography>}
        {msg && <Alert severity="error" sx={{ mb: 1 }}>{msg}</Alert>}
        <BuyButton fullWidth variant="contained" size="large" onClick={checkout} disabled={busy}>
          {busy ? "Placing order..." : "Place order"}
        </BuyButton>
      </Paper>
    </Box>
  );
}
