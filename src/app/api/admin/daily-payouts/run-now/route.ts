import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runDailyPayout } from "@/lib/daily-payout";

// Admin-only "Simulate midnight" trigger. Forces the payout to run regardless
// of the IST-date checkpoint, using a synthetic runDate so it stacks on top of
// any earlier real or test run. Intended for demo / verification, not nightly.

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const result = await runDailyPayout({ force: true });
  return NextResponse.json({ ok: true, ...result });
}
