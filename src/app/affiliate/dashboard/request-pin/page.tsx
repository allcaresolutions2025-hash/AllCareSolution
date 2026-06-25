import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestPinForm } from "./request-pin-form";
import { BuyPinForm } from "./buy-pin-form";
import { isLeader, LEADER_DOWNLINE_THRESHOLD } from "@/lib/leader";
import { getSetting } from "@/lib/settings";
import { toPaise, formatINR } from "@/lib/money";
import { CheckCircle2, Clock, XCircle, KeyRound, Crown, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RequestPinPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [requests, activePinCount, user, pinPriceInr, purchases] = await Promise.all([
    prisma.pinRequest.findMany({
      where: { userId: session.user.id, proMax: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { pins: true } } },
    }),
    prisma.pin.count({
      where: { ownerId: session.user.id, status: "ACTIVE", proMax: false },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leftLegCount: true, rightLegCount: true },
    }),
    getSetting("PIN_PRICE_INR"),
    prisma.pinPurchase.findMany({
      where: { userId: session.user.id, status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: { _count: { select: { pins: true } } },
    }),
  ]);

  const legs = { leftLegCount: user?.leftLegCount ?? 0, rightLegCount: user?.rightLegCount ?? 0 };
  const downlineTotal = legs.leftLegCount + legs.rightLegCount;
  const leader = isLeader(legs);
  const pricePerPinPaise = toPaise(pinPriceInr);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Request PIN</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pins let you add new members to your binary tree. Request the count you need; admin reviews each request before pins are issued.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-emerald-100 text-emerald-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{activePinCount}</div>
            <div className="text-xs text-muted-foreground">Active pins ready to use</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-amber-100 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {requests.filter((r) => r.status === "PENDING").length}
            </div>
            <div className="text-xs text-muted-foreground">Pending requests</div>
          </div>
        </div>
      </div>

      {leader ? (
        <div className="card overflow-hidden border-2 border-amber-300 bg-amber-50/40">
          <div className="p-5 border-b border-amber-200/60 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg grid place-items-center bg-amber-100 text-amber-700 shrink-0">
              <Crown className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold flex items-center gap-2">
                Leader perk — instant pin purchase
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  <Zap className="h-3 w-3" /> No admin approval
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                You have <strong className="text-amber-900">{downlineTotal} members</strong> in your downline — you qualify as a Leader.
                Pay <strong>{formatINR(pricePerPinPaise)}</strong> per pin via Razorpay and your pins are issued instantly.
              </p>
            </div>
          </div>
          <BuyPinForm pricePerPinPaise={pricePerPinPaise} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2">
          <Crown className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>Want instant pins?</strong> Once your downline reaches {LEADER_DOWNLINE_THRESHOLD} members
            ({downlineTotal} / {LEADER_DOWNLINE_THRESHOLD} so far) you unlock the Leader perk: pay via Razorpay and pins are issued
            immediately, no admin wait.
          </div>
        </div>
      )}

      <RequestPinForm />

      {purchases.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold">Razorpay pin purchases</h2>
            <p className="text-xs text-muted-foreground mt-1">Pins you bought instantly via Razorpay.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Paid</th>
                <th className="px-4 py-2 font-medium text-right">Quantity</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium">Payment ID</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {p.paidAt ? p.paidAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{p._count.pins}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatINR(p.totalAmount)}</td>
                  <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{p.razorpayPaymentId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Your recent requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No requests yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Requested</th>
                <th className="px-4 py-2 font-medium">Quantity</th>
                <th className="px-4 py-2 font-medium">Mobile</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Pins issued</th>
                <th className="px-4 py-2 font-medium">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-2 font-medium tabular-nums">{r.quantity}</td>
                  <td className="px-4 py-2 text-xs font-mono">{r.mobileNumber}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2 tabular-nums">{r._count.pins}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.reviewedAt ? r.reviewedAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
