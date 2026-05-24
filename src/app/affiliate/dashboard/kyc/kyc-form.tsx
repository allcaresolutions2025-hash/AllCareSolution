"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type Kyc = {
  panNumber: string | null;
  panName: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  bankHolderName: string | null;
} | null;

export function KycForm({ initial, disabled }: { initial: Kyc; disabled?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    panNumber: initial?.panNumber || "",
    panName: initial?.panName || "",
    bankAccount: initial?.bankAccount || "",
    ifsc: initial?.ifsc || "",
    bankHolderName: initial?.bankHolderName || "",
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/affiliate/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      // Surface zod field errors clearly so user knows what to fix.
      if (data.issues?.fieldErrors) {
        const fields = Object.entries(data.issues.fieldErrors as Record<string, string[]>)
          .map(([k, v]) => `${k}: ${v[0]}`)
          .join(" · ");
        toast.error(fields || data.error || "Validation failed");
      } else {
        toast.error(data.error || "Could not submit");
      }
      return;
    }
    toast.success("KYC submitted — under review");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <h3 className="font-semibold">PAN details</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">PAN number</label>
          <input
            className="input uppercase"
            value={form.panNumber}
            onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
            maxLength={10}
            required
            disabled={disabled}
            placeholder="ABCDE1234F"
          />
        </div>
        <div>
          <label className="label">Name as per PAN</label>
          <input
            className="input"
            value={form.panName}
            onChange={(e) => setForm({ ...form, panName: e.target.value })}
            required
            disabled={disabled}
          />
        </div>
      </div>

      <hr />
      <h3 className="font-semibold">Bank account (where payouts will be sent)</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Account number</label>
          <input
            className="input"
            value={form.bankAccount}
            onChange={(e) => setForm({ ...form, bankAccount: e.target.value.replace(/\D/g, "") })}
            required
            disabled={disabled}
            maxLength={18}
          />
        </div>
        <div>
          <label className="label">IFSC code</label>
          <input
            className="input uppercase"
            value={form.ifsc}
            onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
            required
            disabled={disabled}
            placeholder="HDFC0001234"
            maxLength={11}
          />
        </div>
      </div>
      <div>
        <label className="label">Account holder name</label>
        <input
          className="input"
          value={form.bankHolderName}
          onChange={(e) => setForm({ ...form, bankHolderName: e.target.value })}
          required
          disabled={disabled}
        />
      </div>

      <button type="submit" disabled={disabled || loading} className="btn-primary">
        {loading ? "Submitting…" : disabled ? "Already submitted" : "Submit for verification"}
      </button>
    </form>
  );
}
