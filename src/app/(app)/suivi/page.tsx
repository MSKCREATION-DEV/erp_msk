import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvAccess } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import { SuiviHubGrid } from "@/components/suivi/suivi-hub-cards";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";

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
  const canHr = hasPermission(user, "sv.hr.view") || user.isSuperAdmin;

  const allowed = new Set(
    [
      "sv.access",
      "sv.clients.view",
      "sv.invoices.view",
      "sv.expenses.view",
      "sv.accounts.view",
      "sv.movements.view",
      "sv.stock.view",
      "sv.hr.view",
    ].filter((c) => hasPermission(user, c) || user.isSuperAdmin),
  );

  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const weekAgo = new Date(todayUtc.getTime() - 6 * 86_400_000);

  const [
    clients,
    unpaidInvoices,
    unpaidExpenses,
    stockZero,
    movementsCount,
    accountsCount,
    absencesToday,
    latesWeek,
  ] = await runSeries([
    () => (canClients ? prisma.svClient.count() : Promise.resolve(0)),
    () =>
      canInvoices
        ? prisma.svInvoice.findMany({
            where: { status: { in: ["EMISE", "PARTIELLE"] } },
            select: { totalTtc: true, amountPaid: true },
          })
        : Promise.resolve([] as { totalTtc: number; amountPaid: number }[]),
    () =>
      canExpenses
        ? prisma.svExpenseInvoice.findMany({
            where: { status: { in: ["EMISE", "PARTIELLE"] } },
            select: { totalTtc: true, amountPaid: true },
          })
        : Promise.resolve([] as { totalTtc: number; amountPaid: number }[]),
    () =>
      canStock
        ? prisma.svStockItem.count({ where: { quantity: 0 } })
        : Promise.resolve(0),
    () =>
      canMovements ? prisma.svCashMovement.count() : Promise.resolve(0),
    () => (canAccounts ? prisma.svAccount.count() : Promise.resolve(0)),
    () =>
      canHr
        ? prisma.svAbsence.count({
            where: {
              status: { not: "ANNULEE" },
              startDate: { lte: todayUtc },
              endDate: { gte: todayUtc },
            },
          })
        : Promise.resolve(0),
    () =>
      canHr
        ? prisma.svLate.count({
            where: {
              status: "ENREGISTRE",
              lateDate: { gte: weekAgo, lte: todayUtc },
            },
          })
        : Promise.resolve(0),
  ]);

  const unpaid = unpaidInvoices.filter((i) => i.amountPaid < i.totalTtc).length;
  const unpaidCharges = unpaidExpenses.filter(
    (i) => i.amountPaid < i.totalTtc,
  ).length;

  return (
    <PageShell>
      <PageHeader
        title="Suivi"
        description="Tampon clients · mouvements · stocks — direction / admins."
        breadcrumbs={[{ label: "Accueil", href: "/accueil" }]}
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
      {/*
        Pas de bandeau KPI hybride (ex. « Impayés clients / charges »).
        Comme Commercial : un KPI par carte module, sections métier séparées.
      */}
      <SuiviHubGrid
        allowed={allowed}
        counts={{
          clients,
          factures: { value: unpaid, hint: "à encaisser" },
          charges: { value: unpaidCharges, hint: "à payer" },
          comptes: accountsCount || 2,
          mouvements: movementsCount,
          absences: { value: absencesToday, hint: "aujourd’hui" },
          retards: { value: latesWeek, hint: "7 jours" },
          stocks: { value: stockZero, hint: "à zéro" },
        }}
      />
    </PageShell>
  );
}
