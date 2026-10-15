import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { resolveGoalsForPeriod } from "@/lib/crm/goals";
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
import { GoalsCollabNav } from "@/components/crm/goals-collab-assign";

export const metadata: Metadata = {
  title: "Assignation collaborateur · Objectifs",
};

export default async function ObjectifsAssignerCollabPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const canManage =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");
  if (!canManage) redirect("/crm/objectifs");

  const { userId } = await params;
  const sp = normalizeSearchParams(await searchParams);
  const period = defaultAssignPeriod(sp);
  const { grain, periodStartIso, weeks } = assignFormDefaults(period);

  const teamIds = await commercialTeamUserIds();
  const memberIds = [...new Set([user.id, ...teamIds])];
  const members = await prisma.user.findMany({
    where: { id: { in: memberIds }, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const focus = members.find((m) => m.id === userId);
  if (!focus) notFound();

  const collabGoals = await resolveGoalsForPeriod(focus.id, period);

  return (
    <PageShell>
      <PageHeader
        title={`Objectifs · ${focus.firstName} ${focus.lastName}`}
        description="Ces cibles remplacent l’assignation globale pour cette personne."
        backHref="/crm/objectifs"
        backLabel="Retour à la vue d’ensemble"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Objectifs", href: "/crm/objectifs" },
          { label: focus.firstName },
        ]}
      />

      <Surface className="space-y-6 p-5 sm:p-6">
        <div className="border-b border-msk-ink/[0.08] pb-4">
          <GoalsAssignTabs
            mode="collab"
            firstCollabId={members[0]?.id ?? null}
            currentUserId={focus.id}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-msk-ink">Collaborateur</h2>
          <p className="mt-1 mb-3 text-xs text-msk-ink/45">
            Sélectionnez la personne à qui assigner des objectifs.
          </p>
          <GoalsCollabNav members={members} selectedId={focus.id} />
        </div>

        <div className="border-t border-msk-ink/[0.06] pt-6">
          <GoalsForm
            key={focus.id}
            scope="USER"
            targetUserId={focus.id}
            initial={collabGoals}
            periodType={grain}
            periodStart={periodStartIso}
            weeks={weeks}
            cancelHref={`/crm/objectifs/${focus.id}`}
            submitLabel={`Enregistrer pour ${focus.firstName}`}
          />
        </div>
      </Surface>
    </PageShell>
  );
}
