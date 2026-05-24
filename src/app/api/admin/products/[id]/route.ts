import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { productSchema } from "@/lib/validation";
import { ZodError } from "zod";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const data = productSchema.parse(await req.json());
    const updated = await prisma.product.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  // Soft-delete: hide the product but keep it so historical orders still resolve.
  await prisma.product.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
