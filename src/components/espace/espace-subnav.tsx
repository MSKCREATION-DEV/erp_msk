"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { EspaceNavItem } from "@/lib/espace/nav";

function isActive(pathname: string, item: EspaceNavItem): boolean {
  if (item.href === "/espace") {
    return pathname === "/espace";
  }
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function EspaceSubnav({
  items,
  className,
}: {
  items: EspaceNavItem[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation Mon espace"
      className={cn("-mx-1 min-w-0 border-b border-msk-ink/8", className)}
    >
      <div className="flex gap-0 overflow-x-auto overscroll-x-contain px-1 scrollbar-thin">
        {items.map((item) => {
          const active = isActive(pathname, item);
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
