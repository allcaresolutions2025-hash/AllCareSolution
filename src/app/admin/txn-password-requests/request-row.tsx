"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function RequestRow({
  id,
  user,
  requestedAt,
  status,
  reviewerNotes,
  reviewedAt,
}: {
  id: string;
  user: { id: string; name: string; email: string; phone: string | null; referralCode: string };
  requestedAt: string;
  status: string;
  reviewerNotes: string | null;
  reviewedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    if (!confirm(`Reset ${user.name}'s transaction password to ${user.phone}?`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/txn-password-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success(data.message || "Approved", { duration: 6000 });
    router.refresh();
  }

  async function reject() {
    const notes = prompt("Reason for rejecting this request (shown to member, optional):") || "";
    setLoading(true);
    const res = await fetch(`/api/admin/txn-password-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", notes }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error || "Failed");
      return;
    }
    toast.success("Rejected");
    router.refresh();
  }

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </td>
      <td className="px-4 py-3 font-mono text-xs">{user.phone || "—"}</td>
      <td className="px-4 py-3 font-mono text-xs">{user.referralCode}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {new Date(requestedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
      </td>
      <td className="px-4 py-3">
        <span className={
          status === "PENDING" ? "badge-amber" :
          status === "APPROVED" ? "badge-green" : "badge-red"
        }>{status}</span>
        {reviewedAt && (
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(reviewedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
          </div>
        )}
        {reviewerNotes && (
          <div className="text-xs text-muted-foreground mt-1 max-w-[200px]">“{reviewerNotes}”</div>
        )}
      </td>
      <td className="px-4 py-3">
        {status === "PENDING" ? (
          <div className="flex flex-col gap-1">
            <button disabled={loading} onClick={approve} className="btn-primary text-xs px-3 py-1">
              Reset to mobile
            </button>
            <button disabled={loading} onClick={reject} className="btn-danger text-xs px-3 py-1">
              Reject
            </button>
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
    </tr>
  );
}
