import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFranchiseMemberIds } from "@/lib/franchise";
import { formatRupees, tierByKey } from "@/lib/loan";
import { FranchiseLoanActions } from "./loan-actions";
import { BadgeIndianRupee, Clock, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Loan Requests — Franchise" };

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

export default async function FranchiseLoansPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const leaderId = session.user.id;

  const memberIds = await getFranchiseMemberIds(leaderId);
  const scopedIds = memberIds.length ? memberIds : ["-"];

  const [pending, forwarded, teamLoans] = await Promise.all([
    // Waiting on me.
    prisma.loan.findMany({
      where: { franchiseId: leaderId, franchiseStatus: "PENDING", status: "REQUESTED" },
      orderBy: { requestedAt: "asc" },
      include: {
        user: {
          select: { name: true, email: true, referralCode: true, phone: true, whatsappNumber: true, leftLegCount: true, rightLegCount: true },
        },
      },
    }),
    // I approved these — now sitting with the admin.
    prisma.loan.findMany({
      where: { franchiseId: leaderId, franchiseStatus: "APPROVED", status: "REQUESTED" },
      orderBy: { franchiseReviewedAt: "desc" },
      include: { user: { select: { name: true, referralCode: true } } },
    }),
    // Everything my team has running or finished.
    prisma.loan.findMany({
      // Pro Max loans belong to the Pro Max admin, not to a franchise.
      where: { userId: { in: scopedIds }, proMax: false, status: { in: ["APPROVED", "CLOSED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, referralCode: true } },
        installments: { select: { status: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BadgeIndianRupee className="h-6 w-6 text-franchise-600" /> Loan Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your downline&apos;s loan applications land here first. Approving forwards the request
          to the admin, who does the final approval and disburses the money.
        </p>
      </div>

      {/* ---- Awaiting my approval ---- */}
      <section className="card p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-amber-600" /> Awaiting your approval ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting on you right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 pr-3">Member</th>
                  <th className="text-left py-2 pr-3">Loan</th>
                  <th className="text-left py-2 pr-3">Team</th>
                  <th className="text-left py-2 pr-3">Requested</th>
                  <th className="text-right py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pending.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{l.user.name}</div>
                      <div className="text-xs text-muted-foreground">{l.user.referralCode}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-semibold tabular-nums">{formatRupees(l.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {tierByKey(l.tierKey)?.label ?? l.tierKey} · {l.totalWeeks}w
                      </div>
                    </td>
                    <td className="py-3 pr-3 tabular-nums text-xs">
                      L {l.user.leftLegCount} / R {l.user.rightLegCount}
                    </td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                      {l.requestedAt.toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 text-right">
                      <FranchiseLoanActions id={l.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- Forwarded, waiting on admin ---- */}
      <section className="card p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-4 w-4 text-franchise-600" /> Forwarded to admin ({forwarded.length})
        </h2>
        {forwarded.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing pending with the admin.</p>
        ) : (
          <ul className="divide-y">
            {forwarded.map((l) => (
              <li key={l.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className="font-medium">{l.user.name}</span>{" "}
                  <span className="text-xs text-muted-foreground">{l.user.referralCode}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums font-semibold">{formatRupees(l.amount)}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-franchise-100 text-franchise-700">
                    Awaiting admin
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Team loan status ---- */}
      <section className="card p-5">
        <h2 className="font-semibold mb-4">Team loan status</h2>
        {teamLoans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No loans in your team yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 pr-3">Member</th>
                  <th className="text-left py-2 pr-3">Amount</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2 pr-3">Repaid</th>
                  <th className="text-left py-2">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teamLoans.map((l) => {
                  const verified = l.installments.filter((i) => i.status === "VERIFIED").length;
                  return (
                    <tr key={l.id}>
                      <td className="py-3 pr-3">
                        <div className="font-medium">{l.user.name}</div>
                        <div className="text-xs text-muted-foreground">{l.user.referralCode}</div>
                      </td>
                      <td className="py-3 pr-3 tabular-nums font-semibold">{formatRupees(l.amount)}</td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[l.status] ?? "bg-slate-100 text-slate-700"}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 tabular-nums text-xs">
                        {verified} / {l.installments.length || l.totalWeeks}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {l.dueDate ? l.dueDate.toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
