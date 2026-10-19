import Link from "next/link";
import { redirect } from "next/navigation";
import type { CrmPipelineStage, CrmSource, Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  canReassignCrmDeal,
  crmProspectListScopeWhere,
} from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  SOURCE_LABELS,
  STAGE_LABELS,
  STAGE_ORDER,
  stagesForFilter,
} from "@/lib/crm/labels";
import { isTestOrgName } from "@/lib/crm/test-data";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { Badge } from "@/components/ui/badge";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { StopPropagationTd } from "@/components/ui/stop-propagation-td";
import { ListPagination } from "@/components/ui/list-pagination";
import { ScopeFocusBanner } from "@/components/crm/scope-focus-banner";
import { OriginChip } from "@/components/crm/origin-chip";
import { RelanceCountBadge } from "@/components/crm/relance-count-badge";
import { AssignProspectForm } from "@/components/crm/assign-prospect-form";
import { opportunityIdsWithMinOutreach, outreachCountByOpportunityIds } from "@/lib/crm/follow-up-count";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import {
  dateRangeFilter,
  hasCrmScopePeriodParams,
  isCrmStockListParams,
  parseCrmPeriod,
  shouldFilterProspectsByCrmPeriod,
} from "@/lib/crm/scope-period";

function stageTone(stage: string): "muted" | "success" | "coral" | "blue" {
  if (stage === "GAGNE") return "success";
  if (stage === "PERDU") return "coral";
  if (stage === "INTERESSE" || stage === "DEVIS_ENVOYE") return "blue";
  return "muted";
}

const PROSPECT_LIST_STAGES = STAGE_ORDER.filter((s) => s !== "GAGNE");

export function buildProspectWhere(
  sp: Record<string, string | undefined>,
  scope: Prisma.CrmOpportunityWhereInput,
  now: Date,
  periodCreatedAt?: { gte: Date; lte: Date } | null,
): Prisma.CrmOpportunityWhereInput {
  const where: Prisma.CrmOpportunityWhereInput = { ...scope };
  const andParts: Prisma.CrmOpportunityWhereInput[] = [
    { comClients: { none: {} } },
  ];

  const stageFilterRaw = (sp.stages
    ? (sp.stages.split(",").filter(Boolean) as CrmPipelineStage[])
    : []
  ).filter((s) => s !== "GAGNE");
  if (stageFilterRaw.length) {
    where.stage = { in: [...new Set(stageFilterRaw.flatMap(stagesForFilter))] };
  } else {
    where.stage = { in: [...PROSPECT_LIST_STAGES, "NEGOCIATION"] };
  }
  if (sp.source) where.source = sp.source as CrmSource;
  if (sp.owner) where.ownerId = sp.owner;

  const isStockView = isCrmStockListParams(sp);

  if (!isStockView && periodCreatedAt) {
    where.createdAt = periodCreatedAt;
  } else if (!isStockView && !hasCrmScopePeriodParams(sp) && sp.on) {
    const start = new Date(sp.on);
    start.setHours(0, 0, 0, 0);
    const end = new Date(sp.on);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  } else if (
    !isStockView &&
    !hasCrmScopePeriodParams(sp) &&
    (sp.from || sp.to)
  ) {
    where.createdAt = {};
    if (sp.from) where.createdAt.gte = new Date(sp.from);
    if (sp.to) {
      const t = new Date(sp.to);
      t.setHours(23, 59, 59, 999);
      where.createdAt.lte = t;
    }
  }

  if (sp.late === "1") {
    where.followUpAt = { lt: now };
    where.stage = {
      in: PROSPECT_LIST_STAGES.filter((s) => s !== "PERDU"),
    };
  }

  if (sp.devisRetard === "1") {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    where.stage = "INTERESSE";
    where.comQuotes = { none: {} };
    andParts.push({
      OR: [
        { interestedAt: { lt: cutoff } },
        { interestedAt: null, updatedAt: { lt: cutoff } },
      ],
    });
  }

  const q = sp.q?.trim();
  if (q) {
    andParts.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { organization: { name: { contains: q, mode: "insensitive" } } },
        {
          organization: {
            contacts: {
              some: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          },
        },
      ],
    });
  }

  if (andParts.length) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      ...andParts,
    ];
  }

  return where;
}

export async function ProspectsResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const sp = await searchParams;
  if (sp.vue === "etapes") {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== "vue") p.set(k, v);
    }
    const qs = p.toString();
    redirect(qs ? `/crm/prospects?${qs}` : "/crm/prospects");
  }

  const teamIds = await commercialTeamUserIds();
  const now = new Date();
  const pageSize = DEFAULT_PAGE_SIZE;
  const requestedPage = parsePage(sp.page);
  const listScope = crmProspectListScopeWhere(user);

  const isStockView = isCrmStockListParams(sp);
  const isNouveauxEvent = sp.event === "nouveaux";
  const applyPeriodFilter = shouldFilterProspectsByCrmPeriod(sp);
  const period =
    applyPeriodFilter || hasCrmScopePeriodParams(sp)
      ? parseCrmPeriod(sp)
      : null;
  const periodCreatedAt =
    applyPeriodFilter && period
      ? dateRangeFilter(period.from, period.to)
      : null;

  let where = buildProspectWhere(sp, listScope, now, periodCreatedAt);

  const relancesMin = Number.parseInt(sp.relancesMin ?? "", 10);
  if (Number.isFinite(relancesMin) && relancesMin > 0) {
    const scopedIds = (
      await prisma.crmOpportunity.findMany({
        where,
        select: { id: true },
        take: 2000,
      })
    ).map((d) => d.id);
    const matching = await opportunityIdsWithMinOutreach(
      scopedIds,
      relancesMin,
    );
    where = {
      ...where,
      id: { in: matching.length > 0 ? matching : ["__none__"] },
    };
  }

  const dealInclude = {
    organization: {
      select: {
        name: true,
        sector: true,
        contacts: { where: { isPrimary: true }, take: 1 },
      },
    },
    owner: { select: { firstName: true, lastName: true } },
    createdBy: { select: { firstName: true, lastName: true } },
  } as const;

  const total = await prisma.crmOpportunity.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const deals = await prisma.crmOpportunity.findMany({
    where,
    include: dealInclude,
    orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });

  const outreachMap = await outreachCountByOpportunityIds(
    deals.map((d) => d.id),
  );

  const teamUsers = await prisma.user.findMany({
    where: {
      id: { in: Array.from(new Set([user.id, ...teamIds])) },
      status: "ACTIVE",
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });
  const owners = teamUsers.map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName}`,
  }));

  const canReassign = canReassignCrmDeal(user);
  const commercials = canReassign ? teamUsers : [];
  const stageFilterRaw = sp.stages
    ? (sp.stages.split(",").filter(Boolean) as CrmPipelineStage[])
    : [];
  const qTrim = sp.q?.trim() ?? "";

  const focusOwnerLabel = sp.owner
    ? (owners.find((o) => o.value === sp.owner)?.label ?? null)
    : null;

  const clearOwnerHref = (() => {
    const p = new URLSearchParams(
      Object.entries(sp).filter(
        (e): e is [string, string] =>
          typeof e[1] === "string" && e[0] !== "owner",
      ),
    );
    const s = p.toString();
    return s ? `/crm/prospects?${s}` : "/crm/prospects";
  })();

  const clearFiltersHref = focusOwnerLabel
    ? `/crm/prospects?owner=${encodeURIComponent(sp.owner!)}`
    : "/crm/prospects";

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = { ...sp };
  delete listParams.vue;
  delete listParams.page;

  const legacyDateFilter =
    !hasCrmScopePeriodParams(sp) &&
    (Boolean(sp.on) || Boolean(sp.from) || Boolean(sp.to));

  const hasActiveFilters =
    stageFilterRaw.length > 0 ||
    sp.late === "1" ||
    sp.devisRetard === "1" ||
    Boolean(qTrim) ||
    Boolean(sp.source) ||
    applyPeriodFilter ||
    legacyDateFilter ||
    (Number.isFinite(relancesMin) && relancesMin > 0);

  return (
    <>
      {focusOwnerLabel ? (
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <ScopeFocusBanner
            label={focusOwnerLabel}
            periodLabel={applyPeriodFilter ? period?.label : undefined}
            clearHref={clearOwnerHref}
            clearAriaLabel="Voir toute l’équipe"
          />
          {applyPeriodFilter && period ? (
            <p className="mt-2 text-xs text-msk-ink/45">
              {isNouveauxEvent ? "Nouveaux" : "Créés"} · {period.label}
              {isStockView ? " · portefeuille" : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-msk-ink/6 px-4 py-2.5">
          {qTrim ? <Badge tone="blue">« {qTrim} »</Badge> : null}
          {[
            ...new Map(
              stageFilterRaw.map((s) => [
                STAGE_LABELS[s] ?? s,
                STAGE_LABELS[s] ?? s,
              ]),
            ).values(),
          ].map((label) => (
            <Badge key={label} tone="blue">
              {label}
            </Badge>
          ))}
          {sp.source ? (
            <Badge tone="blue">
              {SOURCE_LABELS[sp.source as CrmSource] ?? sp.source}
            </Badge>
          ) : null}
          {sp.late === "1" ? (
            <Badge tone="coral">Relances en retard</Badge>
          ) : null}
          {sp.devisRetard === "1" ? (
            <Badge tone="coral">Intéressé sans devis</Badge>
          ) : null}
          {Number.isFinite(relancesMin) && relancesMin > 0 ? (
            <Badge tone="coral">Relancés ≥ {relancesMin}×</Badge>
          ) : null}
          {applyPeriodFilter && period ? (
            <Badge tone="blue">
              {isNouveauxEvent ? "Nouveaux" : "Créés"} · {period.label}
            </Badge>
          ) : null}
          {legacyDateFilter && sp.on ? (
            <Badge tone="blue">Créé le {sp.on}</Badge>
          ) : null}
          {legacyDateFilter && !sp.on && (sp.from || sp.to) ? (
            <Badge tone="blue">
              Créé {sp.from ? `du ${sp.from}` : ""}
              {sp.to ? ` au ${sp.to}` : ""}
            </Badge>
          ) : null}
          <Link
            prefetch={false}
            href={clearFiltersHref}
            className="ml-1 text-xs font-medium text-msk-blue hover:underline"
          >
            Effacer
          </Link>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-280 text-center text-sm">
          <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
            <tr>
              <th className="px-4 py-3 font-semibold">Entreprise</th>
              <th className="px-4 py-3 font-semibold">Contact / poste</th>
              <th className="px-4 py-3 font-semibold">Téléphone</th>
              <th className="px-4 py-3 font-semibold">Origine</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Relances</th>
              <th className="px-4 py-3 font-semibold">Prochaine action</th>
              <th className="px-4 py-3 font-semibold">Relance</th>
              <th className="px-4 py-3 font-semibold">Suivi par</th>
              <th className="px-4 py-3 font-semibold">Créé</th>
              <th className="px-4 py-3 font-semibold">Créé par</th>
              {canReassign ? (
                <th className="px-4 py-3 font-semibold">Affecter</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-ink/6">
            {deals.length === 0 ? (
              <tr>
                <td
                  colSpan={canReassign ? 12 : 11}
                  className="px-4 py-10 text-center text-msk-ink/40"
                >
                  {qTrim
                    ? "Aucun prospect pour cette recherche."
                    : "Aucun prospect."}
                </td>
              </tr>
            ) : (
              deals.map((d) => {
                const c = d.organization.contacts[0];
                const overdue =
                  d.followUpAt != null &&
                  d.followUpAt < now &&
                  d.stage !== "GAGNE" &&
                  d.stage !== "PERDU";
                const uiStage = normalizeUiStage(d.stage);
                return (
                  <ClickableRowLink
                    key={d.id}
                    href={`/crm/prospects/${d.id}`}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex flex-wrap items-center justify-center gap-1.5 font-medium text-msk-ink">
                        {d.organization.name}
                        {isTestOrgName(d.organization.name) ? (
                          <Badge tone="coral">TEST</Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-msk-ink/75">
                      {c ? (
                        <span className="inline-flex flex-col items-center">
                          <span className="font-medium text-msk-ink">
                            {c.firstName} {c.lastName}
                          </span>
                          {c.jobTitle ? (
                            <span className="text-xs font-medium text-msk-ink/55">
                              {c.jobTitle}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-msk-ink/75">
                      {c?.phone?.trim() ? c.phone : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex justify-center">
                        <OriginChip source={d.source} size="compact" />
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex justify-center">
                        <Badge tone={stageTone(uiStage)}>
                          {STAGE_LABELS[uiStage]}
                        </Badge>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex justify-center">
                        <RelanceCountBadge
                          count={outreachMap.get(d.id) ?? 0}
                          compact
                        />
                      </span>
                    </td>
                    <td className="max-w-45 truncate px-4 py-3 text-msk-ink/70">
                      {d.nextAction || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
                        <span>
                          {d.followUpAt
                            ? d.followUpAt.toLocaleDateString("fr-FR")
                            : "—"}
                        </span>
                        {overdue ? <Badge tone="coral">Retard</Badge> : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-msk-ink/70">
                      {d.owner.firstName} {d.owner.lastName}
                    </td>
                    <td className="px-4 py-3 text-xs text-msk-ink/55">
                      {d.createdAt.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-xs text-msk-ink/60">
                      {d.createdBy.firstName} {d.createdBy.lastName}
                    </td>
                    {canReassign ? (
                      <StopPropagationTd className="px-4 py-3">
                        <span className="inline-flex justify-center">
                          <AssignProspectForm
                            commercials={commercials}
                            opportunityId={d.id}
                            currentOwnerId={d.ownerId}
                            prospects={[
                              {
                                id: d.id,
                                label: d.organization.name,
                                ownerId: d.ownerId,
                                ownerLabel: `${d.owner.firstName} ${d.owner.lastName}`,
                              },
                            ]}
                            triggerLabel="Affecter"
                            iconOnly
                          />
                        </span>
                      </StopPropagationTd>
                    ) : null}
                  </ClickableRowLink>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <ListPagination
        pathname="/crm/prospects"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
