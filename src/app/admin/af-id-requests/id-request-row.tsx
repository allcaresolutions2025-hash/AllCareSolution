"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { AfBankFields, emptyAfBank, type AfBankValue } from "@/components/af-bank-fields";
import { AfProfileFields, emptyAfProfile, type AfProfileValue } from "@/components/af-profile-fields";
import { PAISE_PER_POINT } from "@/lib/money";

const BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
};

export type AfIdRequestRowData = {
  id: string;
  requester: { name: string; referralCode: string };
  name: string;
  mobile: string;
  email: string;
  sponsorAfId: string | null;
  side: "LEFT" | "RIGHT" | null;
  profile: Parameters<typeof emptyAfProfile>[0];
  bank: Partial<Record<keyof AfBankValue, string | null>>;
  note: string | null;
  fee: number; // paise; 0 on requests from before the fee
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAfId: string | null;
  createdAt: string;
};

export function AfIdRequestRow({ row }: { row: AfIdRequestRowData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(row.name);
  const [mobile, setMobile] = useState(row.mobile);
  const [email, setEmail] = useState(row.email);
  const [sponsorAfId, setSponsorAfId] = useState(row.sponsorAfId ?? "");
  const [side, setSide] = useState<"LEFT" | "RIGHT">(row.side ?? "LEFT");
  const [profile, setProfile] = useState<AfProfileValue>(() => emptyAfProfile(row.profile));
  const [bank, setBank] = useState<AfBankValue>(() => emptyAfBank(row.bank));
  const [feeReceived, setFeeReceived] = useState(false);
  const feePts = row.fee / PAISE_PER_POINT;

  async function send(body: Record<string, unknown>) {
    setLoading(true);
    const res = await fetch(`/api/admin/af/id-requests/${row.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return false;
    }
    return data;
  }

  async function approve(e: React.FormEvent) {
    e.preventDefault();
    const sponsor = sponsorAfId.trim();
    const where = sponsor ? `${side.toLowerCase()} of ${sponsor}` : "as a top-level account (no sponsor)";
    if (!confirm(`Create an AF account for ${name}, placed ${where}?`)) return;
    const data = await send({
      action: "approve",
      name,
      mobile,
      email,
      sponsorAfId: sponsor,
      side: sponsor ? side : null,
      feeReceived,
      ...profile,
      ...bank,
    });
    if (data) {
      toast.success(`AF ID ${data.afId} created.`);
      setOpen(false);
      router.refresh();
    }
  }

  async function reject() {
    const note = prompt("Reason for rejecting (shown to the member, optional):");
    if (note === null) return;
    if (await send({ action: "reject", note: note || undefined })) {
      toast.success("Request rejected.");
      router.refresh();
    }
  }

  return (
    <>
      <tr className="border-t align-top">
        <td className="px-4 py-3">
          <div className="font-medium">{row.requester.name}</div>
          <div className="text-xs text-muted-foreground font-mono">{row.requester.referralCode}</div>
          <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
            {new Date(row.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.mobile} · {row.email}
          </div>
          {row.profile?.panNumber && (
            <div className="text-xs text-muted-foreground mt-1 font-mono">PAN {row.profile.panNumber}</div>
          )}
          {row.bank.bankAccountNumber && (
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              {row.bank.bankName} · {row.bank.bankAccountNumber} · {row.bank.bankIfsc}
            </div>
          )}
          {row.note && <div className="text-xs text-muted-foreground mt-1 max-w-[240px]">“{row.note}”</div>}
          {row.fee > 0 && <div className="text-xs font-medium mt-1">Fee: {feePts} pts (offline)</div>}
        </td>
        <td className="px-4 py-3 text-xs">
          {row.sponsorAfId ? (
            <>
              <span className="font-mono">{row.sponsorAfId}</span>
              {row.side ? ` · ${row.side.toLowerCase()}` : ""}
            </>
          ) : (
            <span className="text-muted-foreground">None given</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={BADGE[row.status]}>{row.status}</span>
          {row.createdAfId && <div className="text-xs font-mono font-semibold mt-1">{row.createdAfId}</div>}
          {row.adminNote && <div className="text-xs text-muted-foreground mt-1 max-w-[180px]">“{row.adminNote}”</div>}
        </td>
        <td className="px-4 py-3">
          {row.status === "PENDING" ? (
            <div className="flex flex-col gap-1">
              <button disabled={loading} onClick={() => setOpen((v) => !v)} className="btn-primary text-xs px-3 py-1">
                {open ? "Close" : "Approve…"}
              </button>
              <button disabled={loading} onClick={reject} className="btn-danger text-xs px-3 py-1">
                Reject
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-af-50/40">
          <td colSpan={5} className="px-4 py-4">
            <form onSubmit={approve} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-end">
              <div>
                <label className="label">Account holder name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Mobile (first password)</label>
                <input
                  className="input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Sponsor AF ID</label>
                <input
                  className="input font-mono uppercase"
                  placeholder="Blank = top-level account"
                  value={sponsorAfId}
                  onChange={(e) => setSponsorAfId(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="label">Side</label>
                <select
                  className="input"
                  value={side}
                  onChange={(e) => setSide(e.target.value as "LEFT" | "RIGHT")}
                  disabled={!sponsorAfId.trim()}
                >
                  <option value="LEFT">Left</option>
                  <option value="RIGHT">Right</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <AfProfileFields value={profile} onChange={setProfile} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <AfBankFields value={bank} onChange={setBank} />
              </div>
              {row.fee > 0 && (
                <label className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={feeReceived}
                    onChange={(e) => setFeeReceived(e.target.checked)}
                    required
                  />
                  I have received the {feePts}-pt AF ID fee from {row.requester.name} ({row.requester.referralCode}).
                </label>
              )}
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Creating…" : "Create AF account"}
              </button>
              <p className="sm:col-span-2 lg:col-span-3 text-xs text-muted-foreground">
                Leave the sponsor blank only for the first (top) AF account. Personal and bank details are as requested
                (older requests start with the requester&apos;s). The first password is the mobile number.
              </p>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
