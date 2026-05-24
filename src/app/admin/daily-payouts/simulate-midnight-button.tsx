"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Play } from "lucide-react";
import { formatPoints } from "@/lib/money";

type RunResult = {
  ok: boolean;
  skipped: boolean;
  date: string;
  forced: boolean;
  payoutsCreated?: number;
  walletsReset?: number;
  gatedCacheCleared?: number;
  totalPaid?: number;
  totalForfeit?: number;
};

export function SimulateMidnightButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<RunResult | null>(null);

  async function run() {
    if (busy) return;
    if (
      !confirm(
        "Simulate midnight payout NOW?\n\nThis will pay 90% of every user's balance, reset balances to 0, and clear the gated-points cache. Intended for demo only."
      )
    ) return;
    setBusy(true);
    const res = await fetch("/api/admin/daily-payouts/run-now", { method: "POST" });
    const json: RunResult = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error("Run failed");
      return;
    }
    setLast(json);
    toast.success(
      `Created ${json.payoutsCreated ?? 0} payouts · reset ${json.walletsReset ?? 0} wallets`
    );
    router.refresh();
  }

  return (
    <div className="card p-5 border-dashed border-2 border-amber-300 bg-amber-50/50">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <Play className="h-4 w-4 text-amber-700" /> Simulate midnight payout
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Triggers the same job that runs nightly at 00:00 IST. Useful for testing the loop:
            give users a balance, click this, and see the DailyPayout rows + reset wallets.
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          {busy ? "Running…" : "Simulate now"}
        </button>
      </div>

      {last && (
        <div className="mt-4 grid sm:grid-cols-5 gap-3 text-sm">
          <Stat label="Run date" value={last.date} />
          <Stat label="Payouts created" value={String(last.payoutsCreated ?? 0)} />
          <Stat label="Wallets reset" value={String(last.walletsReset ?? 0)} />
          <Stat label="Paid (90%)" value={formatPoints(last.totalPaid ?? 0)} />
          <Stat label="Forfeit (10%)" value={formatPoints(last.totalForfeit ?? 0)} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
