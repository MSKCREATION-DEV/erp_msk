import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { clientBalance } from "@/lib/suivi/balances";
import { formatSvXof } from "@/lib/suivi/labels";
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
import { ActionLink } from "@/components/ui/action-link";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { SvClientListActions } from "@/components/suivi/client-list-actions";
import { SvClientsToolbar } from "@/components/suivi/clients-toolbar";

const CLIENT_SORT_COLUMNS = {
  name: (dir: SortDir) => ({ name: dir }),
  contact: (dir: SortDir) => ({ contactName: dir }),
  invoices: (dir: SortDir) => ({ invoices: { _count: dir } }),
  updatedAt: (dir: SortDir) => ({ updatedAt: dir }),
} satisfies SortColumnMap<"name" | "contact" | "invoices" | "updatedAt">;

/** Statuts facture avec reste dû probable (évite dump + filtre client). */
const DUE_INVOICE_STATUSES = ["BROUILLON", "EMISE", "PARTIELLE"] as const;

export const metadata: Metadata = { title: "Clients · Suivi" };

export default async function SuiviClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.clients.view");
  const canManage =
    hasPermission(user, "sv.clients.manage") || user.isSuperAdmin;

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Clients"
        description="Soldes, restants, factures et contrats — tampon Suivi."
        backHref="/suivi"
        actions={
          canManage ? (
            <ActionLink href="/suivi/clients/nouveau" icon={UserPlus}>
              Nouveau client
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
            <SvClientsToolbar />
          </Suspense>
        </div>
        <Suspense key={resultsKey} fallback={<ListTableSkeleton rows={8} cols={8} />}>
          <ClientsResults searchParams={searchParams} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function ClientsResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const canManage =
    hasPermission(user, "sv.clients.manage") || user.isSuperAdmin;
  const canInvoice =
    hasPermission(user, "sv.invoices.manage") || user.isSuperAdmin;

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const onlyDue = firstParam(raw.due) === "1";
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    due: onlyDue ? "1" : undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, CLIENT_SORT_COLUMNS, {
    key: "name",
    dir: "asc",
  });

  const where: Prisma.SvClientWhereInput = {
    AND: [
      ...(q
        ? [
            {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { contactName: { contains: q, mode: "insensitive" as const } },
                { phone: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
                { city: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
      ...(onlyDue
        ? [
            {
              invoices: {
                some: {
                  status: { in: [...DUE_INVOICE_STATUSES] },
                },
              },
            },
          ]
        : []),
    ],
  };

  const total = await prisma.svClient.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const clients = await prisma.svClient.findMany({
    where,
    orderBy: sort.orderBy as Prisma.SvClientOrderByWithRelationInput[],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      invoices: {
        where: { status: { not: "ANNULEE" } },
        select: {
          totalTtc: true,
          amountPaid: true,
          status: true,
          dueAt: true,
          issuedAt: true,
        },
      },
      _count: { select: { invoices: true, contracts: true } },
    },
  });

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    due: onlyDue ? "1" : undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  if (clients.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-msk-ink/50">
        {q || onlyDue ? (
          <>Aucun client pour ces critères.</>
        ) : (
          <>
            Aucun client.{" "}
            {canManage ? (
              <Link
                prefetch={false}
                href="/suivi/clients/nouveau"
                className="font-medium text-msk-blue hover:underline"
              >
                Créer le premier
              </Link>
            ) : (
              "Lancez le seed Suivi ou créez un client."
            )}
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
                label="Client"
                column="name"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/clients"
                searchParams={listParams}
              />
              <SortableTh
                label="Contact"
                column="contact"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/clients"
                searchParams={listParams}
              />
              <PlainTh align="right">Totale</PlainTh>
              <PlainTh align="right">Payé</PlainTh>
              <PlainTh align="right">Restant</PlainTh>
              <PlainTh align="right">À venir</PlainTh>
              <SortableTh
                label="Factures"
                column="invoices"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/clients"
                searchParams={listParams}
                defaultDir="desc"
                align="right"
              />
              <PlainTh>
                <span className="sr-only">Actions</span>
              </PlainTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-ink/6">
            {clients.map((c) => {
              const bal = clientBalance(c.invoices);
              return (
                <ClickableRowLink
                  key={c.id}
                  href={`/suivi/clients/${c.id}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-msk-ink">{c.name}</p>
                    <p className="text-xs text-msk-ink/45">
                      {[c.city, c.country].filter(Boolean).join(" · ") || "—"}
                      {c._count.contracts > 0
                        ? ` · ${c._count.contracts} contrat${c._count.contracts > 1 ? "s" : ""}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-msk-ink/60">
                    <p>{c.contactName ?? "—"}</p>
                    {c.phone ? (
                      <p className="text-xs text-msk-ink/40">{c.phone}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatSvXof(bal.totale)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatSvXof(bal.paye)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      bal.restant > 0 ? "font-medium text-msk-coral" : ""
                    }`}
                  >
                    {formatSvXof(bal.restant)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-msk-ink/60">
                    {formatSvXof(bal.aVenir)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-msk-ink/60">
                    {c._count.invoices}
                  </td>
                  <td className="px-2 py-3">
                    <SvClientListActions
                      clientId={c.id}
                      canEdit={canManage}
                      canInvoice={canInvoice}
                      hasUnpaid={bal.restant > 0}
                    />
                  </td>
                </ClickableRowLink>
              );
            })}
          </tbody>
        </table>
      </ListTableScroll>
      <ListPagination
        pathname="/suivi/clients"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
