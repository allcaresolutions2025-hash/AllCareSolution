"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { AfBankFields, emptyAfBank, type AfBankValue } from "@/components/af-bank-fields";

export function AfAddMemberForm({
  defaultSponsor,
  defaultSide,
  defaultBank,
}: {
  defaultSponsor: string;
  defaultSide: "" | "LEFT" | "RIGHT";
  defaultBank: Partial<Record<keyof AfBankValue, string | null>>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [sponsorAfId, setSponsorAfId] = useState(defaultSponsor);
  const [side, setSide] = useState<"" | "LEFT" | "RIGHT">(defaultSide);
  const [bank, setBank] = useState<AfBankValue>(() => emptyAfBank(defaultBank));
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ afId: string; name: string; mobile: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!side) {
      toast.error("Choose LEFT or RIGHT");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/af/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile, email, sponsorAfId: sponsorAfId.trim(), side, ...bank }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not create the AF account");
      toast.success(`AF ID ${json.afId} created`);
      setCreated({ afId: json.afId, name, mobile });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the AF account");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="card p-5 space-y-4 bg-af-soft border-af-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-af-600" />
          <h2 className="font-semibold">AF account created for {created.name}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">AF ID</div>
            <code className="font-mono text-lg font-bold">{created.afId}</code>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">First password (mobile)</div>
            <code className="font-mono text-lg font-bold">{created.mobile}</code>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Share these with the new member. They sign in at AF Login and must change the password on first login.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/af/dashboard/tree" className="btn-primary">
            View AF tree
          </Link>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setCreated(null);
              setName("");
              setMobile("");
              setEmail("");
              setSide("");
              setBank(emptyAfBank(defaultBank));
            }}
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-af-100 text-af-700 grid place-items-center">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">New AF account</h2>
          <p className="text-xs text-muted-foreground">The mobile number is the first-login password</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Place under AF ID</label>
          <input
            className="input font-mono uppercase"
            placeholder="AF12345678"
            value={sponsorAfId}
            onChange={(e) => setSponsorAfId(e.target.value.toUpperCase())}
            required
          />
        </div>
        <div>
          <label className="label">Side</label>
          <select
            className="input"
            value={side}
            onChange={(e) => setSide(e.target.value as "" | "LEFT" | "RIGHT")}
            required
          >
            <option value="">Choose side</option>
            <option value="LEFT">Left</option>
            <option value="RIGHT">Right</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Account holder name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Mobile (first-login password)</label>
          <input
            className="input"
            inputMode="numeric"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
            required
          />
        </div>
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="border-t pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Bank details</h3>
          <p className="text-xs text-muted-foreground">Withdrawals from the new AF account are paid to this account.</p>
        </div>
        <AfBankFields value={bank} onChange={setBank} />
      </div>

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Creating…" : "Create AF account"}
      </button>
    </form>
  );
}
