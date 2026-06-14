// Reward ladder — mirrors the loan tier model. Each level requires a member
// count threshold met on BOTH the LEFT and RIGHT legs (>=, not exact). Levels
// are claimable strictly in ascending order: a higher level stays locked until
// every lower level has been claimed, even if the leg counts already qualify
// for it. This matches the loan technique in `lib/loan.ts`.

export type RewardLevel = {
  level: number;
  legCount: number;   // members required on EACH leg
  gift: string;
  icon: string;
};

export const REWARD_LEVELS: RewardLevel[] = [
  { level: 1,  legCount: 1,     gift: "Product 1",                              icon: "🌿" },
  { level: 2,  legCount: 2,     gift: "Product 2",                              icon: "🌿" },
  { level: 3,  legCount: 4,     gift: "Product 2",                              icon: "🌿" },
  { level: 4,  legCount: 8,     gift: "Product 2",                              icon: "🌿" },
  { level: 5,  legCount: 16,    gift: "Product 2",                              icon: "🌿" },
  { level: 6,  legCount: 32,    gift: "Product 5",                              icon: "🌿" },
  { level: 7,  legCount: 64,    gift: "Power Bank",                             icon: "🔋" },
  { level: 8,  legCount: 128,   gift: "Air Buds",                               icon: "🎧" },
  { level: 9,  legCount: 256,   gift: "Mobile (10K class)",                     icon: "📱" },
  { level: 10, legCount: 512,   gift: "Laptop (20K class)",                     icon: "💻" },
  { level: 11, legCount: 1024,  gift: "Two-Wheeler (1 Lakh class)",             icon: "🛵" },
  { level: 12, legCount: 2048,  gift: "Car (3 Lakh class)",                     icon: "🚗" },
  { level: 13, legCount: 4096,  gift: "Gold (5 Lakh class)",                    icon: "🥇" },
  { level: 14, legCount: 8192,  gift: "House (20 Lakh class)",                  icon: "🏠" },
  { level: 15, legCount: 16384, gift: "Villa + Gold + Luxury Car (1 Cr class)", icon: "🏆" },
];

export type RewardEligibilityContext = {
  leftLegCount: number;
  rightLegCount: number;
  // Levels the user has already claimed (any status — pending counts too).
  // Once a level appears here it is permanently locked.
  claimedLevels?: readonly number[];
};

export function rewardThresholdMet(reward: RewardLevel, ctx: RewardEligibilityContext): boolean {
  return ctx.leftLegCount >= reward.legCount && ctx.rightLegCount >= reward.legCount;
}

export function rewardIsClaimed(reward: RewardLevel, ctx: RewardEligibilityContext): boolean {
  return ctx.claimedLevels?.includes(reward.level) ?? false;
}

// Sequential claiming: the user can only claim the LOWEST unclaimed level
// whose threshold they meet. REWARD_LEVELS is ascending by legCount, so as
// soon as we hit an unclaimed level whose threshold isn't met we know no
// higher level qualifies either.
export function nextClaimableReward(ctx: RewardEligibilityContext): RewardLevel | null {
  for (const r of REWARD_LEVELS) {
    if (rewardIsClaimed(r, ctx)) continue;
    if (rewardThresholdMet(r, ctx)) return r;
    return null;
  }
  return null;
}

export function rewardCanClaim(reward: RewardLevel, ctx: RewardEligibilityContext): boolean {
  const next = nextClaimableReward(ctx);
  return next !== null && next.level === reward.level;
}

// Highest level whose leg threshold the user satisfies, ignoring claim state.
// Used for "X / 15 unlocked" KPI display.
export function getUnlockedLevel(leftLegCount: number, rightLegCount: number): number {
  let unlocked = 0;
  for (const r of REWARD_LEVELS) {
    if (leftLegCount >= r.legCount && rightLegCount >= r.legCount) unlocked = r.level;
    else break;
  }
  return unlocked;
}
