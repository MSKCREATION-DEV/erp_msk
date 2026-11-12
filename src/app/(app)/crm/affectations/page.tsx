import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { canReassignCrmDeal } from "@/lib/crm/scope";
import { listCommercialRoster } from "@/lib/crm/team";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/crm/labels";
import { normalizeUiStage } from "@/lib/crm/guide-rules";
import { firstSearchParam } from "@/lib/crm/scope-period";
import { firstParam } from "@/lib/list/search-params";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import {
  appendSortParams,
  listKeyFromSearchParams,
  parseListSort,
  type SortColumnMap,
  type SortDir,
} from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { AssignmentResolveActions } from "@/components/crm/assignment-resolve-actions";
import { AssignProspectForm } from "@/components/crm/assign-prospect-form";
import { AffectationsLive } from "@/components/crm/affectations-live";
import { ListTableScroll } from "@/components/ui/list-table-scroll";

const PENDING_SORT = {
  prospect: (dir: SortDir) => ({
    opportunity: { organization: { name: dir } },
  }),
  requester: (dir: SortDir) => ({ requester: { lastName: dir } }),
  owner: (dir: SortDir) => ({
    opportunity: { owner: { lastName: dir } },
  }),
  createdAt: (dir: SortDir) => ({ createdAt: dir }),
  stage: (dir: SortDir) => ({ opportunity: { stage: dir } }),
} satisfies SortColumnMap<
  "prospect" | "requester" | "owner" | "createdAt" | "stage"
>;

const RECENT_SORT = {
  prospect: (dir: SortDir) => ({
    opportunity: { organization: { name: dir } },
  }),
  requester: (dir: SortDir) => ({ requester: { lastName: dir } }),
  resolver: (dir: SortDir) => ({ resolvedBy: { lastName: dir } }),
  createdAt: (dir: SortDir) => ({ createdAt: dir }),
  resolvedAt: (dir: SortDir) => ({ resolvedAt: dir }),
  status: (dir: SortDir) => ({ status: dir }),
} satisfies SortColumnMap<
  "prospect" | "requester" | "resolver" | "createdAt" | "resolvedAt" | "status"
>;

export const metadata: Metadata = { title: "Affectations" };

const OPEN_STAGES = STAGE_ORDER.filter((s) => s !== "GAGNE");

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};

function assignmentSearchWhere(
  q: string,
): Prisma.CrmAssignmentRequestWhereInput | undefined {
  if (!q) return undefined;
  return {
    OR: [
      {
        opportunity: {
          organization: { name: { contains: q, mode: "insensitive" } },
        },
      },
      {
        opportunity: {
          title: { contains: q, mode: "insensitive" },
        },
      },
      { requester: { firstName: { contains: q, mode: "insensitive" } } },
      { requester: { lastName: { contains: q, mode: "insensitive" } } },
      {
        opportunity: {
          owner: { firstName: { contains: q, mode: "insensitive" } },
        },
      },
      {
        opportunity: {
          owner: { lastName: { contains: q, mode: "insensitive" } },
        },
      },
      { resolvedBy: { firstName: { contains: q, mode: "insensitive" } } },
      { resolvedBy: { lastName: { contains: q, mode: "insensitive" } } },
      { message: { contains: q, mode: "insensitive" } },
    ],
  };
}

export default async function CrmAffectationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");
  if (!canReassignCrmDeal(user)) redirect("/crm/prospects");

  const rawSp = await searchParams;
  const pendingKey = listKeyFromSearchParams(rawSp, [
    "q",
    "sort",
    "dir",
    "page",
  ]);
  const historyKey = listKeyFromSearchParams(rawSp, [
    "q",
    "statut",
    "hsort",
    "hdir",
    "hpage",
  ]);

  const [commercials, assignableDeals] = await runSeries([
    async () => {
      const rows = await listCommercialRoster({
        mode: "assign",
        extraIds: [user.id],
      });
      return rows.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      }));
    },
    () =>
      prisma.crmOpportunity.findMany({
        where: {
          stage: { in: [...OPEN_STAGES, "NEGOCIATION"] },
          comClients: { none: {} },
        },
        select: {
          id: true,
          ownerId: true,
          organization: { select: { name: true } },
          owner: { select: { firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
  ]);

  const prospectOpts = assignableDeals.map((d) => ({
    id: d.id,
    label: d.organization.name,
    ownerId: d.ownerId,
    ownerLabel: `${d.owner.firstName} ${d.owner.lastName}`,
  }));

  return (
    <PageShell>
      <AffectationsLive userId={user.id} />
      <PageHeader
        title="Affectations"
        description="Demandes de reprise de suivi et historique des décisions."
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Affectations" },
        ]}
        actions={
          <AssignProspectForm
            commercials={commercials}
            prospects={prospectOpts}
            triggerLabel="Affecter un prospect"
            triggerVariant="primary"
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Rechercher prospect, demandeur, validateur…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <Suspense
        key={pendingKey}
        fallback={<ListTableSkeleton rows={5} cols={6} />}
      >
        <PendingAffectationsResults
          searchParams={searchParams}
          commercials={commercials}
        />
      </Suspense>

      <Suspense
        key={historyKey}
        fallback={<ListTableSkeleton rows={6} cols={6} />}
      >
        <HistoryAffectationsResults searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

function flattenSp(
  raw: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const sp: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    sp[k] = Array.isArray(v) ? v[0] : v;
  }
  return sp;
}

/** Préserve les params de l’autre tableau dans les hrefs SortableTh. */
function crossTableListParams(
  sp: Record<string, string | undefined>,
  pending: { key: string; dir: string; page?: number },
  recent: { key: string; dir: string; page?: number },
  q: string,
): Record<string, string | undefined> {
  return {
    q: q || undefined,
    statut: sp.statut,
    sort: pending.key,
    dir: pending.dir,
    hsort: recent.key,
    hdir: recent.dir,
    page: pending.page && pending.page > 1 ? String(pending.page) : undefined,
    hpage: recent.page && recent.page > 1 ? String(recent.page) : undefined,
  };
}

async function PendingAffectationsResults({
  searchParams,
  commercials,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  commercials: { id: string; firstName: string; lastName: string }[];
}) {
  const spRaw = await searchParams;
  const sp = flattenSp(spRaw);
  const q = (firstSearchParam(spRaw.q) ?? "").trim();
  const pageSize = DEFAULT_PAGE_SIZE;
  const searchWhere = assignmentSearchWhere(q);

  const sort = parseListSort(sp, PENDING_SORT, {
    key: "createdAt",
    dir: "asc",
  });
  const recentSort = parseListSort(
    sp,
    RECENT_SORT,
    { key: "resolvedAt", dir: "desc" },
    { sortKey: "hsort", dirKey: "hdir" },
  );

  const pendingWhere: Prisma.CrmAssignmentRequestWhereInput = {
    status: "PENDING",
    ...(searchWhere ?? {}),
  };

  const pendingTotal = await prisma.crmAssignmentRequest.count({
    where: pendingWhere,
  });
  const pendingPage = clampPage(
    parsePage(firstParam(spRaw.page)),
    pendingTotal,
    pageSize,
  );
  const pending = await prisma.crmAssignmentRequest.findMany({
    where: pendingWhere,
    orderBy:
      sort.orderBy as Prisma.CrmAssignmentRequestOrderByWithRelationInput[],
    include: {
      requester: {
        select: { firstName: true, lastName: true, email: true },
      },
      opportunity: {
        select: {
          id: true,
          stage: true,
          title: true,
          ownerId: true,
          organization: { select: { name: true } },
          owner: { select: { firstName: true, lastName: true } },
        },
      },
    },
    skip: pageSkip(pendingPage, pageSize),
    take: pageSize,
  });

  const listParams = crossTableListParams(
    sp,
    { key: sort.key, dir: sort.dir, page: pendingPage },
    {
      key: recentSort.key,
      dir: recentSort.dir,
      page: parsePage(firstParam(spRaw.hpage)),
    },
    q,
  );

  return (
    <Surface className="overflow-hidden p-0">
      <div className="border-b border-msk-ink/6 bg-msk-chalk/40 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-msk-ink">
          Demandes en attente
          <Badge tone={pendingTotal > 0 ? "coral" : "muted"} className="ml-2">
            {pendingTotal}
          </Badge>
        </h2>
      </div>
      {pending.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-msk-ink/40">
          {q
            ? `Aucune demande en attente pour « ${q} ».`
            : "Aucune demande en attente."}
        </p>
      ) : (
        <>
          <ListTableScroll>
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
                <tr>
                  <SortableTh
                    label="Prospect"
                    column="prospect"
                    sort={sort.key}
                    dir={sort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                  />
                  <SortableTh
                    label="Demandeur"
                    column="requester"
                    sort={sort.key}
                    dir={sort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                  />
                  <SortableTh
                    label="Suivi actuel"
                    column="owner"
                    sort={sort.key}
                    dir={sort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                  />
                  <SortableTh
                    label="Créée le"
                    column="createdAt"
                    sort={sort.key}
                    dir={sort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                    defaultDir="asc"
                  />
                  <SortableTh
                    label="Statut CRM"
                    column="stage"
                    sort={sort.key}
                    dir={sort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                  />
                  <PlainTh>Actions</PlainTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {pending.map((r) => {
                  const uiStage = normalizeUiStage(r.opportunity.stage);
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3">
                        <Link
                          prefetch={false}
                          href={`/crm/prospects/${r.opportunity.id}`}
                          className="font-semibold text-msk-ink hover:text-msk-blue"
                        >
                          {r.opportunity.organization.name}
                        </Link>
                        {r.message ? (
                          <p className="mt-1 text-xs text-msk-ink/55">
                            {r.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-msk-ink/70">
                        {r.requester.firstName} {r.requester.lastName}
                      </td>
                      <td className="px-4 py-3 text-msk-ink/70">
                        {r.opportunity.owner.firstName}{" "}
                        {r.opportunity.owner.lastName}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-msk-ink/55">
                        {r.createdAt.toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="muted">{STAGE_LABELS[uiStage]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-2">
                          <AssignmentResolveActions
                            requestId={r.id}
                            prospectLabel={r.opportunity.organization.name}
                          />
                          <AssignProspectForm
                            commercials={commercials}
                            opportunityId={r.opportunity.id}
                            currentOwnerId={r.opportunity.ownerId}
                            prospects={[
                              {
                                id: r.opportunity.id,
                                label: r.opportunity.organization.name,
                                ownerId: r.opportunity.ownerId,
                                ownerLabel: `${r.opportunity.owner.firstName} ${r.opportunity.owner.lastName}`,
                              },
                            ]}
                            triggerLabel="Affecter à un autre"
                            triggerSize="sm"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ListTableScroll>
          <ListPagination
            pathname="/crm/affectations"
            searchParams={listParams}
            page={pendingPage}
            totalPages={totalPages(pendingTotal, pageSize)}
            total={pendingTotal}
            pageSize={pageSize}
          />
        </>
      )}
    </Surface>
  );
}

async function HistoryAffectationsResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spRaw = await searchParams;
  const sp = flattenSp(spRaw);
  const q = (firstSearchParam(spRaw.q) ?? "").trim();
  const statusFilter = firstSearchParam(spRaw.statut)?.toUpperCase();
  const pageSize = DEFAULT_PAGE_SIZE;
  const searchWhere = assignmentSearchWhere(q);

  const sort = parseListSort(sp, PENDING_SORT, {
    key: "createdAt",
    dir: "asc",
  });
  const recentSort = parseListSort(
    sp,
    RECENT_SORT,
    { key: "resolvedAt", dir: "desc" },
    { sortKey: "hsort", dirKey: "hdir" },
  );

  const recentStatus =
    statusFilter === "APPROVED" ||
    statusFilter === "REJECTED" ||
    statusFilter === "CANCELLED"
      ? [statusFilter]
      : (["APPROVED", "REJECTED", "CANCELLED"] as const);
  const recentWhere: Prisma.CrmAssignmentRequestWhereInput = {
    status: { in: [...recentStatus] },
    ...(searchWhere ?? {}),
  };

  const recentTotal = await prisma.crmAssignmentRequest.count({
    where: recentWhere,
  });
  const recentPage = clampPage(
    parsePage(firstParam(spRaw.hpage)),
    recentTotal,
    pageSize,
  );
  const recent = await prisma.crmAssignmentRequest.findMany({
    where: recentWhere,
    orderBy:
      recentSort.orderBy as Prisma.CrmAssignmentRequestOrderByWithRelationInput[],
    skip: pageSkip(recentPage, pageSize),
    take: pageSize,
    include: {
      requester: { select: { firstName: true, lastName: true } },
      resolvedBy: { select: { firstName: true, lastName: true } },
      opportunity: {
        select: {
          id: true,
          organization: { select: { name: true } },
          owner: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const listParams = crossTableListParams(
    sp,
    {
      key: sort.key,
      dir: sort.dir,
      page: parsePage(firstParam(spRaw.page)),
    },
    { key: recentSort.key, dir: recentSort.dir, page: recentPage },
    q,
  );

  const statutLinks = [
    { id: "", label: "Toutes" },
    { id: "APPROVED", label: "Approuvées" },
    { id: "REJECTED", label: "Refusées" },
    { id: "CANCELLED", label: "Annulées" },
  ] as const;

  return (
    <Surface className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-msk-ink/6 bg-msk-chalk/40 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-msk-ink">
          Historique
          <Badge tone="muted" className="ml-2">
            {recentTotal}
          </Badge>
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {statutLinks.map((s) => {
            const active = (statusFilter ?? "") === s.id;
            const params = new URLSearchParams();
            if (s.id) params.set("statut", s.id);
            if (q) params.set("q", q);
            appendSortParams(params, listParams);
            appendSortParams(params, listParams, {
              sortKey: "hsort",
              dirKey: "hdir",
            });
            const qs = params.toString();
            const href = qs ? `/crm/affectations?${qs}` : "/crm/affectations";
            return (
              <Link
                key={s.id || "all"}
                prefetch={false}
                href={href}
                className={
                  active
                    ? "rounded-lg bg-msk-blue px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-msk-ink/55 hover:bg-msk-chalk"
                }
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>
      {recent.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-msk-ink/40">
          {q
            ? `Aucune affectation pour « ${q} » dans cet historique.`
            : "Aucune affectation dans cet historique."}
        </p>
      ) : (
        <>
          <ListTableScroll>
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
                <tr>
                  <SortableTh
                    label="Prospect"
                    column="prospect"
                    sort={recentSort.key}
                    dir={recentSort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                    sortParam="hsort"
                    dirParam="hdir"
                    pageParam="hpage"
                  />
                  <SortableTh
                    label="Demandeur"
                    column="requester"
                    sort={recentSort.key}
                    dir={recentSort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                    sortParam="hsort"
                    dirParam="hdir"
                    pageParam="hpage"
                  />
                  <SortableTh
                    label="Décidé par"
                    column="resolver"
                    sort={recentSort.key}
                    dir={recentSort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                    sortParam="hsort"
                    dirParam="hdir"
                    pageParam="hpage"
                  />
                  <SortableTh
                    label="Créée"
                    column="createdAt"
                    sort={recentSort.key}
                    dir={recentSort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                    sortParam="hsort"
                    dirParam="hdir"
                    pageParam="hpage"
                    defaultDir="desc"
                  />
                  <SortableTh
                    label="Décidée"
                    column="resolvedAt"
                    sort={recentSort.key}
                    dir={recentSort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                    sortParam="hsort"
                    dirParam="hdir"
                    pageParam="hpage"
                    defaultDir="desc"
                  />
                  <SortableTh
                    label="Statut"
                    column="status"
                    sort={recentSort.key}
                    dir={recentSort.dir}
                    pathname="/crm/affectations"
                    searchParams={listParams}
                    sortParam="hsort"
                    dirParam="hdir"
                    pageParam="hpage"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <Link
                        prefetch={false}
                        href={`/crm/prospects/${r.opportunity.id}`}
                        className="font-medium text-msk-ink hover:text-msk-blue"
                      >
                        {r.opportunity.organization.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-msk-ink/65">
                      {r.requester.firstName} {r.requester.lastName}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/65">
                      {r.resolvedBy
                        ? `${r.resolvedBy.firstName} ${r.resolvedBy.lastName}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-msk-ink/50">
                      {r.createdAt.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-msk-ink/50">
                      {r.resolvedAt
                        ? r.resolvedAt.toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          r.status === "APPROVED"
                            ? "success"
                            : r.status === "REJECTED"
                              ? "coral"
                              : "muted"
                        }
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ListTableScroll>
          <ListPagination
            pathname="/crm/affectations"
            searchParams={listParams}
            page={recentPage}
            totalPages={totalPages(recentTotal, pageSize)}
            total={recentTotal}
            pageSize={pageSize}
            pageParam="hpage"
          />
        </>
      )}
    </Surface>
  );
}
