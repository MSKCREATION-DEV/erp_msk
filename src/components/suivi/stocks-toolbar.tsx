"use client";

import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListFilterChip } from "@/components/suivi/list-filter-chip";

export function SvStocksToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ListSearchForm
        placeholder="Code, désignation, famille, emplacement…"
        className="sm:max-w-md"
      />
      <ListFilterChip
        param="rupture"
        value="1"
        label="Rupture (qté 0)"
        clearLabel="Tous les articles"
      />
    </div>
  );
}
