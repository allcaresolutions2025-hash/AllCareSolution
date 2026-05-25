import crypto from "crypto";

// Short-lived signed token that bridges the admin server action and the
// NextAuth "impersonate" credentials provider. It encodes who is doing the
// impersonating (adminId) and who they want to log in as (targetUserId).
// Signed with NEXTAUTH_SECRET so it cannot be forged on the client.

const TTL_MS = 5 * 60 * 1000; // 5 minutes — plenty of headroom for the round-trip

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is required to sign impersonation tokens");
  return s;
}

export function signImpersonationToken(adminId: string, targetUserId: string): string {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${adminId}|${targetUserId}|${expiresAt}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`, "utf-8").toString("base64url");
}

export function verifyImpersonationToken(
  token: string,
): { adminId: string; targetUserId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split("|");
    if (parts.length !== 4) return null;
    const [adminId, targetUserId, expiresAtStr, sig] = parts;
    const expected = crypto
      .createHmac("sha256", secret())
      .update(`${adminId}|${targetUserId}|${expiresAtStr}`)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    if (Date.now() > Number(expiresAtStr)) return null;
    return { adminId, targetUserId };
  } catch {
    return null;
  }
}
