import { NextResponse } from "next/server";
import { runPackageMatching } from "@/lib/package-plan";

// Nightly AF Solution housekeeping: lapse expired BV and settle any matching
// not already paid on approval — see src/lib/package-plan.ts.
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
  return NextResponse.json({ ok: true, ...(await runPackageMatching()) });
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, ...(await runPackageMatching()) });
}
