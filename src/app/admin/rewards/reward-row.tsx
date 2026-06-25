"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Truck, Package } from "lucide-react";
import type { RewardClaimStatus } from "@prisma/client";

const STATUS_BADGE: Record<RewardClaimStatus, { label: string; cls: string }> = {
  PENDING:    { label: "Pending",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED:   { label: "Approved",   cls: "bg-brand-50 text-brand-700 border-brand-200" },
  DISPATCHED: { label: "Dispatched", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  DELIVERED:  { label: "Delivered",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED:   { label: "Rejected",   cls: "bg-red-50 text-red-700 border-red-200" },
};

const GIFT_ICONS: Record<number, string> = {
  1: "🎁", 2: "🌿", 3: "🌿", 4: "🌿", 5: "🌿", 6: "🌿",
  7: "🔋", 8: "🎧", 9: "📱", 10: "💻", 11: "🛵", 12: "🚗",
  13: "🥇", 14: "🏠", 15: "🏆",
};

interface Props {
  id: string;
  user: { name: string; email: string; phone: string | null; referralCode: string };
  level: number;
  rewardName: string;
  status: RewardClaimStatus;
  adminNote: string | null;
  requestedAt: string;
}

export function RewardRow({ id, user, level, rewardName, status, adminNote, requestedAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  const badge = STATUS_BADGE[status];
  const date = new Date(requestedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

  async function updateStatus(newStatus: RewardClaimStatus, note?: string) {
    setLoading(true);
    await fetch(`/api/admin/rewards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, adminNote: note }),
    });
    setLoading(false);
    setShowReject(false);
    router.refresh();
  }

  return (
    <tr className="hover:bg-muted/20">
      <td className="px-4 py-3">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
        <div className="text-xs text-muted-foreground font-mono">{user.referralCode}</div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
          {level === 100
            ? <>👑 Combo</>
            : level === 0
            ? <>🎁 Welcome</>
            : <>{GIFT_ICONS[level]} L{level}</>}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">{rewardName}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{date}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.cls}`}>
          {badge.label}
        </span>
        {adminNote && status === "REJECTED" && (
          <p className="text-[10px] text-red-600 mt-0.5 max-w-[140px] truncate">{adminNote}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          {status === "PENDING" && (
            <>
              <button
                onClick={() => updateStatus("APPROVED")}
                disabled={loading}
                className="inline-flex items-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg"
              >
                <CheckCircle2 className="h-3 w-3" /> Approve
              </button>
              {!showReject ? (
                <button
                  onClick={() => setShowReject(true)}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg"
                >
                  <XCircle className="h-3 w-3" /> Reject
                </button>
              ) : (
                <div className="space-y-1">
                  <input
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-300"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateStatus("REJECTED", rejectNote)}
                      disabled={loading}
                      className="flex-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Confirm
                    </button>
                    <button onClick={() => setShowReject(false)} className="flex-1 text-xs border px-2 py-1 rounded">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {status === "APPROVED" && (
            <button
              onClick={() => updateStatus("DISPATCHED")}
              disabled={loading}
              className="inline-flex items-center gap-1 text-xs bg-sky-500 hover:bg-sky-600 text-white px-2.5 py-1 rounded-lg"
            >
              <Truck className="h-3 w-3" /> Mark Dispatched
            </button>
          )}
          {status === "DISPATCHED" && (
            <button
              onClick={() => updateStatus("DELIVERED")}
              disabled={loading}
              className="inline-flex items-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg"
            >
              <Package className="h-3 w-3" /> Mark Delivered
            </button>
          )}
          {(status === "DELIVERED" || status === "REJECTED") && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}
