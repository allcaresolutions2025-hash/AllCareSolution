"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { LogIn } from "lucide-react";

export function ImpersonateButton({
  userId,
  userName,
  disabled,
}: {
  userId: string;
  userName: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (disabled || loading) return;
    if (!confirm(`Log in as ${userName}? You can return to the admin account any time.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/impersonate/${userId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.token) {
        toast.error(data.error || "Could not start impersonation");
        return;
      }
      const result = await signIn("impersonate", {
        token: data.token,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Impersonation failed");
        return;
      }
      window.location.href = "/affiliate/dashboard";
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <LogIn className="h-3.5 w-3.5" />
      {loading ? "Signing in…" : "Login as user"}
    </button>
  );
}
