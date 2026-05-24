"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Save, KeyRound, Eye, EyeOff } from "lucide-react";

type Initial = {
  name: string;
  phone: string;
  nominee: string;
  gender: "MALE" | "FEMALE" | null;
  address: string;
  panNumber: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  isActive: boolean;
};

export function AdminUserEditForm({ userId, initial }: { userId: string; initial: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  function set<K extends keyof Initial>(k: K, v: Initial[K]) {
    setForm({ ...form, [k]: v });
  }

  async function setPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) return;
    setPwLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json();
    setPwLoading(false);
    if (!res.ok) { toast.error(data.error || "Failed"); return; }
    toast.success("Password updated");
    setNewPassword("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not save");
      return;
    }
    toast.success("User updated");
    router.refresh();
  }

  return (
    <>
    <form onSubmit={submit} className="card p-6 space-y-6">
      <Section title="Identity & contact">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Name" value={form.name} onChange={(v) => set("name", v)} required />
          <Field label="Mobile" value={form.phone} onChange={(v) => set("phone", v.replace(/[^0-9]/g, ""))} maxLength={10} inputMode="numeric" mono />
          <Field label="Nominee" value={form.nominee} onChange={(v) => set("nominee", v)} />
          <div>
            <label className="label">Gender</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => set("gender", "MALE")}
                className={`px-3 py-2 rounded-md border text-sm font-semibold ${
                  form.gender === "MALE" ? "bg-blue-500 text-white border-blue-600" : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                }`}>Male</button>
              <button type="button" onClick={() => set("gender", "FEMALE")}
                className={`px-3 py-2 rounded-md border text-sm font-semibold ${
                  form.gender === "FEMALE" ? "bg-pink-500 text-white border-pink-600" : "bg-white text-pink-700 border-pink-200 hover:bg-pink-50"
                }`}>Female</button>
            </div>
          </div>
          <Field label="PAN" value={form.panNumber} onChange={(v) => set("panNumber", v.toUpperCase().slice(0, 10))} mono />
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <textarea
              rows={2}
              className="input"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Bank information">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Account name" value={form.bankAccountName} onChange={(v) => set("bankAccountName", v)} />
          <Field label="Account number" value={form.bankAccountNumber} onChange={(v) => set("bankAccountNumber", v.replace(/[^0-9]/g, ""))} maxLength={18} inputMode="numeric" mono />
          <Field label="IFSC" value={form.bankIfsc} onChange={(v) => set("bankIfsc", v.toUpperCase().slice(0, 11))} mono />
          <Field label="Bank name" value={form.bankName} onChange={(v) => set("bankName", v)} />
        </div>
      </Section>

      <Section title="Account">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          Active (uncheck to suspend)
        </label>
      </Section>

      <button type="submit" disabled={loading} className="btn-primary inline-flex items-center gap-2">
        <Save className="h-4 w-4" /> {loading ? "Saving…" : "Save changes"}
      </button>
    </form>

    {/* Set password card — separate form so it doesn't accidentally submit with the profile */}
    <form onSubmit={setPassword} className="card p-6 space-y-4 mt-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-brand-700" />
        <h3 className="font-semibold text-sm text-brand-700">Set Password</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Passwords are stored encrypted and cannot be viewed. Use this to set a new login password for this member.
      </p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={showPw ? "text" : "password"}
            className="input pr-10"
            placeholder="Enter new password…"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={4}
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button type="submit" disabled={pwLoading || !newPassword} className="btn-primary shrink-0">
          {pwLoading ? "Saving…" : "Set Password"}
        </button>
      </div>
    </form>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-3 border-t first:border-0 first:pt-0">
      <h3 className="font-semibold text-sm text-brand-700">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, required, maxLength, inputMode, mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "tel" | "email" | "search" | "url" | "none" | "decimal";
  mono?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className={`input ${mono ? "font-mono" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
      />
    </div>
  );
}
