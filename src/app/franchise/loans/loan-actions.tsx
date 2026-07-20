"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

// Franchise-leader vetting of a downline loan request. Approving does NOT
// disburse anything — it forwards the request to the admin, who approves and
// hands over the money.
export function FranchiseLoanActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    if (action === "approve" && !confirm("Approve and forward this request to the admin for final approval?")) return;
    if (action === "reject") {
      const ok = confirm("Reject this loan request? It will not go to the admin.");
      if (!ok) return;
    }
    setBusy(true);
    const res = await fetch(`/api/franchise/loans/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Action failed"); return; }
    toast.success(action === "approve" ? "Forwarded to admin" : "Request rejected");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => act("approve")}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-franchise-600 hover:bg-franchise-700 text-white disabled:opacity-60"
      >
        <Check className="h-3.5 w-3.5" /> Approve
      </button>
      <button
        onClick={() => act("reject")}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  );
}
