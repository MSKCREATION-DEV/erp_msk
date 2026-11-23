import type { Metadata } from "next";
import { Suspense } from "react";
import { PackagePlus, Plus } from "lucide-react";
import type { Prisma, SvCountry } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { resolveSvPermissionFromPaysParam } from "@/lib/suivi/access";
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
import {
  SV_COUNTRY_TO_URL,
  listSvCountriesForUser,
  svCountryDisplayLabel,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ActionLink } from "@/components/ui/action-link";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { Badge } from "@/components/ui/badge";
import { SvStockListActions } from "@/components/suivi/stock-list-actions";
import { SvStocksToolbar } from "@/components/suivi/stocks-toolbar";
import { SuiviCountryGate } from "@/components/suivi/suivi-country-gate";

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

const TARGET = "/suivi/stocks";

export default async function SuiviStocksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const rawSp = await searchParams;
  const country = resolveSvPermissionFromPaysParam(
    user,
    "sv.stock.view",
    rawSp,
    TARGET,
  );
  if (!country) {
    return (
      <SuiviCountryGate
        countries={listSvCountriesForUser(user)}
        targetPath={TARGET}
        pillarLabel="Stocks"
      />
    );
  }
  const canManage = hasPermission(user, "sv.stock.manage");

  const resultsKey = listKeyFromSearchParams(rawSp);
  const countryLabel = svCountryDisplayLabel(country);

  return (
    <PageShell>
      <PageHeader
        title={`Stocks · ${countryLabel}`}
        description="Inventaire courant — articles tampon Suivi."
        backHref="/suivi"
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <ActionLink
                href={withSvCountryQuery(
                  "/suivi/stocks/mouvements/nouveau",
                  country,
                )}
                icon={PackagePlus}
                variant="secondary"
              >
                Mouvement
              </ActionLink>
              <ActionLink
                href={withSvCountryQuery("/suivi/stocks/nouveau", country)}
                icon={Plus}
              >
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
          <StocksResults
            searchParams={searchParams}
            canManage={canManage}
            country={country}
          />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function StocksResults({
  searchParams,
  canManage,
  country,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  canManage: boolean;
  country: SvCountry;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const onlyRupture = firstParam(raw.rupture) === "1";
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const pays = SV_COUNTRY_TO_URL[country];
  const sp: Record<string, string | undefined> = {
    pays,
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
    country,
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
    pays,
    q: q || undefined,
    rupture: onlyRupture ? "1" : undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  const allQtyZero =
    items.length > 0 &&
    !q &&
    !onlyRupture &&
    items.every((i) => i.quantity === 0) &&
    country === "TOGO";

  if (items.length === 0) {
    const isTogoSeedFail = country === "TOGO" && !q && !onlyRupture;
    return (
      <div className="px-6 py-12 text-center" role="status">
        <p className="text-sm font-medium text-msk-ink">
          {q || onlyRupture
            ? "Aucun article pour ces critères"
            : isTogoSeedFail
              ? "Aucun article Togo"
              : "Aucun article"}
        </p>
        <p className="mt-1 text-sm text-msk-ink/55">
          {q || onlyRupture
            ? "Modifiez la recherche ou le filtre rupture."
            : isTogoSeedFail
              ? "Les familles stock Togo ne sont pas encore créées. Contactez un administrateur."
              : "Créez un article ou lancez le seed inventaire Direction."}
        </p>
        {canManage && !q && !onlyRupture && !isTogoSeedFail ? (
          <div className="mt-4 flex justify-center">
            <ActionLink
              href={withSvCountryQuery("/suivi/stocks/nouveau", country)}
              icon={Plus}
            >
              Nouvel article
            </ActionLink>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {allQtyZero ? (
        <div className="border-b border-msk-ink/6 bg-msk-chalk/50 px-4 py-2.5">
          <Badge tone="muted">
            Quantités à 0 — inventaire Togo à renseigner
          </Badge>
        </div>
      ) : null}
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
                href={withSvCountryQuery(`/suivi/stocks/${item.id}`, country)}
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
                    country={country}
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
