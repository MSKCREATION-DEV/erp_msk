"use client";

import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListFilterChip } from "@/components/suivi/list-filter-chip";

export function SvFacturesToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ListSearchForm
        placeholder="N°, client, objet…"
        className="sm:max-w-md"
      />
      <ListFilterChip
        param="reste"
        value="1"
        label="Reste > 0"
        clearLabel="Toutes"
      />
    </div>
  );
}
