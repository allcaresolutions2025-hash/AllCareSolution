export interface RewardLevel {
  level: number;
  minLegSize: number; // min(leftLegCount, rightLegCount) needed
  totalMembers: number; // 2 * minLegSize — shown in the table
  gift: string;
  icon: string; // emoji for display
}

// Level N unlocks when min(leftLegCount, rightLegCount) >= 2^(N-1)
export const REWARD_LEVELS: RewardLevel[] = [
  { level: 1,  minLegSize: 1,     totalMembers: 2,      gift: "Welcome Kit",                     icon: "🎁" },
  { level: 2,  minLegSize: 2,     totalMembers: 4,      gift: "Product 1",                        icon: "🌿" },
  { level: 3,  minLegSize: 4,     totalMembers: 8,      gift: "Product 2",                        icon: "🌿" },
  { level: 4,  minLegSize: 8,     totalMembers: 16,     gift: "Product 2",                        icon: "🌿" },
  { level: 5,  minLegSize: 16,    totalMembers: 32,     gift: "Product 2",                        icon: "🌿" },
  { level: 6,  minLegSize: 32,    totalMembers: 64,     gift: "Product 5",                        icon: "🌿" },
  { level: 7,  minLegSize: 64,    totalMembers: 128,    gift: "Power Bank",                       icon: "🔋" },
  { level: 8,  minLegSize: 128,   totalMembers: 256,    gift: "Air Buds",                         icon: "🎧" },
  { level: 9,  minLegSize: 256,   totalMembers: 512,    gift: "Mobile (10K class)",               icon: "📱" },
  { level: 10, minLegSize: 512,   totalMembers: 1024,   gift: "Laptop (20K class)",               icon: "💻" },
  { level: 11, minLegSize: 1024,  totalMembers: 2048,   gift: "Two-Wheeler (1 Lakh class)",       icon: "🛵" },
  { level: 12, minLegSize: 2048,  totalMembers: 4096,   gift: "Car (3 Lakh class)",               icon: "🚗" },
  { level: 13, minLegSize: 4096,  totalMembers: 8192,   gift: "Gold (5 Lakh class)",              icon: "🥇" },
  { level: 14, minLegSize: 8192,  totalMembers: 16384,  gift: "House (20 Lakh class)",            icon: "🏠" },
  { level: 15, minLegSize: 16384, totalMembers: 32768,  gift: "Villa + Gold + Luxury Car (1 Crore class)", icon: "🏆" },
];

export function getUnlockedLevel(leftLegCount: number, rightLegCount: number): number {
  const minLeg = Math.min(leftLegCount, rightLegCount);
  let unlocked = 0;
  for (const r of REWARD_LEVELS) {
    if (minLeg >= r.minLegSize) unlocked = r.level;
    else break;
  }
  return unlocked;
}
