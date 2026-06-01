import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const [rows, totals] = await Promise.all([
      prisma.commission.findMany({
        where: { beneficiaryId: auth.user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          level: true,
          ratePercent: true,
          baseAmount: true,
          commissionAmount: true,
          status: true,
          availableAt: true,
          createdAt: true,
          order: {
            select: {
              orderNumber: true,
              user: { select: { name: true, referralCode: true } },
            },
          },
        },
      }),
      prisma.commission.groupBy({
        by: ["status"],
        where: { beneficiaryId: auth.user.id },
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, { totalPaise: number; count: number }> = {};
    for (const t of totals) {
      byStatus[t.status] = {
        totalPaise: t._sum.commissionAmount ?? 0,
        count: t._count._all,
      };
    }

    return NextResponse.json({
      commissions: rows.map((c) => ({
        id: c.id,
        level: c.level,
        ratePercent: c.ratePercent,
        basePaise: c.baseAmount,
        amountPaise: c.commissionAmount,
        status: c.status,
        availableAt: c.availableAt,
        createdAt: c.createdAt,
        orderNumber: c.order.orderNumber,
        fromMemberName: c.order.user.name,
        fromMemberCode: c.order.user.referralCode,
      })),
      byStatus,
    });
  } catch (e) {
    return mobileServerError("affiliate.commissions", e);
  }
}
