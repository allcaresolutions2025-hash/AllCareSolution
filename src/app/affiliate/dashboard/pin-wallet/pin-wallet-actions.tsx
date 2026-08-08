"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound, ArrowLeftRight, ArrowRightLeft, Clock, ShieldCheck } from "lucide-react";
import { formatPoints } from "@/lib/money";

// Per-transfer minimum for payout -> pin wallet (points = whole rupees).
const MIN_TOPUP = 200;

/** Latest activation request state for the payout -> Pin Wallet transfer. */
export type TopUpAccess = {
  /** Admin has approved and not revoked — the transfer form is live. */
  enabled: boolean;
  /** Status of the member's most recent request, or null if they never asked. */
  lastStatus: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED" | null;
  /** Admin's note on a rejection/revocation, shown back to the member. */
  adminNote: string | null;
};

export function PinWalletActions({
  pinWalletBalance,
  payoutBalance,
  pricePerPin,
  maxBuyable,
  minWithdraw = 3000,
  topUp,
}: {
  pinWalletBalance: number;
  payoutBalance: number;
  pricePerPin: number; // paise
  maxBuyable: number;
  // Pin Wallet -> payout floor. 3,000 for standard members; 6,000 for members
  // who have taken a loan of Rs. 5,000 or more.
  minWithdraw?: number;
  topUp: TopUpAccess;
}) {
  const MIN_WITHDRAW = minWithdraw;
  const router = useRouter();
  // Kept as a raw string so the field can be cleared/retyped freely; parsed to
  // a number only where we need it. Forcing a numeric min on the value made the
  // "1" impossible to delete.
  const [qty, setQty] = useState("1");
  const [withdrawPts, setWithdrawPts] = useState(0);
  const [buying, setBuying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [transferPts, setTransferPts] = useState(0);
  const [transferring, setTransferring] = useState(false);
  const [reason, setReason] = useState("");
  const [requesting, setRequesting] = useState(false);

  const qtyNum = parseInt(qty, 10) || 0;
  const cost = qtyNum * pricePerPin;
  const canAfford = qtyNum >= 1 && cost <= pinWalletBalance;

  async function buyPins(e: React.FormEvent) {
    e.preventDefault();
    if (!canAfford) return;
    setBuying(true);
    try {
      const res = await fetch("/api/affiliate/pin-wallet/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qtyNum }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to buy pins");
      toast.success(`${json.pinsIssued} pin${json.pinsIssued === 1 ? "" : "s"} added to your account.`);
      setQty("1");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to buy pins");
    } finally {
      setBuying(false);
    }
  }

  // payout wallet -> Pin Wallet. Only reachable once an admin has approved the
  // member's activation request.
  async function transfer(e: React.FormEvent) {
    e.preventDefault();
    if (transferPts < MIN_TOPUP || transferPts * 100 > payoutBalance) return;
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

  // Ask an admin to switch the payout -> Pin Wallet transfer on for this account.
  async function requestAccess(e: React.FormEvent) {
    e.preventDefault();
    setRequesting(true);
    try {
      const res = await fetch("/api/affiliate/pin-wallet/topup-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send request");
      toast.success("Request sent. An admin will review it shortly.");
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send request");
    } finally {
      setRequesting(false);
    }
  }

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    if (withdrawPts < MIN_WITHDRAW || withdrawPts * 100 > pinWalletBalance) return;
    setWithdrawing(true);
    try {
      const res = await fetch("/api/affiliate/pin-wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: withdrawPts }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Transfer failed");
      toast.success(`Moved ${withdrawPts.toLocaleString("en-IN")} points to your payout wallet.`);
      setWithdrawPts(0);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
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
            type="text"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={() => setQty((q) => (parseInt(q, 10) >= 1 ? String(parseInt(q, 10)) : "1"))}
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

      {/* Top up from payout — needs admin approval before it goes live */}
      {topUp.enabled ? (
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
              placeholder="e.g. 200"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Moves points from payout into the Pin Wallet (1 point = ₹1). Minimum{" "}
              <strong>{MIN_TOPUP.toLocaleString("en-IN")}</strong> points per transfer.
            </p>
          </div>

          <button
            type="submit"
            disabled={transferring || transferPts < MIN_TOPUP || transferPts * 100 > payoutBalance}
            className="btn-secondary w-full"
          >
            {transferring ? "Transferring…" : "Transfer to Pin Wallet"}
          </button>
        </form>
      ) : topUp.lastStatus === "PENDING" ? (
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 grid place-items-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Activation pending</h2>
              <p className="text-xs text-muted-foreground">Payout → Pin Wallet transfer</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Your request is with the admin for review. You&apos;ll get a notification here as soon as
            it&apos;s approved, and the transfer form will appear in this spot.
          </p>
          <button disabled className="btn-secondary w-full opacity-60">
            Awaiting admin approval
          </button>
        </div>
      ) : (
        <form onSubmit={requestAccess} className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Top up from payout wallet</h2>
              <p className="text-xs text-muted-foreground">Needs admin approval</p>
            </div>
          </div>

          {topUp.lastStatus === "REJECTED" || topUp.lastStatus === "REVOKED" ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
              <p className="font-medium">
                {topUp.lastStatus === "REJECTED"
                  ? "Your last request was declined."
                  : "An admin turned this off for your account."}
              </p>
              {topUp.adminNote && <p className="mt-1">“{topUp.adminNote}”</p>}
              <p className="mt-1">You can send a fresh request below.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Moving points from your payout wallet into the Pin Wallet has to be activated by an
              admin first. Send a request and they&apos;ll review it.
            </p>
          )}

          <div>
            <label className="label">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              rows={2}
              className="input"
              placeholder="e.g. I want to buy more pins for my team"
            />
          </div>

          <button type="submit" disabled={requesting} className="btn-secondary w-full">
            {requesting ? "Sending…" : "Request activation"}
          </button>
        </form>
      )}

      {/* Move back to payout */}
      <form onSubmit={withdraw} className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-700 grid place-items-center">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Transfer to payout wallet</h2>
            <p className="text-xs text-muted-foreground">Pin Wallet: {formatPoints(pinWalletBalance)}</p>
          </div>
        </div>

        <div>
          <label className="label">Points to transfer</label>
          <input
            type="number"
            min={0}
            value={withdrawPts || ""}
            onChange={(e) => setWithdrawPts(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="input"
            placeholder="e.g. 3000"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Moves points from the Pin Wallet back into payout. Minimum <strong>{MIN_WITHDRAW.toLocaleString("en-IN")}</strong> points per transfer.
          </p>
        </div>

        <button
          type="submit"
          disabled={withdrawing || withdrawPts < MIN_WITHDRAW || withdrawPts * 100 > pinWalletBalance}
          className="btn-secondary w-full"
        >
          {withdrawing ? "Transferring…" : "Transfer to payout"}
        </button>
      </form>
    </div>
  );
}
