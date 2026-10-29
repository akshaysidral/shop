import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Product } from "../../api";
import { useFetch } from "../../useFetch";

export type CatalogSort = "relevance" | "priceAsc" | "priceDesc" | "discount" | "name";

export function useCatalog(categorySlug?: string) {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get("q") ?? "";
  const legacyCategory = params.get("category");
  const categoriesRequest = useFetch<Category[]>("/categories");
  const categories = categoriesRequest.data ?? [];
  const activeCategory = categories.find((category) => categorySlug
    ? category.slug === categorySlug
    : String(category.id) === legacyCategory);
  const resolvingCategory = !!categorySlug
    && (categoriesRequest.loading || !!categoriesRequest.error || !activeCategory);
  const categoryId = categorySlug
    ? activeCategory?.id
    : legacyCategory
      ? Number(legacyCategory)
      : undefined;
  const productsRequest = useFetch<Product[]>(resolvingCategory ? null : "/products", {
    q: query || undefined,
    categoryId,
  });
  const products = useMemo(() => productsRequest.data ?? [], [productsRequest.data]);
  const [sort, setSort] = useState<CatalogSort>("relevance");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);

  useEffect(() => { setMaxPrice(null); }, [products]);

  const priceCeiling = useMemo(
    () => products.reduce((maximum, product) => Math.max(maximum, product.finalPrice), 0),
    [products],
  );
  const priceLimit = maxPrice ?? priceCeiling;
  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) =>
      product.finalPrice <= priceLimit
      && (!inStockOnly || product.stock > 0)
      && (!dealsOnly || product.discountPercent > 0));

    if (sort === "priceAsc") return [...filtered].sort((a, b) => a.finalPrice - b.finalPrice);
    if (sort === "priceDesc") return [...filtered].sort((a, b) => b.finalPrice - a.finalPrice);
    if (sort === "discount") return [...filtered].sort((a, b) => b.discountPercent - a.discountPercent);
    if (sort === "name") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [products, priceLimit, inStockOnly, dealsOnly, sort]);

  function selectCategory(id: number | null) {
    const next = new URLSearchParams(params.toString());
    next.delete("category");
    const queryString = next.toString();
    const selected = id === null ? undefined : categories.find((category) => category.id === id);
    const destination = selected ? `/category/${selected.slug}` : "/";
    router.push(queryString ? `${destination}?${queryString}` : destination);
  }

  return {
    query,
    categories,
    categoriesRequest,
    activeCategory,
    productsRequest,
    visibleProducts,
    sort,
    setSort,
    maxPrice,
    setMaxPrice,
    inStockOnly,
    setInStockOnly,
    dealsOnly,
    setDealsOnly,
    priceCeiling,
    priceLimit,
    selectCategory,
    isCategorySelected: !!categorySlug || !!legacyCategory,
    isResolvingCategory: resolvingCategory,
  };
}
