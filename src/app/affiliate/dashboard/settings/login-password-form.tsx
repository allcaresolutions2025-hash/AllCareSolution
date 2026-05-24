"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound } from "lucide-react";

export function LoginPasswordForm({ mustChange }: { mustChange: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (current === next) {
      toast.error("New password must be different");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/affiliate/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not change password");
      return;
    }
    toast.success("Login password updated");
    setCurrent("");
    setNext("");
    setConfirm("");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      id="change-password"
      className={`card p-6 space-y-4 ${mustChange ? "ring-2 ring-amber-300" : ""}`}
    >
      <div className="flex items-center gap-2 text-brand-700">
        <KeyRound className="h-4 w-4" /> <h2 className="font-semibold">Login password</h2>
      </div>

      {mustChange && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You are using the default password (your mobile number). Please change it now.
        </div>
      )}

      <div>
        <label className="label">Current password{mustChange ? " (your mobile number)" : ""}</label>
        <input
          type="password"
          className="input"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            className="input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground mt-1">At least 6 characters.</p>
        </div>
        <div>
          <label className="label">Confirm</label>
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
