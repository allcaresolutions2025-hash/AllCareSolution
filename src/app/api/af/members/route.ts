import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyAdmins } from "@/lib/franchise";
import { getSetting } from "@/lib/settings";
import { PAISE_PER_POINT, pointsToPaise } from "@/lib/money";
import { AF_ID_PATTERN, AfPlacementError, afDetailsSchema, requireAfAccount, resolveAfPlacement } from "@/lib/af";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = afDetailsSchema.extend({
  name: z.string().trim().min(2, "Enter the account holder's name").max(80),
  mobile: z.string().trim().regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
  email: z.string().trim().email("Enter a valid email"),
  sponsorAfId: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => AF_ID_PATTERN.test(s), "Place under an AF ID like AF12345678"),
  side: z.enum(["LEFT", "RIGHT"], { errorMap: () => ({ message: "Choose LEFT or RIGHT" }) }),
});

// A signed-in AF account requests a new AF account for an open slot of its
// own AF downline. Nothing is created here: the request carries the
// AF_ID_FEE_POINTS fee (paid to the admin offline), and the admin creates the
// account on approval — see /api/admin/af/id-requests/[id].
export async function POST(req: Request) {
  const auth = await requireAfAccount();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const d = parsed.data;
  const fee = pointsToPaise(await getSetting("AF_ID_FEE_POINTS"));

  try {
    await prisma.$transaction(async (tx) => {
      await resolveAfPlacement(tx, { sponsorAfId: d.sponsorAfId, side: d.side, withinDownlineOf: session.user.id });
      const queued = await tx.afIdRequest.findFirst({
        where: { status: "PENDING", sponsorAfId: d.sponsorAfId, side: d.side },
        select: { id: true },
      });
      if (queued) {
        throw new AfPlacementError(
          `A request for the ${d.side} slot under ${d.sponsorAfId} is already awaiting admin review.`,
        );
      }

      await tx.afIdRequest.create({
        data: {
          requesterId: session.user.id,
          name: d.name,
          mobile: d.mobile,
          email: d.email.toLowerCase(),
          sponsorAfId: d.sponsorAfId,
          side: d.side,
          nominee: d.nominee,
          gender: d.gender,
          address: d.address,
          panNumber: d.panNumber,
          bankAccountName: d.bankAccountName,
          bankAccountNumber: d.bankAccountNumber,
          bankIfsc: d.bankIfsc,
          bankName: d.bankName,
          fee,
        },
      });
      await notifyAdmins(
        tx,
        "New AF ID request",
        `${session.user.name} (${session.user.referralCode}) requested an AF ID for ${d.name} under ${d.sponsorAfId} (${d.side}). Fee: ${fee / PAISE_PER_POINT} pts, to be collected offline.`,
      );
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AfPlacementError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
