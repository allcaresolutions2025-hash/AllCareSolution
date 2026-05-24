import { prisma } from "@/lib/db";
import { PinRequestRow } from "./pin-request-row";
import { GeneratePinsCard } from "./generate-pins-card";
import { KeyRound, Clock, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPinsPage() {
  const [pending, recent, totalPinsIssued, totalPinsActive] = await Promise.all([
    prisma.pinRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true, referralCode: true } } },
    }),
    prisma.pinRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { reviewedAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true, referralCode: true } },
        _count: { select: { pins: true } },
      },
    }),
    prisma.pin.count(),
    prisma.pin.count({ where: { status: "ACTIVE" } }),
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
                  />
                ))}
              </tbody>
            </table>
          </div>
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
                      {r.reviewedAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.user.name}</div>
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
