import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FilePlus2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comQuoteOwnerScopeWhere } from "@/lib/commercial/scope";
import {
  formatComMoney,
  quoteStatusTone,
  QUOTE_STATUS_LABELS,
} from "@/lib/commercial/labels";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { firstParam } from "@/lib/list/search-params";
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh } from "@/components/ui/sortable-th";
import { ListTableScroll } from "@/components/ui/list-table-scroll";

const DEVIS_SORT_COLUMNS = {
  number: (dir: SortDir) => ({ number: dir }),
  client: (dir: SortDir) => ({ client: { name: dir } }),
  object: (dir: SortDir) => ({ object: dir }),
  status: (dir: SortDir) => ({ status: dir }),
  totalTtc: (dir: SortDir) => ({ totalTtc: dir }),
  createdAt: (dir: SortDir) => ({ createdAt: dir }),
} satisfies SortColumnMap<
  "number" | "client" | "object" | "status" | "totalTtc" | "createdAt"
>;

export const metadata: Metadata = { title: "Devis" };

export default async function CommercialDevisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.devis.create") &&
    !hasPermission(user, "com.devis.edit_own") &&
    !hasPermission(user, "com.access")
  ) {
    redirect("/accueil");
  }

  const canCreate = hasPermission(user, "com.devis.create");

  return (
    <PageShell>
      <PageHeader
        title="Devis"
        description="Propositions commerciales — brouillon à accepté."
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Devis" },
        ]}
        actions={
          canCreate ? (
            <ActionLink href="/commercial/devis/nouveau" icon={FilePlus2}>
              Nouveau devis
            </ActionLink>
          ) : null
        }
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <Suspense
            fallback={
              <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
            }
          >
            <ListSearchForm
              placeholder="N°, client, objet…"
              className="sm:max-w-md"
            />
          </Suspense>
        </div>
        <Suspense fallback={<ListTableSkeleton rows={8} cols={6} />}>
          <DevisResults searchParams={searchParams} canCreate={canCreate} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function DevisResults({
  searchParams,
  canCreate,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  canCreate: boolean;
}) {
  const user = await requireUser();
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, DEVIS_SORT_COLUMNS, {
    key: "createdAt",
    dir: "desc",
  });

  const where = {
    AND: [
      comQuoteOwnerScopeWhere(user),
      ...(q
        ? [
            {
              OR: [
                { number: { contains: q, mode: "insensitive" as const } },
                { object: { contains: q, mode: "insensitive" as const } },
                {
                  client: {
                    name: { contains: q, mode: "insensitive" as const },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const total = await prisma.comQuote.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const quotes = await prisma.comQuote.findMany({
    where,
    orderBy: sort.orderBy as Prisma.ComQuoteOrderByWithRelationInput,
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      client: { select: { name: true } },
    },
  });

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  if (quotes.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-msk-ink/50">
        {q ? (
          <>Aucun devis pour « {q} ».</>
        ) : (
          <>
            Aucun devis.{" "}
            {canCreate ? (
              <Link
                prefetch={false}
                href="/commercial/devis/nouveau"
                className="font-medium text-msk-blue hover:underline"
              >
                Créer le premier
              </Link>
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <ListTableScroll>
        <table className="w-full min-w-180 text-left text-sm">
          <thead className="border-b border-msk-ink/10 bg-msk-chalk/40 text-msk-ink/45">
            <tr>
              <SortableTh
                label="N°"
                column="number"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/devis"
                searchParams={listParams}
              />
              <SortableTh
                label="Client"
                column="client"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/devis"
                searchParams={listParams}
              />
              <SortableTh
                label="Objet"
                column="object"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/devis"
                searchParams={listParams}
              />
              <SortableTh
                label="Statut"
                column="status"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/devis"
                searchParams={listParams}
              />
              <SortableTh
                label="TTC"
                column="totalTtc"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/devis"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Date"
                column="createdAt"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/devis"
                searchParams={listParams}
                defaultDir="desc"
              />
            </tr>
          </thead>
          <tbody>
            {quotes.map((row) => (
              <ClickableRowLink
                key={row.id}
                href={`/commercial/devis/${row.id}`}
                className="border-b border-msk-ink/5"
              >
                <td className="px-4 py-3 font-medium text-msk-ink">
                  {row.number}
                </td>
                <td className="px-4 py-3">{row.client.name}</td>
                <td className="max-w-56 truncate px-4 py-3 text-msk-ink/70">
                  {row.object ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={quoteStatusTone(row.status)}>
                    {QUOTE_STATUS_LABELS[row.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatComMoney(row.totalTtc, row.currency)}
                </td>
                <td className="px-4 py-3 text-msk-ink/55">
                  {row.createdAt.toLocaleDateString("fr-FR")}
                </td>
              </ClickableRowLink>
            ))}
          </tbody>
        </table>
      </ListTableScroll>
      <ListPagination
        pathname="/commercial/devis"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
