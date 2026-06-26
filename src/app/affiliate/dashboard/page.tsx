import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNetworkSnapshot, type DownlineNode } from "@/lib/network";
import { PRO_MAX_ENABLED } from "@/lib/pro-max";
import { formatPoints } from "@/lib/money";
import { NotificationBanners } from "@/components/notification-banners";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import {
  BadgeCheck,
  TrendingUp,
  Wallet,
  Users,
  UserSquare2,
  ArrowLeftRight,
  Star,
  KeyRound,
  Crown,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AffiliateDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [me, kyc, notifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { wallet: true },
    }),
    prisma.kycDetail.findUnique({ where: { userId: session.user.id } }),
    prisma.notification.findMany({
      where: { userId: session.user.id, read: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  if (!me) return null;

  const snapshot = await getNetworkSnapshot(me.id);

  // Identify Left + Right by the actual slot field — not creation order,
  // which would swap the legs whenever the right slot was filled first.
  const directs = snapshot.nodes.filter((n) => n.depth === 1);
  const leftRoot: DownlineNode | undefined = directs.find((n) => n.slot === "LEFT");
  const rightRoot: DownlineNode | undefined = directs.find((n) => n.slot === "RIGHT");

  const childrenByParent = new Map<string, DownlineNode[]>();
  for (const n of snapshot.nodes) {
    if (!n.referrerId) continue;
    const arr = childrenByParent.get(n.referrerId);
    if (arr) arr.push(n);
    else childrenByParent.set(n.referrerId, [n]);
  }
  function subtreeIds(rootId: string): Set<string> {
    const out = new Set<string>([rootId]);
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop()!;
      for (const c of childrenByParent.get(id) ?? []) {
        out.add(c.id);
        stack.push(c.id);
      }
    }
    return out;
  }
  const leftIds = leftRoot ? subtreeIds(leftRoot.id) : new Set<string>();
  const rightIds = rightRoot ? subtreeIds(rightRoot.id) : new Set<string>();

  // Points sums per side.
  const downlineIds = snapshot.nodes.map((n) => n.id);
  const wallets = downlineIds.length
    ? await prisma.wallet.findMany({
        where: { userId: { in: downlineIds } },
        select: { userId: true, balanceAvailable: true },
      })
    : [];
  let leftPts = 0;
  let rightPts = 0;
  for (const w of wallets) {
    if (leftIds.has(w.userId)) leftPts += w.balanceAvailable;
    else if (rightIds.has(w.userId)) rightPts += w.balanceAvailable;
  }

  const teamLCount = leftIds.size;
  const teamRCount = rightIds.size;
  const directTeam = directs.length;

  const personalPts = me.wallet?.balanceAvailable ?? 0;

  // Pin Pro Max counts (only when the feature is enabled):
  //  - A Pro Max member sees their own Pro Max-tree leg counts.
  //  - A non-member sees how many of their main-tree LEFT/RIGHT team are Pro Max.
  const proMaxBalance = me.wallet?.proMaxBalanceAvailable ?? 0;
  const isProMaxMember =
    me.isProMax || me.proMaxLeftLegCount > 0 || me.proMaxRightLegCount > 0 || proMaxBalance > 0;
  let proMaxLeft = 0;
  let proMaxRight = 0;
  if (PRO_MAX_ENABLED) {
    if (isProMaxMember) {
      proMaxLeft = me.proMaxLeftLegCount;
      proMaxRight = me.proMaxRightLegCount;
    } else {
      const proMaxMembers = downlineIds.length
        ? await prisma.user.findMany({
            where: { id: { in: downlineIds }, isProMax: true },
            select: { id: true },
          })
        : [];
      for (const m of proMaxMembers) {
        if (leftIds.has(m.id)) proMaxLeft += 1;
        else if (rightIds.has(m.id)) proMaxRight += 1;
      }
    }
  }
  const showProMaxWallet = PRO_MAX_ENABLED && isProMaxMember;

  // Note: public self-signup is disabled. New members are placed by their
  // upline via /affiliate/dashboard/add-member using this Refer ID and a pin.
  const addLeft = `/affiliate/dashboard/add-member?referId=${me.referralCode}&side=LEFT`;
  const addRight = `/affiliate/dashboard/add-member?referId=${me.referralCode}&side=RIGHT`;

  // Doughnut metrics — left vs right share of subtree points.
  const subtreeTotal = leftPts + rightPts;
  const leftShare = subtreeTotal > 0 ? leftPts / subtreeTotal : 0;

  return (
    <div className="space-y-6">
      <NotificationBanners
        items={notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
        }))}
      />

      {me.mustChangePassword && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-amber-900">Please change your password</div>
            <div className="text-xs text-amber-800">
              You&apos;re using the default password (your mobile number). Update it before doing anything else.
            </div>
          </div>
          <Link
            href="/affiliate/dashboard/settings#change-password"
            className="btn-primary shrink-0 text-xs px-3"
          >
            Change password
          </Link>
        </div>
      )}

      {me.mustChangeTransactionPassword && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-amber-900">Set a new transaction password</div>
            <div className="text-xs text-amber-800">
              Admin reset your transaction password to your mobile number. Use that as the current password and pick a new one to keep transferring pins.
            </div>
          </div>
          <Link
            href="/affiliate/dashboard/settings#transaction-password"
            className="btn-primary shrink-0 text-xs px-3"
          >
            Update now
          </Link>
        </div>
      )}

      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Top: Profile / Earnings / Business Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile card */}
        <div className="card p-5 min-w-0">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 grid place-items-center text-2xl font-bold text-brand-800">
                {me.name.charAt(0).toUpperCase()}
              </div>
              {kyc?.status === "APPROVED" && (
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 grid place-items-center ring-2 ring-white">
                  <BadgeCheck className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            <div className="mt-3 font-semibold text-lg leading-tight">{me.name}</div>
            <div className="text-xs text-muted-foreground">
              ID: <span className="font-mono">{me.referralCode}</span>
            </div>
            {kyc?.status === "APPROVED" ? (
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                <BadgeCheck className="h-3 w-3" /> KYC Verified
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                KYC {kyc?.status?.toLowerCase() ?? "not submitted"}
              </span>
            )}
          </div>

          <div className="mt-5 pt-4 border-t space-y-3">
            <div className="text-xs font-semibold text-brand-700 inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Place a New Member
            </div>
            <p className="text-[11px] text-muted-foreground">
              Use one of your active pins to add a direct member to either side.
            </p>
            <ReferralRow side="L" label="ADD ON LEFT" url={addLeft} accent="emerald" />
            <ReferralRow side="R" label="ADD ON RIGHT" url={addRight} accent="sky" />
          </div>
        </div>

        {/* Earnings doughnut */}
        <div className="card p-5 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-brand-700">My Earnings</h2>
            <span className="text-xl font-bold tabular-nums text-brand-700">
              {formatPoints(personalPts)}
            </span>
          </div>
          <div className="my-4 flex justify-center">
            <Doughnut leftShare={leftShare} hasData={subtreeTotal > 0} />
          </div>
          <div className="space-y-2">
            <IncomeRow
              icon={<ArrowLeftRight className="h-4 w-4" />}
              label="Matching Income"
              value={formatPoints(Math.min(leftPts, rightPts))}
              tone="violet"
            />
            <IncomeRow
              icon={<TrendingUp className="h-4 w-4" />}
              label="Sponsor Matching"
              value={formatPoints(Math.floor(personalPts * 0))}
              tone="emerald"
            />
            <IncomeRow
              icon={<Star className="h-4 w-4" />}
              label="Booster Royalty"
              value={formatPoints(0)}
              tone="orange"
            />
          </div>
        </div>

        {/* Business Volume */}
        <div className="card p-5 min-w-0">
          <h2 className="font-semibold">Business Volume (BV)</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <BvCell label="Team L BV" value={teamLCount} />
            <BvCell label="Team R BV" value={teamRCount} />
          </div>

          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3">
            <div className="text-center">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-brand-600 text-white">
                Carried / Balanced
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold tabular-nums">{teamLCount}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  Team L Balance
                </div>
              </div>
              <div className="border-l">
                <div className="text-2xl font-bold tabular-nums">{teamRCount}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  Team R Balance
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t">
            <div>
              <div className="text-xl font-bold tabular-nums">{teamLCount + teamRCount}</div>
              <div className="text-xs text-muted-foreground">Total BV</div>
            </div>
            <div className="inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-100 grid place-items-center text-brand-700">
                <UserSquare2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xl font-bold tabular-nums">{formatPoints(personalPts, { showLabel: false })}</div>
                <div className="text-xs text-muted-foreground">Personal Pts</div>
              </div>
            </div>
          </div>

          {/* Pin Pro Max — team counts (hidden when Pro Max is disabled) */}
          {PRO_MAX_ENABLED && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3">
              <div className="text-center">
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500 text-white">
                  <Crown className="h-3 w-3" /> Pin Pro Max Team
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold tabular-nums text-amber-700">{proMaxLeft}</div>
                  <div className="text-xs text-muted-foreground">Pro Max L</div>
                </div>
                <div className="border-l border-amber-200">
                  <div className="text-2xl font-bold tabular-nums text-amber-700">{proMaxRight}</div>
                  <div className="text-xs text-muted-foreground">Pro Max R</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wallet stats */}
      <div className={`grid gap-4 ${showProMaxWallet ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
        <BigStat
          color="emerald"
          icon={<Wallet className="h-5 w-5" />}
          label="E-WALLET BALANCE"
          value={formatPoints(personalPts)}
        />
        {showProMaxWallet && (
          <BigStat
            color="orange"
            icon={<Crown className="h-5 w-5" />}
            label="PRO MAX WALLET"
            value={formatPoints(proMaxBalance)}
          />
        )}
      </div>

      {/* Team counters */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <TeamCounter color="teal" icon={<Users className="h-5 w-5" />} label="DIRECT TEAM" value={directTeam} />
        <TeamCounter color="pink" icon={<UserSquare2 className="h-5 w-5" />} label="TEAM L" value={teamLCount} />
        <TeamCounter color="blue" icon={<UserSquare2 className="h-5 w-5" />} label="TEAM R" value={teamRCount} />
      </div>

      {/* Pro Max team counters (hidden when Pro Max is disabled) */}
      {PRO_MAX_ENABLED && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <TeamCounter color="amber" icon={<Crown className="h-5 w-5" />} label="PRO MAX L" value={proMaxLeft} />
          <TeamCounter color="violet" icon={<Crown className="h-5 w-5" />} label="PRO MAX R" value={proMaxRight} />
        </div>
      )}
    </div>
  );
}

function ReferralRow({ side, label, url, accent }: { side: "L" | "R"; label: string; url: string; accent: "emerald" | "sky" }) {
  const tone =
    accent === "emerald"
      ? { ring: "border-emerald-200", chip: "bg-emerald-100 text-emerald-700", btn: "bg-emerald-500 hover:bg-emerald-600" }
      : { ring: "border-sky-200", chip: "bg-sky-100 text-sky-700", btn: "bg-sky-500 hover:bg-sky-600" };
  return (
    <div>
      <div className={`text-xs font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${tone.chip}`}>
        <span className="font-mono">{side}</span> {label}
      </div>
      <div className={`mt-1 flex items-stretch rounded-lg border ${tone.ring} bg-white overflow-hidden`}>
        <div className="flex-1 min-w-0 px-3 py-2 text-xs text-muted-foreground truncate font-mono">
          {url}
        </div>
        <CopyButton
          text={url}
          label=""
          className={`${tone.btn} text-white px-3 grid place-items-center transition-colors`}
        />
      </div>
    </div>
  );
}

function Doughnut({ leftShare, hasData }: { leftShare: number; hasData: boolean }) {
  const r = 56;
  const circumference = 2 * Math.PI * r;
  const leftStroke = circumference * leftShare;
  const rightStroke = circumference * (1 - leftShare);
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
      {hasData && (
        <>
          {/* Left team arc (emerald) */}
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#10b981"
            strokeWidth="14"
            strokeDasharray={`${leftStroke} ${circumference}`}
            strokeDashoffset={circumference / 4}
            transform="rotate(-90 70 70)"
          />
          {/* Right team arc (sky) */}
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="14"
            strokeDasharray={`${rightStroke} ${circumference}`}
            strokeDashoffset={circumference / 4 - leftStroke}
            transform="rotate(-90 70 70)"
          />
        </>
      )}
    </svg>
  );
}

function IncomeRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "violet" | "emerald" | "orange";
}) {
  const map = {
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${map[tone]}`}>
      <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="text-sm font-bold tabular-nums shrink-0 ml-1">{value}</div>
    </div>
  );
}

function BvCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-4 text-center">
      <div className="text-4xl font-bold tabular-nums text-brand-700">{value}</div>
      <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function BigStat({
  color,
  icon,
  label,
  value,
}: {
  color: "emerald" | "violet" | "orange";
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const tone = {
    emerald: { bar: "bg-emerald-500", iconBg: "bg-emerald-100 text-emerald-700" },
    violet: { bar: "bg-violet-500", iconBg: "bg-violet-100 text-violet-700" },
    orange: { bar: "bg-orange-500", iconBg: "bg-orange-100 text-orange-700" },
  }[color];
  return (
    <div className="card overflow-hidden relative">
      <div className={`absolute left-0 top-0 bottom-0 w-2 ${tone.bar}`} />
      <div className="p-5 pl-7 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-xl grid place-items-center ${tone.iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

function TeamCounter({
  color,
  icon,
  label,
  value,
}: {
  color: "teal" | "pink" | "blue" | "amber" | "violet";
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const tone = {
    teal: { iconBg: "bg-teal-100 text-teal-700", value: "text-teal-700" },
    pink: { iconBg: "bg-pink-100 text-pink-700", value: "text-pink-700" },
    blue: { iconBg: "bg-blue-100 text-blue-700", value: "text-blue-700" },
    amber: { iconBg: "bg-amber-100 text-amber-700", value: "text-amber-700" },
    violet: { iconBg: "bg-violet-100 text-violet-700", value: "text-violet-700" },
  }[color];
  return (
    <div className="card p-3 sm:p-5 min-w-0 flex flex-col items-center text-center gap-1 sm:flex-row sm:items-center sm:text-left sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold leading-tight">{label}</div>
        <div className={`text-3xl sm:text-4xl font-bold tabular-nums ${tone.value}`}>{value}</div>
      </div>
      <div className={`hidden sm:grid h-12 w-12 rounded-xl place-items-center ${tone.iconBg}`}>{icon}</div>
    </div>
  );
}
