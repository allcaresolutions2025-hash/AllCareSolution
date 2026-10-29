import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AF_ID_PATTERN } from "@/lib/af";
import { AfAddMemberForm } from "./af-add-member-form";
import { UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add AF Member" };

export default async function AfAddMemberPage({ searchParams }: { searchParams: { referId?: string; side?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true, bankAccountName: true, bankAccountNumber: true, bankIfsc: true, bankName: true },
  });
  if (!me) return null;

  // Prefilled from the L+ / R+ slot clicked on the AF tree.
  const referId = searchParams.referId?.toUpperCase();
  const defaultSponsor = referId && AF_ID_PATTERN.test(referId) ? referId : me.referralCode;
  const defaultSide = searchParams.side === "RIGHT" ? "RIGHT" : searchParams.side === "LEFT" ? "LEFT" : "";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-af-600" /> Add AF Member
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new AF account in an open slot under you or anyone in your AF tree. The account is created
          immediately. Bank details start as yours. Change them if the new account holder banks elsewhere.
        </p>
      </div>

      <AfAddMemberForm
        defaultSponsor={defaultSponsor}
        defaultSide={defaultSide}
        defaultBank={{
          bankAccountName: me.bankAccountName,
          bankAccountNumber: me.bankAccountNumber,
          bankIfsc: me.bankIfsc,
          bankName: me.bankName,
        }}
      />
    </div>
  );
}
