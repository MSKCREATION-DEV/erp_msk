import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { formatComMoney, INVOICE_STATUS_LABELS } from "@/lib/commercial/labels";
import { ProposeInvoiceButton } from "@/components/comptabilite/propose-invoice-button";

export const metadata: Metadata = { title: "À comptabiliser" };

/** Factures COM émises/payées sans écriture VE liée — file comptable. */
export default async function AComptabiliserPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.ecritures.manage")) redirect("/accueil");

  const linked = await prisma.cptEntry.findMany({
    where: { sourceType: "COM_INVOICE", sourceId: { not: null } },
    select: { sourceId: true },
  });
  const linkedIds = new Set(
    linked.map((e) => e.sourceId).filter((id): id is string => !!id),
  );

  const invoices = await prisma.comInvoice.findMany({
    where: {
      status: { in: ["EMISE", "PARTIELLEMENT_PAYEE", "PAYEE"] },
    },
    orderBy: { issuedAt: "desc" },
    take: 100,
    include: {
      client: { select: { name: true } },
    },
  });

  const pending = invoices.filter((i) => !linkedIds.has(i.id));
  const done = invoices.filter((i) => linkedIds.has(i.id)).slice(0, 20);

  return (
    <PageShell>
      <PageHeader
        title="À comptabiliser"
        description="Factures Commercial émises ou payées — proposer l’écriture VE SYSCOHADA."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "À comptabiliser" },
        ]}
      />

      <Surface className="overflow-x-auto p-0">
        {pending.length === 0 ? (
          <p className="p-8 text-center text-sm text-msk-ink/50">
            Aucune facture en attente d’écriture.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Facture</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">TTC</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((inv) => (
                <tr key={inv.id} className="border-b border-msk-ink/5">
                  <td className="px-4 py-3">
                    <Link
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
                    <ProposeInvoiceButton invoiceId={inv.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>

      {done.length > 0 ? (
        <Surface className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-msk-ink">
            Déjà liées (récentes)
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-msk-ink/60">
            {done.map((inv) => (
              <li key={inv.id}>
                {inv.number} — {inv.client.name}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </PageShell>
  );
}
