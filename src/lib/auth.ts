import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

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
        } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const u = user as unknown as { id: string; role: string; referralCode: string; mustOnboard: boolean };
        token.id = u.id;
        token.role = u.role;
        token.referralCode = u.referralCode;
        token.mustOnboard = u.mustOnboard;
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
        const u = session.user as { id?: string; role?: string; referralCode?: string; mustOnboard?: boolean };
        u.id = token.id as string;
        u.role = token.role as string;
        u.referralCode = token.referralCode as string;
        u.mustOnboard = (token.mustOnboard as boolean) ?? false;
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
      role: "CUSTOMER" | "ADMIN";
      referralCode: string;
      mustOnboard: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    referralCode?: string;
    mustOnboard?: boolean;
  }
}
