import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPoints, paiseToPoints } from "@/lib/money";
import { getSetting } from "@/lib/settings";
import { BuyPinsForm } from "./buy-pins-form";
import { WalletCards, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { PinWalletTxnType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Pin Wallet" };

const TXN_LABEL: Record<PinWalletTxnType, string> = {
  LOAN_CREDIT: "Loan credit",
  PAYOUT_TRANSFER: "Payout transfer",
  PIN_PURCHASE: "Pin purchase",
  ADMIN_CREDIT: "Admin credit",
  LOAN_REPAYMENT: "Loan repayment",
};

export default async function ProMaxPinWalletPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [wallet, txns, walletPriceInr, offlinePriceInr] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: { pinWalletBalance: true },
    }),
    prisma.pinWalletTxn.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getSetting("PIN_PRO_MAX_WALLET_PRICE_INR"),
    getSetting("PIN_PRO_MAX_PRICE_INR"),
  ]);

  const balance = wallet?.pinWalletBalance ?? 0;
  // Pin prices are configured in rupees but the wallet runs in points (1:1).
  const pricePerPinPts = Math.round(walletPriceInr);
  const offlinePricePts = Math.round(offlinePriceInr);
  const balancePts = paiseToPoints(balance);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <WalletCards className="h-6 w-6 text-promax-600" /> Pin Wallet
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Points credited by admin and rewards, kept separate from your earnings wallet.
        </p>
      </div>

      <div className="card p-6 bg-promax-gradient text-white">
        <div className="text-xs uppercase tracking-wider text-promax-100">Pin Wallet balance</div>
        <div className="mt-1 text-4xl font-bold tabular-nums">{formatPoints(balance)}</div>
      </div>

      <BuyPinsForm pricePerPin={pricePerPinPts} offlinePrice={offlinePricePts} balance={balancePts} />

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Transaction history</h2>
        </div>
        {txns.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => {
                const credit = t.amount >= 0;
                return (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {t.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        {credit ? <ArrowDownCircle className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowUpCircle className="h-3.5 w-3.5 text-red-600" />}
                        {TXN_LABEL[t.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{t.note ?? "—"}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-medium ${credit ? "text-emerald-700" : "text-red-700"}`}>
                      {credit ? "+" : "−"}{formatPoints(Math.abs(t.amount))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPoints(t.balanceAfter)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
