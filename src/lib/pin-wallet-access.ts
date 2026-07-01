import { prisma } from "./db";

// A member can ACCESS the Pin Wallet (buy pins, and transfer points to/from the
// payout wallet) only once BOTH of their binary legs are filled — i.e. they
// have at least one member on the LEFT leg AND at least one on the RIGHT leg.
// Members with an empty leg cannot use the Pin Wallet at all.
export async function hasBothLegsFilled(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { leftLegCount: true, rightLegCount: true },
  });
  return !!u && u.leftLegCount > 0 && u.rightLegCount > 0;
}

export const PIN_WALLET_LOCKED_MESSAGE =
  "Fill both your left and right legs to unlock the Pin Wallet.";
