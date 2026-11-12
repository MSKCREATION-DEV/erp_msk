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

export const metadata: Metadata = { title: "Patrimoine" };

const STATUS_LABEL: Record<string, string> = {
  IN_SERVICE: "En service",
  MAINTENANCE: "Maintenance",
  DISPOSED: "Sorti",
};

function xof(n: number) {
  return n.toLocaleString("fr-FR") + " XOF";
}

const ASSET_SORT_COLUMNS = {
  code: (dir: SortDir) => ({ code: dir }),
  designation: (dir: SortDir) => ({ designation: dir }),
  category: (dir: SortDir) => ({ category: dir }),
  status: (dir: SortDir) => ({ status: dir }),
  value: (dir: SortDir) => ({ valueXof: dir }),
  assigned: (dir: SortDir) => ({ assignedTo: { lastName: dir } }),
} satisfies SortColumnMap<
  "code" | "designation" | "category" | "status" | "value" | "assigned"
>;

export default async function PatrimoinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "pat.access")) redirect("/accueil");
  const canManage = hasPermission(user, "pat.manage");

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Patrimoine"
        description="Biens immobilisés, assignation et sortie d’actif."
        breadcrumbs={[{ label: "Patrimoine" }]}
        actions={
          canManage ? (
            <Link
              prefetch={false}
              href="/patrimoine/nouveau"
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Nouveau bien
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
          <ListSearchForm
            placeholder="Code, désignation, catégorie…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <Suspense
        key={resultsKey}
        fallback={<ListTableSkeleton rows={8} cols={6} />}
      >
        <PatrimoineResults searchParams={searchParams} canManage={canManage} />
      </Suspense>
    </PageShell>
  );
}

async function PatrimoineResults({
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
  const sort = parseListSort(sp, ASSET_SORT_COLUMNS, {
    key: "code",
    dir: "asc",
  });
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  const where: Prisma.PatAssetWhereInput = q
    ? {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { designation: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.patAsset.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const assets = await prisma.patAsset.findMany({
    where,
    orderBy: sort.orderBy as Prisma.PatAssetOrderByWithRelationInput[],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <Surface className="overflow-x-auto p-0">
      {assets.length === 0 ? (
        <p className="p-6 text-sm text-msk-ink/45">
          {q ? (
            <>Aucun bien pour « {q} ».</>
          ) : (
            <>
              Aucun bien.{" "}
              {canManage ? (
                <Link
                  prefetch={false}
                  href="/patrimoine/nouveau"
                  className="text-msk-blue"
                >
                  Enregistrer le premier
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
                  pathname="/patrimoine"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Désignation"
                  column="designation"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/patrimoine"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Catégorie"
                  column="category"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/patrimoine"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Statut"
                  column="status"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/patrimoine"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Valeur"
                  column="value"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/patrimoine"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
                <SortableTh
                  label="Assigné"
                  column="assigned"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/patrimoine"
                  searchParams={listParams}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-msk-chalk/40">
                  <td className="px-4 py-3">
                    <Link
                      prefetch={false}
                      href={`/patrimoine/${a.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {a.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{a.designation}</td>
                  <td className="px-4 py-3 text-msk-ink/55">{a.category}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-msk-ink/5 px-2 py-0.5 text-xs font-medium">
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {xof(a.valueXof)}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {a.assignedTo
                      ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ListPagination
            pathname="/patrimoine"
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
