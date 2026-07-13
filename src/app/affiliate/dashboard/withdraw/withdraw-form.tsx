"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BadgeIndianRupee } from "lucide-react";
import { formatPoints } from "@/lib/money";

const MIN_WITHDRAW = 500;

export function WithdrawForm({
  balanceAvailable,
  hasBankDetails,
  hasPending,
}: {
  balanceAvailable: number; // paise
  hasBankDetails: boolean;
  hasPending: boolean;
}) {
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const maxPoints = Math.floor(balanceAvailable / 100);
  const canSubmit =
    !hasPending &&
    hasBankDetails &&
    points >= MIN_WITHDRAW &&
    points * 100 <= balanceAvailable;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/affiliate/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Withdrawal request failed");
      toast.success(`Requested withdrawal of ${points.toLocaleString("en-IN")} pts. Awaiting admin approval.`);
      setPoints(0);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
          <BadgeIndianRupee className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Request a withdrawal</h2>
          <p className="text-xs text-muted-foreground">Available: {formatPoints(balanceAvailable)}</p>
        </div>
      </div>

      {hasPending ? (
        <p className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
          You already have a withdrawal request pending admin approval. You can request again once it&apos;s
          processed.
        </p>
      ) : !hasBankDetails ? (
        <p className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
          Add your bank account details in <strong>KYC</strong> before requesting a withdrawal.
        </p>
      ) : null}

      <div>
        <label className="label">Points to withdraw</label>
        <input
          type="number"
          min={0}
          value={points || ""}
          onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value, 10) || 0))}
          className="input"
          placeholder={`e.g. ${MIN_WITHDRAW}`}
          disabled={hasPending || !hasBankDetails}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Minimum <strong>{MIN_WITHDRAW.toLocaleString("en-IN")} pts</strong> per request (1 point = ₹1).
          Points are held as soon as you request and paid 1:1 by admin — no deduction. You can withdraw up
          to <strong>{maxPoints.toLocaleString("en-IN")} pts</strong>.
        </p>
      </div>

      <button type="submit" disabled={submitting || !canSubmit} className="btn-primary w-full">
        {submitting
          ? "Submitting…"
          : points > 0 && points < MIN_WITHDRAW
            ? `Minimum ${MIN_WITHDRAW} pts`
            : points * 100 > balanceAvailable
              ? "Not enough points"
              : "Request withdrawal"}
      </button>
    </form>
  );
}
