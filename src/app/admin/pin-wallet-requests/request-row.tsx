"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
  REVOKED: "badge-red",
};

export function RequestRow({
  id,
  user,
  reason,
  status,
  adminNote,
  createdAt,
  reviewedAt,
  revokedAt,
}: {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    referralCode: string;
    pinTopUpEnabled: boolean;
  };
  reason: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  revokedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "approve" | "reject" | "revoke", note?: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/pin-wallet-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success(
      action === "approve"
        ? `Payout → Pin Wallet transfer activated for ${user.name}.`
        : action === "reject"
          ? "Request rejected."
          : `Access revoked for ${user.name}.`,
    );
    router.refresh();
  }

  function approve() {
    if (!confirm(`Let ${user.name} (${user.referralCode}) transfer payout points into their Pin Wallet?`)) return;
    act("approve");
  }

  function reject() {
    const note = prompt("Reason for rejecting (shown to the member, optional):") || undefined;
    act("reject", note);
  }

  function revoke() {
    if (!confirm(`Turn OFF payout → Pin Wallet transfer for ${user.name}? They can request it again later.`)) return;
    const note = prompt("Reason for revoking (shown to the member, optional):") || undefined;
    act("revoke", note);
  }

  const decidedAt = revokedAt ?? reviewedAt;

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </td>
      <td className="px-4 py-3 font-mono text-xs">{user.referralCode}</td>
      <td className="px-4 py-3 font-mono text-xs">{user.phone || "—"}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px]">
        {reason ? `“${reason}”` : "—"}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {new Date(createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
      </td>
      <td className="px-4 py-3">
        <span className={BADGE[status] ?? "badge-amber"}>{status}</span>
        {decidedAt && (
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(decidedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
          </div>
        )}
        {adminNote && (
          <div className="text-xs text-muted-foreground mt-1 max-w-[200px]">“{adminNote}”</div>
        )}
      </td>
      <td className="px-4 py-3">
        {status === "PENDING" ? (
          <div className="flex flex-col gap-1">
            <button disabled={loading} onClick={approve} className="btn-primary text-xs px-3 py-1">
              Approve
            </button>
            <button disabled={loading} onClick={reject} className="btn-danger text-xs px-3 py-1">
              Reject
            </button>
          </div>
        ) : status === "APPROVED" ? (
          <button disabled={loading} onClick={revoke} className="btn-danger text-xs px-3 py-1">
            Revoke access
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
