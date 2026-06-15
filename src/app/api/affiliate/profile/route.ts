import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const PAN_MAX_USES = 15;

const bodySchema = z.object({
  email: z.string().email(),
  nominee: z.string().trim().min(1).max(80).nullable().optional(),
  gender: z.enum(["MALE", "FEMALE"]).nullable().optional(),
  address: z.string().trim().min(1).max(300).nullable().optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format")
    .nullable()
    .optional(),
  whatsappNumber: z
    .string()
    .regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit WhatsApp number")
    .nullable()
    .optional(),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { email, nominee, gender, address, panNumber, whatsappNumber } = parsed.data;

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, panNumber: true },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Email: allow up to 15 member IDs to share the same email.
  if (email !== current.email) {
    const emailCount = await prisma.user.count({ where: { email } });
    if (emailCount >= PAN_MAX_USES) {
      return NextResponse.json({ error: `This email has already been used for ${PAN_MAX_USES} member IDs.` }, { status: 400 });
    }
  }

  // PAN: allow up to 15 member IDs to share the same PAN.
  if (panNumber && panNumber !== current.panNumber) {
    const count = await prisma.user.count({ where: { panNumber } });
    if (count >= PAN_MAX_USES) {
      return NextResponse.json({ error: `This PAN has already been used for ${PAN_MAX_USES} member IDs.` }, { status: 400 });
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email, nominee, gender, address, panNumber, whatsappNumber },
  });
  return NextResponse.json({ ok: true });
}
