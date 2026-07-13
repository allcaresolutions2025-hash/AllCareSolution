// Reward ladder. A level unlocks when the binary tree under the member is
// COMPLETELY FILLED to that level on BOTH legs — every slot in levels 1..N is
// occupied, no gaps (same rule as the loan ladder; see lib/loan.ts). This is
// measured by each leg's *fill depth* (leftFillDepth / rightFillDepth), NOT by
// raw leg head-counts: a deep but lopsided leg with an empty slot does not
// qualify. A perfectly filled leg of depth N holds 2^N - 1 members, so level N
// effectively needs 2^N - 1 members on each side (see rewardMembersPerSide).
//
// Levels are INDEPENDENT — there is no sequential lock: as soon as a level's
// fill requirement is met it is claimable, regardless of which other levels the
// user has or hasn't claimed. The only per-level lock is the one-claim-per-user
// uniqueness on RewardClaim.

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

// Pin Pro Max welcome reward — the "Acht Mart Combo". Claimable once by any
// Pro Max member, independent of the L1-L15 ladder. Stored at a distinct level
// (100) so it never collides with Welcome Kit (0) or L1-15 on the
// RewardClaim @@unique([userId, level]) constraint.
export const PROMAX_COMBO_LEVEL = 100;
export const PROMAX_COMBO_REWARD = {
  level: PROMAX_COMBO_LEVEL,
  gift: "Acht Mart Combo",
  icon: "👑",
} as const;

// 40 Combo Reward — the joining reward for members enrolled with a 2000-pt pin.
// It REPLACES the Welcome Kit for those members (they can't claim both) and is a
// physical product combo fulfilled through the same admin delivery queue
// (approve → dispatch → deliver). Stored at a distinct level so it never
// collides with Welcome Kit (0), L1-15, or the Pro Max combo (100). It credits
// no points — the 2000-pt payout-wallet credit happens separately at enrollment.
export const FORTY_COMBO_LEVEL = 40;
export const FORTY_COMBO_REWARD = {
  level: FORTY_COMBO_LEVEL,
  gift: "40 Combo Reward",
  icon: "🎁",
} as const;

export type RewardLevel = {
  level: number;
  legCount: number;        // members required on EACH leg
  pinWalletPoints: number; // credited to the member's Pin Wallet on admin approval
  gift: string;            // display label
  icon: string;
};

// Each level rewards Pin Wallet points (usable to buy pins) once both legs are
// filled to that level AND admin approves the claim.
export const REWARD_LEVELS: RewardLevel[] = [
  { level: 1,  legCount: 1,     pinWalletPoints: 100,        gift: "100 pts → Pin Wallet",        icon: "💰" },
  { level: 2,  legCount: 2,     pinWalletPoints: 200,        gift: "200 pts → Pin Wallet",        icon: "💰" },
  { level: 3,  legCount: 4,     pinWalletPoints: 200,        gift: "200 pts → Pin Wallet",        icon: "💰" },
  { level: 4,  legCount: 8,     pinWalletPoints: 200,        gift: "200 pts → Pin Wallet",        icon: "💰" },
  { level: 5,  legCount: 16,    pinWalletPoints: 300,        gift: "300 pts → Pin Wallet",        icon: "💰" },
  { level: 6,  legCount: 32,    pinWalletPoints: 500,        gift: "500 pts → Pin Wallet",        icon: "💰" },
  { level: 7,  legCount: 64,    pinWalletPoints: 1000,       gift: "1,000 pts → Pin Wallet",      icon: "💰" },
  { level: 8,  legCount: 128,   pinWalletPoints: 2000,       gift: "2,000 pts → Pin Wallet",      icon: "💰" },
  { level: 9,  legCount: 256,   pinWalletPoints: 10000,      gift: "10,000 pts → Pin Wallet",     icon: "💰" },
  { level: 10, legCount: 512,   pinWalletPoints: 20000,      gift: "20,000 pts → Pin Wallet",     icon: "💰" },
  { level: 11, legCount: 1024,  pinWalletPoints: 100000,     gift: "1 Lakh pts → Pin Wallet",     icon: "💎" },
  { level: 12, legCount: 2048,  pinWalletPoints: 300000,     gift: "3 Lakh pts → Pin Wallet",     icon: "💎" },
  { level: 13, legCount: 4096,  pinWalletPoints: 500000,     gift: "5 Lakh pts → Pin Wallet",     icon: "💎" },
  { level: 14, legCount: 8192,  pinWalletPoints: 2000000,    gift: "20 Lakh pts → Pin Wallet",    icon: "🏆" },
  { level: 15, legCount: 16384, pinWalletPoints: 10000000,   gift: "1 Crore pts → Pin Wallet",    icon: "🏆" },
];

// Pin Wallet points for a reward level (0 if not an L1-15 reward).
export function rewardPinWalletPoints(level: number): number {
  return REWARD_LEVELS.find((r) => r.level === level)?.pinWalletPoints ?? 0;
}

export type RewardEligibilityContext = {
  leftLegCount: number;
  rightLegCount: number;
  // Deepest level to which each leg is a *perfectly filled* binary tree (no
  // empty slots). This — not the raw leg counts above — decides eligibility.
  // See getLegFillDepths in lib/network.ts. Optional for back-compat; when
  // omitted, falls back to the legacy leg-count threshold.
  leftFillDepth?: number;
  rightFillDepth?: number;
  // Levels the user has already claimed (any status — pending counts too).
  // Once a level appears here it is permanently locked for re-claiming.
  claimedLevels?: readonly number[];
};

// Members on each side once a leg is perfectly filled to a given level
// (a complete binary tree of depth N has 2^N - 1 nodes). Used for display.
export function rewardMembersPerSide(level: number): number {
  return level > 0 ? 2 ** level - 1 : 0;
}

export function rewardThresholdMet(reward: RewardLevel, ctx: RewardEligibilityContext): boolean {
  // Both legs must be completely filled to this reward's level.
  if (ctx.leftFillDepth !== undefined && ctx.rightFillDepth !== undefined) {
    return ctx.leftFillDepth >= reward.level && ctx.rightFillDepth >= reward.level;
  }
  // Legacy fallback when fill depths weren't supplied (head-count threshold).
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

// Highest level both legs are completely filled to, ignoring claim state.
// Used for "X / 15 unlocked" KPI display.
export function getUnlockedLevel(leftFillDepth: number, rightFillDepth: number): number {
  let unlocked = 0;
  for (const r of REWARD_LEVELS) {
    if (leftFillDepth >= r.level && rightFillDepth >= r.level) unlocked = r.level;
    else break;
  }
  return unlocked;
}
