import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import Link from "next/link";
import { Coins, Users, KeyRound, UserPlus, GitFork, Crown, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Dashboard" };

export default async function ProMaxDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [me, activePins] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        referralCode: true,
        proMaxLeftLegCount: true,
        proMaxRightLegCount: true,
        wallet: { select: { proMaxBalanceAvailable: true } },
      },
    }),
    prisma.pin.count({ where: { ownerId: session.user.id, status: "ACTIVE", proMax: true } }),
  ]);
  if (!me) return null;

  const points = me.wallet?.proMaxBalanceAvailable ?? 0;
  const downline = me.proMaxLeftLegCount + me.proMaxRightLegCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6 text-promax-600" /> Pro Max Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome, {me.name}. Build your 10,000-pt binary team and earn on every pair.
        </p>
      </div>

      <div className="card p-5 flex items-center gap-4 bg-promax-soft border-promax-200">
        <div className="h-14 w-14 rounded-full bg-promax-100 text-promax-700 grid place-items-center text-xl font-bold">
          {me.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{me.name}</div>
          <div className="text-xs text-muted-foreground truncate">{me.email}</div>
          <div className="text-xs mt-1">
            Member ID <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-promax-200">{me.referralCode}</code>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={<Coins className="h-5 w-5" />} label="Pro Max points" value={formatPoints(points)} accent />
        <Stat icon={<Users className="h-5 w-5" />} label="Team members" value={String(downline)} sub={`L ${me.proMaxLeftLegCount} / R ${me.proMaxRightLegCount}`} />
        <Stat icon={<KeyRound className="h-5 w-5" />} label="Pins ready" value={String(activePins)} />
      </div>

      <div className="rounded-lg border border-promax-200 bg-promax-50 px-4 py-3 text-xs text-promax-900">
        Earn <strong>+2,000</strong> per direct referral (each side) and <strong>+2,000</strong> when your
        left &amp; right first pair — that&apos;s <strong>6,000</strong> for a filled leader. Every paired
        grandchild then cascades points up to you (+2,000 within 15 levels, +1,000 beyond).
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <QuickLink href="/promax/dashboard/request-pin" icon={<KeyRound className="h-5 w-5" />} title="Request Pin" desc="Ask admin for Pro Max pins" />
        <QuickLink href="/promax/dashboard/add-member" icon={<UserPlus className="h-5 w-5" />} title="Add Member" desc="Place a new member with a pin" />
        <QuickLink href="/promax/dashboard/tree" icon={<GitFork className="h-5 w-5" />} title="Genealogy" desc="View your Pro Max tree" />
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-5">
      <div className="h-9 w-9 rounded-lg grid place-items-center bg-promax-100 text-promax-700">{icon}</div>
      <div className={`mt-3 text-2xl font-bold tabular-nums ${accent ? "text-promax-700" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
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
