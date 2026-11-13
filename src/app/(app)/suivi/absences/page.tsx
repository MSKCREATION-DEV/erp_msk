import type { Metadata } from "next";
import { Suspense } from "react";
import { FilePlus2 } from "lucide-react";
import type { Prisma, SvAbsenceReason, SvAbsenceStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import {
  SV_ABSENCE_REASON_LABEL,
  SV_ABSENCE_STATUS_LABEL,
  SV_ABSENCE_STATUS_TONE,
} from "@/lib/suivi/labels";
import { formatSvDateFr } from "@/lib/suivi/dashboard-stats";
import { absenceDaySpan, employeeDisplayName } from "@/lib/suivi/hr";
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
import { SvAbsencesToolbar } from "@/components/suivi/absences-toolbar";

const SORT_COLUMNS = {
  collab: (dir: SortDir) => ({
    employee: { lastName: dir },
  }),
  motif: (dir: SortDir) => ({ reason: dir }),
  statut: (dir: SortDir) => ({ status: dir }),
  debut: (dir: SortDir) => ({ startDate: dir }),
  fin: (dir: SortDir) => ({ endDate: dir }),
  createdAt: (dir: SortDir) => ({ createdAt: dir }),
} satisfies SortColumnMap<
  "collab" | "motif" | "statut" | "debut" | "fin" | "createdAt"
>;

const REASON_SET = new Set<string>([
  "MALADIE",
  "PERSONNEL",
  "AUTORISEE",
  "FORMATION",
  "AUTRE",
]);
const STATUS_SET = new Set<string>([
  "ENREGISTREE",
  "JUSTIFIEE",
  "NON_JUSTIFIEE",
  "ANNULEE",
]);

export const metadata: Metadata = { title: "Absences · Suivi" };

function todayUtcDate(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export default async function SuiviAbsencesPage({
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
        title="Absences"
        description="Absences collaborateurs — justificatif optionnel, trace congés sans écrire en RH."
        backHref="/suivi"
        actions={
          canManage ? (
            <ActionLink href="/suivi/absences/nouveau" icon={FilePlus2}>
              Nouvelle absence
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
            <SvAbsencesToolbar />
          </Suspense>
        </div>
        <Suspense
          key={resultsKey}
          fallback={<ListTableSkeleton rows={8} cols={6} />}
        >
          <AbsencesResults searchParams={searchParams} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function AbsencesResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const motifRaw = firstParam(raw.motif) ?? "";
  const reason = REASON_SET.has(motifRaw)
    ? (motifRaw as SvAbsenceReason)
    : null;
  const statutRaw = firstParam(raw.statut) ?? "";
  const status = STATUS_SET.has(statutRaw)
    ? (statutRaw as SvAbsenceStatus)
    : null;
  const todayOnly = firstParam(raw.aujourdhui) === "1";
  const deductOnly = firstParam(raw.conges) === "1";
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    motif: reason ?? undefined,
    statut: status ?? undefined,
    aujourdhui: todayOnly ? "1" : undefined,
    conges: deductOnly ? "1" : undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, SORT_COLUMNS, {
    key: "debut",
    dir: "desc",
  });

  const today = todayUtcDate();
  const where: Prisma.SvAbsenceWhereInput = {
    AND: [
      ...(status ? [{ status }] : [{ status: { not: "ANNULEE" as const } }]),
      ...(reason ? [{ reason }] : []),
      ...(deductOnly ? [{ deductLeave: true }] : []),
      ...(todayOnly
        ? [{ startDate: { lte: today }, endDate: { gte: today } }]
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
                { reasonNote: { contains: q, mode: "insensitive" as const } },
                {
                  deductLeaveNote: {
                    contains: q,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const count = await prisma.svAbsence.count({ where });
  const pages = totalPages(count, pageSize);
  const page = clampPage(requestedPage, count, pageSize);
  const items = await prisma.svAbsence.findMany({
    where,
    orderBy: sort.orderBy as Prisma.SvAbsenceOrderByWithRelationInput[],
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
        Aucune absence trouvée.
      </p>
    );
  }

  return (
    <>
      <ListTableScroll>
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-msk-ink/6 bg-msk-chalk/50 text-xs uppercase tracking-caps text-msk-ink/45">
            <tr>
              <SortableTh
                label="Collaborateur"
                column="collab"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/absences"
                searchParams={listParams}
              />
              <SortableTh
                label="Motif"
                column="motif"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/absences"
                searchParams={listParams}
              />
              <SortableTh
                label="Statut"
                column="statut"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/absences"
                searchParams={listParams}
              />
              <SortableTh
                label="Début"
                column="debut"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/absences"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Fin"
                column="fin"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/absences"
                searchParams={listParams}
                defaultDir="desc"
              />
              <PlainTh>Jours</PlainTh>
              <PlainTh>Congés</PlainTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-ink/6">
            {items.map((row) => {
              const days = absenceDaySpan(row.startDate, row.endDate);
              return (
                <ClickableRowLink
                  key={row.id}
                  href={`/suivi/absences/${row.id}`}
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
                  <td className="px-4 py-3">
                    {SV_ABSENCE_REASON_LABEL[row.reason]}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={SV_ABSENCE_STATUS_TONE[row.status]}>
                      {SV_ABSENCE_STATUS_LABEL[row.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatSvDateFr(row.startDate)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatSvDateFr(row.endDate)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{days}</td>
                  <td className="px-4 py-3">
                    {row.deductLeave ? (
                      <span className="text-xs font-medium text-msk-coral">
                        À tracer
                      </span>
                    ) : (
                      <span className="text-xs text-msk-ink/40">—</span>
                    )}
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
          pathname="/suivi/absences"
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
