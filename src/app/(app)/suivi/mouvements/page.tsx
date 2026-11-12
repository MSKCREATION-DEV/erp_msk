import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { LayoutDashboard, Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { ensureSvAccounts, getSvAccountByKind } from "@/lib/suivi/accounts";
import {
  familyToCategoryFilterValues,
  SV_CATEGORY_FAMILIES,
  SV_CATEGORY_FAMILY_LABEL,
} from "@/lib/suivi/categories";
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
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { SvMouvementsToolbar } from "@/components/suivi/mouvements-toolbar";

export const metadata: Metadata = { title: "Mouvements · Suivi" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const filterSchema = z.object({
  direction: z.enum(["IN", "OUT"]).optional(),
  from: z.string().regex(ISO_DATE).optional(),
  to: z.string().regex(ISO_DATE).optional(),
  compte: z.enum(["PHYSICAL", "BANK"]).optional(),
  categorie: z.enum(SV_CATEGORY_FAMILIES).optional(),
  category: z.string().max(80).optional(),
});

const MOVE_SORT_COLUMNS = {
  movedAt: (dir: SortDir) => ({ movedAt: dir }),
  direction: (dir: SortDir) => ({ direction: dir }),
  category: (dir: SortDir) => ({ category: dir }),
  amount: (dir: SortDir) => ({ amount: dir }),
  account: (dir: SortDir) => ({ account: { label: dir } }),
} satisfies SortColumnMap<
  "movedAt" | "direction" | "category" | "amount" | "account"
>;

function categoryWhereForFamily(
  family: (typeof SV_CATEGORY_FAMILIES)[number],
): Prisma.StringFilter {
  if (family !== "autre") {
    return { in: familyToCategoryFilterValues(family) };
  }
  const other = SV_CATEGORY_FAMILIES.filter((f) => f !== "autre").flatMap(
    (f) => familyToCategoryFilterValues(f),
  );
  return { notIn: other };
}

export default async function SuiviMouvementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.movements.view");
  const canManage =
    hasPermission(user, "sv.movements.manage") || user.isSuperAdmin;

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title="Mouvements"
        description="Registre entrées / sorties — trésorerie tampon (pas de caisse métier)."
        backHref="/suivi"
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionLink
              href="/suivi/tableau-de-bord"
              icon={LayoutDashboard}
              variant="secondary"
            >
              Tableau de bord
            </ActionLink>
            {canManage ? (
              <ActionLink href="/suivi/mouvements/nouveau" icon={Plus}>
                Nouveau mouvement
              </ActionLink>
            ) : null}
          </div>
        }
      />

      <Suspense fallback={<MouvementsSummarySkeleton />}>
        <MouvementsSummary searchParams={searchParams} />
      </Suspense>

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <Suspense
            fallback={
              <div className="h-20 w-full animate-pulse rounded-xl bg-msk-chalk" />
            }
          >
            <SvMouvementsToolbar />
          </Suspense>
        </div>
        <Suspense key={resultsKey} fallback={<ListTableSkeleton rows={8} cols={8} />}>
          <MouvementsResults searchParams={searchParams} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

function MouvementsSummarySkeleton() {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-msk-ink/8 bg-white"
        />
      ))}
    </div>
  );
}

async function buildMovementWhere(
  raw: Record<string, string | string[] | undefined>,
): Promise<{
  where: Prisma.SvCashMovementWhereInput;
  filters: z.infer<typeof filterSchema>;
  q: string;
}> {
  const q = (firstParam(raw.q) ?? "").trim();
  const parsed = filterSchema.safeParse({
    direction: firstParam(raw.direction),
    from: firstParam(raw.from),
    to: firstParam(raw.to),
    compte: firstParam(raw.compte),
    categorie: firstParam(raw.categorie),
    category: firstParam(raw.category),
  });
  const filters = parsed.success ? parsed.data : {};

  const where: Prisma.SvCashMovementWhereInput = {};
  if (filters.direction) where.direction = filters.direction;
  if (filters.from || filters.to) {
    where.movedAt = {};
    if (filters.from) {
      where.movedAt.gte = new Date(`${filters.from}T00:00:00.000Z`);
    }
    if (filters.to) {
      where.movedAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
    }
  }
  if (filters.compte) {
    await ensureSvAccounts(prisma);
    const acc = await getSvAccountByKind(filters.compte, prisma);
    where.accountId = acc.id;
  }
  if (filters.category) {
    where.category = filters.category;
  } else if (filters.categorie) {
    where.category = categoryWhereForFamily(filters.categorie);
  }
  if (q) {
    where.AND = [
      {
        OR: [
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { clientProject: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  return { where, filters, q };
}

async function MouvementsSummary({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { where, filters, q } = await buildMovementWhere(raw);
  const hasFilters = Boolean(
    q ||
      filters.direction ||
      filters.from ||
      filters.to ||
      filters.compte ||
      filters.categorie ||
      filters.category,
  );

  const [inAgg, outAgg] = await Promise.all([
    prisma.svCashMovement.aggregate({
      where: { AND: [where, { direction: "IN" }] },
      _sum: { amount: true },
    }),
    prisma.svCashMovement.aggregate({
      where: { AND: [where, { direction: "OUT" }] },
      _sum: { amount: true },
    }),
  ]);
  const inSum = inAgg._sum.amount ?? 0;
  const outSum = outAgg._sum.amount ?? 0;
  const solde = inSum - outSum;

  const filterChips: string[] = [];
  if (filters.direction) {
    filterChips.push(filters.direction === "IN" ? "Entrées" : "Sorties");
  }
  if (filters.from || filters.to) {
    filterChips.push(`${filters.from ?? "…"} → ${filters.to ?? "…"}`);
  }
  if (filters.compte) {
    filterChips.push(filters.compte === "PHYSICAL" ? "Physique" : "Banque");
  }
  if (filters.categorie) {
    filterChips.push(SV_CATEGORY_FAMILY_LABEL[filters.categorie]);
  }
  if (filters.category) filterChips.push(filters.category);
  if (q) filterChips.push(`« ${q} »`);

  return (
    <>
      {hasFilters && filterChips.length > 0 ? (
        <p className="mb-3 text-sm text-msk-ink/55">
          Filtres : {filterChips.join(" · ")}
        </p>
      ) : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Entrées
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatSvXof(inSum)}
          </p>
        </div>
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Sorties
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatSvXof(outSum)}
          </p>
        </div>
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Solde
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatSvXof(solde)}
          </p>
        </div>
      </div>
    </>
  );
}

async function MouvementsResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { where, filters, q } = await buildMovementWhere(raw);
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const sp: Record<string, string | undefined> = {
    q: q || undefined,
    direction: filters.direction,
    from: filters.from,
    to: filters.to,
    compte: filters.compte,
    categorie: filters.categorie,
    category: filters.category,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, MOVE_SORT_COLUMNS, {
    key: "movedAt",
    dir: "desc",
  });

  const total = await prisma.svCashMovement.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const rows = await prisma.svCashMovement.findMany({
    where,
    orderBy: [
      sort.orderBy as Prisma.SvCashMovementOrderByWithRelationInput[],
      { createdAt: "desc" },
    ],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      account: { select: { kind: true, label: true } },
    },
  });

  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    direction: filters.direction,
    from: filters.from,
    to: filters.to,
    compte: filters.compte,
    categorie: filters.categorie,
    category: filters.category,
    sort: sort.key,
    dir: sort.dir,
  };

  const hasFilters = Boolean(
    q ||
      filters.direction ||
      filters.from ||
      filters.to ||
      filters.compte ||
      filters.categorie ||
      filters.category,
  );

  if (rows.length === 0) {
    return (
      <p className="p-6 text-sm text-msk-ink/55">
        Aucun mouvement
        {hasFilters ? " pour ces filtres" : ""}.
      </p>
    );
  }

  return (
    <>
      <ListTableScroll>
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
            <tr>
              <SortableTh
                label="Date"
                column="movedAt"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/mouvements"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Sens"
                column="direction"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/mouvements"
                searchParams={listParams}
              />
              <SortableTh
                label="Catégorie"
                column="category"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/mouvements"
                searchParams={listParams}
              />
              <SortableTh
                label="Compte"
                column="account"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/mouvements"
                searchParams={listParams}
              />
              <PlainTh>Description</PlainTh>
              <PlainTh>Projet</PlainTh>
              <SortableTh
                label="Montant"
                column="amount"
                sort={sort.key}
                dir={sort.dir}
                pathname="/suivi/mouvements"
                searchParams={listParams}
                defaultDir="desc"
                align="right"
              />
              <PlainTh>Réf.</PlainTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-msk-ink/6">
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {m.movedAt.toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={m.direction === "IN" ? "success" : "coral"}>
                    {m.direction === "IN" ? "Entrée" : "Sortie"}
                  </Badge>
                </td>
                <td className="px-4 py-3">{m.category}</td>
                <td className="px-4 py-3 text-msk-ink/60">
                  {m.account?.label ?? "—"}
                </td>
                <td className="px-4 py-3 text-msk-ink/70">
                  {m.description ?? "—"}
                </td>
                <td className="px-4 py-3 text-msk-ink/60">
                  {m.clientProject ?? "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatSvXof(m.amount)}
                </td>
                <td className="px-4 py-3 text-xs text-msk-ink/45">
                  {m.reference ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListTableScroll>
      <ListPagination
        pathname="/suivi/mouvements"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
