import { NextResponse } from "next/server";
import { requireProMaxAdmin } from "@/lib/admin";
import { runDailyPayout } from "@/lib/daily-payout";

export const dynamic = "force-dynamic";

// Pro Max admin "Run payout now" — runs the Pro Max payout cycle (pays 90% of
// each eligible member's wallet, resets to 0) on demand. This is the ONLY way
// the Pro Max payout runs; there is no automatic nightly cron for it.
export async function POST() {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const result = await runDailyPayout({ force: true, scope: "proMax" });
  return NextResponse.json({ ok: true, ...result });
}
