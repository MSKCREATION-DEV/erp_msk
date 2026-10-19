import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  buildGoalProgress,
  resolveGoalsForPeriod,
  resolveGoalsSnapshots,
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
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { GoalsProgressStrip } from "@/components/crm/goals-progress-strip";
import { CrmScopeBar } from "@/components/crm/crm-scope-bar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Objectifs" };

/**
 * Vue d’ensemble — progression.
 * Clic ligne → fiche détail · CTA Assignation → /assigner.
 */
export default async function CrmObjectifsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const rawSp = await searchParams;
  const sp = normalizeSearchParams(rawSp);
  const canManage =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");

  if (canManage && sp.vue === "equipe") {
    redirect("/crm/objectifs/assigner");
  }
  const legacyCollab = sp.collab ?? sp.owner;
  if (legacyCollab) {
    redirect(`/crm/objectifs/${legacyCollab}`);
  }

  const rawPeriod = parseCrmPeriod(sp);
  const period =
    rawPeriod.mode === "plage"
      ? parseCrmPeriod({
          semaine: sp.semaine,
          periode: "semaine",
        })
      : rawPeriod;
  const lens = resolveCrmScopeLens(period);
  const weeks = listWeekOptions({ fromYear: new Date().getFullYear() - 1 });

  const myGoals = await resolveGoalsForPeriod(user.id, period);
  const myStats = await computePeriodStats(user.id, period.from, period.to);
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

  const teamSnapshots = canManage
    ? (await resolveGoalsSnapshots(members, period)).map((s) => ({
        id: s.userId,
        firstName: s.firstName,
        lastName: s.lastName,
        progress: s.progress,
      }))
    : [];

  const detailHref = (userId: string) =>
    buildCrmScopeHref(`/crm/objectifs/${userId}`, {
      period,
      ownerId: null,
      canFilterOwners: false,
      forcePeriod: true,
    });

  const scopeKey = `${period.mode}:${period.fromIso}`;

  return (
    <PageShell key={scopeKey}>
      <PageHeader
        title="Objectifs"
        description={`Suivi des cibles · ${period.label}.`}
        backHref={buildCrmScopeHref("/crm", {
          period,
          ownerId: null,
          canFilterOwners: canManage,
          forcePeriod: true,
        })}
        backLabel="Retour tableau de bord"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Objectifs" },
        ]}
        actions={
          canManage ? (
            <ActionLink
              href="/crm/objectifs/assigner"
              icon={ClipboardList}
              variant="primary"
            >
              Assignation
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

      {!canManage ? (
        <>
          <GoalsProgressStrip
            progress={myProgress}
            title={`Mes objectifs · ${period.label}`}
            detailHref={buildCrmScopeHref("/crm/rapport-semaine", {
              period: { ...period, mode: "semaine" },
              ownerId: user.id,
              canFilterOwners: false,
              forcePeriod: true,
            })}
            detailLabel="Voir mon rapport"
          />
          <Surface className="p-5">
            <p className="text-sm text-msk-ink/55">
              Les cibles sont fixées par la Direction. Contactez votre
              responsable pour un ajustement.
            </p>
          </Surface>
        </>
      ) : null}

      {canManage ? (
        <Surface className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-msk-ink">
              Progression de l’équipe
            </h2>
            <p className="mt-1 text-xs text-msk-ink/45">
              Cliquez une ligne pour voir le détail. Pour fixer des cibles :
              Assignation.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="border-b border-msk-ink/8 text-[11px] uppercase tracking-wide text-msk-ink/40">
                <tr>
                  <th className="px-3 py-2 font-semibold">Collaborateur</th>
                  {myProgress.map((g) => (
                    <th key={g.metric} className="px-3 py-2 font-semibold">
                      {g.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {teamSnapshots.map((row) => (
                  <ClickableRowLink
                    key={row.id}
                    href={detailHref(row.id)}
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
      ) : null}
    </PageShell>
  );
}
