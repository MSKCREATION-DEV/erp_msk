import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvAccess } from "@/lib/suivi/access";
import { listSvCountriesForUser } from "@/lib/suivi/country";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import { SuiviHubGrid } from "@/components/suivi/suivi-hub-cards";
import { SuiviCountryPicker } from "@/components/suivi/suivi-country-picker";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = { title: "Suivi" };

export default async function SuiviHubPage() {
  const user = await requireUser();
  requireSvAccess(user);

  const countries = listSvCountriesForUser(user);
  const canClients =
    hasPermission(user, "sv.clients.view") || user.isSuperAdmin;
  const canInvoices =
    hasPermission(user, "sv.invoices.view") || user.isSuperAdmin;
  const canExpenses =
    hasPermission(user, "sv.expenses.view") || user.isSuperAdmin;
  const canHr = hasPermission(user, "sv.hr.view") || user.isSuperAdmin;
  const canCountryPillars =
    hasPermission(user, "sv.accounts.view") ||
    hasPermission(user, "sv.movements.view") ||
    hasPermission(user, "sv.stock.view") ||
    user.isSuperAdmin;

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
        description="Tampon clients · trésorerie par pays · stocks — direction / admins."
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
      <div className="space-y-8">
        {canCountryPillars ? (
          <SuiviCountryPicker countries={countries} />
        ) : null}
        <SuiviHubGrid
          allowed={allowed}
          counts={{
            clients,
            factures: { value: unpaid, hint: "à encaisser" },
            charges: { value: unpaidCharges, hint: "à payer" },
            absences: { value: absencesToday, hint: "aujourd’hui" },
            retards: { value: latesWeek, hint: "7 jours" },
          }}
        />
      </div>
    </PageShell>
  );
}
