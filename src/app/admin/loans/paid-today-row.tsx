"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Eye, CheckCircle2 } from "lucide-react";
import { formatRupees } from "@/lib/loan";

export function PaidTodayRow({
  id,
  weekNumber,
  amount,
  verifiedAt,
  userName,
  userCode,
  userPhone,
  tierLabel,
  hasReceipt,
}: {
  id: string;
  weekNumber: number;
  amount: number;
  verifiedAt: string;
  userName: string;
  userCode: string;
  userPhone: string | null;
  tierLabel: string;
  hasReceipt: boolean;
}) {
  const [show, setShow] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState<string | null>(null);

  async function openReceipt() {
    if (url) {
      setShow(true);
      return;
    }
    const res = await fetch(`/api/admin/loans/installments/${id}/receipt`);
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Could not load receipt");
      return;
    }
    setUrl(`data:${json.mime};base64,${json.data}`);
    setMime(json.mime);
    setShow(true);
  }

  return (
    <tr className="border-t">
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(verifiedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
      </td>
      <td className="px-4 py-3">
        <div className="font-medium">{userName}</div>
        <div className="text-xs font-mono text-muted-foreground">{userCode}</div>
        {userPhone && <div className="text-xs text-muted-foreground">{userPhone}</div>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{tierLabel}</td>
      <td className="px-4 py-3 text-xs tabular-nums">Week {weekNumber}</td>
      <td className="px-4 py-3 text-right tabular-nums font-medium">{formatRupees(amount)}</td>
      <td className="px-4 py-3">
        {hasReceipt ? (
          <button
            onClick={openReceipt}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white border hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> View receipt
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> No file
          </span>
        )}
        {show && url && (
          <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-6" onClick={() => setShow(false)}>
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="font-semibold">Receipt — Week {weekNumber} · {userName}</div>
                <button onClick={() => setShow(false)} className="text-sm px-3 py-1 rounded border hover:bg-slate-50">
                  Close
                </button>
              </div>
              <div className="p-4">
                {mime === "application/pdf" ? (
                  <iframe src={url} className="w-full h-[70vh]" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="Receipt" className="mx-auto max-h-[75vh] object-contain" />
                )}
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
