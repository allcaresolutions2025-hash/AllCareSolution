import { customAlphabet } from "nanoid";
import { prisma } from "./db";

// AM-prefixed IDs: 8-digit random suffix. e.g. AM12345678.
const digits = customAlphabet("0123456789", 8);

export function genAmCode(): string {
  return "AM" + digits();
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = genAmCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate unique referral code after 20 attempts");
}

export async function generateUniquePinCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = genAmCode();
    const existing = await prisma.pin.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate unique pin code after 20 attempts");
}

/**
 * Resolve a referral code to a referrer user. Returns null if not found / invalid.
 * Self-referrals are not allowed but enforced at the call site.
 */
export async function resolveReferrer(code?: string | null) {
  if (!code) return null;
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  return prisma.user.findUnique({
    where: { referralCode: clean },
    select: { id: true, name: true, referralCode: true, referrerId: true, isActive: true },
  });
}

/**
 * Get L1 and L2 referrers for a given user. L1 is the direct referrer; L2 is L1's referrer.
 * Used at order time to snapshot the commission chain.
 */
export async function getReferralChain(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referrerId: true,
      referrer: {
        select: {
          id: true,
          isActive: true,
          referrerId: true,
          referrer: {
            select: { id: true, isActive: true },
          },
        },
      },
    },
  });

  const l1 = user?.referrer?.isActive ? user.referrer.id : null;
  const l2 = user?.referrer?.referrer?.isActive ? user.referrer.referrer.id : null;
  return { l1, l2 };
}
