/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import type { Product } from "./api";

export type CartLine = { product: Product; quantity: number };

type CartCtx = {
  lines: CartLine[];
  add: (p: Product, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  total: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartCtx>(() => ({
    lines,
    add: (p, qty = 1) =>
      setLines((ls) => {
        if (p.stock <= 0) return ls;
        const found = ls.find((l) => l.product.id === p.id);
        const next = Math.min((found?.quantity ?? 0) + qty, p.stock);   // never exceed stock
        if (found) return ls.map((l) => (l.product.id === p.id ? { ...l, quantity: next } : l));
        return [...ls, { product: p, quantity: next }];
      }),
    setQty: (id, qty) =>
      setLines((ls) =>
        qty < 1
          ? ls.filter((l) => l.product.id !== id)
          : ls.map((l) => (l.product.id === id ? { ...l, quantity: Math.min(qty, l.product.stock) } : l))),
    remove: (id) => setLines((ls) => ls.filter((l) => l.product.id !== id)),
    clear: () => setLines([]),
    total: lines.reduce((s, l) => s + l.product.finalPrice * l.quantity, 0),
    count: lines.reduce((s, l) => s + l.quantity, 0),
  }), [lines]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
