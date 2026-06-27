import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestComboButton } from "./request-combo-button";
import { Trophy, Gift, Clock, CheckCircle2, Truck, PackageCheck, XCircle } from "lucide-react";
import type { RewardClaimStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Rewards" };

export default async function ProMaxRewardsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const rewards = await prisma.proMaxReward.findMany({
    where: { userId: session.user.id },
    orderBy: { requestedAt: "desc" },
  });

  const combo = rewards.find((r) => r.kind === "COMBO");
  const levelRewards = rewards.filter((r) => r.kind === "LEVEL");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-promax-600" /> My Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Claim the ACHT MART Pro Max Combo Box and track rewards awarded by admin.
        </p>
      </div>

      {/* Main reward — Combo Box */}
      <div className="card p-6 bg-promax-soft border-promax-200">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-14 w-14 rounded-xl grid place-items-center bg-promax-600 text-white text-2xl">👑</div>
          <div className="flex-1 min-w-[220px]">
            <div className="font-bold text-lg">ACHT MART Pro Max Combo Box</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              The flagship Pro Max reward. Request it once — admin reviews, then dispatches it to you.
            </div>
            {combo && (
              <div className="mt-2"><StatusBadge status={combo.status} /></div>
            )}
          </div>
          <div className="self-center">
            {combo ? (
              <span className="text-xs text-muted-foreground">Requested {combo.requestedAt.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}</span>
            ) : (
              <RequestComboButton />
            )}
          </div>
        </div>
      </div>

      {/* Admin-granted level rewards */}
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-promax-600" /> Awarded rewards
        </h2>
        {levelRewards.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">
            No rewards awarded yet. As your team grows, admin will add level rewards here.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {levelRewards.map((r) => (
              <div key={r.id} className="card p-4 flex items-start gap-3 border-promax-100">
                <div className="h-10 w-10 rounded-lg grid place-items-center bg-promax-100 text-promax-700 text-lg">🎁</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{r.rewardName}</div>
                  {r.adminNote && <div className="text-xs text-muted-foreground mt-0.5">{r.adminNote}</div>}
                  <div className="mt-1.5"><StatusBadge status={r.status} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RewardClaimStatus }) {
  const map: Record<RewardClaimStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-800", icon: <Clock className="h-3 w-3" /> },
    APPROVED: { label: "Approved", cls: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
    DISPATCHED: { label: "Dispatched", cls: "bg-sky-100 text-sky-700", icon: <Truck className="h-3 w-3" /> },
    DELIVERED: { label: "Delivered", cls: "bg-promax-100 text-promax-700", icon: <PackageCheck className="h-3 w-3" /> },
    REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-700", icon: <XCircle className="h-3 w-3" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}
