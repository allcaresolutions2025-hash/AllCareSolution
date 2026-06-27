import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  PROMAX_REWARD_LEVELS,
  PROMAX_WELCOME_KIT_LEVEL,
  proMaxRewardThresholdMet,
  getProMaxUnlockedLevel,
} from "@/lib/rewards-promax";
import { getProMaxLegFillDepths } from "@/lib/network-promax";
import { ProMaxRewardCard } from "./reward-card";
import { WelcomeKitCard } from "./welcome-kit-card";
import { Trophy, Layers } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Rewards" };

export default async function ProMaxRewardsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [claims, fillDepths] = await Promise.all([
    prisma.proMaxReward.findMany({
      where: { userId: session.user.id },
      select: { level: true, status: true, adminNote: true },
    }),
    getProMaxLegFillDepths(session.user.id),
  ]);
  const claimByLevel = new Map(claims.map((c) => [c.level, c]));

  const ctx = { leftFillDepth: fillDepths.leftFillDepth, rightFillDepth: fillDepths.rightFillDepth };
  const filledLevel = Math.min(fillDepths.leftFillDepth, fillDepths.rightFillDepth);
  const unlocked = getProMaxUnlockedLevel(fillDepths.leftFillDepth, fillDepths.rightFillDepth);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-promax-600" /> My Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill both legs of your Pro Max tree completely — every slot, no gaps — to unlock each level&apos;s
          reward. Claim any unlocked level; admin approves and dispatches it.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi label="Levels unlocked" value={`${unlocked} / 15`} />
        <Kpi label="Left leg filled" value={`L${fillDepths.leftFillDepth}`} />
        <Kpi label="Right leg filled" value={`R${fillDepths.rightFillDepth}`} />
      </div>

      <WelcomeKitCard claim={claimByLevel.get(PROMAX_WELCOME_KIT_LEVEL) ?? null} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROMAX_REWARD_LEVELS.map((reward) => (
          <ProMaxRewardCard
            key={reward.level}
            reward={reward}
            thresholdMet={proMaxRewardThresholdMet(reward, ctx)}
            filledLevel={filledLevel}
            claim={claimByLevel.get(reward.level) ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Layers className="h-4 w-4" /> {label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-promax-700">{value}</div>
    </div>
  );
}
