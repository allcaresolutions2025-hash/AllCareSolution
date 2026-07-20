import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFranchiseMemberIds } from "@/lib/franchise";
import { formatRupees } from "@/lib/loan";
import { BadgeIndianRupee, AlertTriangle, Gift, Users, ChevronRight, Store } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Franchise Center" };

export default async function FranchiseOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const leaderId = session.user.id;

  const memberIds = await getFranchiseMemberIds(leaderId);

  const [pendingLoans, pendingKits, activeLoans, overdueCount, disbursedAgg] = await Promise.all([
    prisma.loan.count({
      where: { franchiseId: leaderId, franchiseStatus: "PENDING", status: "REQUESTED" },
    }),
    prisma.rewardClaim.count({
      where: { franchiseId: leaderId, franchiseStatus: "PENDING", level: 0 },
    }),
    // Pro Max runs on its own rails with its own admin — a franchise only ever
    // sees the main 1,000-pt programme.
    prisma.loan.count({
      where: { userId: { in: memberIds.length ? memberIds : ["-"] }, status: "APPROVED", proMax: false },
    }),
    prisma.loanInstallment.count({
      where: {
        status: "PENDING",
        dueDate: { lt: new Date() },
        loan: { status: "APPROVED", proMax: false, userId: { in: memberIds.length ? memberIds : ["-"] } },
      },
    }),
    prisma.loan.aggregate({
      where: {
        userId: { in: memberIds.length ? memberIds : ["-"] },
        status: { in: ["APPROVED", "CLOSED"] },
        proMax: false,
      },
      _sum: { amount: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6 text-franchise-600" /> Franchise Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vet your team&apos;s loan requests, chase unpaid instalments, and hand out Welcome Kits.
          Anything you approve goes to the admin for final sign-off.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi icon={<BadgeIndianRupee className="h-5 w-5" />} label="Loans awaiting you" value={pendingLoans} tone={pendingLoans > 0 ? "amber" : "franchise"} />
        <Kpi icon={<Gift className="h-5 w-5" />} label="Kits awaiting you" value={pendingKits} tone={pendingKits > 0 ? "amber" : "franchise"} />
        <Kpi icon={<AlertTriangle className="h-5 w-5" />} label="Overdue instalments" value={overdueCount} tone={overdueCount > 0 ? "red" : "franchise"} />
        <Kpi icon={<BadgeIndianRupee className="h-5 w-5" />} label="Running loans" value={activeLoans} />
        <Kpi icon={<Users className="h-5 w-5" />} label="My members" value={memberIds.length} />
      </div>

      <div className="card p-5">
        <div className="text-xs text-muted-foreground">Total disbursed across your team</div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-franchise-700">
          {formatRupees(disbursedAgg._sum.amount ?? 0)}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <QuickLink href="/franchise/loans" icon={<BadgeIndianRupee className="h-5 w-5" />} title="Loan Requests" desc={`${pendingLoans} awaiting your approval`} />
        <QuickLink href="/franchise/unpaid" icon={<AlertTriangle className="h-5 w-5" />} title="Unpaid Loans" desc={`${overdueCount} overdue — contact on WhatsApp`} />
        <QuickLink href="/franchise/welcome-kits" icon={<Gift className="h-5 w-5" />} title="Welcome Kits" desc={`${pendingKits} to approve & deliver`} />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone = "franchise" }: { icon: React.ReactNode; label: string; value: number; tone?: "franchise" | "amber" | "red" }) {
  const toneMap = {
    franchise: "bg-franchise-100 text-franchise-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <div className="card p-5">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${toneMap[tone]}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickLink({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="card p-4 flex items-center gap-3 border-2 border-franchise-100 hover:border-franchise-300 transition-colors">
      <div className="h-10 w-10 rounded-lg grid place-items-center bg-franchise-100 text-franchise-700">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{desc}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-franchise-600 shrink-0" />
    </Link>
  );
}
