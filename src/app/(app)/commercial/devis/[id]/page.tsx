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

export const metadata: Metadata = { title: "Devis" };

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
      invoices: { select: { id: true, number: true }, take: 5 },
    },
  });
  if (!quote) notFound();
  if (!canAccessOwned(user, quote.ownerId)) redirect("/commercial/devis");

  return (
    <PageShell>
      <PageHeader
        title={quote.number}
        description={quote.client.name}
        backHref="/commercial/devis"
        backLabel="Retour aux devis"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Devis", href: "/commercial/devis" },
          { label: quote.number },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{QUOTE_STATUS_LABELS[quote.status]}</Badge>
        <Badge tone="muted">{quote.regime}</Badge>
        <Badge tone="muted">{quote.currency}</Badge>
      </div>

      <QuoteActions
        quoteId={quote.id}
        status={quote.status}
        canSend={hasPermission(user, "com.devis.send")}
        canAccept={hasPermission(user, "com.devis.accept_reject")}
        canInvoice={hasPermission(user, "com.factures.create")}
        canPdf={hasPermission(user, "com.devis.edit_own")}
        gedDocumentId={quote.gedDocumentId}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface className="space-y-2 p-5 text-sm lg:col-span-1">
          <p>
            <span className="text-msk-ink/45">Client </span>
            <Link prefetch={false}
              href={`/commercial/clients/${quote.clientId}`}
              className="text-msk-blue hover:underline"
            >
              {quote.client.name}
            </Link>
          </p>
          {quote.opportunityId ? (
            <p>
              <span className="text-msk-ink/45">Prospect </span>
              <Link
                prefetch={false}
                href={`/crm/prospects/${quote.opportunityId}`}
                className="text-msk-blue hover:underline"
              >
                Voir la fiche CRM
              </Link>
            </p>
          ) : null}
          {quote.object ? (
            <p>
              <span className="text-msk-ink/45">Objet </span>
              {quote.object}
            </p>
          ) : null}
          <p>
            <span className="text-msk-ink/45">HT </span>
            {formatComMoney(quote.totalHt, quote.currency)}
          </p>
          <p>
            <span className="text-msk-ink/45">TVA </span>
            {formatComMoney(quote.totalVat, quote.currency)}
            {quote.vatEnabled ? ` (${quote.vatRate} %)` : " (exonéré)"}
          </p>
          <p className="font-semibold">
            TTC {formatComMoney(quote.totalTtc, quote.currency)}
          </p>
          {quote.invoices.length > 0 ? (
            <p className="pt-2">
              Facture{" "}
              <Link prefetch={false}
                href={`/commercial/factures/${quote.invoices[0]!.id}`}
                className="text-msk-blue hover:underline"
              >
                {quote.invoices[0]!.number}
              </Link>
            </p>
          ) : null}
        </Surface>

        <Surface className="overflow-x-auto p-0 lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 font-medium">Qté</th>
                <th className="px-4 py-3 font-medium">P.U.</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((l) => (
                <tr key={l.id} className="border-b border-msk-ink/5">
                  <td className="px-4 py-2">
                    {l.label}
                    {l.isTravel ? (
                      <span className="ml-1 text-xs text-msk-ink/40">
                        (dépl.)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">{l.qty}</td>
                  <td className="px-4 py-2">
                    {formatComMoney(l.unitPrice, quote.currency)}
                  </td>
                  <td className="px-4 py-2">
                    {formatComMoney(l.qty * l.unitPrice, quote.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      </div>
    </PageShell>
  );
}
