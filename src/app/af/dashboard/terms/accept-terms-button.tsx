"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function AcceptTermsButton() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function accept() {
    if (!checked) return;
    setBusy(true);
    const res = await fetch("/api/af/terms", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error || "Could not record your acceptance");
      return;
    }
    toast.success("Terms accepted. You can now request a package.");
    router.push("/af/dashboard/request-package");
    router.refresh();
  }

  return (
    <div className="card p-5 space-y-3">
      <label className="flex items-start gap-3 text-sm cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-amber-600"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>
          I have read and understood these Terms &amp; Conditions, I understand that there is no guaranteed return, and I
          agree to be bound by them.
        </span>
      </label>
      <button onClick={accept} disabled={!checked || busy} className="btn-primary">
        {busy ? "Saving…" : "I accept"}
      </button>
    </div>
  );
}
