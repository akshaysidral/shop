"use client";

import { Suspense } from "react";
import ProductList from "../src/ProductList";

export default function HomePage() {
  return <Suspense fallback={null}><ProductList /></Suspense>;
}
