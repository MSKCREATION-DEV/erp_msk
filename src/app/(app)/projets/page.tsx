import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
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
import { SortableTh } from "@/components/ui/sortable-th";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";

export const metadata: Metadata = { title: "Projets" };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  ON_HOLD: "En pause",
  DONE: "Terminé",
  CANCELLED: "Annulé",
};

function xof(n: number) {
  return n.toLocaleString("fr-FR") + " XOF";
}

const PROJECT_SORT_COLUMNS = {
  code: (dir: SortDir) => ({ code: dir }),
  name: (dir: SortDir) => ({ name: dir }),
  status: (dir: SortDir) => ({ status: dir }),
  budget: (dir: SortDir) => ({ budgetXof: dir }),
  owner: (dir: SortDir) => ({ owner: { lastName: dir } }),
  expenses: (dir: SortDir) => ({ expenses: { _count: dir } }),
  updatedAt: (dir: SortDir) => ({ updatedAt: dir }),
} satisfies SortColumnMap<
  "code" | "name" | "status" | "budget" | "owner" | "expenses" | "updatedAt"
>;

export default async function ProjetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "prj.access")) redirect("/accueil");
  const canManage = hasPermission(user, "prj.manage");

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Projets"
        description="Budget, dépenses et validation des justificatifs."
        breadcrumbs={[{ label: "Projets" }]}
        actions={
          canManage ? (
            <Link
              prefetch={false}
              href="/projets/nouveau"
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Nouveau projet
            </Link>
          ) : null
        }
      />

      <div className="pb-3">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm placeholder="Code, nom…" className="sm:max-w-md" />
        </Suspense>
      </div>

      <Suspense
        key={resultsKey}
        fallback={<ListTableSkeleton rows={8} cols={6} />}
      >
        <ProjetsResults searchParams={searchParams} canManage={canManage} />
      </Suspense>
    </PageShell>
  );
}

async function ProjetsResults({
  searchParams,
  canManage,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  canManage: boolean;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, PROJECT_SORT_COLUMNS, {
    key: "updatedAt",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  const where: Prisma.PrjProjectWhereInput = q
    ? {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.prjProject.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const projects = await prisma.prjProject.findMany({
    where,
    orderBy: sort.orderBy as Prisma.PrjProjectOrderByWithRelationInput[],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      owner: { select: { firstName: true, lastName: true } },
      _count: { select: { expenses: true } },
    },
  });

  return (
    <Surface className="overflow-x-auto p-0">
      {projects.length === 0 ? (
        <p className="p-6 text-sm text-msk-ink/45">
          {q ? (
            <>Aucun projet pour « {q} ».</>
          ) : (
            <>
              Aucun projet.{" "}
              {canManage ? (
                <Link
                  prefetch={false}
                  href="/projets/nouveau"
                  className="text-msk-blue"
                >
                  Créer le premier
                </Link>
              ) : null}
            </>
          )}
        </p>
      ) : (
        <>
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-paper bg-msk-chalk/60 text-xs tracking-caps uppercase text-msk-ink/45">
              <tr>
                <SortableTh
                  label="Code"
                  column="code"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/projets"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Nom"
                  column="name"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/projets"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Statut"
                  column="status"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/projets"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Budget"
                  column="budget"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/projets"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
                <SortableTh
                  label="Responsable"
                  column="owner"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/projets"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Dépenses"
                  column="expenses"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/projets"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-msk-chalk/40">
                  <td className="px-4 py-3">
                    <Link
                      prefetch={false}
                      href={`/projets/${p.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-msk-ink/5 px-2 py-0.5 text-xs font-medium">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {xof(p.budgetXof)}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {p.owner.firstName} {p.owner.lastName}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p._count.expenses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ListPagination
            pathname="/projets"
            searchParams={listParams}
            page={page}
            totalPages={totalPages(total, pageSize)}
            total={total}
            pageSize={pageSize}
          />
        </>
      )}
    </Surface>
  );
}
