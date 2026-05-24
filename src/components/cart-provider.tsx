"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  price: number; // paise
  imageUrl: string;
  quantity: number;
  stock: number;
};

type CartCtx = {
  items: CartLine[];
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, q: number) => void;
  clear: () => void;
  hydrated: boolean;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE = "achtmart.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback((line: CartLine) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.productId === line.productId);
      if (existing) {
        const newQty = Math.min(existing.quantity + line.quantity, line.stock);
        return prev.map((p) =>
          p.productId === line.productId ? { ...p, quantity: newQty } : p
        );
      }
      return [...prev, { ...line, quantity: Math.min(line.quantity, line.stock) }];
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const setQty = useCallback((productId: string, q: number) => {
    setItems((prev) =>
      prev
        .map((p) =>
          p.productId === productId
            ? { ...p, quantity: Math.max(1, Math.min(q, p.stock)) }
            : p
        )
        .filter((p) => p.quantity > 0)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, count, subtotal, add, remove, setQty, clear, hydrated }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
