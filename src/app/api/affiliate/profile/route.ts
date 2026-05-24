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
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { email, nominee, gender, address, panNumber } = parsed.data;

  // Email uniqueness if changed.
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, panNumber: true },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (email !== current.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && taken.email !== current.email) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
  }

  // PAN max-15 if the user is changing PAN to a new one.
  if (panNumber && panNumber !== current.panNumber) {
    const count = await prisma.user.count({ where: { panNumber } });
    if (count >= PAN_MAX_USES) {
      return NextResponse.json(
        { error: `The PAN used more than ${PAN_MAX_USES} times. Cannot save.` },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email, nominee, gender, address, panNumber },
  });
  return NextResponse.json({ ok: true });
}
