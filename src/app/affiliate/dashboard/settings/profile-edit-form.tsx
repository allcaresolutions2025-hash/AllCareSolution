"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserCog, MessageCircle } from "lucide-react";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const WA_REGEX = /^[6-9][0-9]{9}$/;

type Initial = {
  email: string;
  name: string;
  phone: string | null;
  whatsappNumber: string | null;
  nominee: string | null;
  gender: "MALE" | "FEMALE" | null;
  address: string | null;
  panNumber: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
};

export function ProfileEditForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [email, setEmail] = useState(initial.email);
  const [nominee, setNominee] = useState(initial.nominee ?? "");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "">(initial.gender ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [pan, setPan] = useState(initial.panNumber ?? "");
  const [whatsapp, setWhatsapp] = useState(initial.whatsappNumber ?? "");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pan && !PAN_REGEX.test(pan)) {
      toast.error("Invalid PAN format. Must be 5 letters + 4 digits + 1 letter.");
      return;
    }
    if (whatsapp && !WA_REGEX.test(whatsapp)) {
      toast.error("Enter a valid 10-digit WhatsApp number");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/affiliate/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        nominee: nominee.trim() || null,
        gender: gender || null,
        address: address.trim() || null,
        panNumber: pan.trim() || null,
        whatsappNumber: whatsapp.trim() || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not save");
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div className="flex items-center gap-2 text-brand-700">
        <UserCog className="h-4 w-4" /> <h2 className="font-semibold">Profile details</h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ReadOnly label="Name (locked)" value={initial.name} />
        <ReadOnly label="Mobile (locked)" value={initial.phone ?? "—"} mono />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp number
          </label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            maxLength={10}
            className={`input font-mono ${whatsapp.length > 0 && !WA_REGEX.test(whatsapp) ? "border-red-400 focus:border-red-500" : ""}`}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
            placeholder="10-digit WhatsApp number"
          />
          {initial.phone && initial.phone !== whatsapp && (
            <button
              type="button"
              onClick={() => setWhatsapp(initial.phone!.replace(/\D/g, "").slice(-10))}
              className="mt-1.5 text-xs text-brand-700 hover:text-brand-900 font-medium"
            >
              Same as registered mobile ({initial.phone}) →
            </button>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Used for loan repayment reminders. Leave blank to use your registered mobile.
          </p>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="label">Nominee</label>
        <input className="input" value={nominee} onChange={(e) => setNominee(e.target.value)} placeholder="Nominee full name" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Gender</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setGender("MALE")}
              className={`px-3 py-2 rounded-md border text-sm font-semibold ${
                gender === "MALE" ? "bg-blue-500 text-white border-blue-600" : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
              }`}>Male</button>
            <button type="button" onClick={() => setGender("FEMALE")}
              className={`px-3 py-2 rounded-md border text-sm font-semibold ${
                gender === "FEMALE" ? "bg-pink-500 text-white border-pink-600" : "bg-white text-pink-700 border-pink-200 hover:bg-pink-50"
              }`}>Female</button>
          </div>
        </div>
        <div>
          <label className="label">PAN number</label>
          <input
            className={`input font-mono uppercase ${
              pan.length > 0 && !PAN_REGEX.test(pan) ? "border-red-400 focus:border-red-500" : ""
            }`}
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
            placeholder="ABCDE1234F"
            maxLength={10}
          />
          {pan.length > 0 && !PAN_REGEX.test(pan) && (
            <p className="text-xs text-red-600 mt-1">
              Invalid PAN format. Must be 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).
            </p>
          )}
          {pan.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Format: 5 letters, 4 digits, 1 letter.
            </p>
          )}
          {PAN_REGEX.test(pan) && (
            <p className="text-xs text-emerald-600 mt-1">PAN format looks good.</p>
          )}
        </div>
      </div>

      <div>
        <label className="label">Address</label>
        <textarea
          rows={2}
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full postal address"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-muted-foreground">
        Bank details ({initial.bankName ?? "—"} · {initial.bankIfsc ?? "—"}) are locked. Contact admin for changes.
      </div>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className={`input bg-slate-50 text-muted-foreground ${mono ? "font-mono" : ""}`} value={value} disabled readOnly />
    </div>
  );
}
