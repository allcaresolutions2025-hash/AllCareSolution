"use client";

import { signIn, getSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import toast from "react-hot-toast";
import { Crown } from "lucide-react";
import { loginDestination } from "@/lib/post-login";

// AF Solution login (gold). Uses the same NextAuth credentials provider as the
// base login; loginDestination() sends any non-AF account to its own portal.
// AF accounts sign in with their AF ID only (see lib/auth.ts).
function AfLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl");
  const [afId, setAfId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email: afId, password, redirect: false });
    if (res?.error) {
      setLoading(false);
      toast.error("Invalid AF ID or password");
      return;
    }
    const session = await getSession();
    setLoading(false);
    const destination = loginDestination(session?.user, callbackUrl ?? "/af/dashboard");
    toast.success("Welcome back!");
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-12">
      <div className="w-full max-w-md card p-8 animate-slide-up border-af-200">
        <div className="flex flex-col items-center mb-6">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-af-600 text-white mb-3">
            <Crown className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold">AF Login</h1>
          <p className="text-sm text-muted-foreground">Sign in to your AF Solution account</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">AF ID</label>
            <input
              type="text"
              required
              className="input font-mono uppercase"
              value={afId}
              onChange={(e) => setAfId(e.target.value.toUpperCase())}
              placeholder="AF12345678"
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
            <p className="mt-1 text-xs text-muted-foreground">First login? Your password is your mobile number.</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-af-gradient px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-center mt-6 text-muted-foreground">
          Don&apos;t have an AF ID? Sign in to your member account and request one from the{" "}
          <strong>AF Solution</strong> section, or ask your AF upline to add you to their tree.
        </p>
      </div>
    </div>
  );
}

export default function AfLoginPage() {
  return (
    <Suspense fallback={<div className="container-page">Loading…</div>}>
      <AfLoginForm />
    </Suspense>
  );
}
