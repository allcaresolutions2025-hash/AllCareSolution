import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Save the member's display-language choice. "AUTO" follows the delivery region;
// EN/TA/HI is an explicit manual pick that overrides the region.
const bodySchema = z.object({ language: z.enum(["AUTO", "EN", "TA", "HI"]) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const choice = parsed.data.language;
  await prisma.user.update({
    where: { id: session.user.id },
    data:
      choice === "AUTO"
        ? { languageIsManual: false }
        : { languageIsManual: true, preferredLanguage: choice },
  });

  return NextResponse.json({ ok: true });
}
