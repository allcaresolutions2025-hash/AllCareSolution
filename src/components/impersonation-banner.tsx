"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import toast from "react-hot-toast";
import { ShieldAlert, LogOut } from "lucide-react";

// Sticky banner shown across the app while an admin is impersonating
// another user. Reads session.user.impersonatedBy — when null, renders nothing.
export function ImpersonationBanner() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  if (status !== "authenticated" || !session?.user?.impersonatedBy) return null;

  async function returnToAdmin() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/impersonate/exit", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.token) {
        toast.error(data.error || "Could not return to admin");
        return;
      }
      const result = await signIn("impersonate", { token: data.token, redirect: false });
      if (result?.error) {
        toast.error("Could not switch back");
        return;
      }
      window.location.href = "/admin";
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 text-sm border-b border-amber-700 shadow">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <strong>Admin impersonation active.</strong> You ({session.user.impersonatedByName || "admin"}) are signed in as{" "}
          <strong>{session.user.name}</strong>. Actions you take are performed as this user.
        </div>
        <button
          type="button"
          onClick={returnToAdmin}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md bg-amber-950 text-amber-50 hover:bg-black disabled:opacity-50 transition-colors shrink-0"
        >
          <LogOut className="h-3.5 w-3.5" />
          {loading ? "Switching…" : "Return to admin"}
        </button>
      </div>
    </div>
  );
}
