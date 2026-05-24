import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { tierByKey, tierIsEligible, LOAN_TIERS } from "@/lib/loan";

const bodySchema = z.object({
  tierKey: z.enum(LOAN_TIERS.map((t) => t.key) as [string, ...string[]]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const tier = tierByKey(parsed.data.tierKey);
  if (!tier) return NextResponse.json({ error: "Unknown tier" }, { status: 400 });

  // Re-verify eligibility server-side so a malicious client can't request a
  // tier they don't actually qualify for.
  const [me, directLeftSlots, directRightSlots, openLoan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leftLegCount: true, rightLegCount: true },
    }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "LEFT" } }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "RIGHT" } }),
    prisma.loan.findFirst({
      where: { userId: session.user.id, status: { in: ["REQUESTED", "APPROVED"] } },
      select: { id: true, status: true },
    }),
  ]);

  if (openLoan) {
    return NextResponse.json(
      { error: `You already have a ${openLoan.status.toLowerCase()} loan` },
      { status: 400 },
    );
  }

  const eligible = tierIsEligible(tier, {
    leftLegCount: me?.leftLegCount ?? 0,
    rightLegCount: me?.rightLegCount ?? 0,
    directLeftSlots,
    directRightSlots,
  });
  if (!eligible) {
    return NextResponse.json({ error: "You do not qualify for this tier yet" }, { status: 400 });
  }

  const loan = await prisma.loan.create({
    data: {
      userId: session.user.id,
      tierKey: tier.key,
      amount: tier.amount,
      totalWeeks: tier.totalWeeks,
      status: "REQUESTED",
    },
  });

  return NextResponse.json({ ok: true, id: loan.id });
}
