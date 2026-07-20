"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X, Store, ShieldOff } from "lucide-react";

// Approve / reject a member's franchise request.
export function FranchiseRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    let adminNote: string | undefined;
    if (action === "reject") {
      const reason = prompt("Reason for rejecting (optional, shown to the member):");
      if (reason === null) return;
      adminNote = reason.trim() || undefined;
    } else if (!confirm("Approve this franchise? Their downline's loan and Welcome Kit requests will route to them first.")) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/franchise/requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminNote }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Action failed"); return; }
    toast.success(action === "approve" ? "Franchise granted" : "Request rejected");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button onClick={() => act("approve")} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-franchise-600 hover:bg-franchise-700 text-white disabled:opacity-60">
        <Check className="h-3.5 w-3.5" /> Approve
      </button>
      <button onClick={() => act("reject")} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60">
        <X className="h-3.5 w-3.5" /> Reject
      </button>
    </div>
  );
}

// Promote a member directly, for franchises agreed offline.
export function GrantFranchiseCard() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !identifier.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/franchise/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), grant: true }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Could not grant franchise"); return; }
    toast.success(`${json.name} (${json.referralCode}) is now a franchise`);
    setIdentifier("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <Store className="h-4 w-4 text-franchise-600" /> Make a member a franchise
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          For franchises agreed offline — no request needed. Enter the member ID or their email.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="AM12345678 or member@email.com"
          className="flex-1 rounded-xl border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-franchise-400"
        />
        <button
          type="submit"
          disabled={busy || !identifier.trim()}
          className="px-4 py-2 rounded-xl bg-franchise-gradient text-white font-semibold text-sm shadow-franchise-sm hover:opacity-95 disabled:opacity-60"
        >
          {busy ? "Granting…" : "Grant Franchise"}
        </button>
      </div>
    </form>
  );
}

// Revoke. Anything still pending with that leader falls back to the admin queue.
export function RevokeFranchiseButton({ referralCode, name }: { referralCode: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function revoke() {
    if (busy) return;
    if (!confirm(`Remove franchise access from ${name}? Anything still awaiting their approval comes back to you.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/franchise/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: referralCode, grant: false }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Could not revoke"); return; }
    toast.success("Franchise removed");
    router.refresh();
  }

  return (
    <button onClick={revoke} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60">
      <ShieldOff className="h-3.5 w-3.5" /> Revoke
    </button>
  );
}
