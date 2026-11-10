import type { Metadata } from "next";
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
  const canMovements =
    hasPermission(user, "sv.movements.view") || user.isSuperAdmin;
  const canStock = hasPermission(user, "sv.stock.view") || user.isSuperAdmin;

  const allowed = new Set(
    [
      "sv.access",
      "sv.clients.view",
      "sv.invoices.view",
      "sv.movements.view",
      "sv.stock.view",
    ].filter((c) => hasPermission(user, c) || user.isSuperAdmin),
  );

  const [clients, unpaidInvoices, stockZero, inAgg, outAgg, movementsCount] =
    await Promise.all([
      canClients ? prisma.svClient.count() : Promise.resolve(0),
      canInvoices
        ? prisma.svInvoice.findMany({
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
    ]);

  const unpaid = unpaidInvoices.filter((i) => i.amountPaid < i.totalTtc).length;
  const solde = (inAgg._sum.amount ?? 0) - (outAgg._sum.amount ?? 0);

  return (
    <PageShell>
      <PageHeader
        title="Suivi"
        description="Tampon clients · mouvements · stocks — direction / admins."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
            Impayés (factures)
          </p>
          <p className="mt-1 text-2xl font-semibold text-msk-ink">{unpaid}</p>
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
          clients,
          factures: { value: unpaid, hint: "à encaisser" },
          mouvements: movementsCount,
          stocks: { value: stockZero, hint: "à zéro" },
        }}
      />
    </PageShell>
  );
}
