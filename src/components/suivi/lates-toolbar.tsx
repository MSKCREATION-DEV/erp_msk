"use client";

import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListFilterChip } from "@/components/suivi/list-filter-chip";

export function SvLatesToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ListSearchForm
        placeholder="Collaborateur, note…"
        className="sm:max-w-md"
      />
      <ListFilterChip
        param="aujourdhui"
        value="1"
        label="Aujourd’hui"
        clearLabel="Toutes dates"
      />
      <ListFilterChip
        param="semaine"
        value="1"
        label="7 derniers jours"
        clearLabel="Toutes dates"
      />
      <ListFilterChip
        param="annule"
        value="1"
        label="Annulés"
        clearLabel="Actifs"
      />
    </div>
  );
}
