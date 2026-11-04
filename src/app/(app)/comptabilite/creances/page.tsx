import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { computeClientFinancials } from "@/lib/billing/client-financials";
import { formatComMoney } from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListTableScroll } from "@/components/ui/list-table-scroll";

export const metadata: Metadata = { title: "Créances clients" };

export default async function CreancesPage() {
  const user = await requireUser();
  if (
    !hasPermission(user, "cpt.access") &&
    !hasPermission(user, "cpt.etats.view") &&
    !hasPermission(user, "com.reports.view")
  ) {
    redirect("/comptabilite");
  }

  const clients = await prisma.comClient.findMany({
    where: { status: { not: "ARCHIVE" } },
    orderBy: { name: "asc" },
    take: 200,
    select: {
      id: true,
      name: true,
      invoices: {
        select: {
          id: true,
          status: true,
          totalTtc: true,
          amountPaid: true,
          dueDate: true,
          issuedAt: true,
          createdAt: true,
          allocations: {
            select: { paymentId: true, invoiceId: true, amount: true },
          },
          creditNotes: { select: { amount: true } },
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          paidAt: true,
          allocations: { select: { amount: true } },
        },
      },
    },
  });

  const rows = clients
    .map((c) => {
      const fin = computeClientFinancials({
        invoices: c.invoices.map((inv) => ({
          id: inv.id,
          status: inv.status,
          totalTtc: inv.totalTtc,
          amountPaid: inv.amountPaid,
          dueDate: inv.dueDate,
          issuedAt: inv.issuedAt,
          createdAt: inv.createdAt,
          allocations: inv.allocations,
          creditNotesApplied: inv.creditNotes.reduce((s, n) => s + n.amount, 0),
        })),
        payments: c.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paidAt: p.paidAt,
          allocationsSum: p.allocations.reduce((s, a) => s + a.amount, 0),
        })),
      });
      return { client: c, fin };
    })
    .filter((r) => r.fin.totalInvoiced > 0 || r.fin.openReceivable > 0)
    .sort((a, b) => b.fin.openReceivable - a.fin.openReceivable);

  const totalOpen = rows.reduce((s, r) => s + r.fin.openReceivable, 0);
  const totalOverdue = rows.reduce((s, r) => s + r.fin.overdueAmount, 0);
  const totalInvoiced = rows.reduce((s, r) => s + r.fin.totalInvoiced, 0);
  const totalPaid = rows.reduce((s, r) => s + r.fin.totalPaidAllocated, 0);

  return (
    <PageShell>
      <PageHeader
        title="Créances clients"
        description="Facturé ≠ encaissé. Soldes calculés depuis allocations — pas de double-comptage des arriérés."
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Créances" },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Surface className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Facturé
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatComMoney(totalInvoiced)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Encaissé (imputé)
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatComMoney(totalPaid)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Créances ouvertes
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-msk-blue">
            {formatComMoney(totalOpen)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Dont en retard
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-msk-coral">
            {formatComMoney(totalOverdue)}
          </p>
        </Surface>
      </div>

      <Surface className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-msk-ink/50">
            Aucune créance client pour le moment.
          </p>
        ) : (
          <ListTableScroll>
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-msk-ink/10 text-msk-ink/45">
                <tr>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Facturé</th>
                  <th className="px-3 py-3 font-medium">Payé</th>
                  <th className="px-3 py-3 font-medium">Solde</th>
                  <th className="px-3 py-3 font-medium">Retard</th>
                  <th className="px-3 py-3 font-medium">État</th>
                  <th className="px-5 py-3 font-medium">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ client, fin }) => (
                  <tr
                    key={client.id}
                    className="border-b border-msk-ink/5 hover:bg-msk-blue/4"
                  >
                    <td className="px-5 py-3">
                      <Link
                        prefetch={false}
                        href={`/commercial/clients/${client.id}`}
                        className="font-medium text-msk-blue hover:underline"
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatComMoney(fin.totalInvoiced)}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatComMoney(fin.totalPaidAllocated)}
                    </td>
                    <td className="px-3 py-3 tabular-nums font-medium">
                      {formatComMoney(fin.openReceivable)}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-msk-coral">
                      {fin.overdueAmount > 0
                        ? formatComMoney(fin.overdueAmount)
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {fin.openReceivable === 0 ? (
                        <Badge tone="success">Soldé</Badge>
                      ) : fin.overdueAmount > 0 ? (
                        <Badge tone="coral">Retard</Badge>
                      ) : (
                        <Badge tone="blue">Ouvert</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-msk-ink/50">
                      {fin.nextDueDate
                        ? fin.nextDueDate.toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ListTableScroll>
        )}
      </Surface>
    </PageShell>
  );
}
