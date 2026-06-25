"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

export function PinRequestRow({
  id,
  createdAt,
  userName,
  userEmail,
  userCode,
  mobile,
  quantity,
  proMax = false,
}: {
  id: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  userCode: string;
  mobile: string;
  quantity: number;
  proMax?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    const verb = action === "approve" ? "Approve" : "Reject";
    if (action === "reject" && !confirm(`Reject this request for ${quantity} pins?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/pin-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error || `${verb} failed`);
      return;
    }
    toast.success(action === "approve" ? `Issued ${data.pinsIssued} pin${data.pinsIssued === 1 ? "" : "s"}` : "Rejected");
    router.refresh();
  }

  return (
    <tr className="border-t">
      <td className="px-4 py-2 text-xs text-muted-foreground">
        {new Date(createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
      </td>
      <td className="px-4 py-2">
        <div className="font-medium flex items-center gap-2">
          {userName}
          {proMax && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              PRO MAX
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {userEmail} · <code className="font-mono">{userCode}</code>
        </div>
      </td>
      <td className="px-4 py-2 text-xs font-mono">{mobile}</td>
      <td className="px-4 py-2 text-right font-bold tabular-nums">{quantity}</td>
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
