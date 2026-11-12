"use client";

import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListFilterChip } from "@/components/suivi/list-filter-chip";

export function SvClientsToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ListSearchForm
        placeholder="Nom, contact, ville, téléphone…"
        className="sm:max-w-md"
      />
      <ListFilterChip
        param="due"
        value="1"
        label="Solde dû"
        clearLabel="Tous les clients"
      />
    </div>
  );
}
