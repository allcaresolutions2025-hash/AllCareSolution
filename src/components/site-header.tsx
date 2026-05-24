"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "./cart-provider";
import { ShoppingCart, User, LogOut, LayoutDashboard, Users, ShieldCheck, Menu, X } from "lucide-react";
import { useState } from "react";
import { AchtMartLogo } from "./acht-mart-logo";
import type { SiteBrand } from "@/lib/brand";

export function SiteHeader({ brand }: { brand: SiteBrand }) {
  const { data: session } = useSession();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  const closeNav = () => setNavOpen(false);

  return (
    <header className="border-b bg-white sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="container flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <AchtMartLogo size="md" imageUrl={brand.logoUrl} alt={`${brand.siteName} logo`} />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/products" className="hover:text-brand-700">Shop</Link>
          <Link href="/affiliate" className="hover:text-brand-700">Affiliate</Link>
          <Link href="/about" className="hover:text-brand-700">About</Link>
          <Link href="/contact" className="hover:text-brand-700">Contact</Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {session ? (
            <div className="relative">
              <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm hover:bg-muted"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline max-w-[120px] truncate">{session.user.name}</span>
              </button>
              {open && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setOpen(false)}
                  />
                  <div className="absolute right-0 top-12 z-40 w-56 rounded-lg border bg-white shadow-lg p-1.5 animate-fade-in">
                    <MenuItem href="/account" icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => setOpen(false)}>
                      My Account
                    </MenuItem>
                    <MenuItem href="/account/orders" icon={<ShoppingCart className="h-4 w-4" />} onClick={() => setOpen(false)}>
                      My Orders
                    </MenuItem>
                    <MenuItem href="/affiliate/dashboard" icon={<Users className="h-4 w-4" />} onClick={() => setOpen(false)}>
                      Affiliate Dashboard
                    </MenuItem>
                    {isAdmin && (
                      <MenuItem href="/admin" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => setOpen(false)}>
                        Admin Panel
                      </MenuItem>
                    )}
                    <div className="my-1 border-t" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-xs sm:text-sm px-3 sm:px-4">
              <span className="hidden xs:inline sm:inline">Member </span>Login
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            onClick={() => setNavOpen((v) => !v)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen && (
        <div className="md:hidden border-t bg-white animate-fade-in">
          <nav className="container py-3 flex flex-col text-sm">
            <Link href="/products" onClick={closeNav} className="py-2.5 px-1 hover:text-brand-700">Shop</Link>
            <Link href="/affiliate" onClick={closeNav} className="py-2.5 px-1 hover:text-brand-700">Affiliate</Link>
            <Link href="/about" onClick={closeNav} className="py-2.5 px-1 hover:text-brand-700">About</Link>
            <Link href="/contact" onClick={closeNav} className="py-2.5 px-1 hover:text-brand-700">Contact</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuItem({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
    >
      {icon} {children}
    </Link>
  );
}
