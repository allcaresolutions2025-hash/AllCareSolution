import { getServerSession, Session } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

type AdminAuthOk = { ok: true; session: Session };
type AdminAuthFail = { ok: false; response: NextResponse };
export type AdminAuth = AdminAuthOk | AdminAuthFail;

export async function requireAdmin(): Promise<AdminAuth> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}
