import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { REWARD_LEVELS } from "@/lib/rewards";
import { RewardCard } from "./reward-card";
import { Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Rewards" };

export default async function RewardsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leftLegCount: true, rightLegCount: true },
  });
  if (!me) return null;

  const claims = await prisma.rewardClaim.findMany({
    where: { userId: session.user.id },
    select: { level: true, status: true, adminNote: true, requestedAt: true, updatedAt: true },
  });
  const claimByLevel = new Map(claims.map((c) => [c.level, c]));

  const minLeg = Math.min(me.leftLegCount, me.rightLegCount);
  const maxLeg = Math.max(me.leftLegCount, me.rightLegCount);
  const unlockedCount = REWARD_LEVELS.filter((r) => minLeg >= r.minLegSize).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" /> My Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build your team equally on both sides to unlock gifts — one level at a time.
        </p>
      </div>

      {/* Progress summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Left Team</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-700">{me.leftLegCount.toLocaleString("en-IN")}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-700 grid place-items-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Right Team</div>
            <div className="text-2xl font-bold tabular-nums text-sky-700">{me.rightLegCount.toLocaleString("en-IN")}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 grid place-items-center">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Gifts Unlocked</div>
            <div className="text-2xl font-bold tabular-nums text-amber-700">{unlockedCount} / 15</div>
          </div>
        </div>
      </div>

      {/* Balanced leg info */}
      {minLeg > 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Your weaker leg has <strong>{minLeg.toLocaleString("en-IN")}</strong> member{minLeg !== 1 ? "s" : ""} and stronger leg has <strong>{maxLeg.toLocaleString("en-IN")}</strong>.
          {" "}Next unlock at <strong>{(REWARD_LEVELS.find((r) => r.minLegSize > minLeg)?.minLegSize ?? "—").toLocaleString?.("en-IN")}</strong> on each side.
        </div>
      )}

      {/* Reward cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REWARD_LEVELS.map((reward) => {
          const claim = claimByLevel.get(reward.level) ?? null;
          const isUnlocked = minLeg >= reward.minLegSize;
          return (
            <RewardCard
              key={reward.level}
              reward={reward}
              isUnlocked={isUnlocked}
              minLeg={minLeg}
              claim={claim}
            />
          );
        })}
      </div>
    </div>
  );
}
