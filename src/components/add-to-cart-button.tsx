"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart, type CartLine } from "./cart-provider";
import { ShoppingCart, Plus, Minus } from "lucide-react";

export function AddToCartButton({ line }: { line: CartLine }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);

  function handleAdd(goToCart = false) {
    add({ ...line, quantity: qty });
    toast.success(`Added ${qty} × ${line.name}`);
    if (goToCart) router.push("/cart");
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="inline-flex items-center rounded-md border">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="px-3 py-2 hover:bg-muted"
          aria-label="decrease"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-12 text-center font-semibold">{qty}</span>
        <button
          onClick={() => setQty((q) => Math.min(line.stock, q + 1))}
          className="px-3 py-2 hover:bg-muted"
          aria-label="increase"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <button onClick={() => handleAdd(false)} className="btn-secondary flex-1">
        <ShoppingCart className="h-4 w-4" /> Add to cart
      </button>
      <button onClick={() => handleAdd(true)} className="btn-primary flex-1">
        Buy now
      </button>
    </div>
  );
}
