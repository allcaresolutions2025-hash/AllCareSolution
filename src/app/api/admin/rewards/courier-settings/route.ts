import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { setCourierSender, type CourierSender } from "@/lib/courier";
import { z } from "zod";

// Save the company "sender" (FROM) details printed on courier slips.
export const dynamic = "force-dynamic";

const schema = z.object({
  company: z.string().max(120),
  tagline: z.string().max(120),
  line1: z.string().max(200),
  line2: z.string().max(200),
  city: z.string().max(80),
  state: z.string().max(80),
  pincode: z.string().max(12),
  phone: z.string().max(40),
  email: z.string().max(120),
  gstin: z.string().max(30),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await setCourierSender(parsed.data as CourierSender);
  return NextResponse.json({ ok: true });
}
