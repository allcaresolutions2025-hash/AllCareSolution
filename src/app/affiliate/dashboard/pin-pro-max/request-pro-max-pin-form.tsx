"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Crown } from "lucide-react";
import { formatPoints } from "@/lib/money";

export function RequestProMaxPinForm({
  defaultMobile,
  pricePerPinPaise,
}: {
  defaultMobile: string;
  pricePerPinPaise: number;
}) {
  const router = useRouter();
  const [mobile, setMobile] = useState(defaultMobile);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{10}$/.test(mobile)) return toast.error("Enter a valid 10-digit mobile");
    setLoading(true);
    const res = await fetch("/api/pin-requests/pro-max", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 1, mobileNumber: mobile }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not submit request");
      return;
    }
    toast.success("Pro Max upgrade request submitted for admin review");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4 border-2 border-amber-200">
      <div className="flex items-center gap-2 text-amber-700">
        <Crown className="h-4 w-4" /> <h2 className="font-semibold">Request Pro Max upgrade</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        The upgrade costs <strong>{formatPoints(pricePerPinPaise)}</strong>. Admin reviews every
        request; once approved you become a Pro Max member in your current tree position and your
        uplines start earning Pro Max points.
      </p>
      <div>
        <label className="label">Mobile number</label>
        <input
          className="input font-mono"
          inputMode="numeric"
          maxLength={10}
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="10-digit mobile"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
        <span className="text-amber-800">Upgrade cost</span>
        <span className="font-bold text-amber-900 tabular-nums">{formatPoints(pricePerPinPaise)}</span>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Submitting…" : "Request Pro Max upgrade"}
      </button>
    </form>
  );
}
