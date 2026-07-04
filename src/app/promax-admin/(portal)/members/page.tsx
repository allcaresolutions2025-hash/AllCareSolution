import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import { CreditWallet } from "./credit-wallet";
import { Wallet, BadgeIndianRupee } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Members & Wallets" };

const PAGE_SIZE = 20;

export default async function ProMaxAdminMembersPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [total, walletTotals, members] = await Promise.all([
    prisma.user.count({ where: { isProMax: true } }),
    // Totals are computed across ALL Pro Max members, not just the current page.
    prisma.wallet.aggregate({
      where: { user: { isProMax: true } },
      _sum: { proMaxBalanceAvailable: true, pinWalletBalance: true },
    }),
    prisma.user.findMany({
      where: { isProMax: true },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        referralCode: true,
        phone: true,
        proMaxLeftLegCount: true,
        proMaxRightLegCount: true,
        wallet: { select: { proMaxBalanceAvailable: true, pinWalletBalance: true } },
        // Flag members with an active (disbursed, not-yet-cleared) Pro Max loan.
        loans: { where: { proMax: true, status: "APPROVED" }, select: { id: true }, take: 1 },
      },
    }),
  ]);

  const totalPoints = walletTotals._sum.proMaxBalanceAvailable ?? 0;
  const totalPinWallet = walletTotals._sum.pinWalletBalance ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-promax-600" /> Members &amp; Wallets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          See every Pro Max member&apos;s points and credit their wallets.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi label="Pro Max members" value={String(total)} />
        <Kpi label="Total Pro Max points" value={formatPoints(totalPoints)} />
        <Kpi label="Total Pin Wallet points" value={formatPoints(totalPinWallet)} />
      </div>

      <div className="card overflow-hidden">
        {members.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No Pro Max members yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Mobile</th>
                  <th className="px-4 py-2 font-medium text-right">Team (L/R)</th>
                  <th className="px-4 py-2 font-medium text-right">Pro Max points</th>
                  <th className="px-4 py-2 font-medium text-right">Pin Wallet</th>
                  <th className="px-4 py-2 font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t align-top">
                    <td className="px-4 py-2">
                      <div className="font-medium flex items-center gap-2">
                        {m.name}
                        {m.loans.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300" title="This member has an active loan">
                            <BadgeIndianRupee className="h-3 w-3" /> LOAN
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">{m.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{m.phone ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums">
                      {m.proMaxLeftLegCount + m.proMaxRightLegCount}
                      <span className="text-muted-foreground"> ({m.proMaxLeftLegCount}/{m.proMaxRightLegCount})</span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium text-promax-700">{formatPoints(m.wallet?.proMaxBalanceAvailable ?? 0)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPoints(m.wallet?.pinWalletBalance ?? 0)}</td>
                    <td className="px-4 py-2"><CreditWallet userId={m.id} memberName={m.name} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/promax-admin/members" />
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-2xl font-bold tabular-nums text-promax-700">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
