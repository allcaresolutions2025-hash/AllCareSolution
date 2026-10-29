"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserPlus, Clock } from "lucide-react";
import { AfBankFields, emptyAfBank, type AfBankValue } from "@/components/af-bank-fields";
import { AfProfileFields, emptyAfProfile, type AfProfileValue } from "@/components/af-profile-fields";

/** An open LEFT/RIGHT position under `afId` in the requester's AF tree. */
export type OpenSlot = { afId: string; name: string; side: "LEFT" | "RIGHT"; depth: number };

export function AfAddMemberForm({
  openSlots,
  defaultSlot,
  feePoints,
  defaultProfile,
  defaultBank,
}: {
  openSlots: OpenSlot[];
  defaultSlot: string; // "AF12345678:LEFT", or "" for none chosen
  feePoints: number;
  defaultProfile: Parameters<typeof emptyAfProfile>[0];
  defaultBank: Partial<Record<keyof AfBankValue, string | null>>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [slot, setSlot] = useState(defaultSlot);
  const [profile, setProfile] = useState<AfProfileValue>(() => emptyAfProfile(defaultProfile));
  const [bank, setBank] = useState<AfBankValue>(() => emptyAfBank(defaultBank));
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState<{ name: string; placement: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const [sponsorAfId, side] = slot.split(":");
    if (!sponsorAfId || !side) {
      toast.error("Choose where to place the new account");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/af/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile, email, sponsorAfId, side, ...profile, ...bank }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send the request");
      toast.success("AF ID request sent to the admin");
      setRequested({ name, placement: `${side.toLowerCase()} of ${sponsorAfId}` });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the request");
    } finally {
      setBusy(false);
    }
  }

  if (requested) {
    return (
      <div className="card p-5 space-y-4 bg-af-soft border-af-200">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-af-600" />
          <h2 className="font-semibold">Request sent for {requested.name}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Pay the <strong>{feePoints}-pt</strong> AF ID fee to the admin. Once they confirm it and approve, the account
          is created {requested.placement} and its AF ID appears in your requests below. The first password is the
          mobile number.
        </p>
        <button
          type="button"
          className="btn-outline"
          onClick={() => {
            setRequested(null);
            setName("");
            setMobile("");
            setEmail("");
            setSlot("");
            setProfile(emptyAfProfile(defaultProfile));
            setBank(emptyAfBank(defaultBank));
          }}
        >
          Request another
        </button>
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
          <h2 className="font-semibold">Request a new AF account</h2>
          <p className="text-xs text-muted-foreground">
            Fee {feePoints} pts, paid to the admin · the mobile number is the first-login password
          </p>
        </div>
      </div>

      <div>
        <label className="label">Position (parent AF ID · side)</label>
        <select className="input font-mono" value={slot} onChange={(e) => setSlot(e.target.value)} required>
          <option value="">{openSlots.length ? "Choose an open position" : "No open positions in your tree"}</option>
          {openSlots.map((o) => (
            <option key={`${o.afId}:${o.side}`} value={`${o.afId}:${o.side}`}>
              {o.afId} · {o.side === "LEFT" ? "Left" : "Right"} — {o.name}
              {o.depth === 0 ? " (you)" : ` (level ${o.depth})`}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          The new account&apos;s parent is the AF ID you pick here. You can also click L+ / R+ on the AF tree.
        </p>
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
          <h3 className="text-sm font-semibold">Personal details</h3>
          <p className="text-xs text-muted-foreground">
            Prefilled with yours. Change them to the new account holder&apos;s details.
          </p>
        </div>
        <AfProfileFields value={profile} onChange={setProfile} />
      </div>

      <div className="border-t pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Bank details</h3>
          <p className="text-xs text-muted-foreground">Withdrawals from the new AF account are paid to this account.</p>
        </div>
        <AfBankFields value={bank} onChange={setBank} />
      </div>

      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Sending…" : "Send request to admin"}
      </button>
    </form>
  );
}
