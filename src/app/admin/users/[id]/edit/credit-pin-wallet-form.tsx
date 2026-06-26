"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { WalletCards } from "lucide-react";
import { formatPoints } from "@/lib/money";

export function CreditPinWalletForm({
  userId,
  currentBalancePaise,
}: {
  userId: string;
  currentBalancePaise: number;
}) {
  const router = useRouter();
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(points);
    if (!isFinite(n) || n <= 0) return toast.error("Enter a positive points amount");
    setLoading(true);
    const res = await fetch("/api/admin/pin-wallet/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, points: n, note: note.trim() || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not credit pin wallet");
      return;
    }
    toast.success(`Added ${n.toLocaleString("en-IN")} pts. New balance ${formatPoints(data.newBalance)}`);
    setPoints("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 text-brand-700">
        <WalletCards className="h-4 w-4" />
        <h2 className="font-semibold">Add Pin Wallet points</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Current Pin Wallet balance: <strong>{formatPoints(currentBalancePaise)}</strong>. Points added
        here can be used by the member to buy pins. They&apos;ll be notified in their dashboard.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Points to add</label>
            <input
              type="text"
              inputMode="numeric"
              className="input tabular-nums"
              value={points}
              onChange={(e) => setPoints(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="e.g. 1000"
            />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason / reference"
              maxLength={300}
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Adding…" : "Add to Pin Wallet"}
        </button>
      </form>
    </div>
  );
}
