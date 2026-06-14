"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search, Check, X, MessageCircle, ShieldAlert } from "lucide-react";
import { formatRupees } from "@/lib/loan";

export type PendingLoanRow = {
  id: string;
  requestedAt: string;
  userName: string;
  userEmail: string;
  userCode: string;
  userPhone: string | null;
  userPan: string | null;
  tierLabel: string;
  amount: number;
  totalWeeks: number;
  leftLegCount: number;
  rightLegCount: number;
  // Count of OTHER ACTIVE loans (REQUESTED + APPROVED) on the same PAN,
  // excluding this row. Anything > 0 means another account on this PAN
  // already has a pending or disbursed loan — strong signal the admin
  // should not approve a second loan for the same identity.
  duplicatePanCount: number;
};

function matches(row: PendingLoanRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  return (
    row.userName.toLowerCase().includes(needle) ||
    row.userEmail.toLowerCase().includes(needle) ||
    row.userCode.toLowerCase().includes(needle) ||
    (row.userPan?.toLowerCase().includes(needle) ?? false) ||
    (row.userPhone?.toLowerCase().includes(needle) ?? false)
  );
}

export function PendingLoansSection({ rows }: { rows: PendingLoanRow[] }) {
  const [q, setQ] = useState("");
  const [onlyDupes, setOnlyDupes] = useState(false);
  const filtered = useMemo(
    () => rows.filter((r) => matches(r, q) && (!onlyDupes || r.duplicatePanCount > 0)),
    [rows, q, onlyDupes],
  );
  const duplicateCount = useMemo(() => rows.filter((r) => r.duplicatePanCount > 0).length, [rows]);

  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Pending loan requests ({rows.length})</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Verify the member, hand over the cash offline, then click Approve to issue the repayment schedule.
              Search by name, email, code, phone, or PAN to find duplicate applications across the 15 IDs a PAN may hold.
            </p>
          </div>
          <SearchBox value={q} onChange={setQ} placeholder="Search name / email / code / PAN…" />
        </div>

        {duplicateCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-700 shrink-0" />
              <span>
                <strong>{duplicateCount}</strong> request{duplicateCount === 1 ? "" : "s"} flagged — same PAN already has an active loan on another account.
              </span>
            </div>
            <button
              onClick={() => setOnlyDupes((v) => !v)}
              className="px-2 py-1 rounded-md bg-white border border-red-300 text-red-700 hover:bg-red-100 font-medium"
            >
              {onlyDupes ? "Show all" : "Show only flagged"}
            </button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No pending loan requests.</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No requests match &ldquo;{q}&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Requested</th>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium text-center">L / R</th>
                <th className="px-4 py-2 font-medium">PAN</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium text-right">Weeks</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <PendingLoanTr key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PendingLoanTr({ row }: { row: PendingLoanRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function whatsappLink(): string | null {
    if (!row.userPhone) return null;
    const digits = row.userPhone.replace(/[^\d]/g, "");
    if (!digits) return null;
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const msg =
      `Good day, ${row.userName}!\n\n` +
      `We are pleased to inform you that your loan application of ${formatRupees(row.amount)} with ACHT MART has been reviewed and you are eligible to proceed with the loan disbursement.\n\n` +
      `To complete the processing of your loan, we kindly request you to provide a valid Government-issued ID proof (such as Aadhaar Card, PAN Card, Passport, or Voter ID) at your earliest convenience.\n\n` +
      `Please feel free to reach out if you have any questions or require further assistance. We look forward to serving you.\n\n` +
      `Thank you for being a valued member of ACHT MART.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  async function act(action: "approve" | "reject") {
    if (busy) return;
    const notes =
      action === "reject"
        ? prompt("Reason for rejecting? (optional)") ?? ""
        : prompt(`Confirm you have disbursed ${formatRupees(row.amount)} offline to ${row.userName}. Add any notes (optional):`) ?? "";
    if (action === "approve" && notes === null) return;
    setBusy(true);
    const res = await fetch(`/api/admin/loans/${row.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || `${action} failed`);
      return;
    }
    toast.success(action === "approve" ? "Loan approved & schedule generated" : "Loan rejected");
    router.refresh();
  }

  const dupe = row.duplicatePanCount > 0;
  return (
    <tr className={`border-t align-top ${dupe ? "bg-red-50/40" : ""}`}>
      <td className="px-4 py-2 text-xs text-muted-foreground">
        {new Date(row.requestedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
      </td>
      <td className="px-4 py-2">
        <div className="font-medium">{row.userName}</div>
        <div className="text-xs text-muted-foreground">
          {row.userEmail} · <code className="font-mono">{row.userCode}</code>
        </div>
        {row.userPhone && <div className="text-xs text-muted-foreground">{row.userPhone}</div>}
      </td>
      <td className="px-4 py-2 text-center">
        <div className="inline-flex items-center gap-1 text-xs tabular-nums">
          <span
            className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-mono"
            title="Left leg member count"
          >
            L {row.leftLegCount}
          </span>
          <span className="text-muted-foreground">/</span>
          <span
            className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-200 font-mono"
            title="Right leg member count"
          >
            R {row.rightLegCount}
          </span>
        </div>
      </td>
      <td className="px-4 py-2">
        {row.userPan ? (
          <div className="flex flex-col gap-1">
            <code className="font-mono text-xs">{row.userPan}</code>
            {dupe && (
              <span
                title="Another account on this PAN has a REQUESTED or APPROVED loan. Do NOT approve a second loan for the same identity."
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 w-fit"
              >
                <ShieldAlert className="h-3 w-3" />
                +{row.duplicatePanCount} other active loan{row.duplicatePanCount === 1 ? "" : "s"} on this PAN
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-xs">{row.tierLabel}</td>
      <td className="px-4 py-2 text-right font-bold tabular-nums">{formatRupees(row.amount)}</td>
      <td className="px-4 py-2 text-right tabular-nums">{row.totalWeeks}</td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => act("approve")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            onClick={() => act("reject")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white text-red-700 border border-red-300 hover:bg-red-50 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Reject
          </button>
          {whatsappLink() ? (
            <a
              href={whatsappLink()!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-[#25D366] text-white hover:bg-[#1ebe5d]"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          ) : (
            <span
              title="No phone number on file"
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-400 cursor-not-allowed"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"}
        className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-input bg-white w-72 max-w-full focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </div>
  );
}
