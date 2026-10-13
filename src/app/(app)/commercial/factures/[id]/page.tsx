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
import { ProposeInvoiceButton } from "@/components/comptabilite/propose-invoice-button";
import { DocPdfThumb } from "@/components/commercial/doc-pdf-thumb";

export const metadata: Metadata = { title: "Facture" };

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
        {label}
      </p>
      <div className="mt-1 text-sm text-msk-ink">{children}</div>
    </div>
  );
}

export default async function CommercialFactureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const canCom = hasPermission(user, "com.access");
  const canCptPropose = hasPermission(user, "cpt.ecritures.manage");
  if (!canCom && !canCptPropose) redirect("/accueil");
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
  if (canCom && !canAccessOwned(user, invoice.ownerId)) {
    redirect("/commercial/factures");
  }

  const cptEntry = await prisma.cptEntry.findFirst({
    where: { sourceType: "COM_INVOICE", sourceId: invoice.id },
    select: { id: true, number: true, status: true },
  });

  const pdfDoc = invoice.gedDocumentId
    ? await prisma.document.findUnique({
        where: { id: invoice.gedDocumentId },
        select: { id: true, originalName: true },
      })
    : null;

  const remaining = Math.max(0, invoice.totalTtc - invoice.amountPaid);
  const canPay =
    canCom &&
    hasPermission(user, "com.paiements.record") &&
    ["EMISE", "PARTIELLEMENT_PAYEE"].includes(invoice.status);
  const canProposeEntry =
    canCptPropose &&
    ["EMISE", "PARTIELLEMENT_PAYEE", "PAYEE"].includes(invoice.status);
  const showComActions = canCom;
  const canPdf = hasPermission(user, "com.factures.create");
  const needsPdf =
    invoice.status !== "BROUILLON" &&
    invoice.status !== "ANNULEE" &&
    !invoice.gedDocumentId;

  return (
    <PageShell>
      <PageHeader
        title={invoice.number}
        description={invoice.object ?? invoice.client.name}
        backHref={canCom ? "/commercial/factures" : "/comptabilite/a-comptabiliser"}
        backLabel={canCom ? "Retour aux factures" : "Retour à comptabiliser"}
        breadcrumbs={
          canCom
            ? [
                { label: "Commercial", href: "/commercial" },
                { label: "Factures", href: "/commercial/factures" },
                { label: invoice.number },
              ]
            : [
                { label: "Comptabilité", href: "/comptabilite" },
                {
                  label: "À comptabiliser",
                  href: "/comptabilite/a-comptabiliser",
                },
                { label: invoice.number },
              ]
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
            <Badge tone="muted">{invoice.currency}</Badge>
            {cptEntry ? (
              <Badge tone="success">
                Compta ·{" "}
                {cptEntry.status === "VALIDATED" ? "validée" : "brouillon"}
              </Badge>
            ) : canProposeEntry ? (
              <Badge tone="coral">À comptabiliser</Badge>
            ) : null}
          </div>
        }
      />

      {needsPdf ? (
        <Surface className="border-msk-coral/30 bg-msk-coral/[0.04] p-4">
          <p className="text-sm font-semibold text-msk-coral">
            PDF non classé en GED
          </p>
          <p className="mt-1 text-sm text-msk-ink/70">
            Générez le PDF une seule fois pour classer la facture dans le
            dossier client.
          </p>
        </Surface>
      ) : null}

      {showComActions ? (
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          canIssue={hasPermission(user, "com.factures.issue")}
          canPdf={canPdf}
          gedDocumentId={invoice.gedDocumentId}
        />
      ) : null}

      {canProposeEntry ? (
        <ProposeInvoiceButton
          invoiceId={invoice.id}
          existingEntryId={cptEntry?.id}
          existingEntryNumber={cptEntry?.number}
          existingEntryStatus={
            cptEntry
              ? cptEntry.status === "VALIDATED"
                ? "Validée"
                : "Brouillon"
              : null
          }
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="space-y-5 p-5 sm:p-6 lg:col-span-4">
          <h2 className="text-sm font-semibold tracking-tight text-msk-ink">
            Synthèse
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <MetaItem label="Client">
              {canCom ? (
                <Link
                  prefetch={false}
                  href={`/commercial/clients/${invoice.clientId}`}
                  className="font-medium text-msk-blue hover:underline"
                >
                  {invoice.client.name}
                </Link>
              ) : (
                invoice.client.name
              )}
            </MetaItem>
            {invoice.quote && canCom ? (
              <MetaItem label="Devis">
                <Link
                  prefetch={false}
                  href={`/commercial/devis/${invoice.quote.id}`}
                  className="font-medium text-msk-blue hover:underline"
                >
                  {invoice.quote.number}
                </Link>
              </MetaItem>
            ) : null}
            {cptEntry ? (
              <MetaItem label="Écriture">
                <Link
                  prefetch={false}
                  href={`/comptabilite/ecritures/${cptEntry.id}`}
                  className="font-medium text-msk-blue hover:underline"
                >
                  {cptEntry.number}
                </Link>
              </MetaItem>
            ) : null}
            {invoice.object ? (
              <MetaItem label="Objet">{invoice.object}</MetaItem>
            ) : null}
          </div>

          <div className="rounded-2xl border border-msk-ink/[0.08] bg-msk-chalk/40 px-4 py-3.5 text-sm">
            <div className="flex justify-between text-msk-ink/60">
              <span>TTC</span>
              <span className="tabular-nums">
                {formatComMoney(invoice.totalTtc, invoice.currency)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-msk-ink/60">
              <span>Payé</span>
              <span className="tabular-nums">
                {formatComMoney(invoice.amountPaid, invoice.currency)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-msk-ink/10 pt-2 text-base font-semibold text-msk-ink">
              <span>Reste</span>
              <span className="tabular-nums">
                {formatComMoney(remaining, invoice.currency)}
              </span>
            </div>
          </div>
        </Surface>

        <Surface className="overflow-hidden p-0 lg:col-span-5">
          <div className="border-b border-msk-ink/[0.06] px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold tracking-tight text-msk-ink">
              Lignes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-msk-ink/10 text-msk-ink/45">
                <tr>
                  <th className="px-5 py-3 font-medium sm:px-6">Libellé</th>
                  <th className="px-3 py-3 font-medium">Qté</th>
                  <th className="px-5 py-3 font-medium sm:px-6">P.U.</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((l) => (
                  <tr key={l.id} className="border-b border-msk-ink/5">
                    <td className="px-5 py-2.5 sm:px-6">{l.label}</td>
                    <td className="px-3 py-2.5 tabular-nums">{l.qty}</td>
                    <td className="px-5 py-2.5 tabular-nums sm:px-6">
                      {formatComMoney(l.unitPrice, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <Surface className="flex flex-col p-5 sm:p-6 lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold tracking-tight text-msk-ink">
            Document PDF
          </h2>
          {pdfDoc ? (
            <DocPdfThumb
              documentId={pdfDoc.id}
              title={pdfDoc.originalName || invoice.number}
              subtitle={`${INVOICE_STATUS_LABELS[invoice.status]} · ${formatComMoney(invoice.totalTtc, invoice.currency)}`}
              className="max-w-[11rem]"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-msk-ink/12 bg-msk-chalk/30 px-4 py-8 text-center">
              <p className="text-sm text-msk-ink/50">Aucun PDF généré</p>
              <p className="mt-1 text-xs text-msk-ink/40">
                {canPdf && showComActions
                  ? "Utilisez « Générer PDF » — une seule fois."
                  : "Document non encore disponible."}
              </p>
            </div>
          )}
        </Surface>
      </div>

      <Surface className="p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-tight text-msk-ink">
          Paiements
        </h2>
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
