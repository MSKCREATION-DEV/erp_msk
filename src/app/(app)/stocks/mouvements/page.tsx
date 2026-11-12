import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Prisma } from "@/generated/prisma/client";
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
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearchForm } from "@/components/ui/list-search-form";

export const metadata: Metadata = { title: "Mouvements stock" };

function qtyStr(d: Prisma.Decimal | number) {
  return Number(d).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

const MOVE_SORT_COLUMNS = {
  movedAt: (dir: SortDir) => ({ movedAt: dir }),
  type: (dir: SortDir) => ({ type: dir }),
  article: (dir: SortDir) => ({ article: { code: dir } }),
  quantity: (dir: SortDir) => ({ quantity: dir }),
  by: (dir: SortDir) => ({ createdBy: { lastName: dir } }),
} satisfies SortColumnMap<
  "movedAt" | "type" | "article" | "quantity" | "by"
>;

export default async function StocksMouvementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "stk.access")) redirect("/accueil");
  const canMove = hasPermission(user, "stk.moves.create");

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Mouvements"
        description="Historique des entrées, sorties et ajustements."
        backHref="/stocks"
        backLabel="Retour stocks"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Mouvements" },
        ]}
        actions={
          canMove ? (
            <Link
              prefetch={false}
              href="/stocks/mouvements/nouveau"
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Nouveau mouvement
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
            placeholder="Article, motif…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <Suspense
        key={resultsKey}
        fallback={<ListTableSkeleton rows={8} cols={6} />}
      >
        <MouvementsResults searchParams={searchParams} canMove={canMove} />
      </Suspense>
    </PageShell>
  );
}

async function MouvementsResults({
  searchParams,
  canMove,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  canMove: boolean;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, MOVE_SORT_COLUMNS, {
    key: "movedAt",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  const where: Prisma.StkMovementWhereInput = q
    ? {
        OR: [
          { article: { code: { contains: q, mode: "insensitive" } } },
          { article: { designation: { contains: q, mode: "insensitive" } } },
          { reason: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.stkMovement.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const moves = await prisma.stkMovement.findMany({
    where,
    orderBy: sort.orderBy as Prisma.StkMovementOrderByWithRelationInput[],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      article: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <Surface className="overflow-x-auto p-0">
      {moves.length === 0 ? (
        <p className="p-6 text-sm text-msk-ink/45">
          {q ? (
            <>Aucun mouvement pour « {q} ».</>
          ) : (
            <>
              Aucun mouvement.{" "}
              {canMove ? (
                <Link
                  prefetch={false}
                  href="/stocks/mouvements/nouveau"
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
                  label="Date"
                  column="movedAt"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/mouvements"
                  searchParams={listParams}
                  defaultDir="desc"
                />
                <SortableTh
                  label="Type"
                  column="type"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/mouvements"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Article"
                  column="article"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/mouvements"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Qté"
                  column="quantity"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/mouvements"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
                <PlainTh align="right">Avant → Après</PlainTh>
                <SortableTh
                  label="Par"
                  column="by"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/stocks/mouvements"
                  searchParams={listParams}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {m.movedAt.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 font-medium">{m.type}</td>
                  <td className="px-4 py-3">
                    <Link
                      prefetch={false}
                      href={`/stocks/articles/${m.articleId}`}
                      className="text-msk-blue hover:underline"
                    >
                      {m.article.code}
                    </Link>{" "}
                    <span className="text-msk-ink/45">
                      {m.article.designation}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {qtyStr(m.quantity)} {m.article.unit}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-msk-ink/70">
                    {qtyStr(m.qtyBefore)} → {qtyStr(m.qtyAfter)}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {m.createdBy.firstName} {m.createdBy.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ListPagination
            pathname="/stocks/mouvements"
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
