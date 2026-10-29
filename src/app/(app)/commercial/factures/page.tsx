import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comInvoiceOwnerScopeWhere } from "@/lib/commercial/scope";
import {
  formatComMoney,
  invoiceStatusTone,
  INVOICE_STATUS_LABELS,
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
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { ListTableScroll } from "@/components/ui/list-table-scroll";

const FACTURE_SORT_COLUMNS = {
  number: (dir: SortDir) => ({ number: dir }),
  client: (dir: SortDir) => ({ client: { name: dir } }),
  status: (dir: SortDir) => ({ status: dir }),
  totalTtc: (dir: SortDir) => ({ totalTtc: dir }),
  amountPaid: (dir: SortDir) => ({ amountPaid: dir }),
  createdAt: (dir: SortDir) => ({ createdAt: dir }),
} satisfies SortColumnMap<
  "number" | "client" | "status" | "totalTtc" | "amountPaid" | "createdAt"
>;

export const metadata: Metadata = { title: "Factures" };

export default async function CommercialFacturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "com.access")) redirect("/accueil");

  return (
    <PageShell>
      <PageHeader
        title="Factures"
        description="Émission, paiements et lien compta."
        backHref="/commercial"
        backLabel="Retour Menu"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Factures" },
        ]}
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
          <FacturesResults searchParams={searchParams} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function FacturesResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const sort = parseListSort(sp, FACTURE_SORT_COLUMNS, {
    key: "createdAt",
    dir: "desc",
  });

  const where = {
    AND: [
      comInvoiceOwnerScopeWhere(user),
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

  const total = await prisma.comInvoice.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const invoices = await prisma.comInvoice.findMany({
    where,
    orderBy: sort.orderBy as Prisma.ComInvoiceOrderByWithRelationInput,
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: { client: { select: { name: true } } },
  });

  const linked =
    invoices.length > 0
      ? await prisma.cptEntry.findMany({
          where: {
            sourceType: "COM_INVOICE",
            sourceId: { in: invoices.map((i) => i.id) },
          },
          select: { sourceId: true, status: true },
        })
      : [];
  const linkedMap = new Map(
    linked
      .filter((e): e is typeof e & { sourceId: string } => !!e.sourceId)
      .map((e) => [e.sourceId, e.status]),
  );

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  if (invoices.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-msk-ink/50">
        {q ? (
          <>Aucune facture pour « {q} ».</>
        ) : (
          <>
            Aucune facture. Créez-en une depuis un devis accepté ou envoyé.
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <ListTableScroll>
        <table className="w-full min-w-200 text-left text-sm">
          <thead className="border-b border-msk-ink/10 bg-msk-chalk/40 text-msk-ink/45">
            <tr>
              <SortableTh
                label="N°"
                column="number"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/factures"
                searchParams={listParams}
              />
              <SortableTh
                label="Date"
                column="createdAt"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/factures"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Client"
                column="client"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/factures"
                searchParams={listParams}
              />
              <SortableTh
                label="Statut"
                column="status"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/factures"
                searchParams={listParams}
              />
              <SortableTh
                label="TTC"
                column="totalTtc"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/factures"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Payé"
                column="amountPaid"
                sort={sort.key}
                dir={sort.dir}
                pathname="/commercial/factures"
                searchParams={listParams}
                defaultDir="desc"
              />
              <PlainTh>Compta</PlainTh>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const entryStatus = linkedMap.get(inv.id);
              const isIssued = [
                "EMISE",
                "PARTIELLEMENT_PAYEE",
                "PAYEE",
              ].includes(inv.status);
              return (
                <ClickableRowLink
                  key={inv.id}
                  href={`/commercial/factures/${inv.id}`}
                  className="border-b border-msk-ink/5"
                >
                  <td className="px-4 py-3 font-medium text-msk-ink">
                    {inv.number}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-msk-ink/70">
                    {inv.createdAt.toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{inv.client.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={invoiceStatusTone(inv.status)}>
                      {INVOICE_STATUS_LABELS[inv.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatComMoney(inv.totalTtc, inv.currency)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-msk-ink/70">
                    {formatComMoney(inv.amountPaid, inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-xs text-msk-ink/55">
                    {!isIssued
                      ? "—"
                      : entryStatus === "VALIDATED"
                        ? "Validée"
                        : entryStatus
                          ? "Brouillon"
                          : "À comptabiliser"}
                  </td>
                </ClickableRowLink>
              );
            })}
          </tbody>
        </table>
      </ListTableScroll>
      <ListPagination
        pathname="/commercial/factures"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
