import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canRequestFranchise, notifyAdmins, FRANCHISE_REQUEST_MAX_TEAM } from "@/lib/franchise";

const schema = z.object({
  note: z.string().max(1000).optional(),
});

// Member asks the admin to make them a franchise. The other route in is offline
// — the admin promotes someone directly from /admin/franchise.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, referralCode: true, isFranchise: true, leftLegCount: true, rightLegCount: true },
  });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (me.isFranchise) {
    return NextResponse.json({ error: "You are already a franchise" }, { status: 400 });
  }
  if (!canRequestFranchise(me)) {
    return NextResponse.json(
      { error: `Franchise requests are open to members with a team under ${FRANCHISE_REQUEST_MAX_TEAM}. Contact the admin directly.` },
      { status: 400 },
    );
  }

  const existing = await prisma.franchiseRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a request awaiting review" }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const fr = await tx.franchiseRequest.create({
      data: { userId: session.user.id, note: parsed.data.note ?? null },
    });
    await notifyAdmins(
      tx,
      "New franchise request",
      `${me.name} (${me.referralCode}) has requested a franchise. Team size: ${me.leftLegCount + me.rightLegCount}.`,
    );
    return fr;
  });

  return NextResponse.json({ ok: true, id: created.id });
}
