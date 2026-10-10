import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { canAccessOwned } from "@/lib/commercial/scope";
import {
  formatComMoney,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { InvoiceActions } from "@/components/commercial/invoice-actions";
import { PaymentForm } from "@/components/commercial/payment-form";

export const metadata: Metadata = { title: "Facture" };

export default async function CommercialFactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "com.access")) redirect("/accueil");
  const { id } = await params;

  const invoice = await prisma.comInvoice.findUnique({
    where: { id },
    include: {
      client: true,
      quote: { select: { id: true, number: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      payments: {
        orderBy: { paidAt: "desc" },
        include: {
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!invoice) notFound();
  if (!canAccessOwned(user, invoice.ownerId)) {
    redirect("/commercial/factures");
  }

  const remaining = Math.max(0, invoice.totalTtc - invoice.amountPaid);
  const canPay =
    hasPermission(user, "com.paiements.record") &&
    ["EMISE", "PARTIELLEMENT_PAYEE"].includes(invoice.status);

  return (
    <PageShell>
      <PageHeader
        title={invoice.number}
        description={invoice.client.name}
        backHref="/commercial/factures"
        backLabel="Retour aux factures"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Factures", href: "/commercial/factures" },
          { label: invoice.number },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
        <Badge tone="muted">{invoice.currency}</Badge>
        {invoice.gedDocumentId ? (
          <Badge tone="success">PDF GED</Badge>
        ) : null}
      </div>

      <InvoiceActions
        invoiceId={invoice.id}
        status={invoice.status}
        canIssue={hasPermission(user, "com.factures.issue")}
        canPdf={hasPermission(user, "com.factures.create")}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface className="space-y-2 p-5 text-sm lg:col-span-1">
          <p>
            <span className="text-msk-ink/45">Client </span>
            <Link
              href={`/commercial/clients/${invoice.clientId}`}
              className="text-msk-blue hover:underline"
            >
              {invoice.client.name}
            </Link>
          </p>
          {invoice.quote ? (
            <p>
              <span className="text-msk-ink/45">Devis </span>
              <Link
                href={`/commercial/devis/${invoice.quote.id}`}
                className="text-msk-blue hover:underline"
              >
                {invoice.quote.number}
              </Link>
            </p>
          ) : null}
          <p>
            TTC {formatComMoney(invoice.totalTtc, invoice.currency)}
          </p>
          <p>
            Payé {formatComMoney(invoice.amountPaid, invoice.currency)}
          </p>
          <p className="font-semibold">
            Reste {formatComMoney(remaining, invoice.currency)}
          </p>
        </Surface>

        <Surface className="overflow-x-auto p-0 lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 font-medium">Qté</th>
                <th className="px-4 py-3 font-medium">P.U.</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.id} className="border-b border-msk-ink/5">
                  <td className="px-4 py-2">{l.label}</td>
                  <td className="px-4 py-2">{l.qty}</td>
                  <td className="px-4 py-2">
                    {formatComMoney(l.unitPrice, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      </div>

      <Surface className="p-5">
        <h2 className="text-sm font-semibold text-msk-ink">Paiements</h2>
        {invoice.payments.length === 0 ? (
          <p className="mt-2 text-sm text-msk-ink/45">Aucun paiement.</p>
        ) : (
          <ul className="mt-3 divide-y divide-msk-ink/5 text-sm">
            {invoice.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap justify-between gap-2 py-2"
              >
                <span>
                  {formatComMoney(p.amount, invoice.currency)} ·{" "}
                  {PAYMENT_METHOD_LABELS[p.method]}
                </span>
                <span className="text-msk-ink/45">
                  {p.paidAt.toLocaleDateString("fr-FR")} ·{" "}
                  {p.recordedBy.firstName}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canPay ? (
          <div className="mt-4 border-t border-msk-ink/10 pt-4">
            <PaymentForm invoiceId={invoice.id} remaining={remaining} />
          </div>
        ) : null}
      </Surface>
    </PageShell>
  );
}
