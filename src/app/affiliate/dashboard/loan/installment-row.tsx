"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Upload, CheckCircle2, Clock, FileUp, AlertTriangle, WalletCards } from "lucide-react";
import { formatRupees, calcTotalPenalty, daysOverdueIst, loanWalletChargePaise, loanWalletSurcharge } from "@/lib/loan";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB cap for base64 receipts
const ACCEPTED_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

type Status = "PENDING" | "RECEIPT_UPLOADED" | "VERIFIED";

export function InstallmentRow({
  id,
  weekNumber,
  dueDate,
  amount,
  loanAmount,
  status,
  hasReceipt,
  uploadedAt,
  loanClosed,
  rejectedNote,
  pinWalletBalance,
  paidViaWallet,
}: {
  id: string;
  weekNumber: number;
  dueDate: string;
  amount: number;
  loanAmount: number;
  status: Status;
  hasReceipt: boolean;
  uploadedAt: string | null;
  loanClosed: boolean;
  // Set when a previously-uploaded receipt was rejected by admin (status is back
  // to PENDING with no receipt on file). Prompts the member to re-upload.
  rejectedNote?: string | null;
  // When provided (paise), enables "Pay with Pin Wallet" for this installment.
  pinWalletBalance?: number;
  // True when a Pin Wallet payment is awaiting admin approval (status uploaded).
  paidViaWallet?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const due = new Date(dueDate);
  const daysOverdue = status === "PENDING" ? daysOverdueIst(due) : 0;
  const isOverdue = daysOverdue > 0;
  const penalty = calcTotalPenalty(loanAmount, daysOverdue);

  // Pin Wallet repayment: installment + 10% only (no overdue penalty).
  const walletCost = loanWalletChargePaise(amount);
  // Only offer Pin Wallet pay before anything is submitted for this week.
  const walletEnabled = pinWalletBalance !== undefined && !loanClosed && status === "PENDING";
  const canAffordWallet = (pinWalletBalance ?? 0) >= walletCost;
  const walletPending = status === "RECEIPT_UPLOADED" && paidViaWallet;

  async function payWallet() {
    if (busy) return;
    if (!confirm(
      `Pay Week ${weekNumber} from your Pin Wallet?\n\n` +
        `Installment ${formatRupees(amount)} + 10% (${formatRupees(loanWalletSurcharge(amount))})` +
        `\n= ${formatRupees(walletCost)} (points)`,
    )) return;
    setBusy(true);
    const res = await fetch(`/api/affiliate/loan/installments/${id}/pay-wallet`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Payment failed"); return; }
    toast.success("Installment paid from Pin Wallet");
    router.refresh();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_MIMES.includes(file.type)) {
      toast.error("Receipt must be JPG, PNG, WEBP or PDF");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Receipt must be under 2 MB");
      e.target.value = "";
      return;
    }
    setBusy(true);
    const base64 = await fileToBase64(file);
    const res = await fetch(`/api/affiliate/loan/installments/${id}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mime: file.type, data: base64 }),
    });
    const json = await res.json();
    setBusy(false);
    e.target.value = "";
    if (!res.ok) {
      toast.error(json.error || "Upload failed");
      return;
    }
    toast.success("Receipt sent to admin");
    router.refresh();
  }

  return (
    <tr className="border-t">
      <td className="px-4 py-3 font-medium">Week {weekNumber}</td>
      <td className="px-4 py-3 text-xs">
        <div>{due.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}</div>
        {isOverdue && <div className="text-red-600 font-semibold mt-0.5">Overdue</div>}
      </td>
      <td className="px-4 py-3 text-right font-bold tabular-nums">{formatRupees(amount)}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {penalty > 0 ? (
          <span className="inline-flex items-center gap-1 text-red-700 font-bold">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {formatRupees(penalty)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {status === "VERIFIED" ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Paid
          </span>
        ) : status === "RECEIPT_UPLOADED" ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-sky-100 text-sky-800 border-sky-200">
            <Clock className="h-3 w-3" /> {walletPending ? "Pin Wallet · pending approval" : "Pending verify"}
          </span>
        ) : rejectedNote ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200" title={rejectedNote}>
            <AlertTriangle className="h-3 w-3" /> Receipt rejected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
            <FileUp className="h-3 w-3" /> Awaiting payment
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {status === "VERIFIED" || loanClosed ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : walletPending ? (
          <div className="text-xs text-sky-700">
            Paid from Pin Wallet — <strong>awaiting admin approval</strong>.
            <div className="text-[10px] text-muted-foreground mt-0.5">If rejected, your points are refunded.</div>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_MIMES.join(",")}
              className="hidden"
              onChange={onFile}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" />
              {busy ? "Uploading…" : hasReceipt ? "Re-upload" : rejectedNote ? "Re-upload receipt" : "Upload receipt"}
            </button>
            {rejectedNote && (
              <div className="text-[10px] text-red-600 mt-1 max-w-[200px]">
                Rejected: {rejectedNote}
              </div>
            )}
            {uploadedAt && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Last sent: {new Date(uploadedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" })}
              </div>
            )}
            {walletEnabled && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={payWallet}
                  disabled={busy || !canAffordWallet}
                  title={canAffordWallet ? "" : "Not enough Pin Wallet points"}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <WalletCards className="h-3.5 w-3.5" />
                  Pay {formatRupees(walletCost)} from Pin Wallet
                </button>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {formatRupees(amount)} + 10% · paid instantly from points
                </div>
              </div>
            )}
          </>
        )}
      </td>
    </tr>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result looks like "data:image/png;base64,XXXX" — strip the prefix
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
