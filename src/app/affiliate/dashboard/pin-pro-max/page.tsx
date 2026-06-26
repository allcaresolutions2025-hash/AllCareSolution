import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { toPaise, formatPoints } from "@/lib/money";
import { RequestProMaxPinForm } from "./request-pro-max-pin-form";
import { RequestProMaxPinsForm } from "./request-pro-max-pins-form";
import { UpgradeDownlineForm } from "./upgrade-downline-form";
import { Crown, KeyRound, Clock, Wallet, CheckCircle2, XCircle, BadgeCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pin Pro Max" };

export default async function PinProMaxPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [user, wallet, activePins, requests, pricePerPinInr] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, referralCode: true, isProMax: true },
    }),
    prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: { proMaxBalanceAvailable: true },
    }),
    prisma.pin.findMany({
      where: { ownerId: session.user.id, status: "ACTIVE", proMax: true },
      select: { code: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pinRequest.findMany({
      where: { userId: session.user.id, proMax: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getSetting("PIN_PRO_MAX_PRICE_INR"),
  ]);
  if (!user) return null;

  const pricePerPinPaise = toPaise(pricePerPinInr);
  const pinCodes = activePins.map((p) => p.code);
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-500" /> Pin Pro Max
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user.isProMax ? (
            <>
              You&apos;re a Pro Max member. Request Pro Max pins from admin, then apply each approved
              pin to a downline to upgrade them instantly. Your uplines earn <strong>+2,000</strong> per
              direct Pro Max referral and <strong>+2,000</strong> per pair match as their team goes Pro Max.
            </>
          ) : (
            <>
              A premium upgrade ({formatPoints(pricePerPinPaise)}). Request to become Pro Max — once admin
              approves, you can issue Pro Max pins yourself and upgrade your downline instantly.
            </>
          )}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg grid place-items-center ${user.isProMax ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold">{user.isProMax ? "Active" : "Not yet"}</div>
            <div className="text-xs text-muted-foreground">Pro Max status</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-amber-100 text-amber-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{user.isProMax ? pinCodes.length : pendingCount}</div>
            <div className="text-xs text-muted-foreground">{user.isProMax ? "Pro Max pins ready" : "Pending requests"}</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-emerald-100 text-emerald-700">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums text-emerald-700">
              {formatPoints(wallet?.proMaxBalanceAvailable ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">Pro Max wallet</div>
          </div>
        </div>
      </div>

      {user.isProMax ? (
        <>
          <RequestProMaxPinsForm defaultMobile={user.phone ?? ""} />
          {pinCodes.length > 0 ? (
            <UpgradeDownlineForm pins={pinCodes} />
          ) : (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4 text-sm text-amber-800 flex items-start gap-2">
              <Crown className="h-4 w-4 mt-0.5 shrink-0" />
              <div>Request Pro Max pins above. Once admin approves them, apply each pin to a downline member to upgrade them.</div>
            </div>
          )}
        </>
      ) : pendingCount > 0 ? (
        <div className="card p-6 border-2 border-amber-200 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Your Pro Max request is pending</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Admin is reviewing your request to become Pro Max. Once approved, you can issue Pro Max
              pins and upgrade your downline from here. You can&apos;t submit another request until then.
            </div>
          </div>
        </div>
      ) : (
        <RequestProMaxPinForm defaultMobile={user.phone ?? ""} pricePerPinPaise={pricePerPinPaise} />
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Your Pro Max requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No requests yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Requested</th>
                <th className="px-4 py-2 font-medium">Mobile</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{r.mobileNumber}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
