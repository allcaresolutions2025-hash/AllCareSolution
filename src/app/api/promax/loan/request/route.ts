import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { formatRupees, countActivePanLoanConflicts, PAN_CONFLICT_MESSAGE, countIdentityLoanConflicts, IDENTITY_CONFLICT_MESSAGE, tierIsEligible } from "@/lib/loan";
import { PROMAX_LOAN_TIERS, proMaxTierByKey, proMaxNextClaimableTier } from "@/lib/loan-promax";
import { getProMaxLegFillDepths } from "@/lib/network-promax";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tierKey: z.enum(PROMAX_LOAN_TIERS.map((t) => t.key) as [string, ...string[]]),
  whatsappNumber: z.string().regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit WhatsApp number"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!session.user.isProMax) return NextResponse.json({ error: "Pro Max members only" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const tier = proMaxTierByKey(parsed.data.tierKey);
  if (!tier) return NextResponse.json({ error: "Unknown tier" }, { status: 400 });

  const [me, directLeftSlots, directRightSlots, fillDepths, openLoan, closedLoans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { proMaxLeftLegCount: true, proMaxRightLegCount: true },
    }),
    prisma.user.count({ where: { proMaxReferrerId: session.user.id, proMaxSlot: "LEFT" } }),
    prisma.user.count({ where: { proMaxReferrerId: session.user.id, proMaxSlot: "RIGHT" } }),
    getProMaxLegFillDepths(session.user.id),
    prisma.loan.findFirst({
      where: { userId: session.user.id, proMax: true, status: { in: ["REQUESTED", "APPROVED"] } },
      select: { id: true, status: true },
    }),
    prisma.loan.findMany({
      where: { userId: session.user.id, proMax: true, status: "CLOSED" },
      select: { tierKey: true },
    }),
  ]);

  if (openLoan) {
    return NextResponse.json({ error: `You already have a ${openLoan.status.toLowerCase()} loan` }, { status: 400 });
  }

  // PAN + identity guards, scoped to Pro Max loans.
  const panConflict = await countActivePanLoanConflicts(prisma, session.user.id, true);
  if (panConflict.conflictCount > 0) {
    return NextResponse.json({ error: PAN_CONFLICT_MESSAGE }, { status: 400 });
  }
  const identityConflict = await countIdentityLoanConflicts(prisma, session.user.id, true);
  if (identityConflict.conflictCount > 0) {
    return NextResponse.json({ error: IDENTITY_CONFLICT_MESSAGE, code: "IDENTITY_CONFLICT" }, { status: 400 });
  }

  const completedTierKeys = closedLoans.map((l) => l.tierKey);
  if (completedTierKeys.includes(tier.key)) {
    return NextResponse.json({ error: "You have already completed this loan tier. Move on to the next level." }, { status: 400 });
  }

  const ctx = {
    leftLegCount: me?.proMaxLeftLegCount ?? 0,
    rightLegCount: me?.proMaxRightLegCount ?? 0,
    directLeftSlots,
    directRightSlots,
    leftFillDepth: fillDepths.leftFillDepth,
    rightFillDepth: fillDepths.rightFillDepth,
    completedTierKeys,
  };
  if (!tierIsEligible(tier, ctx)) {
    return NextResponse.json({ error: "You do not qualify for this tier yet" }, { status: 400 });
  }
  const next = proMaxNextClaimableTier(ctx);
  if (!next || next.key !== tier.key) {
    return NextResponse.json(
      { error: next ? `Complete the ${formatRupees(next.amount)} loan first before applying for this tier.` : "You do not qualify for any tier yet." },
      { status: 400 },
    );
  }

  const loan = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { whatsappNumber: parsed.data.whatsappNumber },
    });
    return tx.loan.create({
      data: {
        userId: session.user.id,
        tierKey: tier.key,
        amount: tier.amount,
        totalWeeks: tier.totalWeeks,
        proMax: true,
        status: "REQUESTED",
      },
    });
  });

  return NextResponse.json({ ok: true, id: loan.id });
}
