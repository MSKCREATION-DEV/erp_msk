import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  LayoutDashboard,
  PieChart,
  Plus,
  Wallet,
} from "lucide-react";
import type { Prisma, SvCountry } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermissionFromPaysParam } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import {
  accountBalanceFromMoves,
  ensureSvAccounts,
  formatSvBaselineDateFr,
  getSvAccountByKind,
  SV_ACCOUNT_KIND_LABEL,
} from "@/lib/suivi/accounts";
import {
  SV_COUNTRY_TO_URL,
  svCountryDisplayLabel,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import {
  familyToCategoryFilterValues,
  SV_CATEGORY_FAMILIES,
  SV_CATEGORY_FAMILY_LABEL,
  type SvCategoryFamily,
} from "@/lib/suivi/categories";
import { expenseByFamily, sumFlows } from "@/lib/suivi/dashboard-stats";
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
import { gridKpi2, gridKpi3 } from "@/lib/ui/layout-grids";
import { cn } from "@/lib/utils";
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
import { SvMoneyText } from "@/components/suivi/sv-money-text";

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
  const rawSp = await searchParams;
  const country = requireSvPermissionFromPaysParam(
    user,
    "sv.movements.view",
    rawSp,
  );
  const canManage =
    hasPermission(user, "sv.movements.manage") || user.isSuperAdmin;

  const resultsKey = listKeyFromSearchParams(rawSp);
  const countryLabel = svCountryDisplayLabel(country);

  return (
    <PageShell>
      <PageHeader
        title={`Mouvements · ${countryLabel}`}
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
              <ActionLink
                href={withSvCountryQuery("/suivi/mouvements/nouveau", country)}
                icon={Plus}
              >
                Nouveau mouvement
              </ActionLink>
            ) : null}
          </div>
        }
      />

      <Suspense fallback={<MouvementsSummarySkeleton />}>
        <MouvementsSummary searchParams={searchParams} country={country} />
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
          <MouvementsResults searchParams={searchParams} country={country} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

function MouvementsSummarySkeleton() {
  return (
    <div className="mb-5 space-y-3">
      <div className="h-4 w-64 animate-pulse rounded bg-msk-chalk" />
      <div className={gridKpi3}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-msk-ink/8 bg-white"
          />
        ))}
      </div>
      <div className={gridKpi2}>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-msk-ink/8 bg-msk-chalk/40"
          />
        ))}
      </div>
    </div>
  );
}

function buildMouvementsListHref(
  country: SvCountry,
  params: {
    q?: string;
    direction?: "IN" | "OUT";
    from?: string;
    to?: string;
    compte?: "PHYSICAL" | "BANK";
    categorie?: SvCategoryFamily;
    category?: string;
  },
): string {
  return withSvCountryQuery("/suivi/mouvements", country, {
    q: params.q,
    direction: params.direction,
    from: params.from,
    to: params.to,
    compte: params.compte,
    categorie: params.categorie,
    category: params.category,
  });
}

function ActivityKpiCard({
  href,
  icon: Icon,
  tone,
  label,
  amount,
  amountTone,
  signed,
  hint,
  title,
}: {
  href?: string;
  icon: typeof Wallet;
  tone: "coral" | "blue" | "ink";
  label: string;
  amount?: number;
  amountTone?: "neutral" | "in" | "out" | "warn";
  signed?: boolean;
  hint: string;
  /** Ligne principale alternative (ex. nom de famille) au lieu du montant. */
  title?: string;
}) {
  const iconBg =
    tone === "coral"
      ? "bg-msk-coral/10 text-msk-coral"
      : tone === "blue"
        ? "bg-msk-blue/8 text-msk-blue"
        : "bg-msk-ink/6 text-msk-ink/70";

  const body = (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          iconBg,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/40">
          {label}
        </p>
        {title ? (
          <p className="mt-1 truncate text-base font-semibold text-msk-ink">
            {title}
          </p>
        ) : null}
        {amount !== undefined ? (
          <div className={cn(title ? "mt-0.5" : "mt-1")}>
            <SvMoneyText
              amount={amount}
              tone={amountTone ?? "neutral"}
              size={title ? "sm" : "lg"}
              signed={signed}
            />
          </div>
        ) : null}
        <p className="mt-1 text-[11px] leading-snug text-msk-ink/40">{hint}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch={false}
        className="rounded-xl border border-msk-ink/8 bg-white p-4 transition hover:border-msk-blue/30 hover:shadow-sm"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-msk-ink/8 bg-white p-4">{body}</div>
  );
}

async function buildMovementWhere(
  raw: Record<string, string | string[] | undefined>,
  country: SvCountry,
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
    const acc = await getSvAccountByKind(filters.compte, prisma, country);
    where.accountId = acc.id;
  } else if (country === "MALI") {
    // Legacy : mouvements sans compte = Mali
    where.OR = [
      { account: { country: "MALI" } },
      { accountId: null },
    ];
  } else {
    where.account = { country };
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

/**
 * KPI mouvements (décision 2026-11-13) :
 * - Ne plus afficher Entrées/Sorties/Solde sur *tout* le registre (archive
 *   pré-bascule + ouverture + ops → chiffres trompeurs, ex. Solde négatif).
 * - Afficher l’**activité du filtre** post-bascule via `sumFlows` (hors archive
 *   `countsTowardBalance=false`, hors ouverture, hors transferts) — aligné TB.
 * - Soldes physique / banque = cash réel courant (comptes), séparés.
 * Doc : docs/specs/suivi-tampon/DASHBOARD-KPI.md § Mouvements liste.
 */
async function MouvementsSummary({
  searchParams,
  country,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  country: SvCountry;
}) {
  const raw = await searchParams;
  const { where, filters, q } = await buildMovementWhere(raw, country);
  const hasFilters = Boolean(
    q ||
      filters.direction ||
      filters.from ||
      filters.to ||
      filters.compte ||
      filters.categorie ||
      filters.category,
  );

  const activityWhere: Prisma.SvCashMovementWhereInput = {
    AND: [where, { countsTowardBalance: true }],
  };

  const [activityMoves, accounts, ledgerMoves] = await runSeries([
    () =>
      prisma.svCashMovement.findMany({
        where: activityWhere,
        select: {
          direction: true,
          amount: true,
          category: true,
          accountId: true,
          transferId: true,
          movedAt: true,
        },
      }),
    async () => {
      await ensureSvAccounts(prisma);
      return prisma.svAccount.findMany({
        where: { country },
        orderBy: { kind: "asc" },
        select: { id: true, kind: true, label: true },
      });
    },
    () =>
      prisma.svCashMovement.findMany({
        where: {
          countsTowardBalance: true,
          ...(country === "MALI"
            ? {
                OR: [
                  { account: { country: "MALI" as const } },
                  { accountId: null },
                ],
              }
            : { account: { country } }),
        },
        select: {
          accountId: true,
          direction: true,
          amount: true,
          countsTowardBalance: true,
        },
      }),
  ]);

  const flows = sumFlows(activityMoves);
  const baselineLabel = formatSvBaselineDateFr();

  const balanceByAccount = accounts.map((acc) => ({
    id: acc.id,
    kind: acc.kind,
    label: SV_ACCOUNT_KIND_LABEL[acc.kind],
    balance: accountBalanceFromMoves(
      ledgerMoves.filter((m) => m.accountId === acc.id),
    ),
  }));

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

  const topFamily = expenseByFamily(activityMoves)[0] ?? null;
  const topSharePct =
    topFamily && flows.outOps > 0
      ? Math.round((topFamily.amount / flows.outOps) * 100)
      : null;

  const listFilterBase = {
    q: q || undefined,
    direction: filters.direction,
    from: filters.from,
    to: filters.to,
    compte: filters.compte,
    categorie: filters.categorie,
    category: filters.category,
  };

  const outHref = buildMouvementsListHref(country, {
    ...listFilterBase,
    direction: "OUT",
  });
  const inHref = buildMouvementsListHref(country, {
    ...listFilterBase,
    direction: "IN",
  });
  const topFamilyHref = topFamily
    ? buildMouvementsListHref(country, {
        ...listFilterBase,
        categorie: topFamily.family,
        category: undefined,
        direction: "OUT",
      })
    : undefined;

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/40">
            Activité du filtre
          </p>
          <p className="mt-0.5 text-sm text-msk-ink/55">
            Depuis le {baselineLabel} · hors archive, solde d’ouverture et
            virements internes
            {hasFilters && filterChips.length > 0
              ? ` · ${filterChips.join(" · ")}`
              : ""}
          </p>
        </div>
      </div>

      <div className={gridKpi3}>
        <ActivityKpiCard
          href={outHref}
          icon={ArrowDownRight}
          tone="coral"
          label="Sorties d’activité"
          amount={flows.outOps}
          amountTone="out"
          hint="Dépenses du filtre (pas le solde de caisse)"
        />
        <ActivityKpiCard
          href={inHref}
          icon={ArrowUpRight}
          tone="blue"
          label="Entrées d’activité"
          amount={flows.inOps}
          amountTone="in"
          signed={flows.inOps > 0}
          hint="Encaissements / rentrées du filtre"
        />
        {topFamily ? (
          <ActivityKpiCard
            href={topFamilyHref}
            icon={PieChart}
            tone="ink"
            label="Principale dépense"
            title={topFamily.label}
            amount={topFamily.amount}
            amountTone="out"
            hint={
              topSharePct !== null
                ? `${topSharePct} % des sorties du filtre · voir le détail`
                : "Plus grosse famille de dépenses du filtre"
            }
          />
        ) : (
          <ActivityKpiCard
            icon={PieChart}
            tone="ink"
            label="Principale dépense"
            title="Aucune sortie"
            hint="Pas de dépense d’activité sur ce filtre"
          />
        )}
      </div>

      {!filters.compte && balanceByAccount.length > 0 ? (
        <div className={gridKpi2}>
          {balanceByAccount.map((acc) => (
            <Link
              key={acc.id}
              prefetch={false}
              href={withSvCountryQuery(`/suivi/comptes/${acc.id}`, country)}
              className="rounded-xl border border-msk-ink/8 bg-gradient-to-br from-white via-white to-msk-chalk/80 px-4 py-3.5 transition hover:border-msk-blue/30 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-msk-blue/8 text-msk-blue">
                  {acc.kind === "BANK" ? (
                    <Landmark className="size-4" aria-hidden />
                  ) : (
                    <Wallet className="size-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/40">
                    Solde {acc.label.replace(/^Compte\s+/i, "").toLowerCase()}
                  </p>
                  <div className="mt-0.5">
                    <SvMoneyText
                      amount={acc.balance}
                      tone={acc.balance < 0 ? "warn" : "neutral"}
                      size="md"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-msk-ink/40">
                    Cash réel courant · indépendant du filtre liste
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function MouvementsResults({
  searchParams,
  country,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  country: SvCountry;
}) {
  const raw = await searchParams;
  const { where, filters, q } = await buildMovementWhere(raw, country);
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const pays = SV_COUNTRY_TO_URL[country];
  const sp: Record<string, string | undefined> = {
    pays,
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
      ...(sort.orderBy as Prisma.SvCashMovementOrderByWithRelationInput[]),
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
    pays,
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
    const isTogoEmpty = country === "TOGO" && !hasFilters;
    return (
      <div className="px-6 py-12 text-center" role="status">
        <p className="text-sm font-medium text-msk-ink">
          {isTogoEmpty
            ? "Aucun mouvement Togo"
            : hasFilters
              ? "Aucun mouvement sur ce filtre"
              : "Aucun mouvement"}
        </p>
        <p className="mt-1 text-sm text-msk-ink/55">
          {isTogoEmpty
            ? "Aucune entrée ni sortie enregistrée pour le Togo. Commencez par un crédit de caisse ou de banque."
            : hasFilters
              ? "Aucun résultat pour ces critères (période, compte, sens…)."
              : "Aucune écriture sur ce registre."}
        </p>
        {isTogoEmpty ? (
          <div className="mt-4 flex justify-center">
            <ActionLink
              href={withSvCountryQuery("/suivi/mouvements/nouveau", country)}
              icon={Plus}
            >
              Saisir un mouvement
            </ActionLink>
          </div>
        ) : null}
      </div>
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
                <td className="px-4 py-3 text-right">
                  <SvMoneyText
                    amount={m.direction === "OUT" ? -m.amount : m.amount}
                    tone={m.direction === "IN" ? "in" : "out"}
                    size="sm"
                    signed
                  />
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
