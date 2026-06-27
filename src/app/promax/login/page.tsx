"use client";

import { signIn, getSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import toast from "react-hot-toast";
import { Crown } from "lucide-react";
import { loginDestination } from "@/lib/post-login";

// Dedicated Pro Max member login (purple). Uses the same NextAuth credentials
// provider as the base login; the post-login redirect routes the account to the
// correct portal. A non-Pro-Max account that signs in here is sent to its own
// portal by loginDestination().
function ProMaxLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setLoading(false);
      toast.error("Invalid ID / email or password");
      return;
    }
    const session = await getSession();
    setLoading(false);
    const destination = loginDestination(session?.user, callbackUrl ?? "/promax/dashboard");
    toast.success("Welcome back!");
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-12">
      <div className="w-full max-w-md card p-8 animate-slide-up border-promax-200">
        <div className="flex flex-col items-center mb-6">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-promax-600 text-white mb-3">
            <Crown className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold">Pro Max Login</h1>
          <p className="text-sm text-muted-foreground">Sign in to your 10,000-pt Pro Max account</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Member ID or Email</label>
            <input
              type="text"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="AM12345678 or you@example.com"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-promax-gradient px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-center mt-6 text-muted-foreground">
          New to Pro Max? Your account is created by the Pro Max admin — contact
          your sponsor or the admin team to join the 10,000-pt programme.
        </p>
      </div>
    </div>
  );
}

export default function ProMaxLoginPage() {
  return (
    <Suspense fallback={<div className="container-page">Loading…</div>}>
      <ProMaxLoginForm />
    </Suspense>
  );
}
