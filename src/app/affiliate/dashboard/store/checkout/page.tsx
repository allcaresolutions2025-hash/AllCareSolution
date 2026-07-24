import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllBusinessSettings } from "@/lib/settings";
import { toPaise } from "@/lib/money";
import { StoreCheckoutForm, type SavedAddress } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function StoreCheckoutPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/affiliate/dashboard/store/checkout")}`);
  }

  const [defaultAddress, latestAddress, user, wallet, settings] = await Promise.all([
    prisma.address.findFirst({
      where: { userId: session.user.id, isDefault: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.address.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true },
    }),
    prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: { balanceAvailable: true },
    }),
    getAllBusinessSettings(),
  ]);

  const picked = defaultAddress ?? latestAddress;
  const saved: SavedAddress | null = picked
    ? {
        fullName: picked.fullName,
        phone: picked.phone,
        line1: picked.line1,
        line2: picked.line2 ?? "",
        city: picked.city,
        state: picked.state,
        pincode: picked.pincode,
      }
    : null;

  return (
    <StoreCheckoutForm
      savedAddress={saved}
      userName={user?.name ?? ""}
      userPhone={user?.phone ?? ""}
      walletBalance={wallet?.balanceAvailable ?? 0}
      shippingCost={toPaise(settings.SHIPPING_COST_INR)}
    />
  );
}
