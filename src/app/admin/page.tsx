import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR, formatPoints } from "@/lib/money";
import { Package, ShoppingBag, Users, Wallet, FileCheck2, AlertCircle, Coins } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [
    productCount,
    orderCount,
    paidOrderCount,
    userCount,
    pendingKyc,
    pendingPayouts,
    revenue30,
    commissionsAccrued,
    totalPayoutPaid,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.kycDetail.count({ where: { status: "PENDING" } }),
    prisma.payoutRequest.count({ where: { status: "REQUESTED" } }),
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "SHIPPED", "DELIVERED"] },
        paidAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { totalAmount: true },
    }),
    prisma.commission.aggregate({
      where: { status: { in: ["PENDING", "AVAILABLE", "REQUESTED", "PAID"] } },
      _sum: { commissionAmount: true },
    }),
    // Lifetime daily-payout points actually disbursed (1,000-pt program).
    prisma.dailyPayout.aggregate({
      where: { status: "PAID", proMax: false },
      _sum: { paidAmount: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Operations Overview</h1>

      {(pendingKyc > 0 || pendingPayouts > 0) && (
        <div className="card border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Action required
          </h2>
          <ul className="mt-2 text-sm text-amber-900 space-y-1">
            {pendingKyc > 0 && (
              <li>
                <Link href="/admin/kyc" className="underline">
                  {pendingKyc} KYC submission{pendingKyc > 1 ? "s" : ""} awaiting review
                </Link>
              </li>
            )}
            {pendingPayouts > 0 && (
              <li>
                <Link href="/admin/payouts" className="underline">
                  {pendingPayouts} payout request{pendingPayouts > 1 ? "s" : ""} awaiting processing
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Revenue (30 days)" value={formatINR(revenue30._sum.totalAmount ?? 0)} />
        <Kpi icon={<ShoppingBag className="h-5 w-5" />} label="Orders (paid)" value={String(paidOrderCount)} sub={`${orderCount} total`} />
        <Kpi icon={<Users className="h-5 w-5" />} label="Customers" value={String(userCount)} />
        <Kpi icon={<Package className="h-5 w-5" />} label="Active products" value={String(productCount)} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Total commissions accrued" value={formatINR(commissionsAccrued._sum.commissionAmount ?? 0)} />
        <Kpi icon={<Coins className="h-5 w-5" />} label="Total payout paid (all-time)" value={formatPoints(totalPayoutPaid._sum.paidAmount ?? 0)} href="/admin/daily-payouts" />
        <Kpi icon={<FileCheck2 className="h-5 w-5" />} label="Pending KYCs" value={String(pendingKyc)} href="/admin/kyc" />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <QuickLink href="/admin/products" label="Manage products" />
        <QuickLink href="/admin/orders" label="View orders" />
        <QuickLink href="/admin/settings" label="Business settings" />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, href }: { icon: React.ReactNode; label: string; value: string; sub?: string; href?: string }) {
  const inner = (
    <div className="card p-5">
      <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">{icon}</div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}{sub && ` · ${sub}`}</div>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner;
}
function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="card p-4 text-center font-medium hover:bg-brand-50 hover:border-brand-200 transition">
      {label} →
    </Link>
  );
}
