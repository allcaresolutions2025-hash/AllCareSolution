import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPackageConfig } from "@/lib/package-plan";
import { formatPoints } from "@/lib/money";
import { formatDateShort } from "@/lib/date";
import { NotificationBanners } from "@/components/notification-banners";
import { PackageTransferForm } from "./package-forms";
import { Package, ArrowLeftRight, Wallet, TrendingUp, KeyRound, ScrollText, PackagePlus } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "AF Dashboard" };

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
const EARNING_LABEL: Record<string, string> = {
  DIRECT: "Direct bonus",
  BINARY: "Binary matching",
  TRANSFER_OUT: "Moved to e-wallet",
  ADMIN_CREDIT: "Added by admin",
};

export default async function AfDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const userId = session.user.id;

  const [cfg, me, account, purchases, earnings, notifications] = await Promise.all([
    getPackageConfig(),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        referralCode: true,
        mustChangePassword: true,
        afTermsAcceptedAt: true,
        afSlot: true,
        afReferrer: { select: { referralCode: true, name: true } },
        wallet: { select: { balanceAvailable: true } },
      },
    }),
    prisma.packageAccount.findUnique({ where: { userId } }),
    prisma.packagePurchase.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.packageEarning.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  if (!me) return null;

  const leftBv = account?.leftBv ?? 0;
  const rightBv = account?.rightBv ?? 0;

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
        <Banner
          icon={<KeyRound className="h-5 w-5" />}
          title="Please change your password"
          body="You're using the first-login password (your mobile number). Update it before doing anything else."
          href="/af/dashboard/settings"
          cta="Change password"
        />
      )}
      {!me.afTermsAcceptedAt && (
        <Banner
          icon={<ScrollText className="h-5 w-5" />}
          title="Accept the AF Terms & Conditions"
          body="You need to read and accept the Terms & Conditions before you can request a package."
          href="/af/dashboard/terms"
          cta="Read terms"
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AF Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {me.name} · <span className="font-mono">{me.referralCode}</span>
            {me.afReferrer && (
              <>
                {" "}· placed {me.afSlot?.toLowerCase()} of{" "}
                <span className="font-mono">{me.afReferrer.referralCode}</span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/af/dashboard/request-package"
          className="inline-flex items-center gap-2 rounded-lg bg-af-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-af-sm hover:opacity-95"
        >
          <PackagePlus className="h-4 w-4" /> Request a package
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Package className="h-4 w-4" />} label="My packages" value={formatPoints(account?.packageTotal ?? 0)} sub={`${account?.personalBv ?? 0} BV · ${account?.active ? "Active" : "Not active"}`} />
        <Stat icon={<ArrowLeftRight className="h-4 w-4" />} label="Carry-forward BV" value={`${leftBv} L / ${rightBv} R`} sub={`Next match: ${Math.min(leftBv, rightBv)} BV`} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="AF wallet" value={formatPoints(account?.walletBalance ?? 0)} sub={`E-wallet: ${formatPoints(me.wallet?.balanceAvailable ?? 0)}`} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Total earned" value={formatPoints(account?.earnedLifetime ?? 0)} sub={`Lifetime BV ${account?.leftBvTotal ?? 0} L / ${account?.rightBvTotal ?? 0} R`} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="card p-5 text-sm space-y-2">
          <h2 className="font-semibold">How you earn</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              A <strong>{cfg.starterPoints}-pt</strong> package gives <strong>{Math.floor((cfg.starterPoints * cfg.bvPercent) / 100)} BV</strong> ({cfg.bvPercent}% of the points). Minimum package is {cfg.minPoints} pts.
            </li>
            <li>
              <strong>Direct bonus:</strong> {cfg.directPercent}% of the BV when an AF account placed directly below you activates a package.
            </li>
            <li>
              <strong>Pair matching:</strong> as soon as a package below you is approved, you earn {cfg.binaryPercent}% of the BV matched between your left and right legs. The unmatched part carries forward for {cfg.carryExpiryDays} days.
            </li>
            <li>
              Daily binary income is capped at {cfg.dailyCapMultiplier}× your own package total. Total payouts are limited to a share of approved package points.
            </li>
            <li>You need an approved package of your own to earn. Full rules are in the <Link href="/af/dashboard/terms" className="underline">Terms &amp; Conditions</Link>.</li>
          </ul>
        </div>
        <PackageTransferForm walletBalance={account?.walletBalance ?? 0} />
      </div>

      <div className="card">
        <div className="px-5 py-3 border-b font-semibold">My package requests</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Package</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{formatDateShort(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{formatPoints(p.amount)}</div>
                    <div className="text-xs text-muted-foreground">{p.bv} BV</div>
                  </td>
                  <td className="px-4 py-3">{p.productName}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[p.status]}>{p.status}</span>
                    {p.adminNote && <div className="text-xs text-muted-foreground mt-1 max-w-[200px]">“{p.adminNote}”</div>}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "APPROVED" ? (
                      <>
                        <span className={DELIVERY_BADGE[p.deliveryStatus]}>{p.deliveryStatus}</span>
                        {p.trackingNumber && <div className="text-xs text-muted-foreground mt-1 font-mono">{p.trackingNumber}</div>}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No package requests yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-3 border-b font-semibold">AF earnings</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Details</th>
                <th className="px-4 py-2 font-medium text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{formatDateShort(e.createdAt)}</td>
                  <td className="px-4 py-3">{EARNING_LABEL[e.type]}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.note ?? "—"}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${e.amount < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {e.amount < 0 ? "−" : "+"}
                    {formatPoints(Math.abs(e.amount))}
                  </td>
                </tr>
              ))}
              {earnings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No earnings yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Banner({ icon, title, body, href, cta }: { icon: React.ReactNode; title: string; body: string; href: string; cta: string }) {
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-start gap-3">
      <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-amber-900">{title}</div>
        <div className="text-xs text-amber-800">{body}</div>
      </div>
      <Link href={href} className="btn-primary shrink-0 text-xs px-3">
        {cta}
      </Link>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="card p-4 min-w-0">
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold inline-flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums truncate">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>
    </div>
  );
}
