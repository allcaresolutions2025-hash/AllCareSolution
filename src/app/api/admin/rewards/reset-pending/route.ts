import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { WELCOME_KIT_LEVEL } from "@/lib/rewards";

export const dynamic = "force-dynamic";

// Pending level 1-15 claims (Welcome Kit / level 0 is always kept — it's a free
// joining gift). These are the rows this tool removes so members can re-request
// under the completely-filled-tree rule.
const pendingWhere = {
  level: { not: WELCOME_KIT_LEVEL },
  status: "PENDING" as const,
};

// Preview — how many pending claims would be removed. Read-only.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const pendingCount = await prisma.rewardClaim.count({ where: pendingWhere });
  return NextResponse.json({ pendingCount });
}

// Apply — delete the pending level 1-15 claims. Welcome Kit and any
// already-approved/dispatched/delivered gifts are left untouched. Deleting
// (not rejecting) frees the userId+level uniqueness so members can claim again.
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const result = await prisma.rewardClaim.deleteMany({ where: pendingWhere });
  return NextResponse.json({ ok: true, removed: result.count });
}
