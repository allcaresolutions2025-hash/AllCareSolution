"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound, ArrowRightLeft } from "lucide-react";
import { formatPoints } from "@/lib/money";

export function PinWalletActions({
  pinWalletBalance,
  payoutBalance,
  pricePerPin,
  maxBuyable,
}: {
  pinWalletBalance: number;
  payoutBalance: number;
  pricePerPin: number; // paise
  maxBuyable: number;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [transferPts, setTransferPts] = useState(0);
  const [buying, setBuying] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const cost = qty * pricePerPin;
  const canAfford = cost <= pinWalletBalance && qty > 0;

  async function buyPins(e: React.FormEvent) {
    e.preventDefault();
    if (!canAfford) return;
    setBuying(true);
    try {
      const res = await fetch("/api/affiliate/pin-wallet/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to buy pins");
      toast.success(`${json.pinsIssued} pin${json.pinsIssued === 1 ? "" : "s"} added to your account.`);
      setQty(1);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to buy pins");
    } finally {
      setBuying(false);
    }
  }

  async function transfer(e: React.FormEvent) {
    e.preventDefault();
    if (transferPts <= 0 || transferPts * 100 > payoutBalance) return;
    setTransferring(true);
    try {
      const res = await fetch("/api/affiliate/pin-wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: transferPts }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Transfer failed");
      toast.success(`Transferred ${transferPts.toLocaleString("en-IN")} points to your Pin Wallet.`);
      setTransferPts(0);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Buy pins */}
      <form onSubmit={buyPins} className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-sky-100 text-sky-700 grid place-items-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Buy pins</h2>
            <p className="text-xs text-muted-foreground">{formatPoints(pricePerPin)} per pin · no admin approval</p>
          </div>
        </div>

        <div>
          <label className="label">Quantity</label>
          <input
            type="number"
            min={1}
            max={Math.max(1, maxBuyable)}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="input"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            You can buy up to <strong>{maxBuyable}</strong> pin{maxBuyable === 1 ? "" : "s"} with your current balance.
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total cost</span>
          <span className={`font-bold tabular-nums ${canAfford ? "text-foreground" : "text-red-600"}`}>{formatPoints(cost)}</span>
        </div>

        <button type="submit" disabled={buying || !canAfford} className="btn-primary w-full">
          {buying ? "Buying…" : canAfford ? "Buy pins" : "Not enough points"}
        </button>
      </form>

      {/* Transfer from payout */}
      <form onSubmit={transfer} className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Top up from payout wallet</h2>
            <p className="text-xs text-muted-foreground">Available: {formatPoints(payoutBalance)}</p>
          </div>
        </div>

        <div>
          <label className="label">Points to transfer</label>
          <input
            type="number"
            min={0}
            value={transferPts || ""}
            onChange={(e) => setTransferPts(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="input"
            placeholder="e.g. 1070"
          />
          <p className="mt-1 text-xs text-muted-foreground">Moves points from your payout balance into the Pin Wallet (1 point = ₹1).</p>
        </div>

        <button
          type="submit"
          disabled={transferring || transferPts <= 0 || transferPts * 100 > payoutBalance}
          className="btn-secondary w-full"
        >
          {transferring ? "Transferring…" : "Transfer to Pin Wallet"}
        </button>
      </form>
    </div>
  );
}
