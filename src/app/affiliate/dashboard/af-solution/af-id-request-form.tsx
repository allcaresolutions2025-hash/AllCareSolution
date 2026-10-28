"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserPlus } from "lucide-react";

export function AfIdRequestForm({
  defaults,
  hasPending,
}: {
  defaults: { name: string; mobile: string; email: string };
  hasPending: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaults.name);
  const [mobile, setMobile] = useState(defaults.mobile);
  const [email, setEmail] = useState(defaults.email);
  const [sponsorAfId, setSponsorAfId] = useState("");
  const [side, setSide] = useState<"" | "LEFT" | "RIGHT">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/affiliate/af-id-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mobile,
          email,
          sponsorAfId: sponsorAfId.trim() || undefined,
          side: side || undefined,
          note: note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      toast.success("AF ID request sent to the admin.");
      setSponsorAfId("");
      setSide("");
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (hasPending) {
    return (
      <div className="card p-5 text-sm text-muted-foreground">
        Your AF ID request is awaiting admin review. You can send another request once it&apos;s reviewed.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-af-100 text-af-700 grid place-items-center">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Request a new AF ID</h2>
          <p className="text-xs text-muted-foreground">The admin reviews your request and creates the AF account</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Account holder name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Mobile (first-login password)</label>
          <input
            className="input"
            inputMode="numeric"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
            required
          />
        </div>
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Place under AF ID (optional)</label>
          <input
            className="input font-mono uppercase"
            placeholder="AF12345678"
            value={sponsorAfId}
            onChange={(e) => setSponsorAfId(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="label">Preferred side</label>
          <select
            className="input"
            value={side}
            onChange={(e) => setSide(e.target.value as "" | "LEFT" | "RIGHT")}
            disabled={!sponsorAfId.trim()}
          >
            <option value="">No preference</option>
            <option value="LEFT">Left</option>
            <option value="RIGHT">Right</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        The admin makes the final placement decision. Leave the sponsor blank if you don&apos;t have one.
      </p>

      <div>
        <label className="label">Note to admin (optional)</label>
        <textarea className="input min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
