"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X, ShieldAlert, Link2 } from "lucide-react";

export type LinkedAccount = {
  name: string;
  referralCode: string;
  email: string;
  phone: string | null;
  panNumber: string | null;
  matchedOn: string[]; // which fields matched (email / phone / PAN / bank)
  hasLoan: boolean;
};

export function UnlockRequestRow({
  id,
  userName,
  userCode,
  userEmail,
  userPhone,
  userPan,
  reason,
  createdAt,
  linked,
}: {
  id: string;
  userName: string;
  userCode: string;
  userEmail: string;
  userPhone: string | null;
  userPan: string | null;
  reason: string | null;
  createdAt: string;
  linked: LinkedAccount[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    if (busy) return;
    const note =
      action === "reject"
        ? prompt("Reason for declining? (optional, shown to the member)") ?? ""
        : prompt("Approve unlock — this member will be able to apply despite the shared email/PAN. Add a note (optional):") ?? "";
    if (note === null) return;
    setBusy(true);
    const res = await fetch(`/api/admin/loans/unlock-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: note || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error || `${action} failed`);
      return;
    }
    toast.success(action === "approve" ? "Loans unlocked for this member" : "Unlock request declined");
    router.refresh();
  }

  return (
    <div className="p-4 border border-red-200 bg-red-50/40 rounded-lg">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-semibold">{userName}</span>
            <code className="font-mono text-xs text-muted-foreground">{userCode}</code>
          </div>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <div>Email: <span className="font-mono">{userEmail}</span></div>
            <div>Mobile: <span className="font-mono">{userPhone ?? "—"}</span> · PAN: <span className="font-mono">{userPan ?? "—"}</span></div>
            <div>Requested {new Date(createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</div>
          </div>
          {reason && (
            <div className="mt-2 text-xs bg-white border rounded px-2 py-1.5 max-w-lg">
              <span className="text-muted-foreground">Member note:</span> {reason}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => act("approve")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Approve &amp; unlock
          </button>
          <button
            onClick={() => act("reject")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md bg-white text-red-700 border border-red-300 hover:bg-red-50 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Decline
          </button>
        </div>
      </div>

      {/* Linked accounts sharing identity/PAN — red so admin can track them */}
      <div className="mt-3 border-t border-red-200 pt-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-red-700 flex items-center gap-1">
          <Link2 className="h-3.5 w-3.5" /> Linked accounts ({linked.length})
        </div>
        {linked.length === 0 ? (
          <div className="text-xs text-muted-foreground mt-1">No other accounts share this member&apos;s email, mobile, PAN, or bank.</div>
        ) : (
          <div className="mt-1.5 grid gap-1.5">
            {linked.map((a) => (
              <div key={a.referralCode} className="text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5 bg-white border border-red-200 rounded px-2 py-1">
                <span className="font-medium">{a.name}</span>
                <code className="font-mono text-muted-foreground">{a.referralCode}</code>
                {a.hasLoan && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">has loan</span>
                )}
                <span className="text-muted-foreground">matched: {a.matchedOn.join(", ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
