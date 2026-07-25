"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ChevronRight, X, Minus, Plus, ShoppingCart, Check, PackageX } from "lucide-react";
import { useCart, type CartLine } from "@/components/cart-provider";
import { formatINR } from "@/lib/money";

export type CatalogItem = {
  id: string;
  slug: string;
  displayName: string;
  shortDesc: string;
  price: number; // paise
  mrp: number;   // paise
  imageUrl: string;
  stock: number;
};

export type CatalogCategory = {
  key: string;
  title: string;
  items: CatalogItem[];
};

// The catalog as a clickable list of category fields (Wellness, and each
// grocery sub-category). Tapping one opens a list of its products where the
// member sets a quantity and adds to cart, without leaving the page.
export function CategoryList({ categories }: { categories: CatalogCategory[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openCategory = categories.find((c) => c.key === openKey) ?? null;

  return (
    <div className="card divide-y overflow-hidden">
      {categories.map((cat) => {
        const inStock = cat.items.filter((i) => i.stock > 0).length;
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => setOpenKey(cat.key)}
            className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-muted transition"
          >
            <div>
              <div className="font-semibold">{cat.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {cat.items.length} item{cat.items.length === 1 ? "" : "s"}
                {inStock < cat.items.length && ` · ${inStock} in stock`}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        );
      })}

      {openCategory && (
        <CategoryModal category={openCategory} onClose={() => setOpenKey(null)} />
      )}
    </div>
  );
}

function CategoryModal({ category, onClose }: { category: CatalogCategory; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden shadow-card flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="font-bold text-lg">{category.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {category.items.length} item{category.items.length === 1 ? "" : "s"} — pick a quantity and add to cart
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto divide-y">
          {category.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemRow({ item }: { item: CatalogItem }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const outOfStock = item.stock <= 0;

  function changeQty(delta: number) {
    setQty((q) => Math.max(1, Math.min(item.stock, q + delta)));
  }

  function addToCart() {
    const line: CartLine = {
      productId: item.id,
      slug: item.slug,
      name: item.displayName,
      price: item.price,
      imageUrl: item.imageUrl,
      quantity: qty,
      stock: item.stock,
    };
    add(line);
    toast.success(`Added ${qty} × ${item.displayName} to cart`);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div className="p-4 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm truncate">{item.displayName}</div>
        <div className="text-xs text-muted-foreground truncate">{item.shortDesc}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold text-brand-700">{formatINR(item.price)}</span>
          {item.mrp > item.price && (
            <span className="text-xs text-muted-foreground line-through">{formatINR(item.mrp)}</span>
          )}
        </div>
      </div>

      {outOfStock ? (
        <span className="badge-red inline-flex items-center gap-1 shrink-0">
          <PackageX className="h-3.5 w-3.5" /> Out of stock
        </span>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center rounded-md border">
            <button
              type="button"
              onClick={() => changeQty(-1)}
              className="px-2 py-1.5 hover:bg-muted disabled:opacity-40"
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-sm font-medium tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => changeQty(1)}
              className="px-2 py-1.5 hover:bg-muted disabled:opacity-40"
              disabled={qty >= item.stock}
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={addToCart}
            aria-label={`Add ${item.displayName} to cart`}
            className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-brand-600 text-white hover:bg-brand-700"
          >
            {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
