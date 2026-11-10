import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { invoiceReste } from "@/lib/suivi/balances";
import {
  formatSvXof,
  SV_INVOICE_STATUS_LABEL,
  SV_INVOICE_STATUS_TONE,
} from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ClickableRowLink } from "@/components/ui/clickable-row-link";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Factures · Suivi" };

export default async function SuiviFacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ reste?: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.invoices.view");
  const canManage =
    hasPermission(user, "sv.invoices.manage") || user.isSuperAdmin;
  const sp = await searchParams;
  const onlyReste = sp.reste === "1";

  const invoices = await prisma.svInvoice.findMany({
    where: { status: { not: "ANNULEE" } },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    include: { client: { select: { id: true, name: true } } },
  });

  const rows = onlyReste
    ? invoices.filter((i) => invoiceReste(i) > 0)
    : invoices;

  return (
    <PageShell>
      <PageHeader
        title="Factures"
        description="Payé / reste — remix depuis l’historique."
        backHref="/suivi"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={onlyReste ? "/suivi/factures" : "/suivi/factures?reste=1"}
              className="inline-flex h-9 items-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium hover:bg-msk-chalk"
            >
              {onlyReste ? "Toutes" : "Reste > 0"}
            </Link>
            {canManage ? (
              <Link
                href="/suivi/factures/nouveau"
                className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
              >
                Nouvelle (remix)
              </Link>
            ) : null}
          </div>
        }
      />
      <Surface className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">Aucune facture.</p>
        ) : (
          <ListTableScroll>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">TTC</th>
                  <th className="px-4 py-3 font-medium text-right">Payé</th>
                  <th className="px-4 py-3 font-medium text-right">Reste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {rows.map((inv) => {
                  const reste = invoiceReste(inv);
                  return (
                    <ClickableRowLink
                      key={inv.id}
                      href={`/suivi/factures/${inv.id}`}
                    >
                      <td className="px-4 py-3 font-medium">
                        {inv.number ?? "—"}
                      </td>
                      <td className="px-4 py-3">{inv.client.name}</td>
                      <td className="px-4 py-3">
                        <Badge tone={SV_INVOICE_STATUS_TONE[inv.status]}>
                          {SV_INVOICE_STATUS_LABEL[inv.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatSvXof(inv.totalTtc)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatSvXof(inv.amountPaid)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          reste > 0 ? "font-medium text-msk-coral" : ""
                        }`}
                      >
                        {formatSvXof(reste)}
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
