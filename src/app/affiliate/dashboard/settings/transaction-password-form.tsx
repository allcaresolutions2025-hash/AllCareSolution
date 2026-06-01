"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Lock, AlertTriangle } from "lucide-react";

export function TransactionPasswordForm({ isSet, mustChange = false }: { isSet: boolean; mustChange?: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

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
    </form>
  );
}
