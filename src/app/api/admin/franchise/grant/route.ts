import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const schema = z.object({
  // Member ID (AM-code) or email — whichever the admin has to hand.
  identifier: z.string().min(3).max(120),
  grant: z.boolean(),
});

// Admin promotes a member to franchise directly (the "offline request" path),
// or revokes an existing franchise. Revoking releases anything still sitting in
// that leader's queue back to the admin so nothing gets stranded.
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const id = parsed.data.identifier.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ referralCode: id.toUpperCase() }, { email: id.toLowerCase() }],
    },
    select: { id: true, name: true, referralCode: true, isFranchise: true },
  });
  if (!user) return NextResponse.json({ error: "No member with that ID or email" }, { status: 404 });

  if (user.isFranchise === parsed.data.grant) {
    return NextResponse.json(
      { error: parsed.data.grant ? "Already a franchise" : "Not a franchise" },
      { status: 400 },
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        isFranchise: parsed.data.grant,
        franchiseGrantedAt: parsed.data.grant ? now : null,
      },
    });

    if (!parsed.data.grant) {
      // Hand anything they hadn't actioned back to the admin queue.
      await tx.loan.updateMany({
        where: { franchiseId: user.id, franchiseStatus: "PENDING" },
        data: { franchiseId: null, franchiseStatus: "NONE" },
      });
      await tx.rewardClaim.updateMany({
        where: { franchiseId: user.id, franchiseStatus: "PENDING" },
        data: { franchiseId: null, franchiseStatus: "NONE" },
      });
    }

    await tx.notification.create({
      data: {
        userId: user.id,
        title: parsed.data.grant ? "Franchise approved" : "Franchise removed",
        body: parsed.data.grant
          ? "You are now a franchise. Open 'Login into Franchise' from your dashboard to manage your team's loans and Welcome Kits."
          : "Your franchise access has been removed by the admin.",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: parsed.data.grant ? "FRANCHISE_GRANTED" : "FRANCHISE_REVOKED",
        target: user.id,
        metadata: JSON.stringify({ referralCode: user.referralCode }),
      },
    });
  });

  return NextResponse.json({ ok: true, name: user.name, referralCode: user.referralCode });
}
