"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListIcon, ReportIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "Click a Road", icon: ReportIcon },
  { href: "/feed", label: "Reports", icon: ListIcon },
];

// Floating pill bottom nav (PRD 14.3) — the two citizen-facing
// destinations that exist without login. No favorites/profile tab:
// neither has an equivalent in this no-login app (PRD 14.4).
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-4 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-pill bg-ink p-1.5 shadow-lg">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-pill px-4 py-2.5 text-body font-medium transition-colors ${
                active ? "bg-ink-foreground text-ink" : "text-ink-foreground/70 hover:text-ink-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
