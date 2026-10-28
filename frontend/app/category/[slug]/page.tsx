"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ProductList from "../../../src/features/catalog/ProductList";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  return <Suspense fallback={null}><ProductList categorySlug={params.slug} /></Suspense>;
}
