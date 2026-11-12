import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvAccess } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { SuiviHubGrid } from "@/components/suivi/suivi-hub-cards";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { formatSvXof } from "@/lib/suivi/labels";

export const metadata: Metadata = { title: "Suivi" };

export default async function SuiviHubPage() {
  const user = await requireUser();
  requireSvAccess(user);

  const canClients =
    hasPermission(user, "sv.clients.view") || user.isSuperAdmin;
  const canInvoices =
    hasPermission(user, "sv.invoices.view") || user.isSuperAdmin;
  const canExpenses =
    hasPermission(user, "sv.expenses.view") || user.isSuperAdmin;
  const canMovements =
    hasPermission(user, "sv.movements.view") || user.isSuperAdmin;
  const canAccounts =
    hasPermission(user, "sv.accounts.view") || user.isSuperAdmin;
  const canStock = hasPermission(user, "sv.stock.view") || user.isSuperAdmin;

  const allowed = new Set(
    [
      "sv.access",
      "sv.clients.view",
      "sv.invoices.view",
      "sv.expenses.view",
      "sv.accounts.view",
      "sv.movements.view",
      "sv.stock.view",
    ].filter((c) => hasPermission(user, c) || user.isSuperAdmin),
  );

  const [
    clients,
    unpaidInvoices,
    unpaidExpenses,
    stockZero,
    inAgg,
    outAgg,
    movementsCount,
    accountsCount,
  ] = await Promise.all([
    canClients ? prisma.svClient.count() : Promise.resolve(0),
    canInvoices
      ? prisma.svInvoice.findMany({
          where: { status: { in: ["EMISE", "PARTIELLE"] } },
          select: { totalTtc: true, amountPaid: true },
        })
      : Promise.resolve([] as { totalTtc: number; amountPaid: number }[]),
    canExpenses
      ? prisma.svExpenseInvoice.findMany({
          where: { status: { in: ["EMISE", "PARTIELLE"] } },
          select: { totalTtc: true, amountPaid: true },
        })
      : Promise.resolve([] as { totalTtc: number; amountPaid: number }[]),
    canStock
      ? prisma.svStockItem.count({ where: { quantity: 0 } })
      : Promise.resolve(0),
    canMovements
      ? prisma.svCashMovement.aggregate({
          where: { direction: "IN" },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
    canMovements
      ? prisma.svCashMovement.aggregate({
          where: { direction: "OUT" },
          _sum: { amount: true },
        })
      : Promise.resolve({ _sum: { amount: 0 } }),
    canMovements ? prisma.svCashMovement.count() : Promise.resolve(0),
    canAccounts ? prisma.svAccount.count() : Promise.resolve(0),
  ]);

  const unpaid = unpaidInvoices.filter((i) => i.amountPaid < i.totalTtc).length;
  const unpaidCharges = unpaidExpenses.filter(
    (i) => i.amountPaid < i.totalTtc,
  ).length;
  const solde = (inAgg._sum.amount ?? 0) - (outAgg._sum.amount ?? 0);

  return (
    <PageShell>
      <PageHeader
        title="Suivi"
        description="Tampon clients · mouvements · stocks — direction / admins."
        actions={
          <Link
            prefetch={false}
            href="/suivi/tableau-de-bord"
            className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Tableau de bord
          </Link>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            Impayés clients / charges
          </p>
          <p className="mt-1 text-2xl font-semibold text-msk-ink">
            {unpaid}
            <span className="text-base font-medium text-msk-ink/45">
              {" "}
              / {unpaidCharges}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            Solde mouvements
          </p>
          <p className="mt-1 text-2xl font-semibold text-msk-ink">
            {formatSvXof(solde)}
          </p>
        </div>
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            Stocks à zéro
          </p>
          <p className="mt-1 text-2xl font-semibold text-msk-ink">{stockZero}</p>
        </div>
      </div>
      <SuiviHubGrid
        allowed={allowed}
        counts={{
          dashboard: { value: unpaid, hint: "impayés" },
          clients,
          factures: { value: unpaid, hint: "à encaisser" },
          charges: { value: unpaidCharges, hint: "à payer" },
          comptes: accountsCount || 2,
          mouvements: movementsCount,
          stocks: { value: stockZero, hint: "à zéro" },
        }}
      />
    </PageShell>
  );
}
