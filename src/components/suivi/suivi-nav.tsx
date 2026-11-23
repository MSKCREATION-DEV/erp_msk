"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SUIVI_SUBNAV } from "@/lib/suivi/modules";
import {
  parseSvCountryParam,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact || href === "/suivi") return pathname === "/suivi";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SuiviNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paysRaw = searchParams.get("pays");
  const country = parseSvCountryParam(paysRaw);

  return (
    <nav
      aria-label="Navigation Suivi"
      className="-mx-1 min-w-0 border-b border-msk-ink/8"
    >
      <div className="flex gap-0 overflow-x-auto overscroll-x-contain px-1 scrollbar-thin">
        {SUIVI_SUBNAV.map((item) => {
          const exact = "exact" in item ? Boolean(item.exact) : false;
          const countryScoped =
            "countryScoped" in item && Boolean(item.countryScoped);
          const active = isActive(pathname, item.href, exact);

          // Propager `pays` entre piliers ; sans pays → chemin nu (écran de choix).
          // Hub Menu : pas de `pays` collé.
          const href: string = countryScoped
            ? country
              ? withSvCountryQuery(item.href, country)
              : item.href
            : item.href;

          return (
            <Link
              key={item.href}
              prefetch={false}
              href={href}
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
