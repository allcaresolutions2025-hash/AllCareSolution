"use client";

import { signIn, getSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import toast from "react-hot-toast";
import { Leaf } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setLoading(false);
      toast.error("Invalid ID / email or password");
      return;
    }
    const session = await getSession();
    setLoading(false);
    const role = session?.user?.role;
    const mustOnboard = (session?.user as { mustOnboard?: boolean })?.mustOnboard;
    let destination = callbackUrl ?? "/affiliate/dashboard";
    if (role === "ADMIN") destination = "/admin";
    else if (mustOnboard) destination = "/affiliate/dashboard/add-member";
    toast.success("Welcome back!");
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-12">
      <div className="w-full max-w-md card p-8 animate-slide-up">
        <div className="flex flex-col items-center mb-6">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white mb-3">
            <Leaf className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your ACHT MART account</p>
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
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-center mt-6 text-muted-foreground">
          New to ACHT MART? Contact your sponsor or our admin team — accounts are
          created via the membership pin programme.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-page">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
