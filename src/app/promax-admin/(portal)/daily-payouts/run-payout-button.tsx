"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Play } from "lucide-react";
import { formatPoints } from "@/lib/money";

// Forces a Pro Max payout cycle now (the nightly cron also runs it at 00:00 IST).
export function RunPayoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    if (!confirm("Run the Pro Max payout now? This pays 90% of each eligible member's Pro Max wallet and resets it to 0.")) return;
    setBusy(true);
    const res = await fetch("/api/promax-admin/daily-payouts/run-now", { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Run failed"); return; }
    toast.success(`Created ${json.payoutsCreated ?? 0} payout(s) · ${formatPoints(json.totalPaid ?? 0)} to pay`);
    router.refresh();
  }

  return (
    <button onClick={run} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold disabled:opacity-60">
      <Play className="h-4 w-4" /> {busy ? "Running…" : "Run payout now"}
    </button>
  );
}
