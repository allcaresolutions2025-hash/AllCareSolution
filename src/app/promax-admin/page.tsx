import { prisma } from "@/lib/db";
import Link from "next/link";
import { Users, KeyRound, Clock, UserPlus, Sparkles, GitBranch, Crown, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Admin" };

export default async function ProMaxAdminOverviewPage() {
  const [members, activePins, totalPins, pendingRequests] = await Promise.all([
    prisma.user.count({ where: { isProMax: true } }),
    prisma.pin.count({ where: { proMax: true, status: "ACTIVE" } }),
    prisma.pin.count({ where: { proMax: true } }),
    prisma.pinRequest.count({ where: { proMax: true, status: "PENDING" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6 text-promax-600" /> Pro Max Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Operate the standalone 10,000-pt programme — onboard members, issue pins, and watch the tree grow.
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Pro Max members" value={members} />
        <Kpi icon={<KeyRound className="h-5 w-5" />} label="Active pins" value={activePins} />
        <Kpi icon={<Sparkles className="h-5 w-5" />} label="Total pins issued" value={totalPins} />
        <Kpi icon={<Clock className="h-5 w-5" />} label="Pending requests" value={pendingRequests} tone={pendingRequests > 0 ? "amber" : "promax"} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <QuickLink href="/promax-admin/register-member" icon={<UserPlus className="h-5 w-5" />} title="Register Member" desc="Onboard a new Pro Max account" />
        <QuickLink href="/promax-admin/pin-requests" icon={<KeyRound className="h-5 w-5" />} title="Pin Requests" desc={`${pendingRequests} awaiting approval`} />
        <QuickLink href="/promax-admin/genealogy" icon={<GitBranch className="h-5 w-5" />} title="Genealogy" desc="Inspect Pro Max trees" />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone = "promax" }: { icon: React.ReactNode; label: string; value: number; tone?: "promax" | "amber" }) {
  const toneMap = { promax: "bg-promax-100 text-promax-700", amber: "bg-amber-100 text-amber-700" };
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
    <Link href={href} className="card p-4 flex items-center gap-3 border-2 border-promax-100 hover:border-promax-300 transition-colors">
      <div className="h-10 w-10 rounded-lg grid place-items-center bg-promax-100 text-promax-700">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{desc}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-promax-600 shrink-0" />
    </Link>
  );
}
