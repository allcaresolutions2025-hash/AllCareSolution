import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { toPaise, formatPoints } from "@/lib/money";
import { Wallet, KeyRound, ArrowDownLeft, ArrowUpRight, Coins, Lock } from "lucide-react";
import { PinWalletActions } from "./pin-wallet-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pin Wallet" };

function txnLabel(type: string, amount: number): string {
  switch (type) {
    case "LOAN_CREDIT":
      return "Loan credit";
    case "PAYOUT_TRANSFER":
      // Positive = money came in from payout; negative = sent back to payout.
      return amount >= 0 ? "Transfer from payout wallet" : "Transfer to payout wallet";
    case "PIN_PURCHASE":
      return "Pin purchase";
    case "ADMIN_CREDIT":
      return "Admin credit";
    case "LOAN_REPAYMENT":
      return "Loan repayment";
    default:
      return type;
  }
}

export default async function PinWalletPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [user, wallet, txns, activePins, pinWalletPriceInr] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leftLegCount: true, rightLegCount: true, pinWalletUnlocked: true, pinWalletLocked: true },
    }),
    prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: { pinWalletBalance: true, balanceAvailable: true },
    }),
    prisma.pinWalletTxn.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.pin.count({ where: { ownerId: session.user.id, status: "ACTIVE", proMax: false } }),
    getSetting("PIN_WALLET_PRICE_INR"),
  ]);

  const pinWalletBalance = wallet?.pinWalletBalance ?? 0;
  const payoutBalance = wallet?.balanceAvailable ?? 0;
  const pricePerPin = toPaise(pinWalletPriceInr);
  const maxBuyable = pricePerPin > 0 ? Math.floor(pinWalletBalance / pricePerPin) : 0;

  // Pin Wallet access is unlocked once BOTH binary legs have more than one
  // member (left and right filled PLUS another member below) — the same rule as
  // daily-payout eligibility — OR when an admin has manually enabled it. An admin
  // can also force-lock the wallet, which overrides everything. Until enabled the
  // member can't buy pins or transfer to/from the payout wallet.
  const leftFilled = (user?.leftLegCount ?? 0) > 1;
  const rightFilled = (user?.rightLegCount ?? 0) > 1;
  const adminUnlocked = user?.pinWalletUnlocked ?? false;
  const adminLocked = user?.pinWalletLocked ?? false;
  const canAccess = !adminLocked && (adminUnlocked || (leftFilled && rightFilled));

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-brand-600" /> Pin Wallet
          </h1>
        </div>
        <div className="card p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 text-amber-700 grid place-items-center">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {adminLocked ? "Pin Wallet is disabled" : "Pin Wallet is locked"}
          </h2>
          {adminLocked ? (
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              Your Pin Wallet has been temporarily disabled by the admin. Please contact support
              for details.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                You can access the Pin Wallet — buy pins and transfer points to and from your
                payout wallet — once you have <strong>more than one</strong> member on both your
                left and right legs (left and right filled, plus another member below).
              </p>
              <div className="mt-4 inline-flex items-center gap-3 text-sm">
                <span className={`inline-flex items-center gap-1.5 font-medium ${leftFilled ? "text-emerald-700" : "text-red-600"}`}>
                  Left leg: {leftFilled ? "filled" : "empty"}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className={`inline-flex items-center gap-1.5 font-medium ${rightFilled ? "text-emerald-700" : "text-red-600"}`}>
                  Right leg: {rightFilled ? "filled" : "empty"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-brand-600" /> Pin Wallet
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Use Pin Wallet points to buy pins instantly — no admin approval needed. Your approved loan is
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
                          {txnLabel(t.type, t.amount)}
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
