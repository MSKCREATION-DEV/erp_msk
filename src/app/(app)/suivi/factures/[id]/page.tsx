import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { invoiceReste } from "@/lib/suivi/balances";
import { listSvLinkedDocuments, SV_GED_ENTITY } from "@/lib/suivi/ged";
import {
  formatSvXof,
  SV_INVOICE_STATUS_LABEL,
  SV_INVOICE_STATUS_TONE,
} from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { SvPaymentForm } from "@/components/suivi/payment-form";
import { SvGedDocActions } from "@/components/suivi/ged-doc-actions";

export const metadata: Metadata = { title: "Facture · Suivi" };

export default async function SuiviFactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.invoices.view");
  const { id } = await params;

  const invoice = await prisma.svInvoice.findUnique({
    where: { id },
    include: {
      client: true,
      lines: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const reste = invoiceReste(invoice);
  const canPay =
    hasPermission(user, "sv.invoices.manage") || user.isSuperAdmin;

  const gedLinks = await listSvLinkedDocuments({
    entityType: SV_GED_ENTITY.INVOICE,
    entityId: invoice.id,
  });
  const primaryGed = gedLinks[0]?.document ?? null;

  return (
    <PageShell>
      <PageHeader
        title={invoice.number ?? "Facture"}
        description={`${invoice.client.name}${invoice.object ? ` · ${invoice.object}` : ""}`}
        backHref="/suivi/factures"
        actions={
          <Link
            href={`/suivi/clients/${invoice.clientId}`}
            className="inline-flex h-9 items-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium hover:bg-msk-chalk"
          >
            Fiche client
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={SV_INVOICE_STATUS_TONE[invoice.status]}>
          {SV_INVOICE_STATUS_LABEL[invoice.status]}
        </Badge>
        <span className="text-sm text-msk-ink/60">
          TTC {formatSvXof(invoice.totalTtc)} · Payé{" "}
          {formatSvXof(invoice.amountPaid)} · Reste{" "}
          <span className={reste > 0 ? "font-medium text-msk-coral" : ""}>
            {formatSvXof(reste)}
          </span>
        </span>
      </div>

      {canPay ? <SvPaymentForm invoiceId={invoice.id} reste={reste} /> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-msk-ink/6 px-4 py-3">
            <h2 className="text-sm font-semibold">Lignes</h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-caps text-msk-ink/45">
              <tr className="border-b border-msk-ink/6">
                <th className="px-4 py-2 text-left font-medium">Libellé</th>
                <th className="px-4 py-2 text-right font-medium">Qté</th>
                <th className="px-4 py-2 text-right font-medium">PU</th>
                <th className="px-4 py-2 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-ink/6">
              {invoice.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{l.label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.qty}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatSvXof(l.unitPrice)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatSvXof(l.qty * l.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-msk-ink/6 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span>HT</span>
              <span className="tabular-nums">{formatSvXof(invoice.totalHt)}</span>
            </div>
            <div className="flex justify-between">
              <span>TVA</span>
              <span className="tabular-nums">
                {formatSvXof(invoice.totalVat)}
              </span>
            </div>
            <div className="mt-1 flex justify-between font-semibold">
              <span>TTC</span>
              <span className="tabular-nums">
                {formatSvXof(invoice.totalTtc)}
              </span>
            </div>
          </div>
        </Surface>

        <Surface className="overflow-hidden p-0">
          <div className="border-b border-msk-ink/6 px-4 py-3">
            <h2 className="text-sm font-semibold">Paiements</h2>
          </div>
          {invoice.payments.length === 0 ? (
            <p className="p-4 text-sm text-msk-ink/55">Aucun paiement.</p>
          ) : (
            <ul className="divide-y divide-msk-ink/6">
              {invoice.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between px-4 py-3 text-sm"
                >
                  <span>
                    {p.paidAt.toLocaleDateString("fr-FR")}
                    {p.method ? ` · ${p.method}` : ""}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="tabular-nums font-medium">
                    {formatSvXof(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {invoice.notes ? (
            <p className="border-t border-msk-ink/6 px-4 py-3 text-xs text-msk-ink/55">
              {invoice.notes}
            </p>
          ) : null}
          <div className="border-t border-msk-ink/6 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
              Document GED
            </p>
            {primaryGed ? (
              <>
                <p className="mt-1 text-sm text-msk-ink">
                  {primaryGed.originalName}
                </p>
                <SvGedDocActions
                  documentId={primaryGed.id}
                  originalName={primaryGed.originalName}
                  mime={primaryGed.mime}
                  size={primaryGed.size}
                />
              </>
            ) : invoice.sourceDocument ? (
              <p className="mt-1 text-xs text-msk-ink/40">
                Source : {invoice.sourceDocument} (GED non lié — relancer seed)
              </p>
            ) : (
              <p className="mt-1 text-sm text-msk-ink/55">Aucun document lié.</p>
            )}
          </div>
        </Surface>
      </div>
    </PageShell>
  );
}
