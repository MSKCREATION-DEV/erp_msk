"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Chip filtre URL — bascule une clé searchParam, reset `page`, conserve le reste.
 */
export function ListFilterChip({
  param,
  value,
  label,
  clearLabel,
}: {
  /** Clé URL (ex. `reste`, `due`). */
  param: string;
  /** Valeur active (ex. `1`). Absence = filtre off. */
  value: string;
  label: string;
  /** Libellé quand le filtre est actif (ex. « Toutes »). */
  clearLabel?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get(param) === value;

  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");
  if (active) params.delete(param);
  else params.set(param, value);
  const qs = params.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;

  return (
    <Link
      prefetch={false}
      href={href}
      className={cn(
        "inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition",
        active
          ? "border-msk-blue/25 bg-msk-blue/8 text-msk-blue"
          : "border-msk-ink/15 bg-white text-msk-ink/70 hover:bg-msk-chalk",
      )}
      aria-pressed={active}
    >
      {active && clearLabel ? clearLabel : label}
    </Link>
  );
}
