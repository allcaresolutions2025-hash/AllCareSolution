"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X, Eye } from "lucide-react";

// View a member's uploaded receipt, then verify or reject it.
export function ReceiptActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function view() {
    const res = await fetch(`/api/promax-admin/loans/installments/${id}/receipt`);
    const json = await res.json();
    if (!res.ok) { toast.error(json.error || "No receipt"); return; }
    const w = window.open();
    if (w) {
      if (json.mime === "application/pdf") {
        w.document.write(`<iframe src="data:${json.mime};base64,${json.data}" style="border:0;width:100%;height:100%"></iframe>`);
      } else {
        w.document.write(`<img src="data:${json.mime};base64,${json.data}" style="max-width:100%" />`);
      }
    }
  }

  async function act(action: "verify" | "reject") {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/promax-admin/loans/installments/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Action failed"); return; }
    toast.success(action === "verify" ? "Receipt verified" : "Receipt rejected");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={view} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border hover:bg-muted">
        <Eye className="h-3.5 w-3.5" /> View
      </button>
      <button onClick={() => act("verify")} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60">
        <Check className="h-3.5 w-3.5" /> Verify
      </button>
      <button onClick={() => act("reject")} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60">
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  );
}
