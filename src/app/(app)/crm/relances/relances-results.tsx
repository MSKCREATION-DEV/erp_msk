import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { CrmPipelineStage, Prisma } from "@prisma/client";
import { CrmTaskStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility } from "@/lib/crm/scope";
import {
  commercialTeamUserIds,
  formatCollaboratorOptionLabel,
} from "@/lib/crm/team";
import { ACTIVITY_LABELS, STAGE_LABELS } from "@/lib/crm/labels";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import {
  OUTREACH_ACTIVITY_TYPES,
  outreachCountByOpportunityIds,
} from "@/lib/crm/follow-up-count";
import {
  classifyRelanceDue,
  partitionRelanceDue,
  startOfLocalDay,
  summarizeRelanceDueBuckets,
  type RelanceDueBucket,
} from "@/lib/crm/relance-buckets";
import {
  buildRelanceActivitySearchWhere,
  buildRelanceTaskSearchWhere,
  normalizeRelanceSearchQuery,
} from "@/lib/crm/relance-search";
import {
  buildCrmScopeHref,
  buildPortfolioProspectsHref,
  dateRangeFilter,
  normalizeSearchParams,
  parseCrmOwner,
  parseCrmPeriod,
  resolveCrmOwnerIds,
} from "@/lib/crm/scope-period";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { formatContactLabel } from "@/lib/crm/contact-label";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { KpiRadial } from "@/components/crm/kpi-radial";
import { RelanceActions } from "@/components/crm/relance-actions";
import { RelanceCountBadge } from "@/components/crm/relance-count-badge";
import { ScopeFocusBanner } from "@/components/crm/scope-focus-banner";
import { gridKpi3, gridKpi4 } from "@/lib/ui/layout-grids";
import { cn } from "@/lib/utils";

type VueFilter = "tous" | "retard" | "aujourdhui" | "semaine" | "plus-tard";

type TaskRow = Awaited<ReturnType<typeof loadTasks>>[number];

const taskInclude = {
  opportunity: {
    select: {
      id: true,
      title: true,
      stage: true,
      nextAction: true,
      followUpAt: true,
      organization: {
        select: {
          name: true,
          contacts: {
            orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
            take: 1,
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              jobTitle: true,
            },
          },
        },
      },
    },
  },
  assignee: { select: { firstName: true, lastName: true } },
} satisfies Prisma.CrmTaskInclude;

async function loadTasks(
  assigneeFilter: string[] | null,
  searchWhere: Prisma.CrmTaskWhereInput | null,
) {
  const where: Prisma.CrmTaskWhereInput = {
    status: CrmTaskStatus.OPEN,
    ...(assigneeFilter ? { assigneeId: { in: assigneeFilter } } : {}),
    ...(searchWhere ? { AND: [searchWhere] } : {}),
  };
  return prisma.crmTask.findMany({
    where,
    include: taskInclude,
    orderBy: { dueAt: "asc" },
    take: 2000,
  });
}

/** Due dates seules — KPI globaux indépendants de `q`. */
async function loadOpenDueAts(assigneeFilter: string[] | null) {
  return prisma.crmTask.findMany({
    where: {
      status: CrmTaskStatus.OPEN,
      ...(assigneeFilter ? { assigneeId: { in: assigneeFilter } } : {}),
    },
    select: { dueAt: true },
    take: 2000,
  });
}

async function loadOutreachDone(opts: {
  ownerIds: string[] | null;
  occurredBetween: { gte: Date; lte: Date };
  searchWhere: Prisma.CrmActivityWhereInput | null;
}) {
  const where: Prisma.CrmActivityWhereInput = {
    type: { in: OUTREACH_ACTIVITY_TYPES },
    occurredAt: opts.occurredBetween,
    ...(opts.ownerIds && opts.ownerIds.length > 0
      ? { opportunity: { ownerId: { in: opts.ownerIds } } }
      : {}),
    ...(opts.searchWhere ? { AND: [opts.searchWhere] } : {}),
  };
  return prisma.crmActivity.findMany({
    where,
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          stage: true,
          organization: { select: { name: true } },
          owner: { select: { firstName: true, lastName: true } },
        },
      },
      actor: { select: { firstName: true, lastName: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 2000,
  });
}

function stageTone(stage: string): "muted" | "success" | "coral" | "blue" {
  if (stage === "GAGNE") return "success";
  if (stage === "PERDU") return "coral";
  if (stage === "INTERESSE" || stage === "DEVIS_ENVOYE") return "blue";
  return "muted";
}

function formatDue(dueAt: Date, bucket: RelanceDueBucket) {
  const label = dueAt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
  if (bucket === "overdue") {
    const sod = startOfLocalDay(new Date());
    const days = Math.max(
      1,
      Math.round(
        (sod.getTime() - startOfLocalDay(dueAt).getTime()) / 86_400_000,
      ),
    );
    return {
      label,
      hint: days === 1 ? "1 jour de retard" : `${days} jours de retard`,
      tone: "coral" as const,
    };
  }
  if (bucket === "today") {
    return { label, hint: "Aujourd’hui", tone: "blue" as const };
  }
  return { label, hint: null, tone: "muted" as const };
}

function RelanceTable({
  tasks,
  empty,
  outreachMap,
  now,
}: {
  tasks: TaskRow[];
  empty: string;
  outreachMap: Map<string, number>;
  now: Date;
}) {
  if (tasks.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-msk-ink/40">{empty}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-200 text-center text-sm">
        <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
          <tr>
            <th className="px-4 py-3 font-semibold">Entreprise</th>
            <th className="px-4 py-3 font-semibold">Contact</th>
            <th className="px-4 py-3 font-semibold">Statut</th>
            <th className="px-4 py-3 font-semibold">Relances</th>
            <th className="px-4 py-3 font-semibold">À faire</th>
            <th className="px-4 py-3 font-semibold">Échéance</th>
            <th className="px-4 py-3 font-semibold">Suivi par</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-msk-ink/6">
          {tasks.map((t) => {
            const org = t.opportunity?.organization;
            const contact = org?.contacts[0];
            const rawStage = t.opportunity?.stage;
            const uiStage: CrmPipelineStage | null = rawStage
              ? normalizeUiStage(rawStage)
              : null;
            const bucket = classifyRelanceDue(t.dueAt, now);
            const due = formatDue(t.dueAt, bucket);
            const actionLabel =
              t.opportunity?.nextAction?.trim() || t.title || "Relance";
            const contactLabel = contact
              ? formatContactLabel(contact.firstName, contact.lastName)
              : null;
            const jobLabel = formatContactLabel(contact?.jobTitle ?? null, null);
            return (
              <tr
                key={t.id}
                className="align-middle transition hover:bg-msk-chalk/40"
              >
                <td className="px-4 py-3">
                  {t.opportunity ? (
                    <Link
                      prefetch={false}
                      href={`/crm/prospects/${t.opportunity.id}`}
                      className="font-medium text-msk-ink hover:text-msk-blue"
                    >
                      {org?.name ?? "—"}
                    </Link>
                  ) : (
                    <span className="font-medium text-msk-ink">
                      {t.title || "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-msk-ink/75">
                  {contactLabel || jobLabel ? (
                    <>
                      {contactLabel ? (
                        <span className="font-medium text-msk-ink">
                          {contactLabel}
                        </span>
                      ) : null}
                      {jobLabel ? (
                        <p className="text-xs text-msk-ink/50">{jobLabel}</p>
                      ) : null}
                      {contact?.phone?.trim() ? (
                        <p className="text-xs tabular-nums text-msk-ink/45">
                          {contact.phone}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {uiStage ? (
                    <Badge tone={stageTone(uiStage)}>
                      {STAGE_LABELS[uiStage]}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {t.opportunity ? (
                    <RelanceCountBadge
                      count={outreachMap.get(t.opportunity.id) ?? 0}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-msk-ink/80">{actionLabel}</td>
                <td className="px-4 py-3">
                  <p
                    className={cn(
                      "font-medium tabular-nums",
                      due.tone === "coral"
                        ? "text-msk-coral"
                        : due.tone === "blue"
                          ? "text-msk-blue"
                          : "text-msk-ink",
                    )}
                  >
                    {due.label}
                  </p>
                  {due.hint ? (
                    <p
                      className={cn(
                        "text-xs",
                        due.tone === "coral"
                          ? "text-msk-coral/80"
                          : "text-msk-ink/45",
                      )}
                    >
                      {due.hint}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-msk-ink/65">
                  {t.assignee.firstName} {t.assignee.lastName}
                </td>
                <td className="px-4 py-3">
                  <RelanceActions
                    taskId={t.id}
                    opportunityId={t.opportunity?.id ?? null}
                    requireFollowUp
                    orgName={org?.name}
                    title={
                      t.opportunity?.nextAction?.trim() || t.title || "Relance"
                    }
                    dueAt={t.dueAt}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SearchToolbar({
  q,
  clearSearchHref,
  resultCount,
}: {
  q: string;
  clearSearchHref: string;
  resultCount: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Suspense
        fallback={
          <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk sm:max-w-md" />
        }
      >
        <ListSearchForm
          placeholder="Rechercher une relance, un prospect, un client…"
          className="sm:max-w-md"
        />
      </Suspense>
      {q ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-msk-ink/55">
          <span>
            {resultCount === 0
              ? "Aucun résultat"
              : resultCount === 1
                ? "1 résultat"
                : `${resultCount} résultats`}{" "}
            pour «&nbsp;{q}&nbsp;»
          </span>
          <Link
            prefetch={false}
            href={clearSearchHref}
            className="font-medium text-msk-blue hover:underline"
          >
            Effacer
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export async function RelancesResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const raw = await searchParams;
  const sp = normalizeSearchParams(raw);
  const q = normalizeRelanceSearchQuery(sp.q);
  const taskSearchWhere = buildRelanceTaskSearchWhere(q);
  const activitySearchWhere = buildRelanceActivitySearchWhere(q);

  const vueRaw = sp.vue;
  const vue: VueFilter =
    vueRaw === "retard" ||
    vueRaw === "aujourdhui" ||
    vueRaw === "semaine" ||
    vueRaw === "plus-tard"
      ? vueRaw
      : "tous";

  const focusFaites = sp.focus === "faites";
  const period = parseCrmPeriod(sp);
  const occurredBetween = dateRangeFilter(period.from, period.to);

  const vis = crmVisibility(user);
  const teamIds = await commercialTeamUserIds();
  const memberIds = Array.from(new Set([user.id, ...teamIds]));
  const ownerScope = parseCrmOwner(sp, user, memberIds);
  const ownerIds = resolveCrmOwnerIds({
    ownerId: ownerScope.ownerId,
    canFilterOwners: ownerScope.canFilterOwners,
    memberIds,
    userId: user.id,
  });

  /** File ouverte : filtre assignee ; vue « faites » : filtre owner opportunity. */
  const assigneeFilter =
    vis === "global" && !ownerScope.ownerId ? null : ownerIds;

  const focusOwnerUser = ownerScope.ownerId
    ? await prisma.user.findUnique({
        where: { id: ownerScope.ownerId },
        select: { firstName: true, lastName: true, status: true },
      })
    : null;
  const focusOwnerLabel = focusOwnerUser
    ? formatCollaboratorOptionLabel(
        focusOwnerUser.firstName,
        focusOwnerUser.lastName,
        focusOwnerUser.status,
      )
    : null;

  const keepBase = {
    vue: vue !== "tous" ? vue : undefined,
    focus: focusFaites ? "faites" : undefined,
    q: q || undefined,
  };

  const clearOwnerHref = buildCrmScopeHref("/crm/relances", {
    period,
    ownerId: null,
    canFilterOwners: ownerScope.canFilterOwners,
    forcePeriod: focusFaites,
    keep: keepBase,
  });

  const clearSearchHref = buildCrmScopeHref("/crm/relances", {
    period,
    ownerId: ownerScope.ownerId,
    canFilterOwners: ownerScope.canFilterOwners,
    forcePeriod: focusFaites,
    keep: {
      vue: keepBase.vue,
      focus: keepBase.focus,
      q: undefined,
    },
  });

  const scopeHref = (keep?: Record<string, string | undefined>) =>
    buildCrmScopeHref("/crm/relances", {
      period,
      ownerId: ownerScope.ownerId,
      canFilterOwners: ownerScope.canFilterOwners,
      forcePeriod: focusFaites,
      keep: { q: q || undefined, ...keep },
    });

  const pageSize = DEFAULT_PAGE_SIZE;
  const requestedPage = parsePage(sp.page);

  if (focusFaites) {
    const activities = await loadOutreachDone({
      ownerIds: ownerScope.canFilterOwners ? ownerIds : [user.id],
      occurredBetween,
      searchWhere: activitySearchWhere,
    });
    const totalFaites = activities.length;
    const pageFaites = clampPage(requestedPage, totalFaites, pageSize);
    const pageActivities = activities.slice(
      (pageFaites - 1) * pageSize,
      pageFaites * pageSize,
    );
    const listParamsFaites: Record<string, string | undefined> = {
      ...sp,
      focus: "faites",
      ...(q ? { q } : {}),
    };
    delete listParamsFaites.page;
    if (!q) delete listParamsFaites.q;

    return (
      <>
        {focusOwnerLabel ? (
          <ScopeFocusBanner
            label={focusOwnerLabel}
            clearHref={clearOwnerHref}
            clearAriaLabel="Voir toute l’équipe"
          />
        ) : null}

        <div className={gridKpi3}>
          <KpiRadial
            label="Relances faites"
            value={totalFaites}
            tone={totalFaites > 0 ? "coral" : "blue"}
            hint={
              q
                ? `filtrées · ${period.label.toLowerCase()}`
                : period.label.toLowerCase()
            }
          />
          <div className="flex flex-col justify-end gap-3 sm:col-span-1 xl:col-span-2">
            <SearchToolbar
              q={q}
              clearSearchHref={clearSearchHref}
              resultCount={totalFaites}
            />
            <Link
              prefetch={false}
              href={scopeHref({})}
              className="text-sm font-medium text-msk-blue hover:underline"
            >
              Voir la file à faire →
            </Link>
          </div>
        </div>

        <Surface className="overflow-hidden p-0">
          {totalFaites === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-msk-ink/40">
              {q
                ? `Aucune relance journalisée ne correspond à « ${q} » sur ${period.label.toLowerCase()}.`
                : `Aucune relance journalisée sur ${period.label.toLowerCase()}.`}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 text-left text-sm">
                  <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Canal</th>
                      <th className="px-4 py-3 font-semibold">Entreprise</th>
                      <th className="px-4 py-3 font-semibold">Résumé</th>
                      <th className="px-4 py-3 font-semibold">Suivi par</th>
                      <th className="px-4 py-3 font-semibold">Auteur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-msk-ink/6">
                    {pageActivities.map((a) => {
                      const org = a.opportunity?.organization;
                      const owner = a.opportunity?.owner;
                      return (
                        <tr
                          key={a.id}
                          className="align-middle transition hover:bg-msk-chalk/40"
                        >
                          <td className="px-4 py-3 tabular-nums text-msk-ink/70">
                            {a.occurredAt.toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone="muted">
                              {ACTIVITY_LABELS[a.type] ?? a.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {a.opportunity ? (
                              <Link
                                prefetch={false}
                                href={`/crm/prospects/${a.opportunity.id}`}
                                className="font-medium text-msk-ink hover:text-msk-blue"
                              >
                                {org?.name ?? a.opportunity.title}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-msk-ink/65">
                            {a.summary?.trim() || "—"}
                          </td>
                          <td className="px-4 py-3 text-msk-ink/60">
                            {owner
                              ? `${owner.firstName} ${owner.lastName}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-msk-ink/60">
                            {a.actor.firstName} {a.actor.lastName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ListPagination
                pathname="/crm/relances"
                searchParams={listParamsFaites}
                page={pageFaites}
                totalPages={totalPages(totalFaites, pageSize)}
                total={totalFaites}
                pageSize={pageSize}
              />
            </>
          )}
        </Surface>
      </>
    );
  }

  const [tasks, dueForKpis] = await Promise.all([
    loadTasks(assigneeFilter, taskSearchWhere),
    q ? loadOpenDueAts(assigneeFilter) : Promise.resolve(null),
  ]);
  const kpiTasks = dueForKpis ?? tasks;

  const outreachMap = await outreachCountByOpportunityIds(
    tasks
      .map((t) => t.opportunity?.id)
      .filter((id): id is string => Boolean(id)),
  );
  /** KPI journal = période / scope owner — pas filtré par `q` (compteur global). */
  const relancesFaitesPeriod = await prisma.crmActivity.count({
    where: {
      type: { in: OUTREACH_ACTIVITY_TYPES },
      occurredAt: occurredBetween,
      ...(assigneeFilter
        ? { opportunity: { ownerId: { in: assigneeFilter } } }
        : {}),
    },
  });

  const now = new Date();
  const kpiBuckets = partitionRelanceDue(kpiTasks, now);
  const dueSummary = summarizeRelanceDueBuckets(kpiBuckets);

  const listBuckets = partitionRelanceDue(tasks, now);
  const overdue = listBuckets.overdue;
  const today = listBuckets.today;
  const thisWeek = listBuckets.week;
  const later = listBuckets.later;

  const listByVue: Record<VueFilter, TaskRow[]> = {
    tous: tasks,
    retard: overdue,
    aujourdhui: today,
    semaine: thisWeek,
    "plus-tard": later,
  };
  const listTitleByVue: Record<VueFilter, string> = {
    tous: "Toutes les échéances",
    retard: "En retard",
    aujourdhui: "Échéance aujourd’hui",
    semaine: "Échéance sous 7 jours",
    "plus-tard": "Échéance plus lointaine",
  };
  const listToneByVue: Record<
    VueFilter,
    "muted" | "success" | "coral" | "blue"
  > = {
    tous: "muted",
    retard: "coral",
    aujourdhui: "blue",
    semaine: "muted",
    "plus-tard": "muted",
  };
  const emptyByVue: Record<VueFilter, string> = {
    tous: q
      ? `Aucune relance ne correspond à « ${q} ».`
      : "Aucune tâche de relance ouverte.",
    retard: q
      ? `Aucune échéance en retard pour « ${q} ».`
      : "Aucune échéance en retard — bravo.",
    aujourdhui: q
      ? `Aucune échéance aujourd’hui pour « ${q} ».`
      : "Aucune échéance aujourd’hui.",
    semaine: q
      ? `Aucune échéance sous 7 jours pour « ${q} ».`
      : "Aucune échéance dans les 7 prochains jours (hors aujourd’hui).",
    "plus-tard": q
      ? `Aucune échéance plus lointaine pour « ${q} ».`
      : "Aucune échéance plus lointaine.",
  };

  const activeList = listByVue[vue];
  const listTotal = activeList.length;
  const page = clampPage(requestedPage, listTotal, pageSize);
  const pageTasks = activeList.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const pages = totalPages(listTotal, pageSize);

  const listParams: Record<string, string | undefined> = { ...sp };
  delete listParams.page;
  if (vue === "tous") delete listParams.vue;
  else listParams.vue = vue;
  if (q) listParams.q = q;
  else delete listParams.q;

  /** Chips = liste filtrée par `q`. KPI = portefeuille (hors q). */
  const filters: { id: VueFilter; label: string; count: number }[] = [
    { id: "tous", label: "Toutes", count: tasks.length },
    { id: "retard", label: "En retard", count: overdue.length },
    { id: "aujourdhui", label: "Aujourd’hui", count: today.length },
    { id: "semaine", label: "Sous 7 jours", count: thisWeek.length },
    { id: "plus-tard", label: "Plus tard", count: later.length },
  ];

  const prospectsHref = buildPortfolioProspectsHref({
    period,
    ownerId: ownerScope.ownerId,
    canFilterOwners: ownerScope.canFilterOwners,
  });

  return (
    <>
      {focusOwnerLabel ? (
        <ScopeFocusBanner
          label={focusOwnerLabel}
          clearHref={clearOwnerHref}
          clearAriaLabel="Voir toute l’équipe"
        />
      ) : null}

      <div className={gridKpi4}>
        <KpiRadial
          label="En retard"
          value={dueSummary.overdue}
          tone={dueSummary.overdue > 0 ? "coral" : "blue"}
          hint="échéance avant aujourd’hui"
        />
        <KpiRadial
          label="Aujourd’hui"
          value={dueSummary.today}
          hint="échéance ce jour"
        />
        <KpiRadial
          label="Sous 7 jours"
          value={dueSummary.week}
          hint="après aujourd’hui, ≤ 7 j"
        />
        <Link
          prefetch={false}
          href={scopeHref({ focus: "faites" })}
          className="block rounded-xl transition hover:ring-2 hover:ring-msk-blue/20"
        >
          <KpiRadial
            label="Relances faites"
            value={relancesFaitesPeriod}
            hint={`journal · ${period.label.toLowerCase()}`}
          />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <SearchToolbar
          q={q}
          clearSearchHref={clearSearchHref}
          resultCount={tasks.length}
        />
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const active = vue === f.id;
            const href = scopeHref({
              vue: f.id === "tous" ? undefined : f.id,
            });
            return (
              <Link
                key={f.id}
                prefetch={false}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? f.id === "retard" && f.count > 0
                      ? "bg-msk-coral text-white"
                      : "bg-msk-blue text-white"
                    : "bg-white text-msk-ink/55 hover:bg-msk-chalk",
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "tabular-nums",
                    active ? "text-white/80" : "text-msk-ink/35",
                  )}
                >
                  {f.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {!q && tasks.length === 0 ? (
        <Surface className="p-10 text-center">
          <p className="text-sm font-medium text-msk-ink">
            Aucune relance ouverte
          </p>
          <p className="mt-1 text-sm text-msk-ink/45">
            Les relances apparaissent ici dès qu’une date est planifiée sur un
            prospect.
          </p>
          <Link
            prefetch={false}
            href={prospectsHref}
            className="mt-4 inline-flex text-sm font-medium text-msk-blue hover:underline"
          >
            Voir les prospects
          </Link>
        </Surface>
      ) : (
        <Surface className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-msk-ink/6 bg-msk-chalk/40 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-msk-ink">
              {listTitleByVue[vue]}
            </h2>
            <Badge tone={listToneByVue[vue]}>{listTotal}</Badge>
          </div>
          <RelanceTable
            tasks={pageTasks}
            empty={emptyByVue[vue]}
            outreachMap={outreachMap}
            now={now}
          />
          <ListPagination
            pathname="/crm/relances"
            searchParams={listParams}
            page={page}
            totalPages={pages}
            total={listTotal}
            pageSize={pageSize}
          />
        </Surface>
      )}
    </>
  );
}
