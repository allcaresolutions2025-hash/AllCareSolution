"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldQuestion, X } from "lucide-react";

// Shown when a member is blocked by the loan identity/PAN-reuse guard. Lets them
// send an unlock request to the admin with an optional note.
export function RequestUnlockButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/affiliate/loan/unlock-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Could not send request");
      return;
    }
    setOpen(false);
    toast.success("Unlock request sent to admin for review.");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
      >
        <ShieldQuestion className="h-4 w-4" /> Request admin to unlock
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-lg">Request loan unlock</h3>
              <button onClick={() => !busy && setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your email, mobile, bank account, or PAN is already used on another account that has taken a loan,
              so loans are blocked. Send a request and an admin will review and unlock your account if approved.
            </p>
            <label className="label mt-4">Message to admin (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Explain why you should be unlocked…"
              className="input w-full"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} disabled={busy} className="px-4 py-2 rounded-md border text-sm">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
