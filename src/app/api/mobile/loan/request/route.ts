import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";
import { LOAN_TIERS, tierByKey, tierIsEligible } from "@/lib/loan";

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

    const [me, directLeftSlots, directRightSlots, openLoan] = await Promise.all([
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
      return NextResponse.json(
        { error: "You do not qualify for this tier yet" },
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
