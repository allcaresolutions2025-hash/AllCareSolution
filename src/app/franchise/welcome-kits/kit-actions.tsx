"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X, Truck, PackageCheck } from "lucide-react";

// Welcome Kit lifecycle as run by the franchise leader:
// PENDING → APPROVED → DISPATCHED (out for delivery) → DELIVERED.
// The admin is notified at approve/dispatch/deliver but doesn't ship it.
export function WelcomeKitActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(next: "APPROVED" | "DISPATCHED" | "DELIVERED" | "REJECTED", confirmMsg?: string) {
    if (busy) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    const res = await fetch(`/api/franchise/welcome-kits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Action failed"); return; }
    toast.success("Updated");
    router.refresh();
  }

  const btn = "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-60";

  if (status === "PENDING") {
    return (
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => act("APPROVED")} disabled={busy} className={`${btn} bg-franchise-600 hover:bg-franchise-700 text-white`}>
          <Check className="h-3.5 w-3.5" /> Approve
        </button>
        <button onClick={() => act("REJECTED", "Reject this Welcome Kit claim?")} disabled={busy} className={`${btn} border border-red-200 text-red-700 hover:bg-red-50`}>
          <X className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <button onClick={() => act("DISPATCHED", "Mark this kit as out for delivery? The admin will be notified.")} disabled={busy} className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}>
        <Truck className="h-3.5 w-3.5" /> Out for delivery
      </button>
    );
  }

  if (status === "DISPATCHED") {
    return (
      <button onClick={() => act("DELIVERED", "Confirm you have delivered this kit to the member?")} disabled={busy} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
        <PackageCheck className="h-3.5 w-3.5" /> Mark delivered
      </button>
    );
  }

  return <span className="text-xs text-muted-foreground">—</span>;
}
