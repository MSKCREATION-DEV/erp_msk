"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type CommercialSubnavItem = {
  href: string;
  label: string;
  match?: string[];
};

function isActive(pathname: string, item: CommercialSubnavItem): boolean {
  // Menu hub : uniquement /commercial exact
  if (item.href === "/commercial") {
    return pathname === "/commercial";
  }
  // Tableau de bord : uniquement /crm exact (pas /crm/prospects)
  if (item.href === "/crm") {
    return pathname === "/crm";
  }
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function CommercialSubnav({
  items,
  className,
}: {
  items: CommercialSubnavItem[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation Commercial"
      className={cn("-mx-1 min-w-0 border-b border-msk-ink/8", className)}
    >
      <div className="flex gap-0 overflow-x-auto overscroll-x-contain px-1 scrollbar-thin">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href + item.label}
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
