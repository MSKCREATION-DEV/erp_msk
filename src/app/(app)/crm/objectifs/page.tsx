import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  FileText,
  FolderOpen,
  Settings2,
  Users,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  buildGoalProgress,
  loadTeamGoals,
  resolveGoals,
  resolveGoalsSnapshots,
} from "@/lib/crm/goals";
import { weekStartMonday } from "@/lib/crm/week";
import { computeWeekStats } from "@/lib/crm/week-stats";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { GoalsForm } from "@/components/crm/goals-form";
import { GoalsCollabNav } from "@/components/crm/goals-collab-assign";
import { GoalsProgressStrip } from "@/components/crm/goals-progress-strip";
import { ScopeFocusBanner } from "@/components/crm/scope-focus-banner";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Objectifs hebdo" };

type ObjectifsMode = "synthese" | "equipe" | "collab";

export default async function CrmObjectifsPage({
  searchParams,
}: {
  searchParams: Promise<{ collab?: string; vue?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const sp = await searchParams;
  const canManage =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");

  const weekStart = weekStartMonday();
  // Séquentiel — pool Prisma connection_limit=1 (pas de Promise.all prisma)
  const myGoals = await resolveGoals(user.id);
  const myStats = await computeWeekStats(user.id, weekStart);
  const myProgress = buildGoalProgress(myGoals, myStats);

  const teamIds = canManage ? await commercialTeamUserIds() : [];
  const memberIds = canManage
    ? [...new Set([user.id, ...teamIds])]
    : [];

  const members = canManage
    ? await prisma.user.findMany({
        where: { id: { in: memberIds }, status: "ACTIVE" },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      })
    : [];

  const focusCollab =
    canManage && sp.collab && members.some((m) => m.id === sp.collab)
      ? members.find((m) => m.id === sp.collab)!
      : null;

  let mode: ObjectifsMode = "synthese";
  if (canManage && focusCollab) mode = "collab";
  else if (canManage && sp.vue === "equipe") mode = "equipe";

  const teamGoals =
    canManage && (mode === "equipe" || mode === "synthese")
      ? await loadTeamGoals()
      : myGoals;

  const collabGoals = focusCollab
    ? await resolveGoals(focusCollab.id)
    : myGoals;

  const teamSnapshots =
    canManage && mode === "synthese"
      ? (await resolveGoalsSnapshots(members, weekStart)).map((s) => ({
          id: s.userId,
          firstName: s.firstName,
          lastName: s.lastName,
          progress: s.progress,
        }))
      : [];

  const collabProgress = focusCollab
    ? buildGoalProgress(
        collabGoals,
        await computeWeekStats(focusCollab.id, weekStart),
      )
    : [];

  /** Assignation globale / collab : retour via fil d’Ariane ou « Retour aux objectifs ». */
  const headerActions =
    canManage && mode === "synthese" ? (
      <div className="flex flex-wrap gap-2">
        <ActionLink
          href="/crm/objectifs?vue=equipe"
          icon={Settings2}
          variant="secondary"
        >
          Assignation globale
        </ActionLink>
        <ActionLink href="/crm/equipe" icon={Users} variant="secondary">
          Vue Équipe
        </ActionLink>
      </div>
    ) : null;

  const description =
    mode === "collab" && focusCollab
      ? `Par collaborateur · ${focusCollab.firstName} ${focusCollab.lastName}`
      : mode === "equipe"
        ? "Objectifs communs à toute l’équipe commerciale."
        : canManage
          ? "Vue d’ensemble de l’équipe, puis assignation globale ou par collaborateur."
          : "Vos objectifs de la semaine (fixés par la Direction).";

  return (
    <PageShell>
      <PageHeader
        title="Objectifs hebdomadaires"
        description={description}
        backHref={mode === "synthese" ? "/crm" : "/crm/objectifs"}
        backLabel={
          mode === "synthese"
            ? "Retour tableau de bord"
            : "Retour aux objectifs"
        }
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Objectifs", href: mode === "synthese" ? undefined : "/crm/objectifs" },
          ...(mode === "equipe"
            ? [{ label: "Assignation globale" }]
            : mode === "collab" && focusCollab
              ? [{ label: focusCollab.firstName }]
              : []),
        ]}
        actions={headerActions}
      />

      {mode === "synthese" ? (
        <GoalsProgressStrip
          progress={myProgress}
          title="Ma semaine"
          detailHref="/crm/rapport-semaine"
          detailLabel="Voir mon rapport"
        />
      ) : null}

      {!canManage ? (
        <Surface className="p-5">
          <p className="text-sm text-msk-ink/55">
            Les cibles sont fixées par la Direction. Contactez votre responsable
            pour un ajustement.
          </p>
        </Surface>
      ) : null}

      {canManage && mode === "synthese" ? (
        <>
          <Surface className="p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-msk-ink">
                  Progression de l’équipe
                </h2>
                <p className="mt-1 text-xs text-msk-ink/45">
                  Cliquez une ligne pour fixer les objectifs d’un collaborateur.
                </p>
              </div>
              <ActionLink
                href="/crm/objectifs?vue=equipe"
                icon={Settings2}
                variant="ghost"
                size="sm"
              >
                Assignation globale
              </ActionLink>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-180 text-left text-sm">
                <thead className="border-b border-msk-ink/[0.08] text-[11px] uppercase tracking-wide text-msk-ink/40">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Collaborateur</th>
                    {myProgress.map((g) => (
                      <th key={g.metric} className="px-3 py-2 font-semibold">
                        {g.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-msk-ink/[0.06]">
                  {teamSnapshots.map((row) => (
                    <ClickableRowLink
                      key={row.id}
                      href={`/crm/objectifs?collab=${row.id}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-msk-ink">
                        {row.firstName} {row.lastName}
                        {row.id === user.id ? (
                          <Badge tone="muted" className="ml-2">
                            Vous
                          </Badge>
                        ) : null}
                      </td>
                      {row.progress.map((g) => (
                        <td key={g.metric} className="px-3 py-2.5 tabular-nums">
                          <span
                            className={cn(
                              "font-semibold",
                              g.pct >= 100
                                ? "text-emerald-700"
                                : g.pct < 40
                                  ? "text-msk-coral"
                                  : "text-msk-ink",
                            )}
                          >
                            {g.current}/{g.target}
                          </span>
                          <span className="ml-1 text-xs text-msk-ink/40">
                            {g.pct}%
                          </span>
                        </td>
                      ))}
                    </ClickableRowLink>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>

          <Surface className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="text-sm font-semibold text-msk-ink">
                Assigner les objectifs
              </h2>
              <p className="mt-1 max-w-xl text-xs text-msk-ink/45">
                D’abord les objectifs communs à toute l’équipe, puis
                éventuellement des objectifs spécifiques par personne.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionLink
                href="/crm/objectifs?vue=equipe"
                icon={Settings2}
                variant="secondary"
              >
                Assignation globale
              </ActionLink>
              {members[0] ? (
                <ActionLink
                  href={`/crm/objectifs?collab=${members[0].id}`}
                  icon={UserRound}
                  variant="primary"
                >
                  Par collaborateur
                </ActionLink>
              ) : null}
            </div>
          </Surface>
        </>
      ) : null}

      {canManage && mode === "equipe" ? (
        <Surface className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-msk-ink">
              Assignation globale
            </h2>
            <p className="mt-1 text-xs text-msk-ink/45">
              Objectifs communs à toute l’équipe. Un objectif par collaborateur
              reste prioritaire s’il existe.
            </p>
          </div>
          <GoalsForm
            scope="TEAM"
            initial={teamGoals}
            submitLabel="Enregistrer l’assignation globale"
          />
        </Surface>
      ) : null}

      {canManage && mode === "collab" && focusCollab ? (
        <>
          <ScopeFocusBanner
            label={`${focusCollab.firstName} ${focusCollab.lastName}`}
            clearHref="/crm/objectifs"
            clearAriaLabel="Retour à la vue d’ensemble"
          >
            <ActionLink
              href={`/crm/rapport-semaine?owner=${focusCollab.id}`}
              icon={FileText}
              variant="secondary"
              size="sm"
            >
              Rapport
            </ActionLink>
            <ActionLink
              href={`/crm/prospects?owner=${focusCollab.id}`}
              icon={FolderOpen}
              variant="secondary"
              size="sm"
            >
              Prospects
            </ActionLink>
          </ScopeFocusBanner>

          <GoalsProgressStrip
            progress={collabProgress}
            title={`Avancement · ${focusCollab.firstName}`}
            detailHref={`/crm/rapport-semaine?owner=${focusCollab.id}`}
            detailLabel="Rapport détaillé"
          />

          <Surface className="space-y-5 p-5">
            <div>
              <h2 className="text-sm font-semibold text-msk-ink">
                Collaborateur
              </h2>
              <p className="mt-1 mb-3 text-xs text-msk-ink/45">
                Choisissez la personne, puis enregistrez ses objectifs.
              </p>
              <GoalsCollabNav
                members={members}
                selectedId={focusCollab.id}
              />
            </div>
            <div className="border-t border-msk-ink/[0.06] pt-5">
              <h2 className="mb-1 text-sm font-semibold text-msk-ink">
                Objectifs de {focusCollab.firstName}
              </h2>
              <p className="mb-4 text-xs text-msk-ink/45">
                Ces objectifs remplacent l’assignation globale pour cette
                personne.
              </p>
              <GoalsForm
                key={focusCollab.id}
                scope="USER"
                targetUserId={focusCollab.id}
                initial={collabGoals}
                submitLabel={`Enregistrer pour ${focusCollab.firstName}`}
              />
            </div>
          </Surface>
        </>
      ) : null}
    </PageShell>
  );
}
