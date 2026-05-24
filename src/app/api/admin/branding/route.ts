import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getSiteBrand, setSiteBrand } from "@/lib/brand";
import { z } from "zod";

// Hard cap on the stored data URL length. Anything above ~500 KB starts to
// hurt page-load times since the logo is inlined into every server-rendered
// HTML response.
const MAX_LOGO_BYTES = 600_000;

const bodySchema = z.object({
  logoUrl: z.string().max(MAX_LOGO_BYTES).nullable().optional(),
  siteName: z.string().trim().min(1).max(80).optional(),
  tagline: z.string().trim().max(120).optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const brand = await getSiteBrand();
  return NextResponse.json(brand);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  if (parsed.data.logoUrl) {
    const isDataUrl = parsed.data.logoUrl.startsWith("data:image/");
    const isHttp = /^https?:\/\//i.test(parsed.data.logoUrl);
    if (!isDataUrl && !isHttp) {
      return NextResponse.json({ error: "Logo must be a data: URL or an https URL" }, { status: 400 });
    }
  }

  await setSiteBrand(parsed.data);
  const brand = await getSiteBrand();
  return NextResponse.json({ ok: true, brand });
}
