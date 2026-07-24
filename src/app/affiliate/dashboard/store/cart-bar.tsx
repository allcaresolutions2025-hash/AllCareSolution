"use client";

import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatINR } from "@/lib/money";

// Sticky bottom bar shown on the catalog once the cart has items — a quick,
// always-visible path to review the cart and check out.
export function CartBar() {
  const { count, subtotal, hydrated } = useCart();
  if (!hydrated || count === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 mt-6">
      <Link
        href="/affiliate/dashboard/store/cart"
        className="flex items-center justify-between gap-4 rounded-xl bg-brand-700 text-white px-5 py-3 shadow-lg hover:bg-brand-800 transition"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full bg-white text-brand-800 text-[10px] font-bold grid place-items-center">
              {count}
            </span>
          </span>
          View cart · {formatINR(subtotal)}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold">
          Checkout <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}
