import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  buildGoalProgress,
  resolveGoalsForPeriod,
} from "@/lib/crm/goals";
import { listWeekOptions } from "@/lib/crm/week";
import { computePeriodStats } from "@/lib/crm/week-stats";
import {
  buildCrmScopeHref,
  normalizeSearchParams,
  parseCrmPeriod,
  resolveCrmScopeLens,
} from "@/lib/crm/scope-period";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ActionLink } from "@/components/ui/action-link";
import { GoalsProgressStrip } from "@/components/crm/goals-progress-strip";
import { CrmScopeBar } from "@/components/crm/crm-scope-bar";
import { GOAL_LABELS, GOAL_METRICS } from "@/lib/crm/goals";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Détail objectifs" };

/**
 * Fiche lecture des objectifs d’un collaborateur.
 * Modification → `/crm/objectifs/assigner/[userId]`.
 */
export default async function ObjectifsCollabDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const { userId } = await params;
  // Ne pas capturer la route statique /assigner
  if (userId === "assigner") redirect("/crm/objectifs/assigner");

  const canManage =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");
  const sp = normalizeSearchParams(await searchParams);

  const rawPeriod = parseCrmPeriod(sp);
  const period =
    rawPeriod.mode === "plage"
      ? parseCrmPeriod({ semaine: sp.semaine, periode: "semaine" })
      : rawPeriod;
  const lens = resolveCrmScopeLens(period);
  const weeks = listWeekOptions({ fromYear: new Date().getFullYear() - 1 });

  const teamIds = canManage
    ? await commercialTeamUserIds()
    : [];
  const allowedIds = canManage
    ? new Set([user.id, ...teamIds])
    : new Set([user.id]);

  if (!allowedIds.has(userId)) {
    if (!canManage && userId !== user.id) redirect("/crm/objectifs");
    notFound();
  }

  const focus = await prisma.user.findFirst({
    where: { id: userId, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!focus) notFound();

  const goals = await resolveGoalsForPeriod(focus.id, period);
  const stats = await computePeriodStats(focus.id, period.from, period.to);
  const progress = buildGoalProgress(goals, stats);

  const listHref = buildCrmScopeHref("/crm/objectifs", {
    period,
    ownerId: null,
    canFilterOwners: false,
    forcePeriod: true,
  });
  const editHref = `/crm/objectifs/assigner/${focus.id}`;

  return (
    <PageShell>
      <PageHeader
        title={`${focus.firstName} ${focus.lastName}`}
        description={`Objectifs · ${period.label}`}
        backHref={listHref}
        backLabel="Retour à la vue d’ensemble"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Objectifs", href: listHref },
          { label: focus.firstName },
        ]}
        actions={
          canManage ? (
            <ActionLink href={editHref} icon={Pencil} variant="primary">
              Modifier
            </ActionLink>
          ) : null
        }
      />

      <CrmScopeBar
        mode={period.mode}
        semaine={period.semaine}
        mois={period.mois}
        on={period.on}
        from={period.fromIso}
        to={period.toIso}
        weeks={weeks}
        ownerId={null}
        owners={[]}
        canFilterOwners={false}
        periodLabel={period.label}
        periodModes={["jour", "semaine", "mois"]}
        lens={lens}
      />

      <GoalsProgressStrip
        progress={progress}
        title={`Avancement · ${period.label}`}
      />

      <Surface className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-msk-ink">
          Détail des cibles
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GOAL_METRICS.map((m) => {
            const item = progress.find((p) => p.metric === m)!;
            return (
              <div
                key={m}
                className="rounded-xl border border-msk-ink/[0.08] bg-msk-chalk/40 px-4 py-3"
              >
                <p className="text-xs font-medium text-msk-ink/45">
                  {GOAL_LABELS[m]}
                </p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-xl font-semibold tabular-nums",
                      item.pct >= 100
                        ? "text-emerald-700"
                        : item.pct < 40
                          ? "text-msk-coral"
                          : "text-msk-ink",
                    )}
                  >
                    {item.current}
                    <span className="text-base font-medium text-msk-ink/40">
                      {" "}
                      / {item.target}
                    </span>
                  </span>
                  <span className="text-sm text-msk-ink/40">{item.pct}%</span>
                </p>
              </div>
            );
          })}
        </div>
        {canManage ? (
          <div className="mt-5 flex justify-end border-t border-msk-ink/[0.06] pt-4">
            <ActionLink href={editHref} icon={Pencil} variant="primary">
              Modifier ses objectifs
            </ActionLink>
          </div>
        ) : (
          <p className="mt-4 text-sm text-msk-ink/50">
            Lecture seule — les cibles sont fixées par la Direction.
          </p>
        )}
      </Surface>
    </PageShell>
  );
}
