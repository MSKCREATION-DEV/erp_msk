import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { CrmPipelineStage, CrmSource, Prisma } from "@prisma/client";
import { FileUp, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import {
  crmProspectListScopeWhere,
  crmVisibility,
  dealOwnerScopeWhere,
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
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { ProspectsFilterButton } from "@/components/crm/prospects-filter-modal";
import { KpiRadial } from "@/components/crm/kpi-radial";
import { ScopeFocusBanner } from "@/components/crm/scope-focus-banner";
import { OriginChip } from "@/components/crm/origin-chip";
import { RelanceCountBadge } from "@/components/crm/relance-count-badge";
import {
  opportunityIdsWithMinOutreach,
  outreachCountByOpportunityIds,
  sumOutreachCounts,
} from "@/lib/crm/follow-up-count";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Prospects" };

function stageTone(stage: string): "muted" | "success" | "coral" | "blue" {
  if (stage === "GAGNE") return "success";
  if (stage === "PERDU") return "coral";
  if (stage === "INTERESSE" || stage === "DEVIS_ENVOYE") return "blue";
  return "muted";
}

/** Statuts listables — jamais Client (GAGNE) : dossier passé côté Clients. */
const PROSPECT_LIST_STAGES = STAGE_ORDER.filter((s) => s !== "GAGNE");

function buildProspectWhere(
  sp: Record<string, string | undefined>,
  scope: Prisma.CrmOpportunityWhereInput,
  now: Date,
): Prisma.CrmOpportunityWhereInput {
  const where: Prisma.CrmOpportunityWhereInput = { ...scope };
  const andParts: Prisma.CrmOpportunityWhereInput[] = [
    /** Jamais les Clients (statut GAGNE **ou** fiche ComClient liée). */
    { comClients: { none: {} } },
  ];

  const stageFilterRaw = (sp.stages
    ? (sp.stages.split(",").filter(Boolean) as CrmPipelineStage[])
    : []
  ).filter((s) => s !== "GAGNE");
  if (stageFilterRaw.length) {
    where.stage = { in: [...new Set(stageFilterRaw.flatMap(stagesForFilter))] };
  } else {
    /** Listing = prospects uniquement (hors statut Client). */
    where.stage = { in: [...PROSPECT_LIST_STAGES, "NEGOCIATION"] };
  }
  if (sp.source) where.source = sp.source as CrmSource;
  if (sp.owner) where.ownerId = sp.owner;

  /** Date précise `?on=` ou plage `?from=` / `?to=`. */
  if (sp.on) {
    const start = new Date(sp.on);
    start.setHours(0, 0, 0, 0);
    const end = new Date(sp.on);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  } else if (sp.from || sp.to) {
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

export default async function CrmProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const sp = await searchParams;
  // Ancienne vue ?vue=etapes → liste
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
  /** LOT-E : liste partagée (tous les commerciaux voient tous les dossiers). */
  const listScope = crmProspectListScopeWhere(user);
  let where = buildProspectWhere(sp, listScope, now);

  /** LOT-G : filtre historique relances (ex. ?relancesMin=3). */
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

  const vis = crmVisibility(user);
  /** KPIs perso en tête : toujours « mes » dossiers. */
  const ownScope = dealOwnerScopeWhere(user, teamIds);
  const showOwnKpis = vis === "own";
  const openOwn: Prisma.CrmOpportunityWhereInput = {
    ...ownScope,
    stage: { notIn: ["GAGNE", "PERDU"] },
    comClients: { none: {} },
  };

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

  // Séquentiel (pool Prisma connection_limit=1)
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

  let ownKpis: {
    prospects: number;
    interesses: number;
    retards: number;
    relancesFaites: number;
  } | null = null;
  if (showOwnKpis) {
    const ownOpenIds = (
      await prisma.crmOpportunity.findMany({
        where: openOwn,
        select: { id: true },
        take: 2000,
      })
    ).map((d) => d.id);
    const ownOutreachMap = await outreachCountByOpportunityIds(ownOpenIds);
    const [prospects, interesses, retards] = await runSeries([
      () => prisma.crmOpportunity.count({ where: openOwn }),
      () =>
        prisma.crmOpportunity.count({
          where: { ...openOwn, stage: "INTERESSE" },
        }),
      () =>
        prisma.crmOpportunity.count({
          where: { ...openOwn, followUpAt: { lt: now } },
        }),
    ]);
    ownKpis = {
      prospects,
      interesses,
      retards,
      relancesFaites: sumOutreachCounts(ownOutreachMap),
    };
  }

  /** Filtre « Suivi par » disponible pour tous (lecture partagée LOT-E). */
  const owners = (
    await prisma.user.findMany({
      where: {
        id: { in: Array.from(new Set([user.id, ...teamIds])) },
        status: "ACTIVE",
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    })
  ).map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName}`,
  }));

  const canCreate = hasPermission(user, "crm.prospect.create");
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

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = { ...sp };
  delete listParams.vue;
  delete listParams.page;

  const hasActiveFilters =
    stageFilterRaw.length > 0 ||
    sp.late === "1" ||
    sp.devisRetard === "1" ||
    Boolean(qTrim) ||
    Boolean(sp.source) ||
    Boolean(sp.owner) ||
    Boolean(sp.from) ||
    Boolean(sp.to) ||
    Boolean(sp.on) ||
    (Number.isFinite(relancesMin) && relancesMin > 0);

  return (
    <PageShell>
      <PageHeader
        title="Prospects"
        description={
          focusOwnerLabel ? `Prospects de ${focusOwnerLabel}` : undefined
        }
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[{ label: "Commercial", href: "/commercial" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex h-9 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-msk-ink/10 bg-msk-chalk/80 px-3 text-sm font-medium text-msk-ink/35",
              )}
              title="Import Excel — bientôt disponible"
              aria-disabled
            >
              <FileUp className="h-4 w-4 shrink-0" aria-hidden />
              Importer
            </span>
            {canCreate ? (
              <ActionLink href="/crm/prospects/nouveau" icon={UserPlus}>
                Nouveau prospect
              </ActionLink>
            ) : null}
          </div>
        }
      />

      {focusOwnerLabel ? (
        <ScopeFocusBanner
          label={focusOwnerLabel}
          clearHref={clearOwnerHref}
          clearLabel="Toute l’équipe"
        />
      ) : null}

      {ownKpis ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiRadial
            label="Prospects"
            value={ownKpis.prospects}
            hint="dossiers suivis"
          />
          <KpiRadial
            label="Intéressés"
            value={ownKpis.interesses}
            hint="à convertir"
          />
          <KpiRadial
            label="Retards"
            value={ownKpis.retards}
            tone={ownKpis.retards > 0 ? "coral" : "blue"}
            hint="relances dues"
          />
          <KpiRadial
            label="Relances faites"
            value={ownKpis.relancesFaites}
            hint="actions de suivi journalisées"
          />
        </div>
      ) : null}

      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-msk-ink/[0.06] px-4 py-3">
          <Suspense
            fallback={
              <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
            }
          >
            <ListSearchForm
              placeholder="Rechercher entreprise, contact, téléphone…"
              className="sm:max-w-md"
            />
          </Suspense>
          <Suspense fallback={null}>
            <ProspectsFilterButton owners={owners} />
          </Suspense>
          {hasActiveFilters ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:justify-end">
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
                <Badge tone="coral">
                  Relancés ≥ {relancesMin}×
                </Badge>
              ) : null}
              {sp.on ? (
                <Badge tone="blue">Créé le {sp.on}</Badge>
              ) : null}
              {!sp.on && (sp.from || sp.to) ? (
                <Badge tone="blue">
                  Créé {sp.from ? `du ${sp.from}` : ""}
                  {sp.to ? ` au ${sp.to}` : ""}
                </Badge>
              ) : null}
              <Link
                prefetch={false}
                href="/crm/prospects"
                className="ml-1 text-xs font-medium text-msk-blue hover:underline"
              >
                Effacer
              </Link>
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-280 text-center text-sm">
            <thead className="border-b border-msk-ink/[0.08] bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-ink/[0.06]">
              {deals.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
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
                  const uiStage =
                    normalizeUiStage(d.stage);
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
      </Surface>
    </PageShell>
  );
}
