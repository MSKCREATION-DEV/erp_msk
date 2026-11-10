"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUIVI_SUBNAV } from "@/lib/suivi/modules";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact || href === "/suivi") return pathname === "/suivi";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SuiviNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation Suivi"
      className="-mx-1 min-w-0 border-b border-msk-ink/8"
    >
      <div className="flex gap-0 overflow-x-auto overscroll-x-contain px-1 scrollbar-thin">
        {SUIVI_SUBNAV.map((item) => {
          const exact = "exact" in item ? Boolean(item.exact) : false;
          const active = isActive(pathname, item.href, exact);
          return (
            <Link
              key={item.href}
              prefetch={false}
              href={item.href}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "text-msk-blue"
                  : "text-msk-ink/45 hover:text-msk-ink",
              )}
            >
              {item.label}
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-msk-blue"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
