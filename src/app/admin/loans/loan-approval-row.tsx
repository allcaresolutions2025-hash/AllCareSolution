"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import { formatRupees } from "@/lib/loan";

export function LoanApprovalRow({
  id,
  requestedAt,
  userName,
  userEmail,
  userCode,
  tierLabel,
  amount,
  totalWeeks,
}: {
  id: string;
  requestedAt: string;
  userName: string;
  userEmail: string;
  userCode: string;
  tierLabel: string;
  amount: number;
  totalWeeks: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    const notes =
      action === "reject"
        ? prompt("Reason for rejecting? (optional)") ?? ""
        : prompt(`Confirm you have disbursed ${formatRupees(amount)} offline to ${userName}. Add any notes (optional):`) ?? "";
    if (action === "approve" && notes === null) return;
    setBusy(true);
    const res = await fetch(`/api/admin/loans/${id}`, {
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
    toast.success(action === "approve" ? "Loan approved & schedule generated" : "Loan rejected");
    router.refresh();
  }

  return (
    <tr className="border-t">
      <td className="px-4 py-2 text-xs text-muted-foreground">
        {new Date(requestedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
      </td>
      <td className="px-4 py-2">
        <div className="font-medium">{userName}</div>
        <div className="text-xs text-muted-foreground">
          {userEmail} · <code className="font-mono">{userCode}</code>
        </div>
      </td>
      <td className="px-4 py-2 text-xs">{tierLabel}</td>
      <td className="px-4 py-2 text-right font-bold tabular-nums">{formatRupees(amount)}</td>
      <td className="px-4 py-2 text-right tabular-nums">{totalWeeks}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => act("approve")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            onClick={() => act("reject")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white text-red-700 border border-red-300 hover:bg-red-50 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Reject
          </button>
        </div>
      </td>
    </tr>
  );
}
