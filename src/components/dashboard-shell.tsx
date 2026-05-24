"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  return (
    <div className="container-page grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="md:sticky md:top-20 h-fit">
        <h2 className="font-bold text-lg mb-1">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mb-4">{description}</p>
        )}
        <nav className="space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-brand-100 text-brand-800 font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {n.icon}
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
