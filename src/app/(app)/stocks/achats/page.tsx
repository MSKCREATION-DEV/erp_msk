import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
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

export const metadata: Metadata = { title: "Achats stock" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  ORDERED: "Commandé",
  RECEIVED: "Réceptionné",
  CANCELLED: "Annulé",
};

const PURCHASE_SORT_COLUMNS = {
  number: (dir: SortDir) => ({ number: dir }),
  supplier: (dir: SortDir) => ({ supplierName: dir }),
  status: (dir: SortDir) => ({ status: dir }),
  lines: (dir: SortDir) => ({ lines: { _count: dir } }),
  createdAt: (dir: SortDir) => ({ createdAt: dir }),
  by: (dir: SortDir) => ({ createdBy: { lastName: dir } }),
} satisfies SortColumnMap<
  "number" | "supplier" | "status" | "lines" | "createdAt" | "by"
>;

export default async function StocksAchatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["stk.achats.manage", "stk.access"])) {
    redirect("/accueil");
  }
  const canManage = hasPermission(user, "stk.achats.manage");

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Achats"
        description="Commandes fournisseurs, réception stock et proposition écriture AC."
        backHref="/stocks"
        backLabel="Retour stocks"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Achats" },
        ]}
        actions={
          canManage ? (
            <Link
              prefetch={false}
              href="/stocks/achats/nouveau"
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Nouvel achat
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
            placeholder="N°, fournisseur…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <Suspense
        key={resultsKey}
        fallback={<ListTableSkeleton rows={8} cols={6} />}
      >
        <AchatsResults searchParams={searchParams} canManage={canManage} />
      </Suspense>
    </PageShell>
  );
}

async function AchatsResults({
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
  const sort = parseListSort(sp, PURCHASE_SORT_COLUMNS, {
    key: "createdAt",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  const where: Prisma.StkPurchaseWhereInput = q
    ? {
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { supplierName: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.stkPurchase.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const purchases = await prisma.stkPurchase.findMany({
    where,
    orderBy: sort.orderBy as Prisma.StkPurchaseOrderByWithRelationInput[],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { lines: true } },
    },
  });

  return (
    <Surface className="overflow-x-auto p-0">
      {purchases.length === 0 ? (
        <p className="p-6 text-sm text-msk-ink/45">
          {q ? (
            <>Aucun achat pour « {q} ».</>
          ) : (
            <>
              Aucun achat.{" "}
              {canManage ? (
                <Link
                  prefetch={false}
                  href="/stocks/achats/nouveau"
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
                  label="N°"
                  column="number"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Fournisseur"
                  column="supplier"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Statut"
                  column="status"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Lignes"
                  column="lines"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
                <SortableTh
                  label="Créé le"
                  column="createdAt"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                  defaultDir="desc"
                />
                <SortableTh
                  label="Par"
                  column="by"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/achats"
                  searchParams={listParams}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-msk-chalk/40">
                  <td className="px-4 py-3">
                    <Link
                      prefetch={false}
                      href={`/stocks/achats/${p.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {p.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-msk-ink">{p.supplierName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-msk-ink/5 px-2 py-0.5 text-xs font-medium">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p._count.lines}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {p.createdAt.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {p.createdBy.firstName} {p.createdBy.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ListPagination
            pathname="/stocks/achats"
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
