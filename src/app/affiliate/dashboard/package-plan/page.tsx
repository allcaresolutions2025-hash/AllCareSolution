import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPackageConfig } from "@/lib/package-plan";
import { formatPoints } from "@/lib/money";
import { formatDateShort } from "@/lib/date";
import { PackagePurchaseForm, PackageTransferForm } from "./package-forms";
import { Package, ArrowLeftRight, Wallet, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Package Plan" };

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
};

export default async function PackagePlanPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const userId = session.user.id;

  const [cfg, me, account, purchases, earnings, products, address] = await Promise.all([
    getPackageConfig(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true, address: true },
    }),
    prisma.packageAccount.findUnique({ where: { userId } }),
    prisma.packagePurchase.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.packageEarning.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      select: { id: true, name: true, price: true },
      orderBy: { price: "asc" },
    }),
    prisma.address.findFirst({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
  ]);
  if (!me) return null;

  const hasPending = purchases.some((p) => p.status === "PENDING");
  const defaults = address
    ? {
        shipName: address.fullName,
        shipPhone: address.phone,
        shipAddress: [address.line1, address.line2, address.city, `${address.state} - ${address.pincode}`]
          .filter(Boolean)
          .join(", "),
      }
    : { shipName: me.name, shipPhone: me.phone ?? "", shipAddress: me.address ?? "" };

  const leftBv = account?.leftBv ?? 0;
  const rightBv = account?.rightBv ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-brand-600" /> Package Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Request a product package. Once the admin verifies and approves it, your package points are activated and
          you join the binary. Each package adds Business Volume (BV) to your upline&apos;s
          legs. Income is paid on <em>matched</em> BV. There is no fixed return on the package points themselves.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Package className="h-4 w-4" />} label="My packages" value={formatPoints(account?.packageTotal ?? 0)} sub={`${account?.personalBv ?? 0} BV · ${account?.active ? "Active" : "Not active"}`} />
        <Stat icon={<ArrowLeftRight className="h-4 w-4" />} label="Carry-forward BV" value={`${leftBv} L / ${rightBv} R`} sub={`Next match: ${Math.min(leftBv, rightBv)} BV`} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Package wallet" value={formatPoints(account?.walletBalance ?? 0)} sub="Move to e-wallet to withdraw" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Total earned" value={formatPoints(account?.earnedLifetime ?? 0)} sub={`Lifetime BV ${account?.leftBvTotal ?? 0} L / ${account?.rightBvTotal ?? 0} R`} />
      </div>

      <div className="card p-5 text-sm space-y-2">
        <h2 className="font-semibold">How you earn</h2>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            A package of <strong>{cfg.starterPoints} pts</strong> gives <strong>{Math.floor((cfg.starterPoints * cfg.bvPercent) / 100)} BV</strong> ({cfg.bvPercent}% of the points). Minimum package is {cfg.minPoints} pts.
          </li>
          <li>
            <strong>Direct bonus:</strong> {cfg.directPercent}% of the BV when a member placed directly below you activates a package.
          </li>
          <li>
            <strong>Binary matching:</strong> every night you earn {cfg.binaryPercent}% of the BV matched between your left and right legs. The unmatched part carries forward for {cfg.carryExpiryDays} days.
          </li>
          <li>
            Daily binary income is capped at {cfg.dailyCapMultiplier}× your own package total, and all payouts are limited to a share of approved package points.
          </li>
          <li>You need an active package of your own to earn.</li>
        </ul>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <PackagePurchaseForm
          starterPoints={cfg.starterPoints}
          minPoints={cfg.minPoints}
          bvPercent={cfg.bvPercent}
          products={products}
          defaults={defaults}
          hasPending={hasPending}
        />
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
                    <div className="text-xs text-muted-foreground">
                      {p.bv} BV
                    </div>
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
        <div className="px-5 py-3 border-b font-semibold">Package earnings</div>
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
