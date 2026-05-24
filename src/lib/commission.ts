import { prisma } from "./db";
import { getAllBusinessSettings } from "./settings";
import { toPaise } from "./money";
import type { Prisma } from "@prisma/client";

/**
 * Commission engine — accrues commissions on paid orders, releases them after
 * the buyback window, and reverses them on order return/refund.
 *
 * Legal design notes:
 *  - Commissions are tied to actual product sales (the Order). No payouts for
 *    enrollment alone.
 *  - L1 = direct referrer (20% by default). L2 = referrer-of-referrer (5%).
 *    Hard-capped at 2 levels — no deeper attribution exists anywhere in code.
 *  - Base is pre-GST subtotal (you don't pay commission on tax collected).
 *  - Reversed on return/refund inside the buyback window.
 */

export async function accrueCommissionsForOrder(
  orderId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      subtotal: true,
      l1ReferrerId: true,
      l2ReferrerId: true,
      paidAt: true,
      commissions: { select: { id: true } },
    },
  });
  if (!order || !order.paidAt) return;
  if (order.commissions.length > 0) return; // idempotent

  const settings = await getAllBusinessSettings();
  const created: Array<{ beneficiaryId: string; level: 1 | 2; rate: number }> = [];

  if (order.l1ReferrerId) {
    created.push({
      beneficiaryId: order.l1ReferrerId,
      level: 1,
      rate: settings.COMMISSION_L1_PERCENT,
    });
  }
  if (order.l2ReferrerId) {
    created.push({
      beneficiaryId: order.l2ReferrerId,
      level: 2,
      rate: settings.COMMISSION_L2_PERCENT,
    });
  }

  for (const c of created) {
    const commissionAmount = Math.round((order.subtotal * c.rate) / 100);
    await db.commission.create({
      data: {
        orderId: order.id,
        beneficiaryId: c.beneficiaryId,
        level: c.level,
        ratePercent: c.rate,
        baseAmount: order.subtotal,
        commissionAmount,
        status: "PENDING",
      },
    });
    await upsertWalletPending(c.beneficiaryId, commissionAmount, db);
  }
}

async function upsertWalletPending(
  userId: string,
  deltaPaise: number,
  db: Prisma.TransactionClient | typeof prisma
) {
  await db.wallet.upsert({
    where: { userId },
    create: { userId, balancePending: deltaPaise },
    update: { balancePending: { increment: deltaPaise } },
  });
}

/**
 * Release commissions whose buyback window has elapsed and whose order is in
 * good standing (not returned/refunded). Should be run by a scheduled job.
 */
export async function releaseMaturedCommissions() {
  const now = new Date();
  const matured = await prisma.commission.findMany({
    where: {
      status: "PENDING",
      order: {
        buybackUntil: { lte: now },
        status: { in: ["DELIVERED", "PAID", "SHIPPED"] },
      },
    },
    select: { id: true, beneficiaryId: true, commissionAmount: true },
  });

  for (const c of matured) {
    await prisma.$transaction([
      prisma.commission.update({
        where: { id: c.id },
        data: { status: "AVAILABLE", availableAt: now },
      }),
      prisma.wallet.update({
        where: { userId: c.beneficiaryId },
        data: {
          balancePending: { decrement: c.commissionAmount },
          balanceAvailable: { increment: c.commissionAmount },
        },
      }),
    ]);
  }
  return matured.length;
}

/**
 * Reverse commissions on a returned/refunded order. Pulls back from whichever
 * bucket (pending/available) the money is currently in. If already paid out,
 * it logs the reversal but does not claw back paid funds (admin policy).
 */
export async function reverseCommissionsForOrder(orderId: string) {
  const commissions = await prisma.commission.findMany({
    where: { orderId, status: { in: ["PENDING", "AVAILABLE"] } },
  });

  for (const c of commissions) {
    const updates: Prisma.WalletUpdateInput = {};
    if (c.status === "PENDING") {
      updates.balancePending = { decrement: c.commissionAmount };
    } else if (c.status === "AVAILABLE") {
      updates.balanceAvailable = { decrement: c.commissionAmount };
    }
    await prisma.$transaction([
      prisma.commission.update({
        where: { id: c.id },
        data: { status: "REVERSED" },
      }),
      prisma.wallet.update({ where: { userId: c.beneficiaryId }, data: updates }),
    ]);
  }
}

/**
 * Compute TDS for a payout request.
 * Section 194H: TDS at 5% on commission income > Rs 15,000/year per payee.
 * If the user's lifetime paid + this request crosses threshold, TDS applies on this entire request.
 */
export async function computeTdsForPayout(userId: string, amountGrossPaise: number) {
  const settings = await getAllBusinessSettings();
  const thresholdPaise = toPaise(settings.TDS_THRESHOLD_INR);
  const tdsRate = settings.TDS_PERCENT;

  // Lifetime gross commission paid so far (excluding this request)
  const paid = await prisma.commission.aggregate({
    where: { beneficiaryId: userId, status: "PAID" },
    _sum: { commissionAmount: true },
  });
  const paidSoFar = paid._sum.commissionAmount ?? 0;
  const cumulative = paidSoFar + amountGrossPaise;

  if (cumulative <= thresholdPaise) {
    return { tdsAmount: 0, tdsRate: 0, amountNet: amountGrossPaise };
  }
  const tdsAmount = Math.round((amountGrossPaise * tdsRate) / 100);
  return { tdsAmount, tdsRate, amountNet: amountGrossPaise - tdsAmount };
}
