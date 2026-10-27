import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import type { Category, Product } from "./api";
import CategoryIcon from "./components/CategoryIcon";
import HeroBanner from "./components/HeroBanner";
import Loading from "./components/Loading";
import OfferStrip from "./components/OfferStrip";
import ProductCard from "./components/ProductCard";
import SelectField from "./components/SelectField";
import { money } from "./format";
import { useFetch } from "./useFetch";

type Sort = "relevance" | "priceAsc" | "priceDesc" | "discount" | "name";

const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
  { value: "name", label: "Name: A to Z" },
];

export default function ProductList() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const category = params.get("category");

  const productsReq = useFetch<Product[]>("/products", {
    q: q || undefined,
    categoryId: category ? Number(category) : undefined,
  });
  const categoriesReq = useFetch<Category[]>("/categories");
  const products = useMemo(() => productsReq.data ?? [], [productsReq.data]);
  const categories = categoriesReq.data ?? [];

  const [sort, setSort] = useState<Sort>("relevance");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);

  useEffect(() => { setMaxPrice(null); }, [products]);

  const ceiling = useMemo(() => products.reduce((m, p) => Math.max(m, p.finalPrice), 0), [products]);
  const limit = maxPrice ?? ceiling;

  const visible = useMemo(() => {
    const list = products.filter((p) =>
      p.finalPrice <= limit && (!inStockOnly || p.stock > 0) && (!dealsOnly || p.discountPercent > 0));
    if (sort === "priceAsc") return [...list].sort((a, b) => a.finalPrice - b.finalPrice);
    if (sort === "priceDesc") return [...list].sort((a, b) => b.finalPrice - a.finalPrice);
    if (sort === "discount") return [...list].sort((a, b) => b.discountPercent - a.discountPercent);
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, limit, inStockOnly, dealsOnly, sort]);

  function pickCategory(id: number | null) {
    const next = new URLSearchParams(params.toString());
    if (id === null) next.delete("category"); else next.set("category", String(id));
    const query = next.toString();
    router.push(query ? `/?${query}` : "/");
  }

  const activeCategory = categories.find((c) => String(c.id) === category);
  const heading = q ? `Results for "${q}"` : activeCategory ? activeCategory.name : "All products";

  return (
    <>
      <OfferStrip />
      {!q && !category && <HeroBanner />}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "270px 1fr" } }}>
        <Stack spacing={2} sx={{ alignSelf: "start" }}>
          <Paper variant="outlined">
            <Typography variant="overline" sx={{ display: "block", px: 2, pt: 1.5, fontWeight: 700 }}>Categories</Typography>
            <List dense disablePadding>
              <ListItemButton selected={!category} onClick={() => pickCategory(null)}>
                <ListItemText primary="All categories" />
              </ListItemButton>
              {categories.map((c) => (
                <ListItemButton key={c.id} selected={category === String(c.id)} onClick={() => pickCategory(c.id)}>
                  <ListItemIcon sx={{ minWidth: 36 }}><CategoryIcon icon={c.icon} fontSize="small" /></ListItemIcon>
                  <ListItemText primary={c.name} />
                  <Typography variant="caption" color="text.secondary">{c.productCount}</Typography>
                </ListItemButton>
              ))}
            </List>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline" sx={{ fontWeight: 700 }}>Filters</Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <SelectField id="sort" label="Sort by" value={sort} onChange={(v) => setSort(v as Sort)} options={SORTS} />
              <Box>
                <Typography id="max-price-label" variant="body2">Max price: {money(limit)}</Typography>
                <Slider
                  aria-labelledby="max-price-label"
                  min={0}
                  max={ceiling}
                  value={limit}
                  disabled={ceiling === 0}
                  onChange={(_, v) => setMaxPrice(v as number)}
                />
              </Box>
              <FormControlLabel control={<Switch checked={dealsOnly} onChange={(e) => setDealsOnly(e.target.checked)} />} label="On offer only" />
              <FormControlLabel control={<Switch checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />} label="Hide out of stock" />
            </Stack>
          </Paper>
        </Stack>

        <Box id="products" sx={{ minWidth: 0 }}>
          <Paper variant="outlined" sx={{ px: 2, py: 1, mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>{heading}</Typography>
            {!productsReq.loading && !productsReq.error && (
              <Typography variant="body2" color="text.secondary">{visible.length} items</Typography>
            )}
          </Paper>

          {productsReq.loading ? (
            <Loading />
          ) : productsReq.error ? (
            <Alert severity="error">Could not load products. Is the backend running?</Alert>
          ) : visible.length === 0 ? (
            <Alert severity="info">No products match your search or filters.</Alert>
          ) : (
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" } }}>
              {visible.map((p) => <ProductCard key={p.id} product={p} />)}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
