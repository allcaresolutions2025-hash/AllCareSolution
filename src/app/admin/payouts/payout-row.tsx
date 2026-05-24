"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/money";

export function PayoutRow({
  id,
  user,
  requestedAt,
  amountGross,
  tdsAmount,
  amountNet,
  bankSnapshot,
  status,
  utr,
}: {
  id: string;
  user: { name: string; email: string; phone: string | null };
  requestedAt: string;
  amountGross: number;
  tdsAmount: number;
  amountNet: number;
  bankSnapshot: string | null;
  status: string;
  utr: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const bank = bankSnapshot ? JSON.parse(bankSnapshot) : null;

  async function approveAndPay() {
    const utrInput = prompt("Enter UTR / bank reference number after paying:");
    if (!utrInput) return;
    setLoading(true);
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", utr: utrInput }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error || "Failed");
      return;
    }
    toast.success("Marked as paid");
    router.refresh();
  }

  async function reject() {
    const notes = prompt("Reason for rejection?") || "";
    if (!notes) return;
    setLoading(true);
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", notes }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed");
      return;
    }
    toast.success("Rejected — commissions returned to available balance");
    router.refresh();
  }

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {new Date(requestedAt).toLocaleDateString("en-IN")}
      </td>
      <td className="px-4 py-3 text-right">{formatINR(amountGross)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">
        {tdsAmount > 0 ? formatINR(tdsAmount) : "—"}
      </td>
      <td className="px-4 py-3 text-right font-semibold">{formatINR(amountNet)}</td>
      <td className="px-4 py-3 text-xs font-mono">
        {bank ? (
          <>
            A/c {bank.bankAccount}<br />
            {bank.ifsc}<br />
            <span className="text-muted-foreground">{bank.bankHolderName}</span><br />
            <span className="text-muted-foreground">PAN {bank.panNumber}</span>
          </>
        ) : "—"}
      </td>
      <td className="px-4 py-3">
        <span className={
          status === "REQUESTED" ? "badge-amber" :
          status === "PAID" ? "badge-green" :
          status === "REJECTED" ? "badge-red" : "badge-gray"
        }>{status}</span>
        {utr && <div className="text-xs font-mono text-muted-foreground mt-1">UTR {utr}</div>}
      </td>
      <td className="px-4 py-3">
        {status === "REQUESTED" ? (
          <div className="flex flex-col gap-1">
            <button disabled={loading} onClick={approveAndPay} className="btn-primary text-xs px-2 py-1">Mark paid</button>
            <button disabled={loading} onClick={reject} className="btn-danger text-xs px-2 py-1">Reject</button>
          </div>
        ) : "—"}
      </td>
    </tr>
  );
}
