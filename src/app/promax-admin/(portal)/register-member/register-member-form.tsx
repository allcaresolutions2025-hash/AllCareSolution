"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserPlus, CheckCircle2 } from "lucide-react";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

// Pro Max admin onboarding form. Creates a standalone Pro Max account either as a
// fresh ROOT (new tree) or PLACED under an existing Pro Max member. No pin needed.
export function RegisterProMaxMemberForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"ROOT" | "PLACED">("ROOT");

  const [name, setName] = useState("");
  const [nominee, setNominee] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "">("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [referId, setReferId] = useState("");
  const [side, setSide] = useState<"LEFT" | "RIGHT" | "">("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ name: string; memberCode: string; isRoot: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    if (!nominee.trim()) return toast.error("Nominee is required");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Valid email is required");
    if (!/^[0-9]{10}$/.test(mobile)) return toast.error("10-digit mobile is required");
    if (!PAN_REGEX.test(panNumber)) return toast.error("Valid PAN required (e.g. ABCDE1234F)");
    if (gender !== "MALE" && gender !== "FEMALE") return toast.error("Select gender");
    if (!address.trim()) return toast.error("Address is required");
    if (!bankAccountName.trim()) return toast.error("Bank account name is required");
    if (!/^[0-9]{9,18}$/.test(bankAccountNumber)) return toast.error("Bank account number must be 9-18 digits");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) return toast.error("Valid IFSC code required");
    if (!bankName.trim()) return toast.error("Bank name is required");
    if (mode === "PLACED") {
      if (!/^AM[0-9]{8}$/.test(referId.trim().toUpperCase())) return toast.error("Valid Refer ID required");
      if (side !== "LEFT" && side !== "RIGHT") return toast.error("Choose Left or Right slot");
    }

    setLoading(true);
    const res = await fetch("/api/promax-admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        nominee: nominee.trim(),
        gender,
        address: address.trim(),
        email: email.trim().toLowerCase(),
        mobile,
        panNumber,
        bankAccountName: bankAccountName.trim(),
        bankAccountNumber,
        bankIfsc,
        bankName: bankName.trim(),
        ...(mode === "PLACED" ? { referId: referId.trim().toUpperCase(), side } : {}),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not create member");
      return;
    }
    setSuccess({ name, memberCode: data.memberCode, isRoot: data.isRoot });
  }

  if (success) {
    return (
      <div className="card p-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-promax-600 grid place-items-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Pro Max member created</h2>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{success.name}</strong> {success.isRoot ? "started a new Pro Max tree." : "was placed in the tree."}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm">
          Member ID
          <code className="font-mono font-semibold bg-promax-50 text-promax-900 px-2.5 py-1 rounded border border-promax-200">{success.memberCode}</code>
        </div>
        <p className="text-xs text-muted-foreground">
          Default login password is the member&apos;s mobile number. Share the Member ID and ask them to log
          in at <code>/promax/login</code> and change their password.
        </p>
        <div className="flex justify-center gap-2">
          <button onClick={() => { setSuccess(null); router.refresh(); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold">
            Register another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-6">
      <div className="flex items-center gap-2 text-promax-700">
        <UserPlus className="h-4 w-4" /> <h2 className="font-semibold">New Pro Max member</h2>
      </div>

      {/* Placement mode */}
      <div>
        <label className="label">Join as</label>
        <div className="grid grid-cols-2 gap-2 max-w-md">
          <button type="button" onClick={() => setMode("ROOT")}
            className={`px-3 py-2 rounded-md border text-sm font-semibold ${mode === "ROOT" ? "bg-promax-600 text-white border-promax-700" : "bg-white text-promax-700 border-promax-200 hover:bg-promax-50"}`}>
            Root (new tree)
          </button>
          <button type="button" onClick={() => setMode("PLACED")}
            className={`px-3 py-2 rounded-md border text-sm font-semibold ${mode === "PLACED" ? "bg-promax-600 text-white border-promax-700" : "bg-white text-promax-700 border-promax-200 hover:bg-promax-50"}`}>
            Place under member
          </button>
        </div>
      </div>

      {mode === "PLACED" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Refer ID (parent)</label>
            <input className="input font-mono uppercase" value={referId} onChange={(e) => setReferId(e.target.value)} placeholder="AM12345678" />
            <p className="text-xs text-muted-foreground mt-1">If the slot is taken, the system spills to the next open slot on that side.</p>
          </div>
          <div>
            <label className="label">Slot</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSide("LEFT")}
                className={`px-3 py-2 rounded-md border text-sm font-semibold ${side === "LEFT" ? "bg-emerald-500 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"}`}>LEFT</button>
              <button type="button" onClick={() => setSide("RIGHT")}
                className={`px-3 py-2 rounded-md border text-sm font-semibold ${side === "RIGHT" ? "bg-sky-500 text-white border-sky-600" : "bg-white text-sky-700 border-sky-200 hover:bg-sky-50"}`}>RIGHT</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t">
        <Field label="Name *" value={name} onChange={setName} placeholder="Full name" />
        <Field label="Nominee *" value={nominee} onChange={setNominee} placeholder="Nominee full name" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Gender *</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setGender("MALE")}
              className={`px-3 py-2 rounded-md border text-sm font-semibold ${gender === "MALE" ? "bg-blue-500 text-white border-blue-600" : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"}`}>Male</button>
            <button type="button" onClick={() => setGender("FEMALE")}
              className={`px-3 py-2 rounded-md border text-sm font-semibold ${gender === "FEMALE" ? "bg-pink-500 text-white border-pink-600" : "bg-white text-pink-700 border-pink-200 hover:bg-pink-50"}`}>Female</button>
          </div>
        </div>
        <Field label="Address *" value={address} onChange={setAddress} placeholder="Full postal address" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email *" value={email} onChange={setEmail} placeholder="member@example.com" type="email" />
        <Field label="Mobile *" value={mobile} onChange={(v) => setMobile(v.replace(/[^0-9]/g, ""))} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} />
      </div>
      <div>
        <label className="label">PAN number *</label>
        <input
          className="input font-mono uppercase"
          value={panNumber}
          onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
          placeholder="ABCDE1234F"
          maxLength={10}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t">
        <Field label="Account name *" value={bankAccountName} onChange={setBankAccountName} />
        <Field label="Account number *" value={bankAccountNumber} onChange={(v) => setBankAccountNumber(v.replace(/[^0-9]/g, ""))} inputMode="numeric" maxLength={18} />
        <Field label="IFSC code *" value={bankIfsc} onChange={(v) => setBankIfsc(v.toUpperCase().slice(0, 11))} placeholder="HDFC0001234" mono />
        <Field label="Bank name *" value={bankName} onChange={setBankName} placeholder="HDFC Bank" />
      </div>

      <div className="rounded-lg border border-promax-200 bg-promax-50 px-3 py-2 text-xs text-promax-900">
        The new member&apos;s default login password is their <strong>mobile number</strong>. They will be asked to change it on first login.
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold disabled:opacity-60"
      >
        {loading ? "Registering…" : "Register member"}
      </button>
    </form>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", inputMode, maxLength, mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "email" | "tel" | "search" | "url" | "none" | "decimal";
  maxLength?: number;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        className={`input ${mono ? "font-mono" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
