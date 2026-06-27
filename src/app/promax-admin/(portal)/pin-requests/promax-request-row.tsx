"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

// One pending Pro Max pin request with approve/reject actions.
export function ProMaxRequestRow({
  id,
  createdAt,
  userName,
  userCode,
  mobile,
  quantity,
}: {
  id: string;
  createdAt: string;
  userName: string;
  userCode: string;
  mobile: string;
  quantity: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/promax-admin/pin-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || "Action failed");
      return;
    }
    toast.success(action === "approve" ? `Approved — ${json.pinsIssued} pin(s) issued` : "Request rejected");
    router.refresh();
  }

  return (
    <tr className="border-t">
      <td className="px-4 py-2 text-muted-foreground text-xs">
        {new Date(createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
      </td>
      <td className="px-4 py-2">
        <div className="font-medium">{userName}</div>
        <div className="text-xs font-mono text-muted-foreground">{userCode}</div>
      </td>
      <td className="px-4 py-2 text-xs font-mono">{mobile}</td>
      <td className="px-4 py-2 text-right tabular-nums">{quantity}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => act("approve")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            onClick={() => act("reject")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" /> Reject
          </button>
        </div>
      </td>
    </tr>
  );
}
