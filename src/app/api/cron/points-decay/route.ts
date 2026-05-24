import { NextResponse } from "next/server";
import { runDailyPayout } from "@/lib/daily-payout";

// Nightly cron endpoint — see src/lib/daily-payout.ts for the actual logic
// and the docs on what happens to balances + the gated-points cache.
// Auth: header `x-cron-secret: <CRON_SECRET>` OR `authorization: Bearer <CRON_SECRET>`.

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("x-cron-secret") === secret) return true;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return false;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, ...(await runDailyPayout()) });
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, ...(await runDailyPayout()) });
}
