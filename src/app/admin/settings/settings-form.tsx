"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export function SettingsForm({ initial }: { initial: Record<string, number> }) {
  const [form, setForm] = useState({
    COMMISSION_L1_PERCENT: initial.COMMISSION_L1_PERCENT,
    COMMISSION_L2_PERCENT: initial.COMMISSION_L2_PERCENT,
    BUYBACK_DAYS: initial.BUYBACK_DAYS,
    TDS_PERCENT: initial.TDS_PERCENT,
    TDS_THRESHOLD_INR: initial.TDS_THRESHOLD_INR,
    GST_DEFAULT_PERCENT: initial.GST_DEFAULT_PERCENT,
    SHIPPING_COST_INR: initial.SHIPPING_COST_INR,
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error || "Failed");
      return;
    }
    toast.success("Settings saved");
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <Section title="Affiliate commission" caption="L1 = direct referrer, L2 = referrer-of-referrer. Capped at 2 levels.">
        <Field
          label="L1 rate %"
          value={form.COMMISSION_L1_PERCENT}
          onChange={(v) => setForm({ ...form, COMMISSION_L1_PERCENT: v })}
        />
        <Field
          label="L2 rate %"
          value={form.COMMISSION_L2_PERCENT}
          onChange={(v) => setForm({ ...form, COMMISSION_L2_PERCENT: v })}
        />
      </Section>
      <Section title="Buyback / cooling-off" caption="Number of days from delivery during which a customer can return for a full refund. Commissions stay PENDING for this period.">
        <Field
          label="Buyback days"
          value={form.BUYBACK_DAYS}
          onChange={(v) => setForm({ ...form, BUYBACK_DAYS: v })}
        />
      </Section>
      <Section title="TDS (Section 194H)" caption="Tax deducted at source on commission income above the annual threshold per payee.">
        <Field
          label="TDS rate %"
          value={form.TDS_PERCENT}
          onChange={(v) => setForm({ ...form, TDS_PERCENT: v })}
        />
        <Field
          label="Annual threshold (₹)"
          value={form.TDS_THRESHOLD_INR}
          onChange={(v) => setForm({ ...form, TDS_THRESHOLD_INR: v })}
        />
      </Section>
      <Section title="Tax & shipping defaults" caption="Default GST rate (per-product override available in product editor) and flat shipping cost.">
        <Field
          label="Default GST %"
          value={form.GST_DEFAULT_PERCENT}
          onChange={(v) => setForm({ ...form, GST_DEFAULT_PERCENT: v })}
        />
        <Field
          label="Shipping (₹)"
          value={form.SHIPPING_COST_INR}
          onChange={(v) => setForm({ ...form, SHIPPING_COST_INR: v })}
        />
      </Section>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Section({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="border-b last:border-0 pb-4 last:pb-0">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-3">{caption}</p>
      <div className="grid sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}
