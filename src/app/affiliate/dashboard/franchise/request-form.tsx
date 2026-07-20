"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Store } from "lucide-react";

export function RequestFranchiseForm() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/affiliate/franchise/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Could not submit request"); return; }
    toast.success("Franchise request submitted");
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <h2 className="font-semibold">Request a franchise</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tell the admin about the area you cover and why you want a franchise. They will review
          your request.
        </p>
      </div>
      <div>
        <label htmlFor="note" className="text-sm font-medium">
          Your message <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="e.g. I cover Coimbatore city and have 40 active members in my team."
          className="mt-1.5 w-full rounded-xl border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-franchise-400"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-franchise-gradient text-white font-semibold shadow-franchise-sm hover:opacity-95 disabled:opacity-60"
      >
        <Store className="h-4 w-4" /> {busy ? "Submitting…" : "Request Franchise"}
      </button>
    </form>
  );
}
