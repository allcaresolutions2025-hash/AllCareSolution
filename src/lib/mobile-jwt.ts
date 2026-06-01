import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const ISSUER = "achtmart-web";
const AUDIENCE = "achtmart-mobile";
const TTL_DAYS = 30;

function key() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to sign mobile tokens");
  return new TextEncoder().encode(secret);
}

export type MobileTokenPayload = {
  sub: string;
  email: string | null;
  role: string;
};

export async function signMobileToken(payload: MobileTokenPayload) {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(key());
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: (payload.email as string) ?? null,
      role: (payload.role as string) ?? "USER",
    };
  } catch {
    return null;
  }
}

export function bearerFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [scheme, value] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value.trim();
}
