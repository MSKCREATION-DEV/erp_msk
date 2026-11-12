import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilePlus2 } from "lucide-react";
import type { Prisma, SvInvoiceStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { invoiceReste } from "@/lib/suivi/balances";
import {
  formatSvXof,
  SV_INVOICE_STATUS_LABEL,
  SV_INVOICE_STATUS_TONE,
} from "@/lib/suivi/labels";
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
import { SvFacturesToolbar } from "@/components/suivi/factures-toolbar";

const FACTURE_SORT_COLUMNS = {
  number: (dir: SortDir) => ({ number: dir }),
  client: (dir: SortDir) => ({ client: { name: dir } }),
  status: (dir: SortDir) => ({ status: dir }),
  totalTtc: (dir: SortDir) => ({ totalTtc: dir }),
  amountPaid: (dir: SortDir) => ({ amountPaid: dir }),
  issuedAt: (dir: SortDir) => ({ issuedAt: dir }),
} satisfies SortColumnMap<
  "number" | "client" | "status" | "totalTtc" | "amountPaid" | "issuedAt"
>;

const RESTE_STATUSES: SvInvoiceStatus[] = ["BROUILLON", "EMISE", "PARTIELLE"];

export const metadata: Metadata = { title: "Factures · Suivi" };

export default async function SuiviFacturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.invoices.view");
  const canManage =
    hasPermission(user, "sv.invoices.manage") || user.isSuperAdmin;

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Factures"
        description="Payé / reste — nouvelle facture depuis l’historique."
        backHref="/suivi"
        actions={
          canManage ? (
            <ActionLink href="/suivi/factures/nouveau" icon={FilePlus2}>
              Nouvelle facture
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
            <SvFacturesToolbar />
          </Suspense>
        </div>
        <Suspense key={resultsKey} fallback={<ListTableSkeleton rows={8} cols={6} />}>
          <FacturesResults searchParams={searchParams} canManage={canManage} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function FacturesResults({
  searchParams,
  canManage,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  canManage: boolean;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const onlyReste = firstParam(raw.reste) === "1";
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    reste: onlyReste ? "1" : undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, FACTURE_SORT_COLUMNS, {
    key: "issuedAt",
    dir: "desc",
  });

  const where: Prisma.SvInvoiceWhereInput = {
    AND: [
      onlyReste
        ? { status: { in: RESTE_STATUSES } }
        : { status: { not: "ANNULEE" } },
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

  const total = await prisma.svInvoice.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const invoices = await prisma.svInvoice.findMany({
    where,
    orderBy: [
      sort.orderBy as Prisma.SvInvoiceOrderByWithRelationInput[],
      { createdAt: "desc" },
    ],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: { client: { select: { id: true, name: true } } },
  });

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    reste: onlyReste ? "1" : undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  if (invoices.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-msk-ink/50">
        {q || onlyReste ? (
          <>Aucune facture pour ces critères.</>
        ) : (
          <>
            Aucune facture.{" "}
            {canManage ? (
              <Link
                prefetch={false}
                href="/suivi/factures/nouveau"
                className="font-medium text-msk-blue hover:underline"
              >
                Créer la première
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
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
            <tr>
              <SortableTh
                label="N°"
                column="number"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/factures"
                searchParams={listParams}
              />
              <SortableTh
                label="Client"
                column="client"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/factures"
                searchParams={listParams}
              />
              <SortableTh
                label="Statut"
                column="status"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/factures"
                searchParams={listParams}
              />
              <SortableTh
                label="TTC"
                column="totalTtc"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/factures"
                searchParams={listParams}
                defaultDir="desc"
                align="right"
              />
              <SortableTh
                label="Payé"
                column="amountPaid"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/factures"
                searchParams={listParams}
                defaultDir="desc"
                align="right"
              />
              <PlainTh align="right">Reste</PlainTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-ink/6">
            {invoices.map((inv) => {
              const reste = invoiceReste(inv);
              return (
                <ClickableRowLink
                  key={inv.id}
                  href={`/suivi/factures/${inv.id}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {inv.number ?? "—"}
                  </td>
                  <td className="px-4 py-3">{inv.client.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={SV_INVOICE_STATUS_TONE[inv.status]}>
                      {SV_INVOICE_STATUS_LABEL[inv.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatSvXof(inv.totalTtc)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatSvXof(inv.amountPaid)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      reste > 0 ? "font-medium text-msk-coral" : ""
                    }`}
                  >
                    {formatSvXof(reste)}
                  </td>
                </ClickableRowLink>
              );
            })}
          </tbody>
        </table>
      </ListTableScroll>
      <ListPagination
        pathname="/suivi/factures"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
