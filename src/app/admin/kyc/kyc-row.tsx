"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function KycRow({
  id,
  user,
  panNumber,
  panName,
  bankAccount,
  ifsc,
  bankHolderName,
  status,
  submittedAt,
}: {
  id: string;
  user: { name: string; email: string; phone: string | null };
  panNumber: string | null;
  panName: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  bankHolderName: string | null;
  status: string;
  submittedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function action(approve: boolean) {
    let notes = "";
    if (!approve) {
      notes = prompt("Reason for rejection (shown to user):") || "";
      if (!notes) return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/kyc/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve, notes }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed");
      return;
    }
    toast.success(approve ? "Approved" : "Rejected");
    router.refresh();
  }

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
        <div className="text-xs text-muted-foreground">{user.phone}</div>
      </td>
      <td className="px-4 py-3 text-xs font-mono">
        <div>{panNumber}</div>
        <div className="text-muted-foreground">{panName}</div>
      </td>
      <td className="px-4 py-3 text-xs font-mono">
        <div>A/c {bankAccount}</div>
        <div>IFSC {ifsc}</div>
        <div className="text-muted-foreground">{bankHolderName}</div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {submittedAt ? new Date(submittedAt).toLocaleString("en-IN") : "—"}
      </td>
      <td className="px-4 py-3">
        <span className={
          status === "PENDING" ? "badge-amber" :
          status === "APPROVED" ? "badge-green" : "badge-red"
        }>{status}</span>
      </td>
      <td className="px-4 py-3">
        {status === "PENDING" ? (
          <div className="flex gap-2">
            <button disabled={loading} onClick={() => action(true)} className="btn-primary text-xs px-3 py-1">Approve</button>
            <button disabled={loading} onClick={() => action(false)} className="btn-danger text-xs px-3 py-1">Reject</button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
