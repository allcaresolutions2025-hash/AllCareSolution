import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const PAN_MAX_USES = 15;

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[0-9]{10}$/, "Mobile must be 10 digits").nullable().or(z.literal("")),
  nominee: z.string().trim().max(80).optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).nullable(),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format")
    .nullable()
    .or(z.literal("")),
  bankAccountName: z.string().trim().max(80).optional().or(z.literal("")),
  bankAccountNumber: z
    .string()
    .regex(/^[0-9]{9,18}$/, "Invalid account number")
    .nullable()
    .or(z.literal("")),
  bankIfsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC")
    .nullable()
    .or(z.literal("")),
  bankName: z.string().trim().max(80).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const data = parsed.data;
  const cleaned = {
    name: data.name,
    phone: data.phone ? data.phone : null,
    nominee: data.nominee || null,
    gender: data.gender,
    address: data.address || null,
    panNumber: data.panNumber || null,
    bankAccountName: data.bankAccountName || null,
    bankAccountNumber: data.bankAccountNumber || null,
    bankIfsc: data.bankIfsc || null,
    bankName: data.bankName || null,
    isActive: data.isActive,
  };

  // Phone uniqueness check if changed.
  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { phone: true, panNumber: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (cleaned.phone && cleaned.phone !== target.phone) {
    const phoneTaken = await prisma.user.findUnique({ where: { phone: cleaned.phone } });
    if (phoneTaken && phoneTaken.phone !== target.phone) {
      return NextResponse.json({ error: "Mobile already in use" }, { status: 400 });
    }
  }

  // PAN max-15 if changed.
  if (cleaned.panNumber && cleaned.panNumber !== target.panNumber) {
    const count = await prisma.user.count({ where: { panNumber: cleaned.panNumber } });
    if (count >= PAN_MAX_USES) {
      return NextResponse.json(
        { error: `The PAN used more than ${PAN_MAX_USES} times. Cannot save.` },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({ where: { id: params.id }, data: cleaned });
  return NextResponse.json({ ok: true });
}
