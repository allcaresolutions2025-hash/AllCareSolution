"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// Move a reward (Combo Box request) along: approve → dispatch → deliver, or reject.
const NEXT: Record<string, { status: string; label: string; cls: string }[]> = {
  PENDING: [
    { status: "APPROVED", label: "Approve", cls: "bg-promax-700 hover:bg-promax-800 text-white" },
    { status: "REJECTED", label: "Reject", cls: "border border-red-200 text-red-700 hover:bg-red-50" },
  ],
  APPROVED: [{ status: "DISPATCHED", label: "Mark dispatched", cls: "bg-sky-600 hover:bg-sky-700 text-white" }],
  DISPATCHED: [{ status: "DELIVERED", label: "Mark delivered", cls: "bg-emerald-600 hover:bg-emerald-700 text-white" }],
  DELIVERED: [],
  REJECTED: [],
};

export function RewardStatusActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const actions = NEXT[status] ?? [];
  if (actions.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  async function act(next: string) {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/promax-admin/rewards/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Action failed"); return; }
    toast.success("Updated");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {actions.map((a) => (
        <button key={a.status} onClick={() => act(a.status)} disabled={busy}
          className={`text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-60 ${a.cls}`}>
          {a.label}
        </button>
      ))}
    </div>
  );
}
