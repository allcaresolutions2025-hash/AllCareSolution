import { prisma } from "@/lib/db";
import { PinRequestRow } from "./pin-request-row";
import { GeneratePinsCard } from "./generate-pins-card";
import { formatINR, formatPoints } from "@/lib/money";
import { KeyRound, Clock, CheckCircle2, CreditCard, Wallet } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminPinsPage({
  searchParams,
}: {
  searchParams: { rzPage?: string; histPage?: string; pwPage?: string };
}) {
  const rzPage = Math.max(1, parseInt(searchParams.rzPage ?? "1", 10) || 1);
  const histPage = Math.max(1, parseInt(searchParams.histPage ?? "1", 10) || 1);
  const pwPage = Math.max(1, parseInt(searchParams.pwPage ?? "1", 10) || 1);

  const [pending, recent, recentTotal, totalPinsIssued, totalPinsActive, razorpayPurchases, razorpayTotal, walletPurchases, walletTotal] = await Promise.all([
    prisma.pinRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true, referralCode: true } } },
    }),
    prisma.pinRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { reviewedAt: "desc" },
      skip: (histPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true, referralCode: true } },
        _count: { select: { pins: true } },
      },
    }),
    prisma.pinRequest.count({ where: { status: { in: ["APPROVED", "REJECTED"] } } }),
    prisma.pin.count(),
    prisma.pin.count({ where: { status: "ACTIVE" } }),
    prisma.pinPurchase.findMany({
      where: { status: "PAID", source: "RAZORPAY" },
      orderBy: { paidAt: "desc" },
      skip: (rzPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true, referralCode: true, leftLegCount: true, rightLegCount: true } },
        _count: { select: { pins: true } },
      },
    }),
    prisma.pinPurchase.count({ where: { status: "PAID", source: "RAZORPAY" } }),
    prisma.pinPurchase.findMany({
      where: { status: "PAID", source: "PIN_WALLET" },
      orderBy: { paidAt: "desc" },
      skip: (pwPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true, referralCode: true } },
        _count: { select: { pins: true } },
      },
    }),
    prisma.pinPurchase.count({ where: { status: "PAID", source: "PIN_WALLET" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PIN Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review pin requests from members and approve to issue AM-prefixed pin codes.
        </p>
      </div>

      <GeneratePinsCard />

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi icon={<Clock className="h-5 w-5" />} label="Pending requests" value={pending.length} tone="amber" />
        <Kpi icon={<KeyRound className="h-5 w-5" />} label="Active pins" value={totalPinsActive} tone="emerald" />
        <Kpi icon={<CheckCircle2 className="h-5 w-5" />} label="Total pins issued" value={totalPinsIssued} tone="brand" />
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Pending requests ({pending.length})</h2>
        </div>
        {pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No pending requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Requested</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Mobile</th>
                  <th className="px-4 py-2 font-medium text-right">Quantity</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <PinRequestRow
                    key={r.id}
                    id={r.id}
                    createdAt={r.createdAt.toISOString()}
                    userName={r.user.name}
                    userEmail={r.user.email}
                    userCode={r.user.referralCode}
                    mobile={r.mobileNumber}
                    quantity={r.quantity}
                    proMax={r.proMax}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-brand-700" />
          <h2 className="font-semibold">Razorpay pin purchases (Leaders)</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            Auto-issued. No admin approval needed.
          </span>
        </div>
        {razorpayPurchases.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No Razorpay pin purchases yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Paid</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Downline</th>
                  <th className="px-4 py-2 font-medium">Mobile</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Razorpay IDs</th>
                </tr>
              </thead>
              <tbody>
                {razorpayPurchases.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {p.paidAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{p.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{p.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-xs tabular-nums">
                      {p.user.leftLegCount + p.user.rightLegCount}
                      <span className="text-muted-foreground"> (L {p.user.leftLegCount} / R {p.user.rightLegCount})</span>
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{p.mobileNumber}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{p._count.pins}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{formatINR(p.totalAmount)}</td>
                    <td className="px-4 py-2 text-[11px] font-mono text-muted-foreground">
                      <div>Order: {p.razorpayOrderId}</div>
                      <div>Payment: {p.razorpayPaymentId ?? "—"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {razorpayTotal > 0 && (
          <Pagination
            page={rzPage}
            pageParam="rzPage"
            pageSize={PAGE_SIZE}
            total={razorpayTotal}
            basePath="/admin/pins"
            params={{
              histPage: histPage > 1 ? String(histPage) : undefined,
              pwPage: pwPage > 1 ? String(pwPage) : undefined,
            }}
          />
        )}
      </div>

      {/* Pin Wallet purchases — auto-issued, paid from members' Pin Wallet points */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center gap-2">
          <Wallet className="h-4 w-4 text-brand-700" />
          <h2 className="font-semibold">Pin Wallet purchases</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            Paid from Pin Wallet points. Auto-issued, no admin approval.
          </span>
        </div>
        {walletPurchases.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No Pin Wallet purchases yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Paid</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Mobile</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Points spent</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {walletPurchases.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {p.paidAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{p.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{p.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{p.mobileNumber}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{p._count.pins}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">{formatPoints(p.totalAmount)}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                        <Wallet className="h-3 w-3" /> Pin Wallet
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {walletTotal > 0 && (
          <Pagination
            page={pwPage}
            pageParam="pwPage"
            pageSize={PAGE_SIZE}
            total={walletTotal}
            basePath="/admin/pins"
            params={{
              rzPage: rzPage > 1 ? String(rzPage) : undefined,
              histPage: histPage > 1 ? String(histPage) : undefined,
            }}
          />
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Recent history</h2>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No history yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Reviewed</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Mobile</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Pins issued</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {r.reviewedAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium flex items-center gap-2">
                        {r.user.name}
                        {r.proMax && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            PRO MAX
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">{r.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{r.mobileNumber}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.quantity}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r._count.pins}</td>
                    <td className="px-4 py-2">
                      {r.status === "APPROVED" ? (
                        <span className="badge-green">Approved</span>
                      ) : (
                        <span className="badge-red">Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {recentTotal > 0 && (
          <Pagination
            page={histPage}
            pageParam="histPage"
            pageSize={PAGE_SIZE}
            total={recentTotal}
            basePath="/admin/pins"
            params={{
              rzPage: rzPage > 1 ? String(rzPage) : undefined,
              pwPage: pwPage > 1 ? String(pwPage) : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "amber" | "emerald" | "brand" }) {
  const toneMap = {
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    brand: "bg-brand-100 text-brand-700",
  };
  return (
    <div className="card p-5">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${toneMap[tone]}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
