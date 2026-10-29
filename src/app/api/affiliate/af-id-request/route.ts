import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyAdmins } from "@/lib/franchise";
import { getSetting } from "@/lib/settings";
import { PAISE_PER_POINT, pointsToPaise } from "@/lib/money";
import { AF_ID_PATTERN, afBankSchema } from "@/lib/af";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = afBankSchema.extend({
  name: z.string().trim().min(2, "Enter the account holder's name").max(80),
  mobile: z.string().trim().regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
  email: z.string().trim().email("Enter a valid email"),
  sponsorAfId: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => s === "" || AF_ID_PATTERN.test(s), "Sponsor AF ID looks like AF12345678")
    .optional(),
  side: z.enum(["LEFT", "RIGHT"]).optional(),
  note: z.string().trim().max(500).optional(),
});

// A main member asks the admin for a new AF account. One open request at a
// time; the admin collects the AF_ID_FEE_POINTS fee offline and picks the
// final placement when creating the account.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.isAf) {
    return NextResponse.json({ error: "Request new AF IDs from your member account." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.afIdRequest.findFirst({
    where: { requesterId: session.user.id, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have an AF ID request awaiting admin review." }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, referralCode: true },
  });
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const fee = pointsToPaise(await getSetting("AF_ID_FEE_POINTS"));

  await prisma.$transaction(async (tx) => {
    await tx.afIdRequest.create({
      data: {
        requesterId: session.user.id,
        name: d.name,
        mobile: d.mobile,
        email: d.email.toLowerCase(),
        sponsorAfId: d.sponsorAfId || null,
        side: d.sponsorAfId ? d.side ?? null : null,
        bankAccountName: d.bankAccountName,
        bankAccountNumber: d.bankAccountNumber,
        bankIfsc: d.bankIfsc,
        bankName: d.bankName,
        note: d.note || null,
        fee,
      },
    });
    await notifyAdmins(
      tx,
      "New AF ID request",
      `${me.name} (${me.referralCode}) requested an AF ID for ${d.name}${d.sponsorAfId ? ` under ${d.sponsorAfId}${d.side ? ` (${d.side})` : ""}` : ""}. Fee: ${fee / PAISE_PER_POINT} pts, to be collected offline.`,
    );
  });

  return NextResponse.json({ ok: true });
}
