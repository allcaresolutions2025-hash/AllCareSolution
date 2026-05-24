"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatINR } from "@/lib/money";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { items, subtotal, setQty, remove, hydrated, count } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  if (!hydrated) {
    return <div className="container-page">Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-page max-w-xl">
        <div className="card p-12 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="text-muted-foreground mt-2">
            Browse our wellness collection and add your favourites.
          </p>
          <Link href="/products" className="btn-primary mt-6">
            Shop products
          </Link>
        </div>
      </div>
    );
  }

  function goToCheckout() {
    if (!session) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
      return;
    }
    router.push("/checkout");
  }

  return (
    <div className="container-page grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-3">
        <h1 className="text-2xl font-bold mb-2">Your Cart ({count})</h1>
        {items.map((it) => (
          <div key={it.productId} className="card p-4 flex gap-4">
            <div className="h-24 w-24 shrink-0 bg-brand-50 rounded-md overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/products/${it.slug}`} className="font-semibold hover:text-brand-700">
                {it.name}
              </Link>
              <div className="text-sm text-muted-foreground">{formatINR(it.price)} each</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="inline-flex items-center rounded-md border">
                  <button
                    onClick={() => setQty(it.productId, it.quantity - 1)}
                    className="px-2 py-1 hover:bg-muted"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{it.quantity}</span>
                  <button
                    onClick={() => setQty(it.productId, it.quantity + 1)}
                    className="px-2 py-1 hover:bg-muted"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => remove(it.productId)}
                  className="text-red-600 text-sm inline-flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{formatINR(it.price * it.quantity)}</div>
            </div>
          </div>
        ))}
      </div>

      <aside className="card p-6 h-fit sticky top-20">
        <h2 className="font-semibold mb-4">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <Row label="Subtotal" value={formatINR(subtotal)} />
          <Row label="Shipping" value="Calculated at checkout" />
          <Row label="GST" value="Inclusive" />
          <div className="border-t pt-3 flex justify-between font-bold text-base">
            <span>Total</span>
            <span>{formatINR(subtotal)}</span>
          </div>
        </div>
        <button onClick={goToCheckout} className="btn-primary w-full mt-6">
          Proceed to Checkout
        </button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Secure payment via Razorpay · 30-day buyback guarantee
        </p>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
