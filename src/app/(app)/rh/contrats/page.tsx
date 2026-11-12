import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/list/search-params";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import {
  listKeyFromSearchParams,
  parseListSort,
  type SortColumnMap,
  type SortDir,
} from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { SortableTh } from "@/components/ui/sortable-th";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import type { Prisma, RhContractStatus } from "@/generated/prisma/client";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_TYPE_LABEL,
  contractStatusTone,
} from "@/lib/rh/labels";

export const metadata: Metadata = { title: "Contrats" };

const STATUS_FILTERS: RhContractStatus[] = [
  "DRAFT",
  "ACTIVE",
  "ENDED",
  "CANCELLED",
];

const CONTRACT_SORT_COLUMNS = {
  title: (dir: SortDir) => ({ title: dir }),
  employee: (dir: SortDir) => ({ employee: { lastName: dir } }),
  type: (dir: SortDir) => ({ type: dir }),
  startDate: (dir: SortDir) => ({ startDate: dir }),
  status: (dir: SortDir) => ({ status: dir }),
} satisfies SortColumnMap<
  "title" | "employee" | "type" | "startDate" | "status"
>;

export default async function RhContratsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.contracts.manage")) redirect("/accueil");

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);
  const q = (firstParam(rawSp.q) ?? "").trim();
  const status = firstParam(rawSp.status);
  const statusFilter = STATUS_FILTERS.includes(status as RhContractStatus)
    ? (status as RhContractStatus)
    : undefined;
  const sortKey = firstParam(rawSp.sort) ?? "startDate";
  const sortDir = firstParam(rawSp.dir) ?? "desc";

  return (
    <PageShell>
      <PageHeader
        title="Contrats"
        description="CDI, CDD, stage, prestation, avenants."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[{ label: "RH", href: "/rh" }, { label: "Contrats" }]}
        actions={
          <Link
            prefetch={false}
            href="/rh/contrats/nouveau"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Nouveau contrat
          </Link>
        }
      />

      <div className="pb-3">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Intitulé, collaborateur…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          prefetch={false}
          href={(() => {
            const p = new URLSearchParams();
            if (q) p.set("q", q);
            p.set("sort", sortKey);
            p.set("dir", sortDir);
            const qs = p.toString();
            return qs ? `/rh/contrats?${qs}` : "/rh/contrats";
          })()}
          className={`rounded-lg px-3 py-1.5 ${!statusFilter ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
        >
          Tous
        </Link>
        {STATUS_FILTERS.map((s) => (
          <Link
            prefetch={false}
            key={s}
            href={(() => {
              const p = new URLSearchParams();
              p.set("status", s);
              if (q) p.set("q", q);
              p.set("sort", sortKey);
              p.set("dir", sortDir);
              return `/rh/contrats?${p.toString()}`;
            })()}
            className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
          >
            {CONTRACT_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <Suspense
        key={resultsKey}
        fallback={<ListTableSkeleton rows={8} cols={5} />}
      >
        <ContratsResults searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function ContratsResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const status = firstParam(raw.status);
  const statusFilter = STATUS_FILTERS.includes(status as RhContractStatus)
    ? (status as RhContractStatus)
    : undefined;

  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    status: statusFilter,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, CONTRACT_SORT_COLUMNS, {
    key: "startDate",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    status: statusFilter,
    sort: sort.key,
    dir: sort.dir,
  };

  const where: Prisma.RhContractWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { employee: { firstName: { contains: q, mode: "insensitive" } } },
            { employee: { lastName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.rhContract.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const contracts = await prisma.rhContract.findMany({
    where,
    orderBy: sort.orderBy as Prisma.RhContractOrderByWithRelationInput[],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  if (contracts.length === 0) {
    return (
      <Surface className="p-8 text-center text-sm text-msk-ink/50">
        {q ? `Aucun contrat pour « ${q} ».` : "Aucun contrat trouvé."}
      </Surface>
    );
  }

  return (
    <Surface className="overflow-x-auto p-0">
      <table className="w-full min-w-180 text-left text-sm">
        <thead className="border-b border-msk-ink/10 text-msk-ink/45">
          <tr>
            <SortableTh
              label="Intitulé"
              column="title"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/contrats"
              searchParams={listParams}
            />
            <SortableTh
              label="Collaborateur"
              column="employee"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/contrats"
              searchParams={listParams}
            />
            <SortableTh
              label="Type"
              column="type"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/contrats"
              searchParams={listParams}
            />
            <SortableTh
              label="Début"
              column="startDate"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/contrats"
              searchParams={listParams}
              defaultDir="desc"
            />
            <SortableTh
              label="Statut"
              column="status"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/contrats"
              searchParams={listParams}
            />
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => (
            <tr
              key={c.id}
              className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
            >
              <td className="px-4 py-3">
                <Link
                  prefetch={false}
                  href={`/rh/contrats/${c.id}`}
                  className="font-medium text-msk-blue hover:underline"
                >
                  {c.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-msk-ink/70">
                {c.employee.firstName} {c.employee.lastName}
              </td>
              <td className="px-4 py-3">
                <Badge tone="muted">{CONTRACT_TYPE_LABEL[c.type]}</Badge>
              </td>
              <td className="px-4 py-3 text-msk-ink/70">
                {c.startDate.toLocaleDateString("fr-FR")}
              </td>
              <td className="px-4 py-3">
                <Badge tone={contractStatusTone(c.status)}>
                  {CONTRACT_STATUS_LABEL[c.status]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ListPagination
        pathname="/rh/contrats"
        searchParams={listParams}
        page={page}
        totalPages={totalPages(total, pageSize)}
        total={total}
        pageSize={pageSize}
      />
    </Surface>
  );
}
