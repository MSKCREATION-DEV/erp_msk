import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { crmVisibility } from "@/lib/crm/scope";
import { firstSearchParam } from "@/lib/crm/scope-period";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { RelancesResults } from "./relances-results";

export const metadata: Metadata = { title: "Relances" };

/**
 * Shell : auth + en-tête.
 * Corps (KPIs, recherche, chips, table) en Suspense — skeleton à la nav / `q`.
 */
export default async function CrmRelancesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const raw = await searchParams;
  const focusFaites = firstSearchParam(raw.focus) === "faites";
  const vis = crmVisibility(user);

  return (
    <PageShell>
      <PageHeader
        title={focusFaites ? "Relances faites" : "Relances"}
        description={
          focusFaites
            ? "Journal des relances sur la période sélectionnée."
            : vis === "own"
              ? "File du jour — traitez, reportez ou ouvrez la fiche."
              : "File d’équipe — traitez, reportez ou ouvrez la fiche."
        }
        backHref={focusFaites ? "/crm/relances" : "/commercial"}
        backLabel={focusFaites ? "File à faire" : "Retour Commercial"}
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Relances" },
        ]}
      />

      <Suspense fallback={<ListTableSkeleton rows={10} cols={8} />}>
        <RelancesResults searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
