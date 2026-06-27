import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Pro Max admin moves a reward (typically a Combo Box request) along its
// lifecycle: approve → dispatch → deliver, or reject.
const bodySchema = z.object({
  status: z.enum(["APPROVED", "DISPATCHED", "DELIVERED", "REJECTED"]),
  note: z.string().max(300).optional(),
});

const STATUS_MESSAGE: Record<string, string> = {
  APPROVED: "approved",
  DISPATCHED: "dispatched",
  DELIVERED: "delivered",
  REJECTED: "rejected",
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const reward = await prisma.proMaxReward.findUnique({ where: { id: params.id } });
  if (!reward) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.proMaxReward.update({
      where: { id: reward.id },
      data: { status: parsed.data.status, adminNote: parsed.data.note?.trim() || reward.adminNote },
    });
    await tx.notification.create({
      data: {
        userId: reward.userId,
        title: "Reward update",
        body: `Your reward "${reward.rewardName}" was ${STATUS_MESSAGE[parsed.data.status]}.${parsed.data.note?.trim() ? ` Note: ${parsed.data.note.trim()}` : ""}`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
