// Pro Max (10,000-pt) reward ladder. Mirrors the 1,000-pt ladder in lib/rewards.ts
// but with the Pro Max prizes (PLAN 2). A level unlocks when the member's Pro Max
// binary tree is COMPLETELY FILLED to that level on BOTH legs — every slot in
// levels 1..N occupied, no gaps — measured by each leg's fill depth
// (see getProMaxLegFillDepths in lib/network-promax.ts). Levels are independent:
// any unlocked level is claimable, and each claim is unique per member+level.
//
// Levels 1-6 credit Pin Wallet points on admin approval (1K/2K/5K). Levels 7-15
// are physical prizes the admin dispatches. The Welcome Kit (level 0) is a
// one-time joining gift with no leg requirement.

export const PROMAX_WELCOME_KIT_LEVEL = 0;
export const PROMAX_WELCOME_KIT_REWARD = {
  level: PROMAX_WELCOME_KIT_LEVEL,
  gift: "Welcome Kit",
  icon: "🎁",
} as const;

export type ProMaxRewardLevel = {
  level: number;
  legCount: number;        // members at this depth on each side (2^(level-1)); display only
  pinWalletPoints: number; // credited to Pin Wallet on admin approval (0 for physical prizes)
  gift: string;            // display label
  icon: string;
};

export const PROMAX_REWARD_LEVELS: ProMaxRewardLevel[] = [
  { level: 1,  legCount: 1,     pinWalletPoints: 1000, gift: "1,000 pts → Pin Wallet", icon: "💰" },
  { level: 2,  legCount: 2,     pinWalletPoints: 2000, gift: "2,000 pts → Pin Wallet", icon: "💰" },
  { level: 3,  legCount: 4,     pinWalletPoints: 2000, gift: "2,000 pts → Pin Wallet", icon: "💰" },
  { level: 4,  legCount: 8,     pinWalletPoints: 2000, gift: "2,000 pts → Pin Wallet", icon: "💰" },
  { level: 5,  legCount: 16,    pinWalletPoints: 2000, gift: "2,000 pts → Pin Wallet", icon: "💰" },
  { level: 6,  legCount: 32,    pinWalletPoints: 5000, gift: "5,000 pts → Pin Wallet", icon: "💰" },
  { level: 7,  legCount: 64,    pinWalletPoints: 0,    gift: "iPhone (₹40K)",          icon: "📱" },
  { level: 8,  legCount: 128,   pinWalletPoints: 0,    gift: "MacBook (₹60K)",         icon: "💻" },
  { level: 9,  legCount: 256,   pinWalletPoints: 0,    gift: "Enfield Bike (₹1.5L)",   icon: "🏍️" },
  { level: 10, legCount: 512,   pinWalletPoints: 0,    gift: "Car Fund (₹3L)",         icon: "🚗" },
  { level: 11, legCount: 1024,  pinWalletPoints: 0,    gift: "Gold (₹5L)",             icon: "🥇" },
  { level: 12, legCount: 2048,  pinWalletPoints: 0,    gift: "House 1★ (₹10L)",        icon: "🏠" },
  { level: 13, legCount: 4096,  pinWalletPoints: 0,    gift: "House 2★ (₹30L)",        icon: "🏡" },
  { level: 14, legCount: 8192,  pinWalletPoints: 0,    gift: "House 3★ (₹50L)",        icon: "🏘️" },
  { level: 15, legCount: 16384, pinWalletPoints: 0,    gift: "5 Cr Villa, Gold & Luxury Car", icon: "🏆" },
];

// Pin Wallet points for a Pro Max reward level (0 if physical / not a level reward).
export function proMaxRewardPinWalletPoints(level: number): number {
  return PROMAX_REWARD_LEVELS.find((r) => r.level === level)?.pinWalletPoints ?? 0;
}

// Members on each side once a leg is perfectly filled to a given level
// (a complete binary tree of depth N has 2^N - 1 nodes). Used for display.
export function proMaxRewardMembersPerSide(level: number): number {
  return level > 0 ? 2 ** level - 1 : 0;
}

export type ProMaxRewardEligibility = {
  leftFillDepth: number;
  rightFillDepth: number;
};

// A level's threshold is met when BOTH legs are perfectly filled to that depth.
export function proMaxRewardThresholdMet(reward: ProMaxRewardLevel, ctx: ProMaxRewardEligibility): boolean {
  return ctx.leftFillDepth >= reward.level && ctx.rightFillDepth >= reward.level;
}

// Highest level both legs are completely filled to (for "X / 15 unlocked").
export function getProMaxUnlockedLevel(leftFillDepth: number, rightFillDepth: number): number {
  let unlocked = 0;
  for (const r of PROMAX_REWARD_LEVELS) {
    if (leftFillDepth >= r.level && rightFillDepth >= r.level) unlocked = r.level;
    else break;
  }
  return unlocked;
}
