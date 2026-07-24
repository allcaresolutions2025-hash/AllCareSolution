"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/components/cart-provider";
import { formatINR } from "@/lib/money";
import { MapPin, Pencil, Truck, Wallet, Banknote, CheckCircle2 } from "lucide-react";

export type SavedAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

type PaymentMethod = "COD" | "WALLET_POINTS";

export function StoreCheckoutForm({
  savedAddress,
  userName,
  userPhone,
  walletBalance,
  shippingCost,
}: {
  savedAddress: SavedAddress | null;
  userName: string;
  userPhone: string;
  walletBalance: number; // paise, payout wallet balanceAvailable
  shippingCost: number;  // paise
}) {
  const { items, subtotal, clear, hydrated } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"confirm" | "edit">(savedAddress ? "confirm" : "edit");
  const [payment, setPayment] = useState<PaymentMethod>("COD");

  const [shipping, setShipping] = useState<SavedAddress>(
    savedAddress ?? {
      fullName: userName, phone: userPhone, line1: "", line2: "", city: "", state: "", pincode: "",
    },
  );

  useEffect(() => {
    setShipping((s) => ({ ...s, fullName: s.fullName || userName, phone: s.phone || userPhone }));
  }, [userName, userPhone]);

  // Cart subtotal is GST-inclusive (product prices include GST). Grand total is
  // that plus shipping — which mirrors the server's totalAmount calculation.
  const total = subtotal + shippingCost;
  const pointsShort = payment === "WALLET_POINTS" && walletBalance < total;

  if (!hydrated) return <div className="text-muted-foreground">Loading…</div>;
  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card p-8 text-center">
          <p>Your cart is empty.</p>
          <button onClick={() => router.push("/affiliate/dashboard/store")} className="btn-primary mt-4">
            Shop products
          </button>
        </div>
      </div>
    );
  }

  function validateAddress(): boolean {
    if (!shipping.fullName || !shipping.phone || !shipping.line1 || !shipping.city || !shipping.state || !shipping.pincode) {
      toast.error("Please fill the shipping address completely");
      setMode("edit");
      return false;
    }
    return true;
  }

  async function placeOrder() {
    if (!validateAddress()) return;
    if (pointsShort) {
      toast.error("Not enough payout wallet points for this order");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod: payment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not place order");
        setLoading(false);
        return;
      }
      clear();
      toast.success("Order placed! Admin will dispatch it shortly.", { duration: 5000 });
      router.push(`/affiliate/dashboard/store/orders/${data.orderId}?ok=1`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold">Checkout</h1>

        {/* Shipping address */}
        {mode === "confirm" && savedAddress ? (
          <div className="card overflow-hidden">
            <div className="p-5 border-b bg-emerald-50/40 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Deliver to this address?</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Tap edit to change it.</p>
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
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); if (validateAddress() && savedAddress) setMode("confirm"); }}
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
            {savedAddress && (
              <button type="submit" className="text-xs text-brand-700 hover:underline">Save address ✓</button>
            )}
          </form>
        )}

        {/* Payment method */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">Payment method</h2>
          <PaymentOption
            active={payment === "COD"}
            onSelect={() => setPayment("COD")}
            icon={<Banknote className="h-5 w-5" />}
            title="Cash on Delivery"
            subtitle="Pay in cash when your order arrives."
          />
          <PaymentOption
            active={payment === "WALLET_POINTS"}
            onSelect={() => setPayment("WALLET_POINTS")}
            icon={<Wallet className="h-5 w-5" />}
            title="Pay with payout wallet points"
            subtitle={`Available balance: ${formatINR(walletBalance)}`}
            warning={pointsShort ? `Short by ${formatINR(total - walletBalance)} — add more or choose COD.` : undefined}
          />
        </div>
      </div>

      {/* Order summary */}
      <aside className="card p-6 h-fit md:sticky md:top-20">
        <h2 className="font-semibold mb-3">Order Summary</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between">
              <span className="flex-1 min-w-0 truncate">{i.name} × {i.quantity}</span>
              <span className="ml-2 font-medium">{formatINR(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal (incl. GST)</span><span className="text-foreground">{formatINR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span><span className="text-foreground">{shippingCost > 0 ? formatINR(shippingCost) : "Free"}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Total</span><span>{formatINR(total)}</span>
          </div>
        </div>

        <button
          onClick={placeOrder}
          disabled={loading || pointsShort}
          className="w-full mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold disabled:opacity-60"
        >
          {loading
            ? "Placing order…"
            : payment === "WALLET_POINTS"
              ? `Pay ${formatINR(total)} with points`
              : `Place COD order — ${formatINR(total)}`}
        </button>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {payment === "WALLET_POINTS" ? "Paid instantly from your payout wallet" : "Cash on Delivery"}
        </p>
      </aside>
    </div>
  );
}

function PaymentOption({
  active, onSelect, icon, title, subtitle, warning,
}: {
  active: boolean; onSelect: () => void; icon: React.ReactNode;
  title: string; subtitle: string; warning?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left flex items-start gap-3 rounded-lg border p-3 transition ${
        active ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200" : "hover:bg-muted"
      }`}
    >
      <div className={`grid h-9 w-9 place-items-center rounded-lg shrink-0 ${active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
        {warning && <div className="text-xs text-amber-700 mt-0.5">{warning}</div>}
      </div>
      <span className={`ml-auto mt-1 h-4 w-4 rounded-full border-2 shrink-0 ${active ? "border-brand-600 bg-brand-600" : "border-slate-300"}`} />
    </button>
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
