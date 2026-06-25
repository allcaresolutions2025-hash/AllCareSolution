import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runDailyPayout, type PayoutScope } from "@/lib/daily-payout";

// Admin-only "Simulate midnight" trigger. Forces the payout to run regardless
// of the IST-date checkpoint, using a synthetic runDate so it stacks on top of
// any earlier real or test run. Intended for demo / verification, not nightly.
//
// Optional body { scope: "standard" | "proMax" | "all" } lets the admin
// simulate the 1000-pt and Pro Max payouts separately. Defaults to "all".

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const scope: PayoutScope =
    body?.scope === "standard" || body?.scope === "proMax" ? body.scope : "all";

  const result = await runDailyPayout({ force: true, scope });
  return NextResponse.json({ ok: true, ...result });
}
