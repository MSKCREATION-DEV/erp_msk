import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comInvoiceOwnerScopeWhere } from "@/lib/commercial/scope";
import {
  formatComMoney,
  INVOICE_STATUS_LABELS,
} from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Factures" };

export default async function CommercialFacturesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "com.access")) redirect("/accueil");

  const invoices = await prisma.comInvoice.findMany({
    where: comInvoiceOwnerScopeWhere(user),
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { client: { select: { name: true } } },
  });

  const linked =
    invoices.length > 0
      ? await prisma.cptEntry.findMany({
          where: {
            sourceType: "COM_INVOICE",
            sourceId: { in: invoices.map((i) => i.id) },
          },
          select: { sourceId: true, status: true },
        })
      : [];
  const linkedMap = new Map(
    linked
      .filter((e): e is typeof e & { sourceId: string } => !!e.sourceId)
      .map((e) => [e.sourceId, e.status]),
  );

  return (
    <PageShell>
      <PageHeader
        title="Factures"
        description="Émission, paiements et lien compta."
        backHref="/commercial"
        backLabel="Retour Menu"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Factures" },
        ]}
      />

      {invoices.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucune facture. Créez-en une depuis un devis accepté ou envoyé.
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">TTC</th>
                <th className="px-4 py-3 font-medium">Payé</th>
                <th className="px-4 py-3 font-medium">Compta</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const entryStatus = linkedMap.get(inv.id);
                const isIssued = [
                  "EMISE",
                  "PARTIELLEMENT_PAYEE",
                  "PAYEE",
                ].includes(inv.status);
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        prefetch={false}
                        href={`/commercial/factures/${inv.id}`}
                        className="font-medium text-msk-blue hover:underline"
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.client.name}</td>
                    <td className="px-4 py-3">
                      <Badge tone="muted">
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {formatComMoney(inv.totalTtc, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {formatComMoney(inv.amountPaid, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {entryStatus === "VALIDATED" ? (
                        <Badge tone="success">Validée</Badge>
                      ) : entryStatus ? (
                        <Badge tone="blue">Brouillon</Badge>
                      ) : isIssued ? (
                        <Badge tone="coral">À faire</Badge>
                      ) : (
                        <span className="text-msk-ink/35">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Surface>
      )}
    </PageShell>
  );
}
