import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bearerFromHeader, verifyMobileToken } from "@/lib/mobile-jwt";

export type MobileAuthUser = {
  id: string;
  email: string | null;
  role: string;
  name: string;
  referralCode: string;
};

export async function authMobile(
  req: Request,
): Promise<{ user: MobileAuthUser } | { response: NextResponse }> {
  const token = bearerFromHeader(req.headers.get("authorization"));
  if (!token) {
    return { response: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };
  }
  const payload = await verifyMobileToken(token);
  if (!payload) {
    return { response: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      referralCode: true,
      isActive: true,
    },
  });
  if (!user || !user.isActive) {
    return { response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      referralCode: user.referralCode,
    },
  };
}

export function mobileServerError(label: string, e: unknown) {
  console.error(`[mobile/${label}] error:`, e);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
