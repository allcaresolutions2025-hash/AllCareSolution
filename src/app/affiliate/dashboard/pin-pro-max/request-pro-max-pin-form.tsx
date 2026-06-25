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
  const [quantity, setQuantity] = useState(1);
  const [mobile, setMobile] = useState(defaultMobile);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{10}$/.test(mobile)) return toast.error("Enter a valid 10-digit mobile");
    if (quantity < 1) return toast.error("Quantity must be at least 1");
    setLoading(true);
    const res = await fetch("/api/pin-requests/pro-max", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity, mobileNumber: mobile }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not submit request");
      return;
    }
    toast.success("Pro Max pin request submitted for admin review");
    router.refresh();
  }

  const total = pricePerPinPaise * quantity;

  return (
    <form onSubmit={submit} className="card p-6 space-y-4 border-2 border-amber-200">
      <div className="flex items-center gap-2 text-amber-700">
        <Crown className="h-4 w-4" /> <h2 className="font-semibold">Request Pro Max pins</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Each Pro Max pin costs <strong>{formatPoints(pricePerPinPaise)}</strong>. Admin reviews
        every request before pins are issued. Your first approved Pro Max pin enrolls you in the
        Pro Max program.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Quantity</label>
          <input
            type="number"
            min={1}
            max={100}
            className="input tabular-nums"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value || "1", 10) || 1)))}
          />
        </div>
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
      </div>
      <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
        <span className="text-amber-800">Total</span>
        <span className="font-bold text-amber-900 tabular-nums">{formatPoints(total)}</span>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Submitting…" : "Request Pro Max pins"}
      </button>
    </form>
  );
}
