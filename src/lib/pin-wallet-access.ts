import { prisma } from "./db";

// A member can ACCESS the Pin Wallet (buy pins, and transfer points to/from the
// payout wallet) only once BOTH of their binary legs have strictly MORE than
// one member — i.e. left and right filled PLUS at least one more member below.
// This mirrors the daily-payout eligibility rule (leftLegCount/rightLegCount
// > 1). Members who don't yet meet it cannot use the Pin Wallet at all.
export async function hasBothLegsFilled(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { leftLegCount: true, rightLegCount: true },
  });
  return !!u && u.leftLegCount > 1 && u.rightLegCount > 1;
}

export const PIN_WALLET_LOCKED_MESSAGE =
  "Add more than one member on both your left and right legs to unlock the Pin Wallet.";
