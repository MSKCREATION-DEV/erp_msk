import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { listKeyFromSearchParams } from "@/lib/list/sort";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import {
  filterClientAccountRows,
  parseClientAccountStatutFilter,
  sumClientAccountTotals,
} from "@/lib/comptabilite/client-accounts";
import { loadClientAccounts } from "@/lib/comptabilite/load-client-accounts";
import { formatComMoney } from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { KpiGrid } from "@/components/ui/kpi-card";
import { Surface } from "@/components/ui/surface";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { ClientsFilterButton } from "@/components/comptabilite/clients-filter-modal";
import { ClientsResults } from "./clients-results";

export const metadata: Metadata = { title: "Clients" };

/**
 * Shell sync-ish : auth + KPI (indépendants de `q`, dépendent du statut).
 * Résultats filtrés/triés/paginés dans Suspense — recherche reste interactive.
 */
export default async function ComptabiliteClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "cpt.access") &&
    !hasPermission(user, "cpt.etats.view") &&
    !hasPermission(user, "com.reports.view")
  ) {
    redirect("/comptabilite");
  }

  const sp = await searchParams;
  const statutFilter = parseClientAccountStatutFilter(sp);

  const allRows = await loadClientAccounts();
  const kpiRows = filterClientAccountRows(allRows, { statut: statutFilter });
  const totals = sumClientAccountTotals(kpiRows);
  const resultsKey = listKeyFromSearchParams(sp);

  return (
    <PageShell>
      <PageHeader
        title="Clients"
        description="Vue comptable — facturé, encaissé, créances ouvertes et retards, par client."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Clients" },
        ]}
      />

      <KpiGrid
        items={[
          { label: "Facturé", value: formatComMoney(totals.totalInvoiced) },
          { label: "Encaissé (imputé)", value: formatComMoney(totals.totalPaid) },
          {
            label: "Créances ouvertes",
            value: formatComMoney(totals.totalOpen),
            hint: `${kpiRows.length} client${kpiRows.length > 1 ? "s" : ""}`,
          },
          {
            label: "Dont en retard",
            value: formatComMoney(totals.totalOverdue),
          },
        ]}
      />

      <Surface className="min-w-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-msk-ink/6 px-4 py-3">
          <Suspense
            fallback={
              <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
            }
          >
            <ListSearchForm placeholder="Rechercher un client, un contact, un email…" />
          </Suspense>
          <Suspense fallback={null}>
            <ClientsFilterButton />
          </Suspense>
        </div>

        <Suspense key={resultsKey} fallback={<ListTableSkeleton rows={10} cols={8} />}>
          <ClientsResults searchParams={searchParams} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}
