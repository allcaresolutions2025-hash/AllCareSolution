"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function DashboardShell({
  title,
  description,
  nav,
  children,
}: {
  title: string;
  description?: string;
  nav: DashboardNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const activeItem = nav.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/")
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {nav.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-brand-100 text-brand-800 font-semibold"
                : "hover:bg-muted text-foreground"
            )}
          >
            {n.icon}
            <span className="flex-1">{n.label}</span>
            {active && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="container-page grid md:grid-cols-[220px_1fr] gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden md:block md:sticky md:top-20 h-fit">
        <h2 className="font-bold text-lg mb-1">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mb-4">{description}</p>
        )}
        <nav className="space-y-1">
          <NavLinks />
        </nav>
      </aside>

      {/* Mobile: sticky top bar + slide-down drawer */}
      <div className="md:hidden col-span-full">
        {/* Sticky trigger bar */}
        <div className="sticky top-16 z-30 -mx-4 px-4 py-2 bg-white/95 backdrop-blur border-b border-slate-100 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            {activeItem && (
              <span className="text-brand-700 shrink-0">{activeItem.icon}</span>
            )}
            <span className="font-semibold text-sm truncate">
              {activeItem?.label ?? title}
            </span>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-muted transition-colors shrink-0"
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>{open ? "Close" : "Menu"}</span>
          </button>
        </div>

        {/* Slide-down overlay */}
        {open && (
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm">
            <div
              ref={overlayRef}
              className="absolute top-0 left-0 right-0 bg-white shadow-xl rounded-b-2xl max-h-[85vh] overflow-y-auto"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b">
                <div>
                  <div className="font-bold text-base">{title}</div>
                  {description && (
                    <div className="text-xs text-muted-foreground">{description}</div>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="p-3 space-y-0.5">
                <NavLinks onClick={() => setOpen(false)} />
              </nav>

              {/* Bottom safe area */}
              <div className="h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 col-span-full md:col-span-1">{children}</div>
    </div>
  );
}
