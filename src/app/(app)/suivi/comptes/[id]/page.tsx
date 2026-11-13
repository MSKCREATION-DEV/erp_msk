import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import {
  accountBalanceFromMoves,
  formatSvBaselineDateFr,
  SV_ACCOUNT_KIND_HINT,
  SV_ACCOUNT_KIND_LABEL,
} from "@/lib/suivi/accounts";
import { formatSvXof } from "@/lib/suivi/labels";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { firstParam } from "@/lib/list/search-params";
import { listKeyFromSearchParams } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { ActionLink } from "@/components/ui/action-link";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { Badge } from "@/components/ui/badge";
import { SvCompteHistoryToolbar } from "@/components/suivi/compte-history-toolbar";

export const metadata: Metadata = { title: "Compte · Suivi" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const histFilterSchema = z.object({
  direction: z.enum(["IN", "OUT"]).optional(),
  from: z.string().regex(ISO_DATE).optional(),
  to: z.string().regex(ISO_DATE).optional(),
});

export default async function SuiviCompteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.accounts.view");
  const { id } = await params;

  const account = await prisma.svAccount.findUnique({ where: { id } });
  if (!account) notFound();

  const balanceMoves = await prisma.svCashMovement.findMany({
    where: { accountId: id, countsTowardBalance: true },
    select: {
      direction: true,
      amount: true,
      countsTowardBalance: true,
    },
  });

  const balance = accountBalanceFromMoves(balanceMoves);
  const canManage =
    hasPermission(user, "sv.accounts.manage") || user.isSuperAdmin;
  const baselineLabel = account.baselineAt
    ? formatSvBaselineDateFr(account.baselineAt)
    : null;

  const rawSp = await searchParams;
  const resultsKey = listKeyFromSearchParams(rawSp);

  return (
    <PageShell>
      <PageHeader
        title={SV_ACCOUNT_KIND_LABEL[account.kind]}
        description={SV_ACCOUNT_KIND_HINT[account.kind]}
        backHref="/suivi/comptes"
        actions={
          canManage ? (
            <ActionLink
              href={`/suivi/comptes/${account.id}/mouvement`}
              icon={Plus}
            >
              Créditer / débiter
            </ActionLink>
          ) : null
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Surface className="p-4 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            Solde courant
          </p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              balance < 0 ? "text-msk-coral" : "text-msk-ink"
            }`}
          >
            {formatSvXof(balance)}
          </p>
          {baselineLabel && account.baselineBalance != null ? (
            <p className="mt-2 text-xs text-msk-ink/50">
              Solde au {baselineLabel} :{" "}
              <span className="tabular-nums font-medium text-msk-ink/70">
                {formatSvXof(account.baselineBalance)}
              </span>
              <span className="mt-0.5 block text-msk-ink/40">
                Ouverture Direction — début de journée
              </span>
            </p>
          ) : null}
        </Surface>
        <Surface className="p-4 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            Note
          </p>
          <p className="mt-1 text-sm text-msk-ink/70">
            {account.notes ??
              "Chaque mouvement post-bascule met à jour le solde courant. L’historique antérieur reste visible en archive."}
          </p>
        </Surface>
      </div>

      <Surface className="mb-5 overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <Suspense
            fallback={
              <div className="h-16 w-full animate-pulse rounded-xl bg-msk-chalk" />
            }
          >
            <SvCompteHistoryToolbar />
          </Suspense>
        </div>
      </Surface>

      <Suspense key={resultsKey} fallback={<CompteHistorySkeleton />}>
        <CompteHistorySections
          accountId={id}
          canManage={canManage}
          baselineLabel={baselineLabel}
          searchParams={searchParams}
        />
      </Suspense>
    </PageShell>
  );
}

function CompteHistorySkeleton() {
  return (
    <div className="space-y-5">
      <Surface className="overflow-hidden p-0">
        <ListTableSkeleton rows={6} cols={5} />
      </Surface>
    </div>
  );
}

async function CompteHistorySections({
  accountId,
  canManage,
  baselineLabel,
  searchParams,
}: {
  accountId: string;
  canManage: boolean;
  baselineLabel: string | null;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const parsed = histFilterSchema.safeParse({
    direction: firstParam(raw.direction),
    from: firstParam(raw.from),
    to: firstParam(raw.to),
  });
  const filters = parsed.success ? parsed.data : {};

  const baseFilter: Prisma.SvCashMovementWhereInput = {
    accountId,
  };
  if (filters.direction) baseFilter.direction = filters.direction;
  if (filters.from || filters.to) {
    baseFilter.movedAt = {};
    if (filters.from) {
      baseFilter.movedAt.gte = new Date(`${filters.from}T00:00:00.000Z`);
    }
    if (filters.to) {
      baseFilter.movedAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
    }
  }
  if (q) {
    baseFilter.AND = [
      {
        OR: [
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const currentWhere: Prisma.SvCashMovementWhereInput = {
    AND: [baseFilter, { countsTowardBalance: true }],
  };
  const archiveWhere: Prisma.SvCashMovementWhereInput = {
    AND: [baseFilter, { countsTowardBalance: false }],
  };

  const pageSize = DEFAULT_PAGE_SIZE;
  const requestedPage = parsePage(firstParam(raw.page));
  const requestedHPage = parsePage(firstParam(raw.hpage));

  const [currentTotal, archiveTotal] = await runSeries([
    () => prisma.svCashMovement.count({ where: currentWhere }),
    () => prisma.svCashMovement.count({ where: archiveWhere }),
  ]);

  const page = clampPage(requestedPage, currentTotal, pageSize);
  const hpage = clampPage(requestedHPage, archiveTotal, pageSize);

  const [currentMoves, archivedMoves] = await runSeries([
    () =>
      prisma.svCashMovement.findMany({
        where: currentWhere,
        orderBy: [{ movedAt: "desc" }, { createdAt: "desc" }],
        skip: pageSkip(page, pageSize),
        take: pageSize,
      }),
    () =>
      prisma.svCashMovement.findMany({
        where: archiveWhere,
        orderBy: [{ movedAt: "desc" }, { createdAt: "desc" }],
        skip: pageSkip(hpage, pageSize),
        take: pageSize,
      }),
  ]);

  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    direction: filters.direction,
    from: filters.from,
    to: filters.to,
  };

  const hasFilters = Boolean(
    q || filters.direction || filters.from || filters.to,
  );
  const filterHint = hasFilters ? " pour ces filtres" : "";

  return (
    <div className="space-y-5">
      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-msk-ink/6 bg-msk-blue/4 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-blue/80">
              Courant
            </p>
            <h2 className="text-sm font-semibold text-msk-ink">
              Mouvements post-bascule
            </h2>
            <p className="mt-0.5 text-xs text-msk-ink/45">
              Ouverture + opérations depuis la bascule — impactent le solde ·{" "}
              {currentTotal} ligne{currentTotal === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {currentMoves.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">
            Aucun mouvement courant{filterHint}.
            {canManage && !hasFilters ? (
              <>
                {" "}
                <Link
                  href={`/suivi/comptes/${accountId}/mouvement`}
                  className="font-medium text-msk-blue hover:underline"
                >
                  Saisir une opération
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <>
            <MovementsTable rows={currentMoves} />
            <ListPagination
              pathname={`/suivi/comptes/${accountId}`}
              searchParams={{ ...listParams, hpage: String(hpage) }}
              page={page}
              totalPages={totalPages(currentTotal, pageSize)}
              total={currentTotal}
              pageSize={pageSize}
            />
          </>
        )}
      </Surface>

      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-msk-ink/6 bg-msk-chalk/70 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/40">
              Archive
            </p>
            <h2 className="text-sm font-semibold text-msk-ink">
              Historique avant bascule
            </h2>
            <p className="mt-0.5 text-xs text-msk-ink/45">
              Avant le {baselineLabel ?? "12/11/2026"} — traçabilité, exclu du
              solde · {archiveTotal} ligne{archiveTotal === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {archiveTotal === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">
            {hasFilters
              ? `Aucun mouvement archivé${filterHint}.`
              : "Pas d’historique archivé sur ce compte."}
          </p>
        ) : archivedMoves.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">
            Aucun résultat archive{filterHint} sur cette page.
          </p>
        ) : (
          <>
            <MovementsTable rows={archivedMoves} archived />
            <ListPagination
              pathname={`/suivi/comptes/${accountId}`}
              searchParams={{
                ...listParams,
                page: String(page),
              }}
              pageParam="hpage"
              page={hpage}
              totalPages={totalPages(archiveTotal, pageSize)}
              total={archiveTotal}
              pageSize={pageSize}
            />
          </>
        )}
      </Surface>
    </div>
  );
}

function MovementsTable({
  rows,
  archived = false,
}: {
  rows: {
    id: string;
    movedAt: Date;
    direction: "IN" | "OUT";
    category: string;
    description: string | null;
    reference: string | null;
    amount: number;
    transferId: string | null;
  }[];
  archived?: boolean;
}) {
  return (
    <ListTableScroll>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Sens</th>
            <th className="px-4 py-3 font-medium">Catégorie</th>
            <th className="px-4 py-3 font-medium">Motif</th>
            <th className="px-4 py-3 font-medium text-right">Montant</th>
          </tr>
        </thead>
        <tbody
          className={`divide-y divide-msk-ink/6 ${archived ? "bg-msk-chalk/30" : ""}`}
        >
          {rows.map((m) => (
            <tr key={m.id} className={archived ? "text-msk-ink/55" : undefined}>
              <td className="px-4 py-3 tabular-nums text-msk-ink/70">
                {m.movedAt.toLocaleDateString("fr-FR")}
                {m.transferId ? (
                  <span className="ml-1 text-xs text-msk-blue">transfert</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                {archived ? (
                  <span className="font-medium text-msk-ink/50">
                    {m.direction === "IN" ? "Entrée" : "Sortie"}
                  </span>
                ) : (
                  <Badge tone={m.direction === "IN" ? "success" : "coral"}>
                    {m.direction === "IN" ? "Entrée" : "Sortie"}
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-msk-ink/70">{m.category}</td>
              <td className="px-4 py-3 text-msk-ink/60">
                {m.description ?? "—"}
                {m.reference ? (
                  <span className="block text-xs text-msk-ink/40">
                    {m.reference}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {m.direction === "OUT" ? "−" : "+"}
                {formatSvXof(m.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ListTableScroll>
  );
}
