import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  REWARD_LEVELS,
  rewardThresholdMet,
  WELCOME_KIT_LEVEL,
  PROMAX_COMBO_LEVEL,
  FORTY_COMBO_LEVEL,
} from "@/lib/rewards";
import { getLegFillDepths } from "@/lib/network";
import { PRO_MAX_ENABLED } from "@/lib/pro-max";
import { RewardCard } from "./reward-card";
import { WelcomeKitCard } from "./welcome-kit-card";
import { ProMaxComboCard } from "./pro-max-combo-card";
import { FortyComboCard } from "./forty-combo-card";
import { PIN_REWARD_PIN_VALUE } from "@/lib/pin-reward";
import { Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Rewards" };

export default async function RewardsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [me, fillDepths] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leftLegCount: true, rightLegCount: true, isProMax: true },
    }),
    getLegFillDepths(session.user.id),
  ]);
  if (!me) return null;

  const claims = await prisma.rewardClaim.findMany({
    where: { userId: session.user.id },
    select: { level: true, status: true, adminNote: true, requestedAt: true, updatedAt: true },
  });

  // The "40 Combo Reward" — shown if this member was enrolled using a 2000-pt
  // pin (its 2000 pts were auto-credited to their payout wallet at join time).
  const enrollmentPin = await prisma.pin.findFirst({
    where: { usedForUserId: session.user.id },
    select: { pointsValue: true },
  });
  const comboRewardPoints =
    enrollmentPin && enrollmentPin.pointsValue >= PIN_REWARD_PIN_VALUE ? enrollmentPin.pointsValue : 0;
  const claimByLevel = new Map(claims.map((c) => [c.level, c]));
  const welcomeKitClaim = claimByLevel.get(WELCOME_KIT_LEVEL) ?? null;
  const proMaxComboClaim = claimByLevel.get(PROMAX_COMBO_LEVEL) ?? null;
  const fortyComboClaim = claimByLevel.get(FORTY_COMBO_LEVEL) ?? null;

  const ctx = {
    leftLegCount: me.leftLegCount,
    rightLegCount: me.rightLegCount,
    leftFillDepth: fillDepths.leftFillDepth,
    rightFillDepth: fillDepths.rightFillDepth,
  };

  // The gate is the level both legs are filled to — the weaker (min) side.
  const filledLevel = Math.min(fillDepths.leftFillDepth, fillDepths.rightFillDepth);
  const unlockedCount = REWARD_LEVELS.filter((r) => rewardThresholdMet(r, ctx)).length;
  const nextLevel = REWARD_LEVELS.find((r) => !rewardThresholdMet(r, ctx))?.level ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" /> My Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill both legs of your binary tree completely — every slot occupied, no gaps — to unlock Pin Wallet rewards. Each level is independent; claim any unlocked level whenever you like. Approved rewards are credited to your Pin Wallet for buying pins.
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
            <div className="text-xs text-muted-foreground">Rewards Unlocked</div>
            <div className="text-2xl font-bold tabular-nums text-amber-700">{unlockedCount} / 15</div>
          </div>
        </div>
      </div>

      {/* Joining reward — 2000-pt members get the 40 Combo Reward INSTEAD of the
          Welcome Kit; everyone else gets the Welcome Kit. */}
      {comboRewardPoints > 0 ? (
        <FortyComboCard claim={fortyComboClaim} />
      ) : (
        <WelcomeKitCard claim={welcomeKitClaim} />
      )}

      {/* Pin Pro Max welcome reward — only for Pro Max members */}
      {PRO_MAX_ENABLED && me.isProMax && <ProMaxComboCard claim={proMaxComboClaim} />}

      {/* Progress banner */}
      <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
        Both legs are completely filled to <strong>level {filledLevel}</strong>
        {" "}(filled depth — Left <strong>{fillDepths.leftFillDepth}</strong> / Right <strong>{fillDepths.rightFillDepth}</strong>).
        {nextLevel !== null && (
          <> Fill both legs to <strong>level {nextLevel}</strong> — every slot occupied — to unlock the next reward.</>
        )}
      </div>

      {/* Reward cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REWARD_LEVELS.map((reward) => {
          const claim = claimByLevel.get(reward.level) ?? null;
          const thresholdMet = rewardThresholdMet(reward, ctx);
          return (
            <RewardCard
              key={reward.level}
              reward={reward}
              thresholdMet={thresholdMet}
              filledLevel={filledLevel}
              claim={claim}
            />
          );
        })}
      </div>
    </div>
  );
}
