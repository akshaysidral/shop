import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Product } from "../api";
import { money } from "../format";

export default function PriceTag({ product, large = false }: {
  product: Pick<Product, "price" | "finalPrice" | "discountPercent">;
  large?: boolean;
}) {
  const onOffer = product.discountPercent > 0;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 1 }}>
      <Typography component="span" data-testid="final-price" sx={{ fontWeight: 700, fontSize: large ? "2rem" : "1.2rem" }}>
        {money(product.finalPrice)}
      </Typography>
      {onOffer && (
        <>
          <Typography component="span" data-testid="list-price" sx={{ textDecoration: "line-through", color: "text.secondary", fontSize: "0.9rem" }}>
            {money(product.price)}
          </Typography>
          <Typography component="span" sx={{ color: "success.main", fontWeight: 600, fontSize: "0.85rem" }}>
            {product.discountPercent}% off
          </Typography>
        </>
      )}
    </Box>
  );
}
