"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import toast from "react-hot-toast";
import { useCart } from "@/components/cart-provider";
import { formatINR } from "@/lib/money";
import { CheckCircle2, MapPin, Pencil, Truck } from "lucide-react";

export type SavedAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function CheckoutForm({
  savedAddress,
  userName,
  userEmail,
  userPhone,
}: {
  savedAddress: SavedAddress | null;
  userName: string;
  userEmail: string;
  userPhone: string;
}) {
  const { items, subtotal, clear, hydrated } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Two modes: "confirm" (show the saved address with a confirm/edit toggle)
  // or "edit" (raw form). If no saved address exists, start in edit mode.
  const [mode, setMode] = useState<"confirm" | "edit">(savedAddress ? "confirm" : "edit");

  const [shipping, setShipping] = useState<SavedAddress>(
    savedAddress ?? {
      fullName: userName,
      phone: userPhone,
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
    },
  );

  // Re-seed full name from the user's profile if we don't have one yet.
  useEffect(() => {
    setShipping((s) => ({ ...s, fullName: s.fullName || userName, phone: s.phone || userPhone }));
  }, [userName, userPhone]);

  if (!hydrated) return <div className="container-page">Loading…</div>;
  if (items.length === 0) {
    return (
      <div className="container-page max-w-xl">
        <div className="card p-8 text-center">
          <p>Your cart is empty.</p>
          <button onClick={() => router.push("/products")} className="btn-primary mt-4">Shop products</button>
        </div>
      </div>
    );
  }

  async function placeOrder() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not place order");
        setLoading(false);
        return;
      }

      if (!window.Razorpay) {
        toast.error("Payment SDK not loaded. Please reload.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "ACHT MART",
        description: `Order ${data.orderNumber}`,
        order_id: data.razorpayOrderId,
        prefill: { name: shipping.fullName, email: userEmail, contact: shipping.phone },
        theme: { color: "#298143" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/orders/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const v = await verifyRes.json();
          if (!verifyRes.ok) {
            toast.error(v.error || "Payment verification failed");
            return;
          }
          clear();
          toast.success("Order placed — delivery date will be updated soon", { duration: 5000 });
          router.push(`/account/orders/${v.orderId}?ok=1`);
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
      setLoading(false);
    }
  }

  function onConfirm() {
    // Quick local sanity check before opening Razorpay.
    if (!shipping.fullName || !shipping.phone || !shipping.line1 || !shipping.city || !shipping.state || !shipping.pincode) {
      toast.error("Please fill the shipping address completely");
      setMode("edit");
      return;
    }
    placeOrder();
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <div className="container-page grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <h1 className="text-2xl font-bold">Checkout</h1>

          {/* ===== Saved address confirm mode ===== */}
          {mode === "confirm" && savedAddress && (
            <div className="card overflow-hidden">
              <div className="p-5 border-b bg-emerald-50/40 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Deliver to this address?</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      We&apos;ve filled in your saved address. Tap edit to change it.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMode("edit")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white border hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
              <div className="p-5 text-sm space-y-1">
                <div className="font-semibold">{shipping.fullName}</div>
                <div className="text-muted-foreground">{shipping.phone}</div>
                <div>{shipping.line1}{shipping.line2 ? `, ${shipping.line2}` : ""}</div>
                <div>{shipping.city}, {shipping.state} — <span className="font-mono">{shipping.pincode}</span></div>
              </div>
              <div className="p-5 border-t flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Address looks correct?
                </span>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? "Processing…" : `Yes, place order for ${formatINR(subtotal)}`}
                </button>
              </div>
            </div>
          )}

          {/* ===== Edit / new-address form ===== */}
          {mode === "edit" && (
            <form
              onSubmit={(e) => { e.preventDefault(); onConfirm(); }}
              className="card p-5 space-y-4"
            >
              <h2 className="font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-brand-600" /> Shipping address
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name" value={shipping.fullName} onChange={(v) => setShipping({ ...shipping, fullName: v })} required />
                <Field label="Phone" value={shipping.phone} onChange={(v) => setShipping({ ...shipping, phone: v.replace(/\D/g, "") })} required maxLength={10} pattern="[6-9][0-9]{9}" />
              </div>
              <Field label="Address line 1" value={shipping.line1} onChange={(v) => setShipping({ ...shipping, line1: v })} required />
              <Field label="Address line 2 (optional)" value={shipping.line2} onChange={(v) => setShipping({ ...shipping, line2: v })} />
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="City" value={shipping.city} onChange={(v) => setShipping({ ...shipping, city: v })} required />
                <Field label="State" value={shipping.state} onChange={(v) => setShipping({ ...shipping, state: v })} required />
                <Field label="PIN code" value={shipping.pincode} onChange={(v) => setShipping({ ...shipping, pincode: v.replace(/\D/g, "") })} required maxLength={6} pattern="\d{6}" />
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                {savedAddress && (
                  <button
                    type="button"
                    onClick={() => { setShipping(savedAddress); setMode("confirm"); }}
                    className="text-xs text-brand-700 hover:underline"
                  >
                    ← Use my saved address
                  </button>
                )}
                <button type="submit" disabled={loading} className="ml-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold disabled:opacity-60">
                  {loading ? "Processing…" : `Place order — ${formatINR(subtotal)}`}
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                By placing this order you agree to our Terms &amp; 30-day buyback policy.
                Once payment is confirmed your order goes to admin and a delivery date will be updated shortly.
              </p>
            </form>
          )}
        </div>

        {/* ===== Order summary ===== */}
        <aside className="card p-6 h-fit sticky top-20">
          <h2 className="font-semibold mb-3">Order Summary</h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between">
                <span className="flex-1 min-w-0 truncate">{i.name} × {i.quantity}</span>
                <span className="ml-2 font-medium">{formatINR(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t mt-3 pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            After payment, you&apos;ll see <strong>&ldquo;Order placed successfully&rdquo;</strong>.
            Admin reviews and updates the delivery date shortly.
          </p>
        </aside>
      </div>
    </>
  );
}

function Field({
  label, value, onChange, required, pattern, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; pattern?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        pattern={pattern}
        maxLength={maxLength}
      />
    </div>
  );
}
