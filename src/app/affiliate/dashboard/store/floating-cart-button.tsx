"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Minus, Plus, Trash2, ArrowRight, Package } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatINR } from "@/lib/money";

const hasImage = (url: string) => !!url && !url.startsWith("data:image/svg");

// A floating cart icon (bottom-right, always on top) that replaces the old
// sticky bar. Tapping it opens a slide-over showing everything added so far,
// so the member can review and proceed straight to checkout.
export function FloatingCartButton() {
  const { items, count, subtotal, setQty, remove, hydrated } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!hydrated) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View cart"
        className="fixed bottom-6 right-5 z-30 h-14 w-14 rounded-full bg-brand-700 text-white shadow-lg grid place-items-center hover:bg-brand-800 transition"
      >
        <ShoppingCart className="h-6 w-6" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-[11px] font-bold grid place-items-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={() => setOpen(false)}>
          <div
            className="bg-white w-full max-w-sm h-full overflow-hidden shadow-card flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b flex items-center justify-between shrink-0">
              <h2 className="font-bold text-lg">Your Cart {count > 0 && `(${count})`}</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 grid place-items-center p-8 text-center">
                <div>
                  <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Your cart is empty.</p>
                  <p className="text-xs text-muted-foreground mt-1">Tap a category to add products.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto divide-y">
                  {items.map((it) => (
                    <div key={it.productId} className="p-4 flex gap-3">
                      <div className="h-14 w-14 shrink-0 bg-brand-50 rounded-md overflow-hidden grid place-items-center">
                        {hasImage(it.imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-6 w-6 text-brand-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{it.name}</div>
                        <div className="text-xs text-muted-foreground">{formatINR(it.price)} each</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="inline-flex items-center rounded-md border">
                            <button onClick={() => setQty(it.productId, it.quantity - 1)} className="px-1.5 py-1 hover:bg-muted">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-medium">{it.quantity}</span>
                            <button
                              onClick={() => setQty(it.productId, it.quantity + 1)}
                              className="px-1.5 py-1 hover:bg-muted disabled:opacity-40"
                              disabled={it.quantity >= it.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button onClick={() => remove(it.productId)} className="text-red-600 hover:text-red-700" aria-label="Remove">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm font-semibold shrink-0">{formatINR(it.price * it.quantity)}</div>
                    </div>
                  ))}
                </div>

                <div className="p-5 border-t shrink-0 space-y-3">
                  <div className="flex justify-between font-bold">
                    <span>Subtotal</span>
                    <span>{formatINR(subtotal)}</span>
                  </div>
                  <button
                    onClick={() => { setOpen(false); router.push("/affiliate/dashboard/store/checkout"); }}
                    className="btn-primary w-full inline-flex items-center justify-center gap-2"
                  >
                    Proceed to Checkout <ArrowRight className="h-4 w-4" />
                  </button>
                  <Link
                    href="/affiliate/dashboard/store/cart"
                    onClick={() => setOpen(false)}
                    className="block text-center text-sm text-brand-700 hover:underline"
                  >
                    View full cart
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
