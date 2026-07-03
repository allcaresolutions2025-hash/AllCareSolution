import { prisma } from "./db";

// A member can ACCESS the Pin Wallet (buy pins, and transfer points to/from the
// payout wallet) once BOTH of their binary legs have strictly MORE than one
// member — i.e. left and right filled PLUS at least one more member below.
// This mirrors the daily-payout eligibility rule (leftLegCount/rightLegCount
// > 1). An admin can also grant access manually via the `pinWalletUnlocked`
// override, which bypasses the leg requirement entirely.
export function pinWalletAccessAllowed(u: {
  pinWalletUnlocked: boolean;
  leftLegCount: number;
  rightLegCount: number;
}): boolean {
  if (u.pinWalletUnlocked) return true;
  return u.leftLegCount > 1 && u.rightLegCount > 1;
}

export async function canAccessPinWallet(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinWalletUnlocked: true, leftLegCount: true, rightLegCount: true },
  });
  return !!u && pinWalletAccessAllowed(u);
}

export const PIN_WALLET_LOCKED_MESSAGE =
  "Add more than one member on both your left and right legs to unlock the Pin Wallet, or ask an admin to enable it for you.";
