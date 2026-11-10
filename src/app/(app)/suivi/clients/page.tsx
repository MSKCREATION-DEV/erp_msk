import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { clientBalance } from "@/lib/suivi/balances";
import { formatSvXof } from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { ActionLink } from "@/components/ui/action-link";
import { SvClientListActions } from "@/components/suivi/client-list-actions";

export const metadata: Metadata = { title: "Clients · Suivi" };

export default async function SuiviClientsPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.clients.view");
  const canManage =
    hasPermission(user, "sv.clients.manage") || user.isSuperAdmin;
  const canInvoice =
    hasPermission(user, "sv.invoices.manage") || user.isSuperAdmin;

  const clients = await prisma.svClient.findMany({
    orderBy: { name: "asc" },
    include: {
      invoices: {
        where: { status: { not: "ANNULEE" } },
        select: {
          totalTtc: true,
          amountPaid: true,
          status: true,
          dueAt: true,
          issuedAt: true,
        },
      },
      _count: { select: { invoices: true, contracts: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Clients"
        description="Soldes, restants, factures et contrats — tampon Suivi."
        backHref="/suivi"
        actions={
          canManage ? (
            <ActionLink href="/suivi/clients/nouveau" icon={UserPlus}>
              Nouveau client
            </ActionLink>
          ) : null
        }
      />
      <Surface className="overflow-hidden p-0">
        {clients.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">
            Aucun client. Lancez le seed Suivi ou créez un client.
          </p>
        ) : (
          <ListTableScroll>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium text-right">Totale</th>
                  <th className="px-4 py-3 font-medium text-right">Payé</th>
                  <th className="px-4 py-3 font-medium text-right">Restant</th>
                  <th className="px-4 py-3 font-medium text-right">À venir</th>
                  <th className="px-4 py-3 font-medium text-right">Factures</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {clients.map((c) => {
                  const bal = clientBalance(c.invoices);
                  return (
                    <ClickableRowLink
                      key={c.id}
                      href={`/suivi/clients/${c.id}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-msk-ink">{c.name}</p>
                        <p className="text-xs text-msk-ink/45">
                          {[c.city, c.country].filter(Boolean).join(" · ") ||
                            "—"}
                          {c._count.contracts > 0
                            ? ` · ${c._count.contracts} contrat${c._count.contracts > 1 ? "s" : ""}`
                            : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-msk-ink/60">
                        <p>{c.contactName ?? "—"}</p>
                        {c.phone ? (
                          <p className="text-xs text-msk-ink/40">{c.phone}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatSvXof(bal.totale)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatSvXof(bal.paye)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          bal.restant > 0 ? "font-medium text-msk-coral" : ""
                        }`}
                      >
                        {formatSvXof(bal.restant)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-msk-ink/60">
                        {formatSvXof(bal.aVenir)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-msk-ink/60">
                        {c._count.invoices}
                      </td>
                      <td className="px-2 py-3">
                        <SvClientListActions
                          clientId={c.id}
                          canEdit={canManage}
                          canInvoice={canInvoice}
                          hasUnpaid={bal.restant > 0}
                        />
                      </td>
                    </ClickableRowLink>
                  );
                })}
              </tbody>
            </table>
          </ListTableScroll>
        )}
      </Surface>
    </PageShell>
  );
}
