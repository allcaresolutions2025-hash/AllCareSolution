"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BadgeIndianRupee } from "lucide-react";

export function ApplyLoanButton({ tierKey, amountLabel }: { tierKey: string; amountLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function apply() {
    if (busy) return;
    if (!confirm(`Apply for a loan of ${amountLabel}? Admin will verify and disburse offline.`)) return;
    setBusy(true);
    const res = await fetch("/api/affiliate/loan/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierKey }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Could not submit loan request");
      return;
    }
    toast.success("Loan request submitted. Awaiting admin approval.");
    router.refresh();
    router.push("/affiliate/dashboard/loan");
  }

  return (
    <button
      onClick={apply}
      disabled={busy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
    >
      <BadgeIndianRupee className="h-4 w-4" />
      {busy ? "Submitting…" : `Apply for ${amountLabel}`}
    </button>
  );
}
