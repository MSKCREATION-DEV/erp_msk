import type { Metadata } from "next";
import { Suspense } from "react";
import { PackagePlus, Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
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
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ActionLink } from "@/components/ui/action-link";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { SvStockListActions } from "@/components/suivi/stock-list-actions";
import { SvStocksToolbar } from "@/components/suivi/stocks-toolbar";

const STOCK_SORT_COLUMNS = {
  code: (dir: SortDir) => ({ code: dir }),
  family: (dir: SortDir) => ({ family: dir }),
  label: (dir: SortDir) => ({ label: dir }),
  quantity: (dir: SortDir) => ({ quantity: dir }),
  location: (dir: SortDir) => ({ location: dir }),
} satisfies SortColumnMap<
  "code" | "family" | "label" | "quantity" | "location"
>;

export const metadata: Metadata = { title: "Stocks · Suivi" };

export default async function SuiviStocksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.view");
  const canManage = hasPermission(user, "sv.stock.manage");

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Stocks"
        description="Inventaire courant — articles tampon Suivi."
        backHref="/suivi"
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <ActionLink
                href="/suivi/stocks/mouvements/nouveau"
                icon={PackagePlus}
                variant="secondary"
              >
                Mouvement
              </ActionLink>
              <ActionLink href="/suivi/stocks/nouveau" icon={Plus}>
                Nouvel article
              </ActionLink>
            </div>
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
            <SvStocksToolbar />
          </Suspense>
        </div>
        <Suspense key={resultsKey} fallback={<ListTableSkeleton rows={8} cols={7} />}>
          <StocksResults searchParams={searchParams} canManage={canManage} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function StocksResults({
  searchParams,
  canManage,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  canManage: boolean;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const onlyRupture = firstParam(raw.rupture) === "1";
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    rupture: onlyRupture ? "1" : undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, STOCK_SORT_COLUMNS, {
    key: "family",
    dir: "asc",
  });

  const where: Prisma.SvStockItemWhereInput = {
    archivedAt: null,
    AND: [
      ...(onlyRupture ? [{ quantity: 0 }] : []),
      ...(q
        ? [
            {
              OR: [
                { code: { contains: q, mode: "insensitive" as const } },
                { label: { contains: q, mode: "insensitive" as const } },
                { family: { contains: q, mode: "insensitive" as const } },
                { location: { contains: q, mode: "insensitive" as const } },
                {
                  observations: { contains: q, mode: "insensitive" as const },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const total = await prisma.svStockItem.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const items = await prisma.svStockItem.findMany({
    where,
    orderBy: [
      ...(sort.orderBy as Prisma.SvStockItemOrderByWithRelationInput[]),
      { code: "asc" },
    ],
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    rupture: onlyRupture ? "1" : undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  if (items.length === 0) {
    return (
      <div className="px-6 py-12 text-center" role="status">
        <p className="text-sm font-medium text-msk-ink">
          {q || onlyRupture ? "Aucun article pour ces critères" : "Aucun article"}
        </p>
        {!q && !onlyRupture ? (
          <p className="mt-1 text-sm text-msk-ink/55">
            Créez un article ou lancez le seed inventaire Direction.
          </p>
        ) : null}
        {canManage && !q && !onlyRupture ? (
          <div className="mt-4 flex justify-center">
            <ActionLink href="/suivi/stocks/nouveau" icon={Plus}>
              Nouvel article
            </ActionLink>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <ListTableScroll>
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
            <tr>
              <SortableTh
                label="Code"
                column="code"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/stocks"
                searchParams={listParams}
              />
              <SortableTh
                label="Famille"
                column="family"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/stocks"
                searchParams={listParams}
              />
              <SortableTh
                label="Désignation"
                column="label"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/stocks"
                searchParams={listParams}
              />
              <SortableTh
                label="Qté"
                column="quantity"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/stocks"
                searchParams={listParams}
                defaultDir="desc"
                align="right"
              />
              <PlainTh>Unité</PlainTh>
              <SortableTh
                label="Emplacement"
                column="location"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/stocks"
                searchParams={listParams}
              />
              <PlainTh>
                <span className="sr-only">Actions</span>
              </PlainTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-ink/6">
            {items.map((item) => (
              <ClickableRowLink
                key={item.id}
                href={`/suivi/stocks/${item.id}`}
                className={item.quantity === 0 ? "bg-msk-coral/4" : undefined}
              >
                <td className="px-4 py-3 font-medium tabular-nums">
                  {item.code}
                </td>
                <td className="px-4 py-3 text-msk-ink/65">{item.family}</td>
                <td className="px-4 py-3">
                  <p>{item.label}</p>
                  {item.observations ? (
                    <p className="line-clamp-1 text-xs text-msk-ink/40">
                      {item.observations}
                    </p>
                  ) : null}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${
                    item.quantity === 0 ? "font-semibold text-msk-coral" : ""
                  }`}
                >
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-msk-ink/60">{item.unit}</td>
                <td className="px-4 py-3 text-msk-ink/60">
                  {item.location ?? "—"}
                </td>
                <td className="px-2 py-3">
                  <SvStockListActions
                    itemId={item.id}
                    canManage={canManage}
                  />
                </td>
              </ClickableRowLink>
            ))}
          </tbody>
        </table>
      </ListTableScroll>
      <ListPagination
        pathname="/suivi/stocks"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
