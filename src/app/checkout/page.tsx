import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckoutForm, type SavedAddress } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
  }

  // Prefer the default address; fall back to the most recently added one.
  // Either way, the form will offer "use this" vs "edit / new".
  const [defaultAddress, latestAddress, user] = await Promise.all([
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
      select: { name: true, email: true, phone: true },
    }),
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
    <CheckoutForm
      savedAddress={saved}
      userName={user?.name ?? ""}
      userEmail={user?.email ?? ""}
      userPhone={user?.phone ?? ""}
    />
  );
}
