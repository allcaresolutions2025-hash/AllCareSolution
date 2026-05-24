import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateUniqueReferralCode } from "@/lib/referral";
import { awardUplinePoints } from "@/lib/points";
import bcrypt from "bcryptjs";
import { z } from "zod";

const MAX_USES = 15; // email, phone, and PAN can each be shared across up to 15 member IDs

const bodySchema = z.object({
  pinCode: z.string().regex(/^AM[0-9]{8}$/, "Invalid pin format"),
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
  referId: z.string().regex(/^AM[0-9]{8}$/, "Refer ID must be AM-prefixed"),
  side: z.enum(["LEFT", "RIGHT"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const {
    pinCode, name, nominee, gender, address, email, mobile, panNumber,
    bankAccountName, bankAccountNumber, bankIfsc, bankName, referId, side,
  } = parsed.data;

  // 1. Pin must belong to caller and be ACTIVE.
  const pin = await prisma.pin.findUnique({ where: { code: pinCode } });
  if (!pin || pin.ownerId !== session.user.id || pin.status !== "ACTIVE") {
    return NextResponse.json({ error: "Pin not found or already used" }, { status: 400 });
  }

  // 2. Resolve Refer ID; ensure it's caller or in caller's downline.
  const parent = await prisma.user.findUnique({
    where: { referralCode: referId },
    select: { id: true, referrerId: true },
  });
  if (!parent) {
    return NextResponse.json({ error: "Refer ID does not match any member" }, { status: 400 });
  }
  if (parent.id !== session.user.id) {
    let cursor: string | null = parent.referrerId;
    let allowed = false;
    let safety = 0;
    while (cursor && safety++ < 100) {
      if (cursor === session.user.id) { allowed = true; break; }
      const next = await prisma.user.findUnique({ where: { id: cursor }, select: { referrerId: true } });
      cursor = next?.referrerId ?? null;
    }
    if (!allowed) {
      return NextResponse.json({ error: "Refer ID is not in your downline" }, { status: 403 });
    }
  }

  // 3. Spillover to next open slot on the chosen side.
  let placementParentId = parent.id;
  let spillover = 0;
  for (let safety = 0; safety < 100; safety++) {
    const taken = await prisma.user.findFirst({
      where: { referrerId: placementParentId, slot: side },
      select: { id: true },
    });
    if (!taken) break;
    placementParentId = taken.id;
    spillover++;
  }

  // 4. Usage-limit checks — each detail can be shared across up to 15 member IDs.
  const [emailCount, phoneCount, panCount] = await Promise.all([
    prisma.user.count({ where: { email } }),
    prisma.user.count({ where: { phone: mobile } }),
    prisma.user.count({ where: { panNumber } }),
  ]);
  if (emailCount >= MAX_USES)
    return NextResponse.json({ error: `This email has already been used for ${MAX_USES} member IDs.` }, { status: 400 });
  if (phoneCount >= MAX_USES)
    return NextResponse.json({ error: `This mobile number has already been used for ${MAX_USES} member IDs.` }, { status: 400 });
  if (panCount >= MAX_USES)
    return NextResponse.json({ error: `This PAN has already been used for ${MAX_USES} member IDs.` }, { status: 400 });

  // 5. Create user, consume pin, award upline points — single transaction.
  // Default password = the member's own mobile number. They will be prompted
  // to change it on first login.
  const passwordHash = await bcrypt.hash(mobile, 12);
  const memberCode = await generateUniqueReferralCode();

  let newUser;
  try {
    newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          phone: mobile,
          name,
          nominee,
          gender,
          address,
          panNumber,
          bankAccountName,
          bankAccountNumber,
          bankIfsc,
          bankName,
          passwordHash,
          mustChangePassword: true,
          referralCode: memberCode,
          referrerId: placementParentId,
          slot: side,
          agreedToTermsAt: new Date(),
          wallet: { create: {} },
        },
      });
      await tx.pin.update({
        where: { id: pin.id },
        data: { status: "USED", usedAt: new Date(), usedForUserId: created.id },
      });
      await awardUplinePoints(tx, created.id);
      await tx.user.update({
        where: { id: session.user.id },
        data: { mustOnboard: false },
      });
      return created;
    });
  } catch (err) {
    console.error("[MEMBER_CREATE]", err);
    return NextResponse.json({ error: "Could not create member. Please try again." }, { status: 500 });
  }

  const placementParent = await prisma.user.findUnique({
    where: { id: placementParentId },
    select: { name: true, referralCode: true },
  });

  return NextResponse.json({
    ok: true,
    memberId: newUser.id,
    memberCode: newUser.referralCode,
    spillover,
    placement: placementParent,
  });
}
