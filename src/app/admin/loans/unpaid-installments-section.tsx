"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Bell, MessageCircle, Phone } from "lucide-react";
import { formatRupees } from "@/lib/loan";
import { SearchBox } from "./pending-loans-section";

export type UnpaidInstallmentRow = {
  id: string;
  loanId: string;
  weekNumber: number;
  amount: number;
  dueDate: string;
  status: "PENDING" | "RECEIPT_UPLOADED";
  lastReminderAt: string | null;
  daysOverdue: number; // 0 means due today, >0 means past due
  userName: string;
  userEmail: string;
  userCode: string;
  userPhone: string | null;
  userPan: string | null;
  tierLabel: string;
  totalUnpaid: number; // total paise this user still owes across all unpaid installments
};

function matches(row: UnpaidInstallmentRow, q: string): boolean {
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

export function UnpaidInstallmentsSection({
  title,
  description,
  rows,
  tone,
}: {
  title: string;
  description: string;
  rows: UnpaidInstallmentRow[];
  tone: "amber" | "red";
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => rows.filter((r) => matches(r, q)), [rows, q]);

  const totals = useMemo(() => {
    const sum = filtered.reduce((acc, r) => acc + r.amount, 0);
    return { count: filtered.length, sum };
  }, [filtered]);

  const ring = tone === "red" ? "ring-red-200 bg-red-50/30" : "ring-amber-200 bg-amber-50/30";

  return (
    <div className={`card overflow-hidden ring-1 ${ring}`}>
      <div className="p-5 border-b border-current/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{title} ({rows.length})</h2>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <SearchBox value={q} onChange={setQ} placeholder="Search name / code / phone / PAN…" />
        </div>
        {filtered.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{totals.count}</span> installment{totals.count === 1 ? "" : "s"} ·{" "}
            <span className="font-medium text-foreground">{formatRupees(totals.sum)}</span> due
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Nothing here right now.</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No installments match &ldquo;{q}&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Tier · Week</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium text-right">Total unpaid</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Reminder</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <UnpaidRow key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UnpaidRow({ row }: { row: UnpaidInstallmentRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [lastReminderAt, setLastReminderAt] = useState<string | null>(row.lastReminderAt);

  async function recordReminder() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/loans/installments/${row.id}/remind`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Could not record reminder");
        return;
      }
      setLastReminderAt(json.lastReminderAt ?? new Date().toISOString());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function whatsappLink(): string | null {
    if (!row.userPhone) return null;
    const digits = row.userPhone.replace(/[^\d]/g, "");
    if (!digits) return null;
    // Default to India country code if user entered a 10-digit number.
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const due = new Date(row.dueDate).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
    const overdueLabel = row.daysOverdue > 0 ? ` (overdue by ${row.daysOverdue} day${row.daysOverdue === 1 ? "" : "s"})` : "";
    const msg =
      `Hi ${row.userName}, this is a reminder from ACHT MART. ` +
      `Your loan installment of ${formatRupees(row.amount)} (week ${row.weekNumber}) was due on ${due}${overdueLabel}. ` +
      `Please clear it at the earliest and upload the receipt in the app. Thanks.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  async function sendWhatsapp() {
    const link = whatsappLink();
    if (!link) {
      toast.error("No phone on file for this member");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
    await recordReminder();
  }

  const due = new Date(row.dueDate);
  const overdueBadge =
    row.daysOverdue > 0 ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-800 w-fit">
        {row.daysOverdue} day{row.daysOverdue === 1 ? "" : "s"} overdue
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 w-fit">
        Due today
      </span>
    );

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-2 text-xs">
        <div>{due.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}</div>
        <div className="mt-1">{overdueBadge}</div>
      </td>
      <td className="px-4 py-2">
        <div className="font-medium">{row.userName}</div>
        <div className="text-xs text-muted-foreground">
          <code className="font-mono">{row.userCode}</code>
          {row.userPan ? <> · PAN <code className="font-mono">{row.userPan}</code></> : null}
        </div>
        <div className="text-xs text-muted-foreground">{row.userEmail}</div>
        {row.userPhone && (
          <a
            href={`tel:${row.userPhone}`}
            className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline mt-0.5"
          >
            <Phone className="h-3 w-3" /> {row.userPhone}
          </a>
        )}
      </td>
      <td className="px-4 py-2 text-xs">
        <div>{row.tierLabel}</div>
        <div className="text-muted-foreground">Week {row.weekNumber}</div>
      </td>
      <td className="px-4 py-2 text-right font-bold tabular-nums">{formatRupees(row.amount)}</td>
      <td className="px-4 py-2 text-right tabular-nums">{formatRupees(row.totalUnpaid)}</td>
      <td className="px-4 py-2">
        {row.status === "RECEIPT_UPLOADED" ? (
          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
            Receipt uploaded
          </span>
        ) : (
          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
            Not paid
          </span>
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={sendWhatsapp}
              disabled={busy || !row.userPhone}
              title={row.userPhone ? "Open WhatsApp with a prefilled reminder" : "No phone number on file"}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </button>
            <button
              onClick={recordReminder}
              disabled={busy}
              title="Mark a reminder as sent (without opening WhatsApp)"
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white border hover:bg-slate-50 disabled:opacity-50"
            >
              <Bell className="h-3.5 w-3.5" /> Log
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {lastReminderAt
              ? `Last: ${new Date(lastReminderAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" })}`
              : "No reminder sent yet"}
          </div>
        </div>
      </td>
    </tr>
  );
}
