import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { generateUniqueReferralCode } from "@/lib/referral";
import { awardProMaxUplinePoints } from "@/lib/points-promax";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Pro Max admin onboarding endpoint. Creates a brand-new standalone Pro Max
// account (own member ID + mobile-as-password). Two modes:
//   - ROOT joiner  → no referId: starts a fresh Pro Max tree (proMaxReferrerId null).
//   - PLACED       → referId + side: placed under an existing Pro Max member with
//                    spillover, and the upline points cascade is awarded.
// No pin is consumed — this is the admin-driven entry point before members can
// request pins of their own.
const MAX_USES = 15;

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  nominee: z.string().trim().min(2).max(80),
  gender: z.enum(["MALE", "FEMALE"]),
  address: z.string().trim().min(3).max(300),
  email: z.string().email().transform((s) => s.toLowerCase()),
  mobile: z.string().regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format"),
  bankAccountName: z.string().trim().min(2).max(80),
  bankAccountNumber: z.string().regex(/^[0-9]{9,18}$/, "Invalid account number"),
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC"),
  bankName: z.string().trim().min(2).max(80),
  // Placement is optional — omit both for a root joiner.
  referId: z.string().regex(/^AM[0-9]{8}$/, "Refer ID must be AM-prefixed").optional().or(z.literal("")),
  side: z.enum(["LEFT", "RIGHT"]).optional(),
});

export async function POST(req: Request) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const d = parsed.data;
  const hasReferId = !!d.referId;
  if (hasReferId && !d.side) {
    return NextResponse.json({ error: "Choose LEFT or RIGHT when a Refer ID is given" }, { status: 400 });
  }

  // Resolve placement (when given): refer ID must be an existing Pro Max member.
  let placementParentId: string | null = null;
  let beneficiaryId: string | null = null;
  let spillover = 0;
  if (hasReferId) {
    const parent = await prisma.user.findUnique({
      where: { referralCode: d.referId as string },
      select: { id: true, isProMax: true },
    });
    if (!parent) return NextResponse.json({ error: "Refer ID does not match any member" }, { status: 400 });
    if (!parent.isProMax) return NextResponse.json({ error: "Refer ID is not a Pro Max member" }, { status: 400 });
    beneficiaryId = parent.id;

    // Spill to the next open slot on the chosen side.
    placementParentId = parent.id;
    for (let safety = 0; safety < 100; safety++) {
      const taken: { id: string } | null = await prisma.user.findFirst({
        where: { proMaxReferrerId: placementParentId, proMaxSlot: d.side },
        select: { id: true },
      });
      if (!taken) break;
      placementParentId = taken.id;
      spillover++;
    }
  }

  // Usage-limit checks — each detail can be shared across up to 15 member IDs.
  const [emailCount, phoneCount, panCount] = await Promise.all([
    prisma.user.count({ where: { email: d.email } }),
    prisma.user.count({ where: { phone: d.mobile } }),
    prisma.user.count({ where: { panNumber: d.panNumber } }),
  ]);
  if (emailCount >= MAX_USES)
    return NextResponse.json({ error: `This email has already been used for ${MAX_USES} member IDs.` }, { status: 400 });
  if (phoneCount >= MAX_USES)
    return NextResponse.json({ error: `This mobile number has already been used for ${MAX_USES} member IDs.` }, { status: 400 });
  if (panCount >= MAX_USES)
    return NextResponse.json({ error: `This PAN has already been used for ${MAX_USES} member IDs.` }, { status: 400 });

  const passwordHash = await bcrypt.hash(d.mobile, 12);
  const memberCode = await generateUniqueReferralCode();

  let newUser;
  try {
    newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: d.email,
          phone: d.mobile,
          name: d.name,
          nominee: d.nominee,
          gender: d.gender,
          address: d.address,
          panNumber: d.panNumber,
          bankAccountName: d.bankAccountName,
          bankAccountNumber: d.bankAccountNumber,
          bankIfsc: d.bankIfsc,
          bankName: d.bankName,
          passwordHash,
          mustChangePassword: true,
          referralCode: memberCode,
          isProMax: true,
          proMaxReferrerId: placementParentId,
          proMaxSlot: hasReferId ? d.side : null,
          agreedToTermsAt: new Date(),
          wallet: { create: {} },
        },
      });
      if (placementParentId && beneficiaryId) {
        await awardProMaxUplinePoints(tx, created.id, beneficiaryId);
      }
      return created;
    });
  } catch (err) {
    console.error("[PROMAX_ADMIN_MEMBER_CREATE]", err);
    return NextResponse.json({ error: "Could not create member. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    memberId: newUser.id,
    memberCode: newUser.referralCode,
    isRoot: !hasReferId,
    spillover,
  });
}
