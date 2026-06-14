"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CreditCard } from "lucide-react";
import { formatINR } from "@/lib/money";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

const RZP_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = RZP_CHECKOUT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function BuyPinForm({ pricePerPinPaise }: { pricePerPinPaise: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("1");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const qInt = Math.max(1, Math.min(100, parseInt(quantity || "1", 10) || 1));
  const totalPaise = qInt * pricePerPinPaise;

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const q = parseInt(quantity, 10);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Enter a valid number of pins");
      return;
    }
    if (q > 100) {
      toast.error("Max 100 pins per purchase");
      return;
    }
    if (!/^[0-9]{10}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    const sdkOk = await loadRazorpay();
    if (!sdkOk) {
      setLoading(false);
      toast.error("Could not load Razorpay checkout");
      return;
    }

    const createRes = await fetch("/api/pin-purchases/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: q, mobileNumber: mobile }),
    });
    const create = await createRes.json();
    if (!createRes.ok) {
      setLoading(false);
      toast.error(create.error || "Could not start payment");
      return;
    }

    const rzp = new window.Razorpay!({
      key: create.razorpayKeyId,
      amount: create.amount,
      currency: create.currency,
      name: "AchtMart",
      description: `${create.quantity} pin${create.quantity === 1 ? "" : "s"} purchase`,
      order_id: create.razorpayOrderId,
      prefill: create.prefill,
      theme: { color: "#0f766e" },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const verifyRes = await fetch("/api/pin-purchases/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchaseId: create.purchaseId,
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          }),
        });
        const verify = await verifyRes.json();
        setLoading(false);
        if (!verifyRes.ok) {
          toast.error(verify.error || "Payment verification failed");
          return;
        }
        toast.success(`Payment successful — ${verify.pinsIssued} pin${verify.pinsIssued === 1 ? "" : "s"} added to your account`);
        setQuantity("1");
        setMobile("");
        router.refresh();
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    });
    rzp.open();
  }

  return (
    <form onSubmit={pay} className="p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Number of pins</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="100"
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">{formatINR(pricePerPinPaise)} per pin. Max 100.</p>
        </div>
        <div>
          <label className="label">Mobile number <span className="text-red-600">*</span></label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            className="input font-mono"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="10-digit mobile"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Used for the payment receipt.</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-amber-200 px-4 py-3">
        <div className="text-sm">
          <div className="text-muted-foreground text-xs">Total payable</div>
          <div className="font-bold text-lg tabular-nums">{formatINR(totalPaise)}</div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold disabled:opacity-60"
        >
          <CreditCard className="h-4 w-4" />
          {loading ? "Processing…" : `Pay & get ${qInt} pin${qInt === 1 ? "" : "s"}`}
        </button>
      </div>
    </form>
  );
}
