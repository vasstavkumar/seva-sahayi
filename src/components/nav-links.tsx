"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

const ICONS = {
  work: "M4 6h16M4 12h16M4 18h10",
  new: "M12 5v14M5 12h14",
  impact: "M4 19V10M10 19V5M16 19v-7M22 19H2",
};

export function NavLinks({ className = "", mobile = false }: { className?: string; mobile?: boolean }) {
  const { t } = useI18n();
  const path = usePathname();
  const links = [
    { href: "/dashboard", key: "work" as const, active: path === "/dashboard" || path.startsWith("/applications/") && path !== "/applications/new" },
    { href: "/applications/new", key: "new" as const, active: path === "/applications/new" },
    { href: "/impact", key: "impact" as const, active: path === "/impact" },
  ];

  return (
    <nav className={className}>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.active ? "page" : undefined}
          className={
            mobile
              ? `flex flex-1 flex-col items-center gap-0.5 whitespace-nowrap py-2 text-xs ${l.active ? "font-semibold text-brand" : "text-muted"}`
              : `whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${l.active ? "bg-brand-soft font-semibold text-brand" : "text-ink-2 hover:bg-page"}`
          }
        >
          {mobile && (
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d={ICONS[l.key]} />
            </svg>
          )}
          {t.nav[l.key]}
        </Link>
      ))}
    </nav>
  );
}
