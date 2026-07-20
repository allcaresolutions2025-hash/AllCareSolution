"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

// Approve / reject a pending Pro Max loan request.
export function LoanActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    if (action === "approve" && !confirm("Approve this loan? The amount is disbursed offline and a weekly repayment schedule will be created.")) return;
    setBusy(true);
    const res = await fetch(`/api/promax-admin/loans/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Action failed"); return; }
    toast.success(action === "approve" ? "Loan approved & disbursed" : "Loan rejected");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => act("approve")} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white disabled:opacity-60">
        <Check className="h-3.5 w-3.5" /> Approve
      </button>
      <button onClick={() => act("reject")} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60">
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  );
}
