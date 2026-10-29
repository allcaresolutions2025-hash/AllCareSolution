import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AF_ID_PATTERN, AfPlacementError, createAfAccount, requireAfAccount } from "@/lib/af";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
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

// A signed-in AF account adds a new AF account into an open slot of its own
// AF downline. No admin review: the account is created immediately, with the
// creator's profile and bank details copied over (as on admin approval).
export async function POST(req: Request) {
  const auth = await requireAfAccount();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const account = await createAfAccount(tx, {
        name: d.name,
        mobile: d.mobile,
        email: d.email,
        sponsorAfId: d.sponsorAfId,
        side: d.side,
        profileFromUserId: session.user.id,
        withinDownlineOf: session.user.id,
      });
      await tx.notification.create({
        data: {
          userId: session.user.id,
          title: "New AF account created",
          body: `AF ID ${account.afId} has been created for ${d.name} under ${d.sponsorAfId} (${d.side}). The first password is the mobile number ${d.mobile}.`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "AF_ACCOUNT_CREATED_BY_AF",
          target: account.id,
          metadata: JSON.stringify({ afId: account.afId, sponsorAfId: d.sponsorAfId, side: d.side }),
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
