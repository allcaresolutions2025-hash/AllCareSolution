"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { useCart, type CartLine } from "@/components/cart-provider";
import { formatINR } from "@/lib/money";

type ProductCardData = {
  id: string;
  slug: string;
  // Display name already resolved to the member's language (English fallback).
  displayName: string;
  shortDesc: string;
  price: number; // paise
  mrp: number;   // paise
  imageUrl: string;
  stock: number;
};

// One product tile on the single-page catalog: image, price, a quantity stepper
// and an "Add to cart" button. Quantity is clamped to available stock.
export function ProductCard({ product }: { product: ProductCardData }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const outOfStock = product.stock <= 0;

  function changeQty(delta: number) {
    setQty((q) => Math.max(1, Math.min(product.stock, q + delta)));
  }

  function addToCart() {
    const line: CartLine = {
      productId: product.id,
      slug: product.slug,
      name: product.displayName,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: qty,
      stock: product.stock,
    };
    add(line);
    toast.success(`Added ${qty} × ${product.displayName} to cart`);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  // Products without a real photo (e.g. the grocery range) show no image box —
  // just the name and details. The old SVG placeholder counts as "no image".
  const hasImage = !!product.imageUrl && !product.imageUrl.startsWith("data:image/svg");

  return (
    <div className="card overflow-hidden flex flex-col">
      {hasImage && (
        <div className="aspect-square bg-brand-50 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.displayName} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold line-clamp-2">{product.displayName}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2.5em]">
          {product.shortDesc}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-brand-700">{formatINR(product.price)}</span>
          {product.mrp > product.price && (
            <span className="text-xs text-muted-foreground line-through">{formatINR(product.mrp)}</span>
          )}
        </div>

        {outOfStock ? (
          <div className="mt-3">
            <span className="badge-red">Out of stock</span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border shrink-0">
              <button
                type="button"
                onClick={() => changeQty(-1)}
                className="px-2 py-1.5 hover:bg-muted disabled:opacity-40"
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => changeQty(1)}
                className="px-2 py-1.5 hover:bg-muted disabled:opacity-40"
                disabled={qty >= product.stock}
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={addToCart}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              {justAdded ? "Added" : "Add to cart"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
