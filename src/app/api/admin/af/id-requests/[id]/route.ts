import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PAISE_PER_POINT } from "@/lib/money";
import { AF_ID_PATTERN, AfPlacementError, afBankSchema, createAfAccount } from "@/lib/af";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  afBankSchema.extend({
    action: z.literal("approve"),
    name: z.string().trim().min(2).max(80),
    mobile: z.string().trim().regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
    email: z.string().trim().email(),
    sponsorAfId: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .refine((s) => s === "" || AF_ID_PATTERN.test(s), "Sponsor must be an AF ID like AF12345678"),
    side: z.enum(["LEFT", "RIGHT"]).nullable(),
    feeReceived: z.boolean().optional(),
    note: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("reject"), note: z.string().max(500).optional() }),
]);

// Admin review of an AF ID request.
//  - approve → the admin confirms the AF ID fee was received offline, then
//    the AF account is created at the chosen placement and the AF ID is sent
//    back to the requester
//  - reject  → declines with an optional note
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;
  const note = d.note?.trim() || null;
  const reviewerId = auth.session.user.id;

  const request = await prisma.afIdRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 400 });
  }

  if (d.action === "reject") {
    await prisma.$transaction([
      prisma.afIdRequest.update({
        where: { id: request.id },
        data: { status: "REJECTED", adminNote: note, reviewerId, reviewedAt: new Date() },
      }),
      prisma.notification.create({
        data: {
          userId: request.requesterId,
          title: "AF ID request declined",
          body: note
            ? `Your AF ID request for ${request.name} was declined. Reason: ${note}`
            : `Your AF ID request for ${request.name} was declined. Please contact support for details.`,
        },
      }),
      prisma.auditLog.create({
        data: { actorId: reviewerId, action: "AF_ID_REQUEST_REJECTED", target: request.id, metadata: JSON.stringify({ note }) },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (request.fee > 0 && !d.feeReceived) {
    return NextResponse.json(
      { error: `Confirm the ${request.fee / PAISE_PER_POINT}-pt AF ID fee has been received before approving.` },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Conditional flip guards against a double approve from two tabs.
      const flipped = await tx.afIdRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: { status: "APPROVED", adminNote: note, reviewerId, reviewedAt: new Date() },
      });
      if (flipped.count === 0) throw new AfPlacementError("This request has already been reviewed.");

      const account = await createAfAccount(tx, {
        name: d.name,
        mobile: d.mobile,
        email: d.email,
        sponsorAfId: d.sponsorAfId || null,
        side: d.sponsorAfId ? d.side : null,
        profileFromUserId: request.requesterId,
        bank: {
          bankAccountName: d.bankAccountName,
          bankAccountNumber: d.bankAccountNumber,
          bankIfsc: d.bankIfsc,
          bankName: d.bankName,
        },
      });
      await tx.afIdRequest.update({
        where: { id: request.id },
        data: { createdUserId: account.id, createdAfId: account.afId },
      });
      await tx.notification.create({
        data: {
          userId: request.requesterId,
          title: "Your AF ID is ready",
          body: `AF ID ${account.afId} has been created for ${d.name}. Sign in at AF Login with this ID. The first password is the mobile number ${d.mobile}.`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: "AF_ACCOUNT_CREATED",
          target: account.id,
          metadata: JSON.stringify({
            requestId: request.id,
            afId: account.afId,
            sponsorAfId: d.sponsorAfId || null,
            side: d.side,
            feeReceived: request.fee,
          }),
        },
      });
      return account;
    });
    return NextResponse.json({ ok: true, afId: created.afId });
  } catch (e) {
    if (e instanceof AfPlacementError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "That slot was just taken. Pick another placement." }, { status: 400 });
    }
    throw e;
  }
}
