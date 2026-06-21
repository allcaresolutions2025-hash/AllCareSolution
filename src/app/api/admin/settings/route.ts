import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { settingsSchema } from "@/lib/validation";
import { setSetting } from "@/lib/settings";
import { ZodError } from "zod";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const data = settingsSchema.parse(await req.json());
    await Promise.all([
      setSetting("COMMISSION_L1_PERCENT", data.COMMISSION_L1_PERCENT),
      setSetting("COMMISSION_L2_PERCENT", data.COMMISSION_L2_PERCENT),
      setSetting("BUYBACK_DAYS", data.BUYBACK_DAYS),
      setSetting("TDS_PERCENT", data.TDS_PERCENT),
      setSetting("TDS_THRESHOLD_INR", data.TDS_THRESHOLD_INR),
      setSetting("GST_DEFAULT_PERCENT", data.GST_DEFAULT_PERCENT),
      setSetting("SHIPPING_COST_INR", data.SHIPPING_COST_INR),
      setSetting("PIN_WALLET_PRICE_INR", data.PIN_WALLET_PRICE_INR),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
