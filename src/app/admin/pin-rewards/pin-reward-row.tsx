"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

export function PinRewardRow({
  id,
  user,
  requestedAt,
  pointsValue,
  status,
  adminNote,
}: {
  id: string;
  user: { name: string; email: string; phone: string | null; referralCode: string };
  requestedAt: string;
  pointsValue: number;
  status: string;
  adminNote: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    let notes: string | undefined;
    if (action === "reject") {
      notes = prompt("Reason for rejection? (optional)") ?? undefined;
    } else if (
      !confirm(`Credit ${pointsValue.toLocaleString("en-IN")} pts to ${user.name}'s payout wallet?`)
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/pin-rewards/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success(action === "approve" ? `Credited ${pointsValue} pts` : "Rejected");
    router.refresh();
  }

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">
          {user.email} · <code className="font-mono">{user.referralCode}</code>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {new Date(requestedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums">
        {pointsValue.toLocaleString("en-IN")} pts
      </td>
      <td className="px-4 py-3">
        <span
          className={
            status === "PENDING"
              ? "badge-amber"
              : status === "REJECTED"
                ? "badge-red"
                : "badge-green"
          }
        >
          {status}
        </span>
        {adminNote && <div className="text-xs text-muted-foreground mt-1">{adminNote}</div>}
      </td>
      <td className="px-4 py-3">
        {status === "PENDING" ? (
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
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
