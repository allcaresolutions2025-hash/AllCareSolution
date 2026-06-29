"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound, ShoppingCart } from "lucide-react";

// Buy Pro Max pins using Pin Wallet points. pricePerPin / balance are in points.
export function BuyPinsForm({
  pricePerPin,
  offlinePrice,
  balance,
}: {
  pricePerPin: number;
  offlinePrice: number;
  balance: number;
}) {
  const router = useRouter();
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const quantity = Math.max(0, parseInt(qty, 10) || 0);
  const total = quantity * pricePerPin;
  const affordable = Math.floor(balance / pricePerPin);
  const canBuy = quantity >= 1 && total <= balance;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (quantity < 1) return toast.error("Enter a quantity");
    if (total > balance) return toast.error("Not enough Pin Wallet points");
    setBusy(true);
    const res = await fetch("/api/promax/pin-wallet/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Could not buy pins"); return; }
    toast.success(`Bought ${json.pinsIssued} Pro Max pin${json.pinsIssued === 1 ? "" : "s"}`);
    setQty("1");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4 border-promax-200">
      <div className="flex items-center gap-2 text-promax-700">
        <ShoppingCart className="h-4 w-4" /> <h2 className="font-semibold">Buy Pro Max pins with points</h2>
      </div>

      <div className="rounded-lg bg-promax-50 border border-promax-200 px-4 py-3 text-xs text-promax-900 flex flex-wrap gap-x-6 gap-y-1">
        <span>Pin Wallet price: <strong>{pricePerPin.toLocaleString("en-IN")} pts / pin</strong></span>
        <span className="text-muted-foreground">Offline (cash) price: {offlinePrice.toLocaleString("en-IN")} pts / pin</span>
        <span>You can afford <strong>{affordable.toLocaleString("en-IN")}</strong> pin{affordable === 1 ? "" : "s"}</span>
      </div>

      <div className="grid sm:grid-cols-[160px_1fr] gap-4 items-end">
        <div>
          <label className="label">Quantity</label>
          <input
            type="text"
            inputMode="numeric"
            className="input tabular-nums"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={() => setQty((q) => String(Math.min(100, Math.max(1, parseInt(q, 10) || 1))))}
          />
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground text-xs">Total cost</div>
          <div className={`text-2xl font-bold tabular-nums ${total > balance ? "text-red-600" : "text-promax-700"}`}>
            {total.toLocaleString("en-IN")} <span className="text-sm font-normal text-muted-foreground">pts</span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy || !canBuy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" /> {busy ? "Buying…" : `Buy ${quantity || ""} pin${quantity === 1 ? "" : "s"}`.trim()}
      </button>
    </form>
  );
}
