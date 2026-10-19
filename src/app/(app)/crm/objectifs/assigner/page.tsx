import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { listCommercialRoster } from "@/lib/crm/team";
import { loadTeamGoalsForPeriod } from "@/lib/crm/goals";
import {
  assignFormDefaults,
  defaultAssignPeriod,
} from "@/lib/crm/goals-assign";
import { normalizeSearchParams } from "@/lib/crm/scope-period";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { GoalsForm } from "@/components/crm/goals-form";
import { GoalsAssignTabs } from "@/components/crm/goals-assign-tabs";

export const metadata: Metadata = { title: "Assignation globale · Objectifs" };

export default async function ObjectifsAssignerEquipePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const canManage =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");
  if (!canManage) redirect("/crm/objectifs");

  const sp = normalizeSearchParams(await searchParams);
  const period = defaultAssignPeriod(sp);
  const { grain, periodStartIso, weeks } = assignFormDefaults(period);
  const teamGoals = await loadTeamGoalsForPeriod(period);

  const roster = await listCommercialRoster({
    mode: "assign",
    extraIds: [user.id],
  });
  const first = roster[0] ?? null;

  return (
    <PageShell>
      <PageHeader
        title="Assignation globale"
        description="Objectifs communs à toute l’équipe. Un objectif individuel reste prioritaire s’il existe."
        backHref="/crm/objectifs"
        backLabel="Retour à la vue d’ensemble"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Objectifs", href: "/crm/objectifs" },
          { label: "Assignation globale" },
        ]}
      />

      <Surface className="p-5 sm:p-6">
        <div className="mb-6 border-b border-msk-ink/8 pb-4">
          <GoalsAssignTabs
            mode="equipe"
            firstCollabId={first?.id ?? null}
          />
        </div>

        <GoalsForm
          scope="TEAM"
          initial={teamGoals}
          periodType={grain}
          periodStart={periodStartIso}
          weeks={weeks}
          cancelHref="/crm/objectifs"
          submitLabel="Enregistrer l’assignation globale"
        />
      </Surface>
    </PageShell>
  );
}
