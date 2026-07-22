import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireFranchise, notifyAdmins } from "@/lib/franchise";
import { WELCOME_KIT_LEVEL } from "@/lib/rewards";

const schema = z.object({
  status: z.enum(["APPROVED", "DISPATCHED", "DELIVERED", "REJECTED"]),
  note: z.string().max(500).optional(),
});

// Legal moves for the franchise-run Welcome Kit lifecycle. Anything else (e.g.
// re-opening a delivered kit) is the admin's call, not the franchise's.
const ALLOWED_NEXT: Record<string, string[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED"],
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireFranchise();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const claim = await prisma.rewardClaim.findUnique({
    where: { id: params.id },
    include: { user: { select: { name: true, referralCode: true } } },
  });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  if (claim.franchiseId !== auth.leaderId) {
    return NextResponse.json({ error: "This claim is not assigned to you" }, { status: 403 });
  }
  // Hard guard: a franchise only ever touches the Welcome Kit.
  if (claim.level !== WELCOME_KIT_LEVEL) {
    return NextResponse.json({ error: "Only the Welcome Kit is handled by a franchise" }, { status: 403 });
  }

  const next = parsed.data.status;
  if (!ALLOWED_NEXT[claim.status]?.includes(next)) {
    return NextResponse.json(
      { error: `Cannot move a ${claim.status.toLowerCase()} kit to ${next.toLowerCase()}` },
      { status: 400 },
    );
  }

  const now = new Date();
  const who = `${auth.session.user.name} (franchise)`;
  const member = `${claim.user.name} (${claim.user.referralCode})`;

  const memberMessage: Record<string, { title: string; body: string }> = {
    APPROVED: {
      title: "Welcome Kit approved",
      body: "Your Welcome Kit has been approved by your franchise and will be delivered to you shortly.",
    },
    DISPATCHED: {
      title: "Welcome Kit out for delivery",
      body: "Your franchise has sent your Welcome Kit out for delivery. They will contact you shortly.",
    },
    DELIVERED: {
      title: "Welcome Kit delivered",
      body: "Your Welcome Kit has been marked as delivered by your franchise. Enjoy!",
    },
    REJECTED: {
      title: "Welcome Kit claim rejected",
      body: "Your Welcome Kit claim was rejected by your franchise. Please contact them for details.",
    },
  };

  const adminMessage: Record<string, { title: string; body: string }> = {
    APPROVED: {
      title: "Franchise approved a Welcome Kit",
      body: `${who} approved the Welcome Kit for ${member}. They will deliver it.`,
    },
    DISPATCHED: {
      title: "Welcome Kit sent for delivery",
      body: `${who} has sent the Welcome Kit for ${member} out for delivery.`,
    },
    DELIVERED: {
      title: "Welcome Kit delivered by franchise",
      body: `${who} delivered the Welcome Kit to ${member}.`,
    },
    REJECTED: {
      title: "Franchise rejected a Welcome Kit",
      body: `${who} rejected the Welcome Kit claim from ${member}.`,
    },
  };

  await prisma.$transaction(async (tx) => {
    await tx.rewardClaim.update({
      where: { id: claim.id },
      data: {
        status: next,
        franchiseStatus: next === "REJECTED" ? "REJECTED" : "APPROVED",
        franchiseReviewedAt: claim.franchiseReviewedAt ?? now,
        franchiseNotes: parsed.data.note ?? claim.franchiseNotes,
        franchiseDeliveredAt: next === "DELIVERED" ? now : claim.franchiseDeliveredAt,
      },
    });
    // Delivering a kit takes one off the franchise leader's shelf. Floor at
    // zero so a leader who ran out (or delivered before any stock was logged)
    // never goes negative, and record the movement in the ledger.
    if (next === "DELIVERED") {
      const leader = await tx.user.findUnique({
        where: { id: auth.leaderId },
        select: { franchiseStockCurrent: true },
      });
      const nextStock = Math.max(0, (leader?.franchiseStockCurrent ?? 0) - 1);
      if (nextStock !== (leader?.franchiseStockCurrent ?? 0)) {
        await tx.user.update({
          where: { id: auth.leaderId },
          data: { franchiseStockCurrent: nextStock },
        });
        await tx.franchiseStockTxn.create({
          data: {
            franchiseId: auth.leaderId,
            type: "CONSUME",
            quantity: -1,
            balanceAfter: nextStock,
            note: `Delivered Welcome Kit to ${claim.user.name} (${claim.user.referralCode})`,
            rewardClaimId: claim.id,
          },
        });
      }
    }
    await tx.notification.create({
      data: { userId: claim.userId, ...memberMessage[next] },
    });
    await notifyAdmins(tx, adminMessage[next].title, adminMessage[next].body);
  });

  return NextResponse.json({ ok: true, status: next });
}
