import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { runPackageMatching } from "@/lib/package-plan";

export const dynamic = "force-dynamic";

// Runs tonight's matching early. Same idempotent run as the cron — once it has
// run for today's IST date, both this button and the cron are no-ops.
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const result = await runPackageMatching();
  if (!result.skipped) {
    await prisma.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: "PACKAGE_MATCHING_RUN",
        metadata: JSON.stringify(result),
      },
    });
  }
  return NextResponse.json({ ok: true, ...result });
}
