"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound } from "lucide-react";

export function RequestPinForm() {
  const router = useRouter();
  const [quantity, setQuantity] = useState("1");
  const [mobile, setMobile] = useState("");
  const [pointsValue, setPointsValue] = useState<1000 | 2000>(1000);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = parseInt(quantity, 10);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Enter a valid number of pins");
      return;
    }
    if (q > 100) {
      toast.error("Max 100 pins per request");
      return;
    }
    if (!/^[0-9]{10}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/pin-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: q, mobileNumber: mobile, pointsValue }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Request failed");
      return;
    }
    toast.success("Pin request submitted for admin review");
    setQuantity("1");
    setMobile("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div className="flex items-center gap-2 text-brand-700">
        <KeyRound className="h-4 w-4" /> <h2 className="font-semibold">New pin request</h2>
      </div>

      <div>
        <label className="label">Pin value</label>
        <div className="grid grid-cols-2 gap-3">
          {([1000, 2000] as const).map((v) => (
            <button
              type="button"
              key={v}
              onClick={() => setPointsValue(v)}
              className={`rounded-lg border p-3 text-left transition ${
                pointsValue === v
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                  : "border-border hover:border-brand-300"
              }`}
            >
              <div className="font-semibold tabular-nums">{v.toLocaleString("en-IN")} pts pin</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {v === 1000
                  ? "Standard pin"
                  : "The member you enroll with it gets the 40 Combo Reward"}
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Both pins follow the same points system and tree placement — a 2,000 pts pin simply entitles the
          member you enroll to the 40 Combo Reward (claimed from admin) instead of the Welcome Kit.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Number of pins</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="100"
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">How many pins do you need? Max 100 per request.</p>
        </div>
        <div>
          <label className="label">Mobile number <span className="text-red-600">*</span></label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            className="input font-mono"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="10-digit mobile"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Pins will be sent to this number once approved.</p>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Submitting…" : "Generate Pin"}
      </button>
    </form>
  );
}
