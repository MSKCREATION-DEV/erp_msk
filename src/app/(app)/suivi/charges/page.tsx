import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilePlus2 } from "lucide-react";
import type { Prisma, SvExpenseCategory, SvInvoiceStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { invoiceReste } from "@/lib/suivi/balances";
import {
  formatSvXof,
  SV_EXPENSE_CATEGORY_LABEL,
  SV_EXPENSE_STATUS_LABEL,
  SV_EXPENSE_STATUS_TONE,
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
import { SvChargesToolbar } from "@/components/suivi/charges-toolbar";

const CHARGE_SORT_COLUMNS = {
  number: (dir: SortDir) => ({ number: dir }),
  vendor: (dir: SortDir) => ({ vendorName: dir }),
  category: (dir: SortDir) => ({ category: dir }),
  status: (dir: SortDir) => ({ status: dir }),
  totalTtc: (dir: SortDir) => ({ totalTtc: dir }),
  amountPaid: (dir: SortDir) => ({ amountPaid: dir }),
  issuedAt: (dir: SortDir) => ({ issuedAt: dir }),
} satisfies SortColumnMap<
  | "number"
  | "vendor"
  | "category"
  | "status"
  | "totalTtc"
  | "amountPaid"
  | "issuedAt"
>;

const UNPAID: SvInvoiceStatus[] = ["BROUILLON", "EMISE", "PARTIELLE"];
const CATEGORY_VALUES = new Set<string>([
  "ORANGE_INTERNET",
  "EDM_ELECTRICITE",
  "LOYER",
  "AUTRE",
]);

export const metadata: Metadata = { title: "Charges · Suivi" };

export default async function SuiviChargesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.expenses.view");
  const canManage =
    hasPermission(user, "sv.expenses.manage") || user.isSuperAdmin;

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Charges"
        description="Factures fournisseurs — Orange, EDM, loyer… (distinct des factures clients)."
        backHref="/suivi"
        actions={
          canManage ? (
            <ActionLink href="/suivi/charges/nouveau" icon={FilePlus2}>
              Nouvelle charge
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
            <SvChargesToolbar />
          </Suspense>
        </div>
        <Suspense key={resultsKey} fallback={<ListTableSkeleton rows={8} cols={7} />}>
          <ChargesResults searchParams={searchParams} canManage={canManage} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function ChargesResults({
  searchParams,
  canManage,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  canManage: boolean;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const onlyUnpaid = firstParam(raw.impaye) === "1";
  const onlyPaid = firstParam(raw.paye) === "1";
  const echeanceRaw = firstParam(raw.echeance) ?? "";
  const echeance =
    echeanceRaw === "retard" || echeanceRaw === "bientot"
      ? echeanceRaw
      : null;
  const typeRaw = firstParam(raw.type) ?? "";
  const category = CATEGORY_VALUES.has(typeRaw)
    ? (typeRaw as SvExpenseCategory)
    : null;
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    impaye: onlyUnpaid || echeance ? "1" : undefined,
    paye: onlyPaid && !onlyUnpaid && !echeance ? "1" : undefined,
    echeance: echeance ?? undefined,
    type: category ?? undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, CHARGE_SORT_COLUMNS, {
    key: "issuedAt",
    dir: "desc",
  });

  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueFilter: Prisma.SvExpenseInvoiceWhereInput | null =
    echeance === "retard"
      ? { dueAt: { lt: now }, status: { in: UNPAID } }
      : echeance === "bientot"
        ? {
            dueAt: { gte: now, lte: soon },
            status: { in: UNPAID },
          }
        : null;

  const where: Prisma.SvExpenseInvoiceWhereInput = {
    AND: [
      { status: { not: "ANNULEE" } },
      ...(onlyUnpaid || echeance ? [{ status: { in: UNPAID } }] : []),
      ...(onlyPaid && !onlyUnpaid && !echeance
        ? [{ status: "PAYEE" as const }]
        : []),
      ...(dueFilter ? [dueFilter] : []),
      ...(category ? [{ category }] : []),
      ...(q
        ? [
            {
              OR: [
                { number: { contains: q, mode: "insensitive" as const } },
                { object: { contains: q, mode: "insensitive" as const } },
                { vendorName: { contains: q, mode: "insensitive" as const } },
                { periodLabel: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
    ],
  };

  const total = await prisma.svExpenseInvoice.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const rows = await prisma.svExpenseInvoice.findMany({
    where,
    orderBy: [
      ...(sort.orderBy as Prisma.SvExpenseInvoiceOrderByWithRelationInput[]),
      { createdAt: "desc" },
    ],
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    impaye: onlyUnpaid || echeance ? "1" : undefined,
    paye: onlyPaid && !onlyUnpaid && !echeance ? "1" : undefined,
    echeance: echeance ?? undefined,
    type: category ?? undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-msk-ink/50">
        {q || onlyUnpaid || onlyPaid || category || echeance ? (
          <>Aucune charge pour ces critères.</>
        ) : (
          <>
            Aucune charge.{" "}
            {canManage ? (
              <Link
                prefetch={false}
                href="/suivi/charges/nouveau"
                className="font-medium text-msk-blue hover:underline"
              >
                Enregistrer la première
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
                pathname="/suivi/charges"
                searchParams={listParams}
              />
              <SortableTh
                label="Type"
                column="category"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/charges"
                searchParams={listParams}
              />
              <SortableTh
                label="Fournisseur"
                column="vendor"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/charges"
                searchParams={listParams}
              />
              <SortableTh
                label="Statut"
                column="status"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/charges"
                searchParams={listParams}
              />
              <SortableTh
                label="TTC"
                column="totalTtc"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/charges"
                searchParams={listParams}
                defaultDir="desc"
                align="right"
              />
              <SortableTh
                label="Payé"
                column="amountPaid"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/charges"
                searchParams={listParams}
                defaultDir="desc"
                align="right"
              />
              <PlainTh align="right">Reste</PlainTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-ink/6">
            {rows.map((inv) => {
              const reste = invoiceReste(inv);
              return (
                <ClickableRowLink
                  key={inv.id}
                  href={`/suivi/charges/${inv.id}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {inv.number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">
                    {SV_EXPENSE_CATEGORY_LABEL[inv.category]}
                  </td>
                  <td className="px-4 py-3">{inv.vendorName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={SV_EXPENSE_STATUS_TONE[inv.status]}>
                      {SV_EXPENSE_STATUS_LABEL[inv.status]}
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
        pathname="/suivi/charges"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
