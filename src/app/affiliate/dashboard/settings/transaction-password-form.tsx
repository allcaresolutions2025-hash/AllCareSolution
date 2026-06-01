"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Lock, AlertTriangle, HelpCircle, Clock } from "lucide-react";

export function TransactionPasswordForm({
  isSet,
  mustChange = false,
  hasPendingResetRequest = false,
}: {
  isSet: boolean;
  mustChange?: boolean;
  hasPendingResetRequest?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 4) {
      toast.error("Transaction password must be at least 4 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/affiliate/transaction-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: isSet ? current : undefined,
        newPassword: next,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not save");
      return;
    }
    toast.success(isSet ? "Transaction password updated" : "Transaction password set");
    setCurrent("");
    setNext("");
    setConfirm("");
    router.refresh();
  }

  async function requestReset() {
    const ok = window.confirm(
      "Are you sure you want to request a transaction password reset?\n\n" +
      "This will send a request to the admin. Once approved, your transaction password will be reset to your registered mobile number — you can then sign in here and choose a new one.\n\n" +
      "Continue?"
    );
    if (!ok) return;
    setForgotLoading(true);
    const res = await fetch("/api/affiliate/transaction-password/forgot", { method: "POST" });
    const data = await res.json();
    setForgotLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not send request");
      return;
    }
    toast.success("Request sent to admin. You'll be notified once it's approved.", { duration: 6000 });
    router.refresh();
  }

  return (
    <form onSubmit={submit} id="transaction-password" className="card p-6 space-y-4">
      <div className="flex items-center gap-2 text-brand-700">
        <Lock className="h-4 w-4" /> <h2 className="font-semibold">Transaction password</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        This is a separate password used to authorize sensitive actions like pin transfers.
        It is not your login password.
      </p>

      {mustChange && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-900">
            <strong>Admin has reset your transaction password.</strong> Enter your registered mobile number as the
            current transaction password, then choose a new one to continue using sensitive actions.
          </div>
        </div>
      )}

      {isSet && (
        <div>
          <label className="label">Current transaction password</label>
          <input
            type="password"
            className="input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{isSet ? "New password" : "Transaction password"}</label>
          <input
            type="password"
            className="input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={4}
          />
          <p className="text-xs text-muted-foreground mt-1">At least 4 characters.</p>
        </div>
        <div>
          <label className="label">Confirm</label>
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : isSet ? "Update password" : "Set password"}
      </button>

      <div className="pt-3 border-t">
          {hasPendingResetRequest ? (
            <div className="inline-flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <Clock className="h-4 w-4" />
              Reset request pending admin approval. You&apos;ll be notified once it&apos;s approved.
            </div>
          ) : (
            <button
              type="button"
              onClick={requestReset}
              disabled={forgotLoading}
              className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800 hover:underline disabled:opacity-50"
            >
              <HelpCircle className="h-4 w-4" />
              {forgotLoading ? "Sending request…" : "Forgot transaction password? Request admin reset →"}
            </button>
          )}
      </div>
    </form>
  );
}
