import { NextResponse } from "next/server";
import { requireProMaxAdmin } from "@/lib/admin";
import { runDailyPayout } from "@/lib/daily-payout";

export const dynamic = "force-dynamic";

// Pro Max admin "Run payout now" — forces the Pro Max payout cycle (pays 90% of
// each Pro Max member's wallet, resets to 0) using a synthetic runDate so it
// stacks on top of any earlier run. For verification; the nightly cron runs it
// automatically at 00:00 IST.
export async function POST() {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const result = await runDailyPayout({ force: true, scope: "proMax" });
  return NextResponse.json({ ok: true, ...result });
}
