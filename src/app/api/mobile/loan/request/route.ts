import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";
import { LOAN_TIERS, tierByKey, tierIsEligible, nextClaimableTier, formatRupees } from "@/lib/loan";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tierKey: z.enum(LOAN_TIERS.map((t) => t.key) as [string, ...string[]]),
});

export async function POST(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const tier = tierByKey(parsed.data.tierKey);
    if (!tier) return NextResponse.json({ error: "Unknown tier" }, { status: 400 });

    const [me, directLeftSlots, directRightSlots, openLoan, closedLoans] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { leftLegCount: true, rightLegCount: true },
      }),
      prisma.user.count({ where: { referrerId: auth.user.id, slot: "LEFT" } }),
      prisma.user.count({ where: { referrerId: auth.user.id, slot: "RIGHT" } }),
      prisma.loan.findFirst({
        where: { userId: auth.user.id, status: { in: ["REQUESTED", "APPROVED"] } },
        select: { id: true, status: true },
      }),
      prisma.loan.findMany({
        where: { userId: auth.user.id, status: "CLOSED" },
        select: { tierKey: true },
      }),
    ]);

    if (openLoan) {
      return NextResponse.json(
        { error: `You already have a ${openLoan.status.toLowerCase()} loan` },
        { status: 400 },
      );
    }

    const completedTierKeys = closedLoans.map((l) => l.tierKey);
    if (completedTierKeys.includes(tier.key)) {
      return NextResponse.json(
        { error: "You have already completed this loan tier. Move on to the next level." },
        { status: 400 },
      );
    }

    const ctx = {
      leftLegCount: me?.leftLegCount ?? 0,
      rightLegCount: me?.rightLegCount ?? 0,
      directLeftSlots,
      directRightSlots,
      completedTierKeys,
    };
    if (!tierIsEligible(tier, ctx)) {
      return NextResponse.json(
        { error: "You do not qualify for this tier yet" },
        { status: 400 },
      );
    }
    const next = nextClaimableTier(ctx);
    if (!next || next.key !== tier.key) {
      return NextResponse.json(
        {
          error: next
            ? `Complete the ${formatRupees(next.amount)} loan first before applying for this tier.`
            : "You do not qualify for any tier yet.",
        },
        { status: 400 },
      );
    }

    const loan = await prisma.loan.create({
      data: {
        userId: auth.user.id,
        tierKey: tier.key,
        amount: tier.amount,
        totalWeeks: tier.totalWeeks,
        status: "REQUESTED",
      },
    });

    return NextResponse.json({ ok: true, id: loan.id });
  } catch (e) {
    return mobileServerError("loan.request", e);
  }
}
