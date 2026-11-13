"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListFilterChip } from "@/components/suivi/list-filter-chip";
import { cn } from "@/lib/utils";

/**
 * Filtres historique compte — reset `page` (courant) + `hpage` (archive).
 */
export function SvCompteHistoryToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const hasPeriod = Boolean(from || to);
  const hasFilters = Boolean(
    searchParams.get("direction") ||
      searchParams.get("q") ||
      hasPeriod,
  );

  function applyPeriod(patch: { from?: string | null; to?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("hpage");
    if (patch.from !== undefined) {
      if (!patch.from) params.delete("from");
      else params.set("from", patch.from);
    }
    if (patch.to !== undefined) {
      if (!patch.to) params.delete("to");
      else params.set("to", patch.to);
    }
    const qs = params.toString();
    start(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function clearAll() {
    start(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ListSearchForm
          placeholder="Motif, catégorie, référence…"
          className="sm:max-w-md"
        />
        <ListFilterChip
          param="direction"
          value="IN"
          label="Entrées"
          clearLabel="Tous sens"
        />
        <ListFilterChip
          param="direction"
          value="OUT"
          label="Sorties"
          clearLabel="Tous sens"
        />
        {hasFilters ? (
          <button
            type="button"
            disabled={pending}
            onClick={clearAll}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-ink/70 transition hover:bg-msk-chalk",
              pending && "opacity-60",
            )}
          >
            <X className="size-3.5" aria-hidden />
            Réinitialiser
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-msk-ink/12 bg-white px-2.5 text-sm text-msk-ink/70">
          <span className="sr-only">Du</span>
          <input
            type="date"
            value={from}
            disabled={pending}
            onChange={(e) => applyPeriod({ from: e.target.value || null })}
            className="bg-transparent text-sm outline-none"
          />
        </label>
        <span className="text-xs text-msk-ink/35" aria-hidden>
          →
        </span>
        <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-msk-ink/12 bg-white px-2.5 text-sm text-msk-ink/70">
          <span className="sr-only">Au</span>
          <input
            type="date"
            value={to}
            disabled={pending}
            onChange={(e) => applyPeriod({ to: e.target.value || null })}
            className="bg-transparent text-sm outline-none"
          />
        </label>
      </div>
    </div>
  );
}
