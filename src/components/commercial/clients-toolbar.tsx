"use client";

import { ListSearchForm } from "@/components/ui/list-search-form";
import {
  ClientsFilterModal,
  type ClientsFilterRosterEntry,
} from "@/components/commercial/clients-filter-modal";

export function ClientsToolbar({
  roster,
  readTeam,
}: {
  roster: ClientsFilterRosterEntry[];
  readTeam: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ListSearchForm
        placeholder="Rechercher entreprise, contact, ville, téléphone…"
        className="sm:max-w-md"
      />
      <ClientsFilterModal roster={roster} readTeam={readTeam} />
    </div>
  );
}
