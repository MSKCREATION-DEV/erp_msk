import type { Metadata } from "next";
import { Suspense } from "react";
import { FilePlus2 } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import {
  SV_LATE_STATUS_LABEL,
  SV_LATE_STATUS_TONE,
} from "@/lib/suivi/labels";
import { formatSvDateFr } from "@/lib/suivi/dashboard-stats";
import { employeeDisplayName, formatSvTimeFr } from "@/lib/suivi/hr";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { firstParam } from "@/lib/list/search-params";
import {
  parseListSort,
  type SortColumnMap,
  type SortDir,
  listKeyFromSearchParams,
} from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { SvLatesToolbar } from "@/components/suivi/lates-toolbar";
import { SvLateListActions } from "@/components/suivi/late-list-actions";

const SORT_COLUMNS = {
  collab: (dir: SortDir) => ({ employee: { lastName: dir } }),
  date: (dir: SortDir) => ({ lateDate: dir }),
  arrivee: (dir: SortDir) => ({ arrivedAt: dir }),
  minutes: (dir: SortDir) => ({ minutesLate: dir }),
  statut: (dir: SortDir) => ({ status: dir }),
} satisfies SortColumnMap<
  "collab" | "date" | "arrivee" | "minutes" | "statut"
>;

export const metadata: Metadata = { title: "Retards · Suivi" };

function todayUtcDate(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export default async function SuiviRetardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.hr.view");
  const canManage =
    hasPermission(user, "sv.hr.manage") || user.isSuperAdmin;

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Retards"
        description="Arrivées tardives — date, heure prévue et heure d’arrivée."
        backHref="/suivi"
        actions={
          canManage ? (
            <ActionLink href="/suivi/retards/nouveau" icon={FilePlus2}>
              Nouveau retard
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
            <SvLatesToolbar />
          </Suspense>
        </div>
        <Suspense
          key={resultsKey}
          fallback={<ListTableSkeleton rows={8} cols={6} />}
        >
          <LatesResults
            searchParams={searchParams}
            canManage={canManage}
          />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function LatesResults({
  searchParams,
  canManage,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  canManage: boolean;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const todayOnly = firstParam(raw.aujourdhui) === "1";
  const weekOnly = firstParam(raw.semaine) === "1";
  const showCancelled = firstParam(raw.annule) === "1";
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    aujourdhui: todayOnly ? "1" : undefined,
    semaine: weekOnly && !todayOnly ? "1" : undefined,
    annule: showCancelled ? "1" : undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, SORT_COLUMNS, {
    key: "date",
    dir: "desc",
  });

  const today = todayUtcDate();
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);

  const where: Prisma.SvLateWhereInput = {
    AND: [
      showCancelled
        ? { status: "ANNULE" as const }
        : { status: "ENREGISTRE" as const },
      ...(todayOnly ? [{ lateDate: today }] : []),
      ...(weekOnly && !todayOnly
        ? [{ lateDate: { gte: weekAgo, lte: today } }]
        : []),
      ...(q
        ? [
            {
              OR: [
                {
                  employee: {
                    OR: [
                      { firstName: { contains: q, mode: "insensitive" as const } },
                      { lastName: { contains: q, mode: "insensitive" as const } },
                    ],
                  },
                },
                { note: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
    ],
  };

  const count = await prisma.svLate.count({ where });
  const pages = totalPages(count, pageSize);
  const page = clampPage(requestedPage, count, pageSize);
  const items = await prisma.svLate.findMany({
    where,
    orderBy: sort.orderBy as Prisma.SvLateOrderByWithRelationInput[],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      employee: {
        select: { firstName: true, lastName: true, jobTitle: true },
      },
    },
  });

  const from = count === 0 ? 0 : pageSkip(page, pageSize) + 1;
  const to = Math.min(page * pageSize, count);
  const listParams: Record<string, string | undefined> = {
    ...sp,
    sort: sort.key,
    dir: sort.dir,
  };

  if (items.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-msk-ink/55" role="status">
        Aucun retard trouvé.
      </p>
    );
  }

  return (
    <>
      <ListTableScroll>
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-msk-ink/6 bg-msk-chalk/50 text-xs uppercase tracking-caps text-msk-ink/45">
            <tr>
              <SortableTh
                label="Collaborateur"
                column="collab"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/retards"
                searchParams={listParams}
              />
              <SortableTh
                label="Date"
                column="date"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/retards"
                searchParams={listParams}
                defaultDir="desc"
              />
              <PlainTh>Prévu</PlainTh>
              <SortableTh
                label="Arrivée"
                column="arrivee"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/retards"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Retard"
                column="minutes"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/retards"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Statut"
                column="statut"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/retards"
                searchParams={listParams}
              />
              <PlainTh>
                <span className="sr-only">Actions</span>
              </PlainTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-ink/6">
            {items.map((row) => {
              const cancelled = row.status === "ANNULE";
              return (
                <ClickableRowLink
                  key={row.id}
                  href={`/suivi/retards/${row.id}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-msk-ink">
                      {employeeDisplayName(row.employee)}
                    </p>
                    {row.employee.jobTitle ? (
                      <p className="text-xs text-msk-ink/45">
                        {row.employee.jobTitle}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatSvDateFr(row.lateDate)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatSvTimeFr(row.expectedAt)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatSvTimeFr(row.arrivedAt)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium text-msk-coral">
                    {row.minutesLate != null ? `${row.minutesLate} min` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={SV_LATE_STATUS_TONE[row.status]}>
                      {SV_LATE_STATUS_LABEL[row.status]}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <SvLateListActions
                      lateId={row.id}
                      canManage={canManage}
                      cancelled={cancelled}
                    />
                  </td>
                </ClickableRowLink>
              );
            })}
          </tbody>
        </table>
      </ListTableScroll>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-msk-ink/6 px-4 py-3">
        <p className="text-xs text-msk-ink/45">
          {from}–{to} sur {count}
        </p>
        <ListPagination
          pathname="/suivi/retards"
          searchParams={listParams}
          page={page}
          totalPages={pages}
          total={count}
          pageSize={pageSize}
        />
      </div>
    </>
  );
}
