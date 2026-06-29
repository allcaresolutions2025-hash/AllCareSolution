import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { verifyImpersonationToken } from "./impersonation";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Accept either email address or AM-prefixed member ID (referral code)
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.email.toLowerCase().trim() },
              { referralCode: credentials.email.toUpperCase().trim() },
            ],
          },
        });
        if (!user || !user.isActive) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          referralCode: user.referralCode,
          mustOnboard: user.mustOnboard,
          isProMax: user.isProMax,
        } as never;
      },
    }),
    // Admin impersonation: signs in as `targetUserId` after the admin server
    // action issued a short-lived HMAC token. The token alone is sufficient —
    // we don't need a password — because issuing it already required an
    // authenticated ADMIN session.
    CredentialsProvider({
      id: "impersonate",
      name: "Admin Impersonation",
      credentials: { token: { label: "Token", type: "text" } },
      async authorize(credentials) {
        if (!credentials?.token) return null;
        const payload = verifyImpersonationToken(credentials.token);
        if (!payload) return null;
        const [admin, target] = await Promise.all([
          prisma.user.findUnique({ where: { id: payload.adminId } }),
          prisma.user.findUnique({ where: { id: payload.targetUserId } }),
        ]);
        // The user who created the token must still exist. We allow the token
        // both ways: admin → user (admin must currently be ADMIN) and the
        // implicit return-to-admin call uses a token where targetUserId is
        // the admin themselves, which is also fine.
        if (!admin || !target) return null;
        // Both the main admin and the Pro Max admin may impersonate. The token
        // is only ever issued by a guarded admin route (which also restricts the
        // Pro Max admin to Pro Max members), so reaching here means the pairing
        // was already authorised.
        if (admin.role !== "ADMIN" && admin.role !== "PROMAX_ADMIN") return null;
        if (!target.isActive && target.id !== admin.id) return null;
        // impersonatedBy is set only when admin is logging in AS someone else.
        // When the admin returns to themselves (target === admin), clear it.
        const impersonating = admin.id !== target.id;
        return {
          id: target.id,
          email: target.email,
          name: target.name,
          role: target.role,
          referralCode: target.referralCode,
          mustOnboard: false,
          isProMax: target.isProMax,
          impersonatedBy: impersonating ? admin.id : null,
          impersonatedByName: impersonating ? admin.name : null,
        } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          role: string;
          referralCode: string;
          mustOnboard: boolean;
          isProMax?: boolean;
          impersonatedBy?: string | null;
          impersonatedByName?: string | null;
        };
        token.id = u.id;
        token.role = u.role;
        token.referralCode = u.referralCode;
        token.mustOnboard = u.mustOnboard;
        token.isProMax = u.isProMax ?? false;
        token.impersonatedBy = u.impersonatedBy ?? null;
        token.impersonatedByName = u.impersonatedByName ?? null;
      }
      // When the client calls session.update() (e.g. after completing onboarding)
      // we re-pull mustOnboard from the DB so middleware stops redirecting.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { mustOnboard: true },
        });
        if (fresh) token.mustOnboard = fresh.mustOnboard;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as {
          id?: string;
          role?: string;
          referralCode?: string;
          mustOnboard?: boolean;
          isProMax?: boolean;
          impersonatedBy?: string | null;
          impersonatedByName?: string | null;
        };
        u.id = token.id as string;
        u.role = token.role as string;
        u.referralCode = token.referralCode as string;
        u.mustOnboard = (token.mustOnboard as boolean) ?? false;
        u.isProMax = (token.isProMax as boolean) ?? false;
        u.impersonatedBy = (token.impersonatedBy as string | null) ?? null;
        u.impersonatedByName = (token.impersonatedByName as string | null) ?? null;
      }
      return session;
    },
  },
};

// Type augmentation for the session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "CUSTOMER" | "ADMIN" | "PROMAX_ADMIN";
      referralCode: string;
      mustOnboard: boolean;
      isProMax: boolean;
      impersonatedBy: string | null;
      impersonatedByName: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    referralCode?: string;
    mustOnboard?: boolean;
    isProMax?: boolean;
    impersonatedBy?: string | null;
    impersonatedByName?: string | null;
  }
}
