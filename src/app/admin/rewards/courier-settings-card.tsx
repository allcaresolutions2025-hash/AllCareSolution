"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Truck, ChevronDown } from "lucide-react";
import type { CourierSender } from "@/lib/courier";

const FIELDS: { key: keyof CourierSender; label: string; placeholder: string; full?: boolean }[] = [
  { key: "company", label: "Company name", placeholder: "ACHT MART" },
  { key: "tagline", label: "Tagline", placeholder: "Pure · Natural · Authentic" },
  { key: "line1", label: "Address line 1", placeholder: "Building, street", full: true },
  { key: "line2", label: "Address line 2", placeholder: "Area, landmark", full: true },
  { key: "city", label: "City", placeholder: "City" },
  { key: "state", label: "State", placeholder: "State" },
  { key: "pincode", label: "Pincode", placeholder: "600001" },
  { key: "phone", label: "Phone", placeholder: "+91 …" },
  { key: "email", label: "Email", placeholder: "care@company.com" },
  { key: "gstin", label: "GSTIN", placeholder: "22AAAAA0000A1Z5" },
];

export function CourierSettingsCard({ initial }: { initial: CourierSender }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CourierSender>(initial);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await fetch("/api/admin/rewards/courier-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Failed to save");
      return;
    }
    toast.success("Courier sender details saved");
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-muted/30"
      >
        <Truck className="h-4 w-4 text-brand-600" />
        <span className="font-semibold">Courier sender details (FROM address)</span>
        <span className="text-xs text-muted-foreground">— printed on every courier slip</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-4 border-t space-y-4">
          <p className="text-xs text-muted-foreground">
            These are your company&apos;s FROM / sender details. The member&apos;s address is used as the
            TO / delivery address automatically on each slip.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                <label className="label">{f.label}</label>
                <input
                  className="input"
                  value={form[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button onClick={save} disabled={loading} className="btn-primary">
            {loading ? "Saving…" : "Save sender details"}
          </button>
        </div>
      )}
    </div>
  );
}
