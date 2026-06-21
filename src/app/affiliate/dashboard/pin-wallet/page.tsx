import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { toPaise, formatPoints } from "@/lib/money";
import { Wallet, KeyRound, ArrowDownLeft, ArrowUpRight, Coins } from "lucide-react";
import { PinWalletActions } from "./pin-wallet-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pin Wallet" };

const TXN_LABEL: Record<string, string> = {
  LOAN_CREDIT: "₹2,000 loan credit",
  PAYOUT_TRANSFER: "Transfer from payout wallet",
  PIN_PURCHASE: "Pin purchase",
};

export default async function PinWalletPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [wallet, txns, activePins, pinWalletPriceInr] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: { pinWalletBalance: true, balanceAvailable: true },
    }),
    prisma.pinWalletTxn.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.pin.count({ where: { ownerId: session.user.id, status: "ACTIVE" } }),
    getSetting("PIN_WALLET_PRICE_INR"),
  ]);

  const pinWalletBalance = wallet?.pinWalletBalance ?? 0;
  const payoutBalance = wallet?.balanceAvailable ?? 0;
  const pricePerPin = toPaise(pinWalletPriceInr);
  const maxBuyable = pricePerPin > 0 ? Math.floor(pinWalletBalance / pricePerPin) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-brand-600" /> Pin Wallet
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Use Pin Wallet points to buy pins instantly — no admin approval needed. Your ₹2,000 loan is
          credited here, and you can top up anytime from your payout wallet.
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="mt-3 text-2xl font-bold tabular-nums text-brand-700">{formatPoints(pinWalletBalance)}</div>
          <div className="text-xs text-muted-foreground">Pin Wallet balance</div>
        </div>
        <div className="card p-5">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
            <Coins className="h-5 w-5" />
          </div>
          <div className="mt-3 text-2xl font-bold tabular-nums text-emerald-700">{formatPoints(payoutBalance)}</div>
          <div className="text-xs text-muted-foreground">Payout wallet (transferable)</div>
        </div>
        <div className="card p-5">
          <div className="h-9 w-9 rounded-lg bg-sky-100 text-sky-700 grid place-items-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="mt-3 text-2xl font-bold tabular-nums text-sky-700">{activePins}</div>
          <div className="text-xs text-muted-foreground">Active pins you own</div>
        </div>
      </div>

      {/* Buy + transfer actions */}
      <PinWalletActions
        pinWalletBalance={pinWalletBalance}
        payoutBalance={payoutBalance}
        pricePerPin={pricePerPin}
        maxBuyable={maxBuyable}
      />

      {/* Ledger */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Pin Wallet history</h2>
        </div>
        {txns.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium text-right">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => {
                  const credit = t.amount >= 0;
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {t.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          {credit ? (
                            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {TXN_LABEL[t.type] ?? t.type}
                        </span>
                      </td>
                      <td className={`px-4 py-2 text-right font-medium tabular-nums ${credit ? "text-emerald-700" : "text-red-600"}`}>
                        {credit ? "+" : "−"}{formatPoints(Math.abs(t.amount))}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatPoints(t.balanceAfter)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
