"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { UserPlus, User, Mail, IdCard, Landmark, MapPin, CheckCircle2 } from "lucide-react";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function AddMemberForm({
  pins,
  pinValues,
  defaultReferId,
  defaultSide,
  myReferralCode,
  lockReferId = false,
  endpoint = "/api/members",
  successHref = "/affiliate/dashboard/referrals",
}: {
  pins: string[];
  // Optional map of pin code → denomination (1000 / 2000). When supplied, each
  // pin's value is shown in the selector so the member knows a 2000-pt pin will
  // credit 2000 pts to the person they enroll. Omitted by the Pro Max forms.
  pinValues?: Record<string, number>;
  defaultReferId: string;
  defaultSide: "LEFT" | "RIGHT" | "";
  myReferralCode: string;
  lockReferId?: boolean;
  // Where to POST the registration. Defaults to the 1000-pt members endpoint.
  endpoint?: string;
  successHref?: string;
}) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [pin, setPin] = useState(pins[0] ?? "");

  // Personal
  const [name, setName] = useState("");
  const [nominee, setNominee] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "">("");
  const [address, setAddress] = useState("");

  // Contact
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  // Identity
  const [panNumber, setPanNumber] = useState("");

  // Bank (mandatory)
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");

  // Placement
  const [referId, setReferId] = useState(defaultReferId);
  const [side, setSide] = useState<"LEFT" | "RIGHT" | "">(defaultSide);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    name: string;
    memberCode: string;
    side: "LEFT" | "RIGHT";
    spillover: number;
    placementName?: string;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return toast.error("Select a pin");
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
    if (!referId.trim()) return toast.error("Refer ID is required");
    if (side !== "LEFT" && side !== "RIGHT") return toast.error("Choose Left or Right slot");

    setLoading(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pinCode: pin,
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
        referId: referId.trim().toUpperCase(),
        side,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not add member");
      return;
    }
    // Refresh session so middleware re-reads mustOnboard (now false) from DB.
    await updateSession();
    setSuccess({
      name,
      memberCode: data.memberCode,
      side: side as "LEFT" | "RIGHT",
      spillover: data.spillover ?? 0,
      placementName: data.placement?.name,
    });
  }

  function dismissSuccess() {
    setSuccess(null);
    router.push(successHref);
    router.refresh();
  }

  return (
    <>
    {success && <SuccessModal data={success} onClose={dismissSuccess} />}
    <form onSubmit={submit} className="card p-6 space-y-6">
      <div className="flex items-center gap-2 text-brand-700">
        <UserPlus className="h-4 w-4" /> <h2 className="font-semibold">Registration form</h2>
      </div>

      {/* Pin */}
      <div>
        <label className="label">Select Pin</label>
        <select className="input font-mono" value={pin} onChange={(e) => setPin(e.target.value)} required>
          {pins.map((p) => (
            <option key={p} value={p}>
              {p}
              {pinValues?.[p] ? ` — ${pinValues[p].toLocaleString("en-IN")} pts pin` : ""}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">You have {pins.length} active pin{pins.length === 1 ? "" : "s"}.</p>
        {pinValues && (pinValues[pin] ?? 0) >= 2000 && (
          <p className="text-xs mt-2 rounded-lg bg-violet-50 border border-violet-200 text-violet-800 px-3 py-2">
            This is a <strong>{(pinValues[pin] ?? 0).toLocaleString("en-IN")} pts pin</strong> — the member
            you enroll with it gets the <strong>40 Combo Reward</strong> (claimed from admin) instead of the
            Welcome Kit. Points and placement work the same as a standard pin.
          </p>
        )}
      </div>

      {/* Personal */}
      <Section title="Personal" icon={<User className="h-4 w-4" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Name *" value={name} onChange={setName} placeholder="Full name" />
          <Field label="Nominee *" value={nominee} onChange={setNominee} placeholder="Nominee full name" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Gender *</label>
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
          <Field label="Address *" value={address} onChange={setAddress} placeholder="Full postal address" />
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact" icon={<Mail className="h-4 w-4" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Email *" value={email} onChange={setEmail} placeholder="member@example.com" type="email" />
          <Field label="Mobile *" value={mobile} onChange={(v) => setMobile(v.replace(/[^0-9]/g, ""))} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} />
        </div>
      </Section>

      {/* Identity */}
      <Section title="Identity" icon={<IdCard className="h-4 w-4" />}>
        <div>
          <label className="label">PAN number *</label>
          <input
            type="text"
            className={`input font-mono ${
              panNumber.length === 10 && !PAN_REGEX.test(panNumber) ? "border-red-400 focus:border-red-500" : ""
            }`}
            value={panNumber}
            onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
            placeholder="ABCDE1234F"
            maxLength={10}
            required
          />
          {panNumber.length > 0 && !PAN_REGEX.test(panNumber) && (
            <p className="text-xs text-red-600 mt-1">
              Invalid PAN format. Must be 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).
            </p>
          )}
          {panNumber.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).
            </p>
          )}
          {PAN_REGEX.test(panNumber) && (
            <p className="text-xs text-emerald-600 mt-1">PAN format looks good.</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            A single PAN can be used to register up to 15 members.
          </p>
        </div>
      </Section>

      {/* Bank — mandatory */}
      <Section title="Bank information (mandatory)" icon={<Landmark className="h-4 w-4" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Account name *" value={bankAccountName} onChange={setBankAccountName} />
          <Field label="Account number *" value={bankAccountNumber} onChange={(v) => setBankAccountNumber(v.replace(/[^0-9]/g, ""))} inputMode="numeric" maxLength={18} />
          <Field label="IFSC code *" value={bankIfsc} onChange={(v) => setBankIfsc(v.toUpperCase().slice(0, 11))} placeholder="HDFC0001234" mono />
          <Field label="Bank name *" value={bankName} onChange={setBankName} placeholder="HDFC Bank" />
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Name, Mobile, and Bank details cannot be edited later by the member — only by admin.
        </p>
      </Section>

      {/* Placement */}
      <Section title="Placement" icon={<MapPin className="h-4 w-4" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Refer ID</label>
            <input
              className={`input font-mono uppercase ${lockReferId ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
              value={referId}
              onChange={(e) => { if (!lockReferId) setReferId(e.target.value); }}
              readOnly={lockReferId}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {lockReferId
                ? <>Your referral code <code className="font-mono">{myReferralCode}</code> is used automatically.</>
                : <>Default is your code <code className="font-mono">{myReferralCode}</code>. If slot is taken, the system will spill over to the next open slot on the chosen side.</>
              }
            </p>
          </div>
          <div>
            <label className="label">Slot</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSide("LEFT")}
                className={`px-3 py-2 rounded-md border text-sm font-semibold ${
                  side === "LEFT" ? "bg-emerald-500 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                }`}>LEFT</button>
              <button type="button" onClick={() => setSide("RIGHT")}
                className={`px-3 py-2 rounded-md border text-sm font-semibold ${
                  side === "RIGHT" ? "bg-sky-500 text-white border-sky-600" : "bg-white text-sky-700 border-sky-200 hover:bg-sky-50"
                }`}>RIGHT</button>
            </div>
          </div>
        </div>
      </Section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        New member&apos;s default login password is their <strong>mobile number</strong>. They will be asked to change it on first login.
      </div>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Registering…" : "Register member"}
      </button>
    </form>
    </>
  );
}

function SuccessModal({
  data,
  onClose,
}: {
  data: { name: string; memberCode: string; side: "LEFT" | "RIGHT"; spillover: number; placementName?: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border-t-8 border-emerald-500 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 px-6 pt-8 pb-6 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-500 grid place-items-center mx-auto shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-9 w-9 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 mt-4">Registration successful</h2>
          <p className="text-sm text-emerald-800 mt-1">
            <strong>{data.name}</strong> has been added to your network.
          </p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Member ID</span>
            <code className="font-mono font-semibold bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded">
              {data.memberCode}
            </code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Slot</span>
            <span className={`font-semibold ${data.side === "LEFT" ? "text-emerald-700" : "text-sky-700"}`}>
              {data.side}
            </span>
          </div>
          {data.spillover > 0 && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Slot near the top was taken — placed <strong>{data.spillover}</strong> level
              {data.spillover === 1 ? "" : "s"} down{data.placementName ? <> under <strong>{data.placementName}</strong></> : ""}.
            </div>
          )}
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            Default login password is the member&apos;s <strong>mobile number</strong>. They&apos;ll be asked to change it on first login.
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-2 border-t first:border-0 first:pt-0">
      <h3 className="font-semibold text-sm inline-flex items-center gap-2 text-brand-700">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
  mono,
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
        required
      />
    </div>
  );
}
