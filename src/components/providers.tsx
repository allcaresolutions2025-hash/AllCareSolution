"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "./cart-provider";

// react-hot-toast ships ~5KB of client JS. Lazy-load it after hydration so
// it isn't blocking the first paint on slow mobile networks. Toasts fired
// immediately on mount (rare) appear one tick later.
const Toaster = dynamic(
  () => import("react-hot-toast").then((m) => m.Toaster),
  { ssr: false, loading: () => null },
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{ duration: 4000, className: "text-sm" }}
        />
      </CartProvider>
    </SessionProvider>
  );
}
