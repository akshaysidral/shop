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
import CategoryIcon from "../../components/CategoryIcon";
import HeroBanner from "../../components/HeroBanner";
import Loading from "../../components/Loading";
import OfferStrip from "../../components/OfferStrip";
import ProductCard from "./components/ProductCard";
import SelectField from "../../components/SelectField";
import { money } from "../../format";
import { useCatalog, type CatalogSort } from "./useCatalog";

type ProductListProps = { categorySlug?: string };

const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
  { value: "name", label: "Name: A to Z" },
];

export default function ProductList({ categorySlug }: ProductListProps) {
  const catalog = useCatalog(categorySlug);
  const heading = catalog.query
    ? `Results for "${catalog.query}"`
    : catalog.activeCategory
      ? catalog.activeCategory.name
      : "All products";

  return (
    <>
      <OfferStrip />
      {!catalog.query && !catalog.isCategorySelected && <HeroBanner />}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "270px 1fr" } }}>
        <Stack spacing={2} sx={{ alignSelf: "start" }}>
          <Paper variant="outlined">
            <Typography variant="overline" sx={{ display: "block", px: 2, pt: 1.5, fontWeight: 700 }}>Categories</Typography>
            <List dense disablePadding>
              <ListItemButton selected={!catalog.isCategorySelected} onClick={() => catalog.selectCategory(null)}>
                <ListItemText primary="All categories" />
              </ListItemButton>
              {catalog.categories.map((c) => (
                <ListItemButton key={c.id} selected={catalog.activeCategory?.id === c.id} onClick={() => catalog.selectCategory(c.id)}>
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
              <SelectField id="sort" label="Sort by" value={catalog.sort} onChange={(v) => catalog.setSort(v as CatalogSort)} options={SORTS} />
              <Box>
                <Typography id="max-price-label" variant="body2">Max price: {money(catalog.priceLimit)}</Typography>
                <Slider
                  aria-labelledby="max-price-label"
                  min={0}
                  max={catalog.priceCeiling}
                  value={catalog.priceLimit}
                  disabled={catalog.priceCeiling === 0}
                  onChange={(_, v) => catalog.setMaxPrice(v as number)}
                />
              </Box>
              <FormControlLabel control={<Switch checked={catalog.dealsOnly} onChange={(e) => catalog.setDealsOnly(e.target.checked)} />} label="On offer only" />
              <FormControlLabel control={<Switch checked={catalog.inStockOnly} onChange={(e) => catalog.setInStockOnly(e.target.checked)} />} label="Hide out of stock" />
            </Stack>
          </Paper>
        </Stack>

        <Box id="products" sx={{ minWidth: 0 }}>
          <Paper variant="outlined" sx={{ px: 2, py: 1, mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>{heading}</Typography>
            {!catalog.isResolvingCategory && !catalog.productsRequest.loading && !catalog.productsRequest.error && (
              <Typography variant="body2" color="text.secondary">{catalog.visibleProducts.length} items</Typography>
            )}
          </Paper>

          {categorySlug && catalog.categoriesRequest.error ? (
            <Alert severity="error">Could not load categories. Please try again.</Alert>
          ) : categorySlug && !catalog.categoriesRequest.loading && !catalog.activeCategory ? (
            <Alert severity="warning">Category not found.</Alert>
          ) : catalog.productsRequest.loading ? (
            <Loading />
          ) : catalog.productsRequest.error ? (
            <Alert severity="error">Could not load products. Is the backend running?</Alert>
          ) : catalog.visibleProducts.length === 0 ? (
            <Alert severity="info">No products match your search or filters.</Alert>
          ) : (
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" } }}>
              {catalog.visibleProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
