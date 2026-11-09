import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { parseSortDir, type SortDir } from "@/lib/list/sort";
import {
  CLIENT_ACCOUNT_STATUT_LABELS,
  deriveClientAccountStatut,
  filterClientAccountRows,
  parseClientAccountSortKey,
  parseClientAccountStatutFilter,
  sortClientAccountRows,
  type ClientAccountStatut,
} from "@/lib/comptabilite/client-accounts";
import { loadClientAccounts } from "@/lib/comptabilite/load-client-accounts";
import { formatComMoney } from "@/lib/commercial/labels";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";

const STATUT_TONE: Record<ClientAccountStatut, BadgeTone> = {
  RETARD: "coral",
  OUVERT: "blue",
  SOLDE: "success",
};

function buildClientHref(
  id: string,
  listParams: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(listParams)) {
    if (v) params.set(k, v);
  }
  if (page > 1) params.set("page", String(page));
  params.set("from", "list");
  return `/comptabilite/clients/${id}?${params.toString()}`;
}

export async function ClientsResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "cpt.access") &&
    !hasPermission(user, "cpt.etats.view") &&
    !hasPermission(user, "com.reports.view")
  ) {
    redirect("/comptabilite");
  }

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const statut = parseClientAccountStatutFilter(sp);
  const sortKey = parseClientAccountSortKey(sp.sort);
  const defaultDir: SortDir = sortKey === "name" || sortKey === "owner" || sortKey === "due"
    ? "asc"
    : "desc";
  const dir = parseSortDir(sp.dir, defaultDir);

  const allRows = await loadClientAccounts();
  const filtered = filterClientAccountRows(allRows, { q, statut });
  const sorted = sortClientAccountRows(filtered, sortKey, dir);

  const total = sorted.length;
  const pageSize = DEFAULT_PAGE_SIZE;
  const requestedPage = parsePage(sp.page);
  const page = clampPage(requestedPage, total, pageSize);
  const pageRows = sorted.slice(pageSkip(page, pageSize), pageSkip(page, pageSize) + pageSize);

  const listParams: Record<string, string | undefined> = {};
  if (q) listParams.q = q;
  if (statut.length) listParams.statut = statut.join(",");
  listParams.sort = sortKey;
  listParams.dir = dir;

  const hasActiveFilters = Boolean(q) || statut.length > 0;
  const clearFiltersHref = "/comptabilite/clients";

  return (
    <>
      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-msk-ink/6 px-4 py-2.5">
          {q ? <Badge tone="blue">« {q} »</Badge> : null}
          {statut.map((s) => (
            <Badge key={s} tone="blue">
              {CLIENT_ACCOUNT_STATUT_LABELS[s]}
            </Badge>
          ))}
          <Link
            prefetch={false}
            href={clearFiltersHref}
            className="ml-1 text-xs font-medium text-msk-blue hover:underline"
          >
            Effacer
          </Link>
        </div>
      ) : null}

      {pageRows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-msk-ink/50">
          {hasActiveFilters
            ? "Aucun client pour ces filtres."
            : "Aucun client pour le moment."}
        </p>
      ) : (
        <ListTableScroll>
          <table className="w-full min-w-224 text-left text-sm">
            <thead className="border-b border-msk-ink/8 bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
              <tr>
                <SortableTh
                  label="Client"
                  column="name"
                  sort={sortKey}
                  dir={dir}
                  pathname="/comptabilite/clients"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Suivi par"
                  column="owner"
                  sort={sortKey}
                  dir={dir}
                  pathname="/comptabilite/clients"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Facturé"
                  column="invoiced"
                  sort={sortKey}
                  dir={dir}
                  pathname="/comptabilite/clients"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
                <SortableTh
                  label="Payé"
                  column="paid"
                  sort={sortKey}
                  dir={dir}
                  pathname="/comptabilite/clients"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
                <SortableTh
                  label="Solde"
                  column="balance"
                  sort={sortKey}
                  dir={dir}
                  pathname="/comptabilite/clients"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
                <SortableTh
                  label="Retard"
                  column="overdue"
                  sort={sortKey}
                  dir={dir}
                  pathname="/comptabilite/clients"
                  searchParams={listParams}
                  defaultDir="desc"
                  align="right"
                />
                <PlainTh align="center">État</PlainTh>
                <SortableTh
                  label="Échéance"
                  column="due"
                  sort={sortKey}
                  dir={dir}
                  pathname="/comptabilite/clients"
                  searchParams={listParams}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-ink/6">
              {pageRows.map(({ client, fin }) => {
                const statutValue = deriveClientAccountStatut(fin);
                return (
                  <ClickableRowLink
                    key={client.id}
                    href={buildClientHref(client.id, listParams, page)}
                  >
                    <td className="px-4 py-3 font-medium text-msk-ink">
                      {client.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-msk-ink/65">
                      {client.ownerName || "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatComMoney(fin.totalInvoiced)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatComMoney(fin.totalPaidAllocated)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatComMoney(fin.openReceivable)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-msk-coral">
                      {fin.overdueAmount > 0 ? formatComMoney(fin.overdueAmount) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex justify-center">
                        <Badge tone={STATUT_TONE[statutValue]}>
                          {CLIENT_ACCOUNT_STATUT_LABELS[statutValue]}
                        </Badge>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-msk-ink/50">
                      {fin.nextDueDate
                        ? fin.nextDueDate.toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                  </ClickableRowLink>
                );
              })}
            </tbody>
          </table>
        </ListTableScroll>
      )}

      <ListPagination
        pathname="/comptabilite/clients"
        searchParams={listParams}
        page={page}
        totalPages={totalPages(total, pageSize)}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
