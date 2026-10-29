"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
};
const DELIVERY_BADGE: Record<string, string> = {
  PENDING: "badge-gray",
  SHIPPED: "badge-blue",
  DELIVERED: "badge-green",
};

export type PackageRowData = {
  id: string;
  user: { name: string; referralCode: string; phone: string | null };
  amountLabel: string;
  bv: number;
  productName: string;
  shipName: string;
  shipPhone: string;
  shipAddress: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  deliveryStatus: "PENDING" | "SHIPPED" | "DELIVERED";
  trackingNumber: string | null;
  adminNote: string | null;
  createdAt: string;
};

export function PackageRow({ row }: { row: PackageRowData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "approve" | "reject" | "ship" | "deliver", extra: { note?: string; trackingNumber?: string } = {}) {
    setLoading(true);
    const res = await fetch(`/api/admin/af/packages/${row.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success(
      action === "approve"
        ? `Approved — ${data.bv} BV sent to ${data.ancestors} upline AF account${data.ancestors === 1 ? "" : "s"}. Pair matching paid ${(data.matchingPaid / 100).toLocaleString("en-IN")} pts to ${data.membersMatched} account${data.membersMatched === 1 ? "" : "s"}.`
        : action === "reject"
          ? "Request rejected."
          : action === "ship"
            ? "Marked shipped."
            : "Marked delivered.",
    );
    router.refresh();
  }

  function approve() {
    if (!confirm(`Approve ${row.amountLabel} package for ${row.user.name}? This activates their points and adds ${row.bv} BV to the AF tree.`)) return;
    act("approve");
  }
  function reject() {
    const note = prompt("Reason for rejecting (shown to the member, optional):");
    if (note === null) return;
    act("reject", { note: note || undefined });
  }
  function ship() {
    const trackingNumber = prompt("Tracking number (optional):");
    if (trackingNumber === null) return;
    act("ship", { trackingNumber: trackingNumber || undefined });
  }
  function deliver() {
    if (!confirm(`Mark ${row.productName} delivered to ${row.shipName}?`)) return;
    act("deliver");
  }

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{row.user.name}</div>
        <div className="text-xs text-muted-foreground font-mono">{row.user.referralCode}</div>
        <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
          {new Date(row.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium whitespace-nowrap">{row.amountLabel}</div>
        <div className="text-xs text-muted-foreground">{row.bv} BV</div>
      </td>
      <td className="px-4 py-3 text-xs max-w-[240px]">
        <div className="font-medium text-sm">{row.productName}</div>
        <div className="text-muted-foreground mt-1">
          {row.shipName} · {row.shipPhone}
          <br />
          {row.shipAddress}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={STATUS_BADGE[row.status]}>{row.status}</span>
        {row.status === "APPROVED" && (
          <div className="mt-1">
            <span className={DELIVERY_BADGE[row.deliveryStatus]}>{row.deliveryStatus}</span>
          </div>
        )}
        {row.trackingNumber && <div className="text-xs text-muted-foreground mt-1 font-mono">{row.trackingNumber}</div>}
        {row.adminNote && <div className="text-xs text-muted-foreground mt-1 max-w-[180px]">“{row.adminNote}”</div>}
      </td>
      <td className="px-4 py-3">
        {row.status === "PENDING" ? (
          <div className="flex flex-col gap-1">
            <button disabled={loading} onClick={approve} className="btn-primary text-xs px-3 py-1">
              Approve
            </button>
            <button disabled={loading} onClick={reject} className="btn-danger text-xs px-3 py-1">
              Reject
            </button>
          </div>
        ) : row.status === "APPROVED" && row.deliveryStatus === "PENDING" ? (
          <button disabled={loading} onClick={ship} className="btn-outline text-xs px-3 py-1">
            Mark shipped
          </button>
        ) : row.status === "APPROVED" && row.deliveryStatus === "SHIPPED" ? (
          <button disabled={loading} onClick={deliver} className="btn-outline text-xs px-3 py-1">
            Mark delivered
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

export function RunMatchingButton({ ranToday }: { ranToday: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!confirm("Run today's housekeeping now (expire old BV, settle any outstanding matching)? The nightly cron will then skip today.")) return;
    setLoading(true);
    const res = await fetch("/api/admin/af/run-matching", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    if (data.skipped) toast("Matching already ran today.");
    else toast.success(`Matched ${data.membersMatched} member(s), paid ${(data.totalPaid / 100).toLocaleString("en-IN")} pts.`);
    router.refresh();
  }

  return (
    <button onClick={run} disabled={loading || ranToday} className="btn-outline">
      {loading ? "Running…" : ranToday ? "Catch-up done today" : "Run catch-up now"}
    </button>
  );
}
