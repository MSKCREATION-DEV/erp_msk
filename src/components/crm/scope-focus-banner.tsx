import Link from "next/link";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bandeau de contexte quand une page réagit à un filtre collab (`?owner=` / `?collab=`).
 */
export function ScopeFocusBanner({
  label,
  clearHref,
  clearLabel = "Toute l’équipe",
  className,
  children,
}: {
  label: string;
  clearHref: string;
  clearLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-msk-blue/20 bg-msk-blue/[0.04] px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-blue/70">
          Focus collaborateur
        </p>
        <p className="truncate text-sm font-semibold text-msk-ink">{label}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Link
          prefetch={false}
          href={clearHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-msk-ink/12 bg-white px-3 text-sm font-medium text-msk-ink/70 transition hover:bg-msk-chalk"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          {clearLabel}
        </Link>
      </div>
    </div>
  );
}
