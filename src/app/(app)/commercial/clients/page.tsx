import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comClientListScopeWhere, comVisibility } from "@/lib/commercial/scope";
import { parseComClientOwnersCsv } from "@/lib/commercial/client-filters";
import {
  commercialTeamUserIds,
  formatCollaboratorOptionLabel,
  listCommercialRoster,
} from "@/lib/crm/team";
import { USER_STATUS_LABEL, USER_STATUS_TONE } from "@/lib/users/status";
import {
  buildCrmScopeHref,
  canFilterCrmOwners,
  dateRangeFilter,
  normalizeSearchParams,
  parseCrmOwner,
  parseCrmPeriod,
} from "@/lib/crm/scope-period";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ActionLink } from "@/components/ui/action-link";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ClientsToolbar } from "@/components/commercial/clients-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh } from "@/components/ui/sortable-th";
import { Badge } from "@/components/ui/badge";
import { ScopeFocusBanner } from "@/components/crm/scope-focus-banner";
import { ListTableScroll } from "@/components/ui/list-table-scroll";

const CLIENT_SORT_COLUMNS = {
  name: (dir: SortDir) => ({ name: dir }),
  contact: (dir: SortDir) => ({ contactName: dir }),
  phone: (dir: SortDir) => ({ phone: dir }),
  city: (dir: SortDir) => ({ city: dir }),
  owner: (dir: SortDir) => ({ owner: { lastName: dir } }),
  quotes: (dir: SortDir) => ({ quotes: { _count: dir } }),
  invoices: (dir: SortDir) => ({ invoices: { _count: dir } }),
  updatedAt: (dir: SortDir) => ({ updatedAt: dir }),
} satisfies SortColumnMap<
  | "name"
  | "contact"
  | "phone"
  | "city"
  | "owner"
  | "quotes"
  | "invoices"
  | "updatedAt"
>;

export const metadata: Metadata = { title: "Clients" };

export default async function CommercialClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.clients.view_own") &&
    !hasPermission(user, "com.clients.manage")
  ) {
    redirect("/commercial");
  }

  const canCreate = hasPermission(user, "com.clients.manage");
  const readTeam =
    comVisibility(user) === "global" || canFilterCrmOwners(user);
  const roster = readTeam ? await listCommercialRoster({ mode: "filter" }) : [];
  const rosterForModal = roster.map((u) => ({
    id: u.id,
    label: formatCollaboratorOptionLabel(
      u.firstName,
      u.lastName,
      u.status,
    ),
  }));

  return (
    <PageShell>
      <PageHeader
        title="Clients"
        description="Clients signés — Commercial."
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Clients" },
        ]}
        actions={
          canCreate ? (
            <ActionLink href="/commercial/clients/nouveau" icon={UserPlus}>
              Nouveau client
            </ActionLink>
          ) : null
        }
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <Suspense
            fallback={
              <div className="h-10 w-full max-w-md animate-pulse rounded-xl bg-msk-chalk" />
            }
          >
            <ClientsToolbar roster={rosterForModal} readTeam={readTeam} />
          </Suspense>
        </div>

        <Suspense fallback={<ListTableSkeleton rows={8} cols={8} />}>
          <ClientsResults
            searchParams={searchParams}
            canCreate={canCreate}
          />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function ClientsResults({
  searchParams,
  canCreate,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  canCreate: boolean;
}) {
  const user = await requireUser();
  const raw = await searchParams;
  const sp = normalizeSearchParams(raw);
  const q = (sp.q ?? "").trim();
  const requestedPage = parsePage(sp.page);
  const pageSize = DEFAULT_PAGE_SIZE;

  const isGagnesEvent = sp.event === "gagnes";
  const period =
    isGagnesEvent || sp.periode || sp.semaine || sp.mois
      ? parseCrmPeriod(sp)
      : null;
  const occurredBetween = period
    ? dateRangeFilter(period.from, period.to)
    : null;

  /**
   * Allow-list collab : COM global **ou** lead CRM (drill-down « Clients gagnés »
   * depuis le TB avec `?owner=`). Sinon parseCrmOwner rejette l’UUID / COM own
   * + owner collab = liste vide vs KPI TB.
   */
  const readTeam =
    comVisibility(user) === "global" || canFilterCrmOwners(user);
  const teamIds = readTeam ? await commercialTeamUserIds() : [];
  const memberIds = Array.from(new Set([user.id, ...teamIds]));
  const ownerScope = parseCrmOwner(sp, user, memberIds);
  const allowedOwnerSet = new Set(memberIds);
  const ownersCsv = ownerScope.ownerId
    ? { ownerIds: [] as string[], hadInvalidToken: false }
    : parseComClientOwnersCsv(sp, allowedOwnerSet);

  const focusOwnerUser = ownerScope.ownerId
    ? await prisma.user.findUnique({
        where: { id: ownerScope.ownerId },
        select: { firstName: true, lastName: true },
      })
    : null;
  const focusOwnerLabel = focusOwnerUser
    ? `${focusOwnerUser.firstName} ${focusOwnerUser.lastName}`
    : null;

  const baseScope: Prisma.ComClientWhereInput = ownerScope.ownerId
    ? { ownerId: ownerScope.ownerId }
    : comClientListScopeWhere(user, memberIds);

  const ownersScope: Prisma.ComClientWhereInput | null =
    ownerScope.ownerId || ownersCsv.ownerIds.length === 0
      ? null
      : { ownerId: { in: ownersCsv.ownerIds } };

  const gagnesFilter: Prisma.ComClientWhereInput | null =
    isGagnesEvent && occurredBetween
      ? {
          sourceOpportunity: {
            stage: "GAGNE",
            OR: [
              { wonAt: occurredBetween },
              { wonAt: null, updatedAt: occurredBetween },
            ],
          },
        }
      : null;

  const where: Prisma.ComClientWhereInput = {
    AND: [
      baseScope,
      ...(ownersScope ? [ownersScope] : []),
      ...(gagnesFilter ? [gagnesFilter] : []),
      ...(q
        ? [
            {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                {
                  contactName: { contains: q, mode: "insensitive" as const },
                },
                { city: { contains: q, mode: "insensitive" as const } },
                { phone: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
    ],
  };

  const sort = parseListSort(sp, CLIENT_SORT_COLUMNS, {
    key: "updatedAt",
    dir: "desc",
  });

  const total = await prisma.comClient.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const clients = await prisma.comClient.findMany({
    where,
    orderBy: sort.orderBy as Prisma.ComClientOrderByWithRelationInput,
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      _count: { select: { quotes: true, invoices: true } },
      owner: { select: { firstName: true, lastName: true, status: true } },
      sourceOpportunity: { select: { wonAt: true } },
    },
  });

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = { ...sp };
  delete listParams.page;
  listParams.sort = sort.key;
  listParams.dir = sort.dir;

  const clearOwnerHref =
    period != null
      ? buildCrmScopeHref("/commercial/clients", {
          period,
          ownerId: null,
          canFilterOwners: ownerScope.canFilterOwners,
          forcePeriod: isGagnesEvent,
          keep: {
            event: isGagnesEvent ? "gagnes" : undefined,
            q: q || undefined,
            owners: sp.owners?.trim() || undefined,
          },
        })
      : (() => {
          const p = new URLSearchParams();
          if (q) p.set("q", q);
          if (isGagnesEvent) p.set("event", "gagnes");
          if (sp.owners?.trim()) p.set("owners", sp.owners.trim());
          const s = p.toString();
          return s ? `/commercial/clients?${s}` : "/commercial/clients";
        })();

  const clearEventHref =
    period != null
      ? buildCrmScopeHref("/commercial/clients", {
          period,
          ownerId: ownerScope.ownerId,
          canFilterOwners: ownerScope.canFilterOwners,
          keep: {
            q: q || undefined,
            owners: sp.owners?.trim() || undefined,
          },
        })
      : ownerScope.ownerId
        ? (() => {
            const p = new URLSearchParams();
            p.set("owner", ownerScope.ownerId);
            if (q) p.set("q", q);
            if (sp.owners?.trim()) p.set("owners", sp.owners.trim());
            return `/commercial/clients?${p.toString()}`;
          })()
        : (() => {
            const p = new URLSearchParams();
            if (q) p.set("q", q);
            if (sp.owners?.trim()) p.set("owners", sp.owners.trim());
            const s = p.toString();
            return s ? `/commercial/clients?${s}` : "/commercial/clients";
          })();

  return (
    <>
      {focusOwnerLabel || (isGagnesEvent && period) ? (
        <div className="space-y-2 border-b border-msk-ink/6 px-4 py-3">
          {focusOwnerLabel ? (
            <ScopeFocusBanner
              label={focusOwnerLabel}
              periodLabel={
                isGagnesEvent && period ? period.label : undefined
              }
              clearHref={clearOwnerHref}
              clearAriaLabel="Voir toute l’équipe"
            />
          ) : null}
          {isGagnesEvent && period ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">Gagnés · {period.label}</Badge>
              <Link
                prefetch={false}
                href={clearEventHref}
                className="text-xs font-medium text-msk-blue hover:underline"
              >
                Voir tous les clients
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <ListTableScroll>
        <table className="w-full min-w-220 text-left text-sm">
          <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
            <tr>
              <SortableTh
                label="Client"
                column="name"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/clients"
                searchParams={listParams}
              />
              <SortableTh
                label="Contact"
                column="contact"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/clients"
                searchParams={listParams}
              />
              <SortableTh
                label="Tél."
                column="phone"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/clients"
                searchParams={listParams}
              />
              <SortableTh
                label="Ville"
                column="city"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/clients"
                searchParams={listParams}
              />
              <SortableTh
                label="Suivi par"
                column="owner"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/clients"
                searchParams={listParams}
              />
              <SortableTh
                label="Devis"
                column="quotes"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/clients"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Factures"
                column="invoices"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/clients"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Mis à jour"
                column="updatedAt"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/clients"
                searchParams={listParams}
                defaultDir="desc"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-ink/6">
            {clients.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-msk-ink/40"
                >
                  {q ? (
                    <>Aucun client pour « {q} ».</>
                  ) : isGagnesEvent && period ? (
                    <>Aucun client gagné sur {period.label.toLowerCase()}.</>
                  ) : (
                    <>
                      Aucun client pour l’instant.
                      {canCreate ? (
                        <>
                          {" "}
                          <Link
                            prefetch={false}
                            href="/commercial/clients/nouveau"
                            className="font-medium text-msk-blue hover:underline"
                          >
                            Créer le premier
                          </Link>
                        </>
                      ) : null}
                    </>
                  )}
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <ClickableRowLink
                  key={c.id}
                  href={`/commercial/clients/${c.id}`}
                >
                  <td className="px-4 py-3 font-medium text-msk-ink">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/75">
                    {c.contactName ?? "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-msk-ink/75">
                    {c.phone?.trim() ? c.phone : "—"}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/75">
                    {c.city ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-msk-ink/60">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-medium text-msk-ink/75">
                        {c.owner.firstName} {c.owner.lastName}
                      </span>
                      <Badge
                        tone={
                          USER_STATUS_TONE[c.owner.status] ?? "muted"
                        }
                        className="w-fit text-[10px]"
                      >
                        {USER_STATUS_LABEL[c.owner.status] ?? c.owner.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c._count.quotes}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {c._count.invoices}
                  </td>
                  <td className="px-4 py-3 text-xs text-msk-ink/55">
                    {(
                      c.sourceOpportunity?.wonAt ?? c.updatedAt
                    ).toLocaleDateString("fr-FR")}
                  </td>
                </ClickableRowLink>
              ))
            )}
          </tbody>
        </table>
      </ListTableScroll>

      <ListPagination
        pathname="/commercial/clients"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
