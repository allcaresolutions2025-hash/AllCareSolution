import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const loans = await prisma.loan.findMany({
      where: { userId: auth.user.id },
      orderBy: { requestedAt: "desc" },
      include: {
        installments: {
          orderBy: { weekNumber: "asc" },
          select: {
            id: true,
            weekNumber: true,
            amount: true,
            dueDate: true,
            status: true,
            uploadedAt: true,
            verifiedAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      loans: loans.map((l) => ({
        id: l.id,
        tierKey: l.tierKey,
        amount: l.amount,
        totalWeeks: l.totalWeeks,
        status: l.status,
        reviewerNotes: l.reviewerNotes,
        requestedAt: l.requestedAt,
        approvedAt: l.approvedAt,
        rejectedAt: l.rejectedAt,
        closedAt: l.closedAt,
        dueDate: l.dueDate,
        installments: l.installments,
      })),
    });
  } catch (e) {
    return mobileServerError("loan.list", e);
  }
}
