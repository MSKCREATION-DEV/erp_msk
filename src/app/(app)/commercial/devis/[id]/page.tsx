import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { canAccessOwned } from "@/lib/commercial/scope";
import {
  formatComMoney,
  QUOTE_STATUS_LABELS,
} from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { QuoteActions } from "@/components/commercial/quote-actions";
import { DocPdfThumb } from "@/components/commercial/doc-pdf-thumb";

export const metadata: Metadata = { title: "Devis" };

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

export default async function CommercialDevisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "com.access")) redirect("/accueil");
  const { id } = await params;

  const quote = await prisma.comQuote.findUnique({
    where: { id },
    include: {
      client: true,
      lines: { orderBy: { sortOrder: "asc" } },
      invoices: { select: { id: true, number: true, status: true }, take: 5 },
    },
  });
  if (!quote) notFound();
  if (!canAccessOwned(user, quote.ownerId)) redirect("/commercial/devis");

  const pdfDoc = quote.gedDocumentId
    ? await prisma.document.findUnique({
        where: { id: quote.gedDocumentId },
        select: { id: true, originalName: true },
      })
    : null;

  const canPdf = hasPermission(user, "com.devis.edit_own");

  return (
    <PageShell>
      <PageHeader
        title={quote.number}
        description={quote.object ?? quote.client.name}
        backHref="/commercial/devis"
        backLabel="Retour aux devis"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Devis", href: "/commercial/devis" },
          { label: quote.number },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{QUOTE_STATUS_LABELS[quote.status]}</Badge>
            <Badge tone="muted">{quote.regime}</Badge>
            <Badge tone="muted">{quote.currency}</Badge>
          </div>
        }
      />

      <QuoteActions
        quoteId={quote.id}
        status={quote.status}
        canSend={hasPermission(user, "com.devis.send")}
        canAccept={hasPermission(user, "com.devis.accept_reject")}
        canInvoice={hasPermission(user, "com.factures.create")}
        canPdf={canPdf}
        gedDocumentId={quote.gedDocumentId}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="space-y-5 p-5 sm:p-6 lg:col-span-4">
          <h2 className="text-sm font-semibold tracking-tight text-msk-ink">
            Synthèse
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <MetaItem label="Client">
              <Link
                prefetch={false}
                href={`/commercial/clients/${quote.clientId}`}
                className="font-medium text-msk-blue hover:underline"
              >
                {quote.client.name}
              </Link>
            </MetaItem>
            {quote.opportunityId ? (
              <MetaItem label="Prospect">
                <Link
                  prefetch={false}
                  href={`/crm/prospects/${quote.opportunityId}`}
                  className="font-medium text-msk-blue hover:underline"
                >
                  Voir la fiche CRM
                </Link>
              </MetaItem>
            ) : null}
            {quote.object ? (
              <MetaItem label="Objet">{quote.object}</MetaItem>
            ) : null}
            {quote.validUntil ? (
              <MetaItem label="Validité">
                {quote.validUntil.toLocaleDateString("fr-FR")}
              </MetaItem>
            ) : null}
          </div>

          <div className="rounded-2xl border border-msk-ink/[0.08] bg-msk-chalk/40 px-4 py-3.5 text-sm">
            <div className="flex justify-between text-msk-ink/60">
              <span>HT</span>
              <span className="tabular-nums">
                {formatComMoney(quote.totalHt, quote.currency)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-msk-ink/60">
              <span>
                TVA
                {quote.vatEnabled ? ` (${quote.vatRate} %)` : " (exonéré)"}
              </span>
              <span className="tabular-nums">
                {formatComMoney(quote.totalVat, quote.currency)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-msk-ink/10 pt-2 text-base font-semibold text-msk-ink">
              <span>TTC</span>
              <span className="tabular-nums">
                {formatComMoney(quote.totalTtc, quote.currency)}
              </span>
            </div>
          </div>

          {quote.invoices.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                Factures liées
              </p>
              <ul className="space-y-1.5">
                {quote.invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      prefetch={false}
                      href={`/commercial/factures/${inv.id}`}
                      className="text-sm font-medium text-msk-blue hover:underline"
                    >
                      {inv.number}
                    </Link>
                    <span className="ml-2 text-xs text-msk-ink/45">
                      {inv.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
                  <th className="px-3 py-3 font-medium">P.U.</th>
                  <th className="px-5 py-3 font-medium sm:px-6">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((l) => (
                  <tr key={l.id} className="border-b border-msk-ink/5">
                    <td className="px-5 py-2.5 sm:px-6">
                      {l.label}
                      {l.isTravel ? (
                        <span className="ml-1 text-xs text-msk-ink/40">
                          (dépl.)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{l.qty}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatComMoney(l.unitPrice, quote.currency)}
                    </td>
                    <td className="px-5 py-2.5 tabular-nums sm:px-6">
                      {formatComMoney(l.qty * l.unitPrice, quote.currency)}
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
              title={pdfDoc.originalName || quote.number}
              subtitle={`${QUOTE_STATUS_LABELS[quote.status]} · ${formatComMoney(quote.totalTtc, quote.currency)}`}
              className="max-w-[11rem]"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-msk-ink/12 bg-msk-chalk/30 px-4 py-8 text-center">
              <p className="text-sm text-msk-ink/50">Aucun PDF généré</p>
              <p className="mt-1 text-xs text-msk-ink/40">
                {canPdf
                  ? "Utilisez « Générer PDF » ci-dessus — une seule fois."
                  : "Document non encore disponible."}
              </p>
            </div>
          )}
          {quote.missionNote ? (
            <div className="mt-4 border-t border-msk-ink/[0.06] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                Note mission
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-msk-ink/75">
                {quote.missionNote}
              </p>
            </div>
          ) : null}
        </Surface>
      </div>
    </PageShell>
  );
}
