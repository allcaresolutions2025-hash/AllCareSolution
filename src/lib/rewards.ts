// Reward ladder. Each level requires a member-count threshold met on BOTH the
// LEFT and RIGHT legs (>=, not exact). Levels are INDEPENDENT — there is no
// sequential lock: as soon as a level's threshold is met it is claimable,
// regardless of which other levels the user has or hasn't claimed. The only
// per-level lock is the one-claim-per-user uniqueness on RewardClaim.

// Welcome Kit is a one-time joining gift. It is NOT part of the level ladder —
// any joined user can apply for it once, independent of leg counts, and it
// does not gate the level rewards. Stored at level=0 in the RewardClaim table
// so the admin's existing reward queue surfaces it alongside L1-L15 claims.
export const WELCOME_KIT_LEVEL = 0;
export const WELCOME_KIT_REWARD = {
  level: WELCOME_KIT_LEVEL,
  gift: "Welcome Kit",
  icon: "🎁",
} as const;

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
  // Once a level appears here it is permanently locked for re-claiming.
  claimedLevels?: readonly number[];
};

export function rewardThresholdMet(reward: RewardLevel, ctx: RewardEligibilityContext): boolean {
  return ctx.leftLegCount >= reward.legCount && ctx.rightLegCount >= reward.legCount;
}

export function rewardIsClaimed(reward: RewardLevel, ctx: RewardEligibilityContext): boolean {
  return ctx.claimedLevels?.includes(reward.level) ?? false;
}

// A reward is claimable when its leg-count threshold is met AND it hasn't been
// claimed yet. Levels are independent of one another — no sequential lock.
export function rewardCanClaim(reward: RewardLevel, ctx: RewardEligibilityContext): boolean {
  return rewardThresholdMet(reward, ctx) && !rewardIsClaimed(reward, ctx);
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
