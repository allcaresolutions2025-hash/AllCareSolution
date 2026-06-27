"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Gift } from "lucide-react";

// Pro Max admin grants a reward to a member directly (creates it APPROVED).
export function GrantRewardForm() {
  const router = useRouter();
  const [memberCode, setMemberCode] = useState("");
  const [rewardName, setRewardName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/promax-admin/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberCode: memberCode.trim().toUpperCase(), rewardName: rewardName.trim(), note: note.trim() || undefined }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || "Could not grant reward");
      return;
    }
    toast.success(`Reward granted to ${json.memberName}`);
    setMemberCode(""); setRewardName(""); setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4 border-2 border-dashed border-promax-300 bg-promax-50/40">
      <div className="flex items-center gap-2 text-promax-700">
        <Gift className="h-4 w-4" /> <h2 className="font-semibold">Grant a reward to a member</h2>
      </div>
      <div className="grid sm:grid-cols-[180px_1fr] gap-3">
        <div>
          <label className="label">Member ID</label>
          <input required className="input font-mono uppercase" placeholder="AM12345678" value={memberCode} onChange={(e) => setMemberCode(e.target.value)} pattern="^AM[0-9]{8}$" />
        </div>
        <div>
          <label className="label">Reward</label>
          <input required className="input" placeholder="e.g. Bronze Achiever Bonus" value={rewardName} onChange={(e) => setRewardName(e.target.value)} maxLength={120} />
        </div>
      </div>
      <div>
        <label className="label">Note (optional)</label>
        <input className="input" placeholder="Any detail to show the member" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </div>
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold disabled:opacity-60">
        {busy ? "Granting…" : "Grant reward"}
      </button>
    </form>
  );
}
