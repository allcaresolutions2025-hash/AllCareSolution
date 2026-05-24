"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X, Eye } from "lucide-react";
import { formatRupees } from "@/lib/loan";

export function ReceiptReviewRow({
  id,
  weekNumber,
  amount,
  dueDate,
  uploadedAt,
  userName,
  userCode,
  tierLabel,
}: {
  id: string;
  weekNumber: number;
  amount: number;
  dueDate: string;
  uploadedAt: string | null;
  userName: string;
  userCode: string;
  tierLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptMime, setReceiptMime] = useState<string | null>(null);

  async function openReceipt() {
    if (receiptUrl) {
      setShowReceipt(true);
      return;
    }
    const res = await fetch(`/api/admin/loans/installments/${id}/receipt`);
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Could not load receipt");
      return;
    }
    setReceiptUrl(`data:${json.mime};base64,${json.data}`);
    setReceiptMime(json.mime);
    setShowReceipt(true);
  }

  async function act(action: "verify" | "reject") {
    if (busy) return;
    const notes =
      action === "reject"
        ? prompt("Reason for rejecting this receipt?") ?? ""
        : "";
    if (action === "reject" && !notes.trim()) {
      toast.error("Rejection reason required");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/loans/installments/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || `${action} failed`);
      return;
    }
    toast.success(action === "verify" ? "Receipt accepted" : "Receipt rejected");
    router.refresh();
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-medium">
            {userName} <span className="text-xs font-mono text-muted-foreground">({userCode})</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Week {weekNumber} · {formatRupees(amount)} · Due {new Date(dueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {tierLabel} ·{" "}
            {uploadedAt && (
              <>Uploaded {new Date(uploadedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openReceipt}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white border hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> View receipt
          </button>
          <button
            onClick={() => act("verify")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Accept
          </button>
          <button
            onClick={() => act("reject")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white text-red-700 border border-red-300 hover:bg-red-50 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Reject
          </button>
        </div>
      </div>

      {showReceipt && receiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-6"
          onClick={() => setShowReceipt(false)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">
                Receipt — Week {weekNumber} · {userName}
              </div>
              <button onClick={() => setShowReceipt(false)} className="text-sm px-3 py-1 rounded border hover:bg-slate-50">
                Close
              </button>
            </div>
            <div className="p-4">
              {receiptMime === "application/pdf" ? (
                <iframe src={receiptUrl} className="w-full h-[70vh]" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={receiptUrl} alt="Receipt" className="mx-auto max-h-[75vh] object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
