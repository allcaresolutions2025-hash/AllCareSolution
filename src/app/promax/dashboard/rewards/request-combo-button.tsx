"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Crown } from "lucide-react";

// Member requests the ACHT MART Pro Max Combo Box. Disabled once requested.
export function RequestComboButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/promax/rewards", { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || "Could not request reward");
      return;
    }
    toast.success("Combo Box requested — awaiting admin approval");
    router.refresh();
  }

  return (
    <button
      onClick={submit}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold disabled:opacity-60"
    >
      <Crown className="h-4 w-4" />
      {busy ? "Requesting…" : "Request Combo Box"}
    </button>
  );
}
