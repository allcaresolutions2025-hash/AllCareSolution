"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Crown } from "lucide-react";

// Pro Max member applies a Pro Max pin to an existing downline member (by ID) to
// upgrade them to Pro Max instantly.
export function UpgradeDownlineForm({ pins }: { pins: string[] }) {
  const router = useRouter();
  const [pin, setPin] = useState(pins[0] ?? "");
  const [referId, setReferId] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return toast.error("Select a pin");
    if (!/^AM[0-9]{8}$/.test(referId.trim().toUpperCase())) return toast.error("Enter a valid member ID (AM…)");
    setLoading(true);
    const res = await fetch("/api/members/pro-max/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinCode: pin, referId: referId.trim().toUpperCase() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not upgrade member");
      return;
    }
    toast.success(`${data.name ?? "Member"} is now Pro Max`);
    setReferId("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4 border-2 border-amber-200">
      <div className="flex items-center gap-2 text-amber-700">
        <Crown className="h-4 w-4" /> <h2 className="font-semibold">Upgrade a downline to Pro Max</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter the member ID of someone in your downline. They become Pro Max instantly using one of
        your Pro Max pins — no admin approval.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Pro Max pin</label>
          <select className="input font-mono" value={pin} onChange={(e) => setPin(e.target.value)} required>
            {pins.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <p className="text-xs text-muted-foreground mt-1">{pins.length} pin{pins.length === 1 ? "" : "s"} available.</p>
        </div>
        <div>
          <label className="label">Downline member ID</label>
          <input
            className="input font-mono uppercase"
            value={referId}
            onChange={(e) => setReferId(e.target.value.toUpperCase())}
            placeholder="AM12345678"
            maxLength={10}
          />
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Upgrading…" : "Upgrade to Pro Max"}
      </button>
    </form>
  );
}
