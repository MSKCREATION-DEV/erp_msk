import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, CalendarClock, FileText, Hash } from "lucide-react";
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
import { formatSvDateFr } from "@/lib/suivi/dashboard-stats";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { DetailHeroAmount } from "@/components/ui/detail-hero-amount";
import { SvInvoiceDetailActions } from "@/components/suivi/invoice-detail-actions";

export const metadata: Metadata = { title: "Facture · Suivi" };

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return formatSvDateFr(d);
}

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

  const now = new Date();
  const overdue =
    reste > 0 &&
    invoice.dueAt != null &&
    invoice.dueAt.getTime() < now.getTime() &&
    invoice.status !== "ANNULEE";

  return (
    <PageShell>
      <PageHeader
        title={invoice.number ?? "Facture"}
        description="Facture client — détail et encaissement"
        backHref="/suivi/factures"
      />

      <Surface className="mb-5 overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-msk-blue/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-caps text-msk-blue">
                  <FileText className="size-3.5" aria-hidden />
                  Facture client
                </span>
                <Badge tone={SV_INVOICE_STATUS_TONE[invoice.status]}>
                  {SV_INVOICE_STATUS_LABEL[invoice.status]}
                </Badge>
                {overdue ? <Badge tone="coral">Retard</Badge> : null}
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-msk-blue shadow-sm ring-1 ring-msk-ink/6">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-caps text-msk-ink/40">
                    Client
                  </p>
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-msk-ink sm:text-3xl">
                    {invoice.client.name}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-msk-ink/55">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Hash className="size-3.5 opacity-50" aria-hidden />
                      {invoice.number ?? "Sans n°"}
                    </span>
                    {invoice.object ? <span>{invoice.object}</span> : null}
                    {invoice.issuedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock
                          className="size-3.5 opacity-50"
                          aria-hidden
                        />
                        Émise {fmtDate(invoice.issuedAt)}
                      </span>
                    ) : null}
                    {invoice.dueAt ? (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          overdue ? "font-medium text-msk-coral" : ""
                        }`}
                      >
                        <CalendarClock
                          className="size-3.5 opacity-50"
                          aria-hidden
                        />
                        Échéance {fmtDate(invoice.dueAt)}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-72">
              <DetailHeroAmount
                label="TTC"
                value={formatSvXof(invoice.totalTtc)}
              />
              <DetailHeroAmount
                label="Payé"
                value={formatSvXof(invoice.amountPaid)}
              />
              <DetailHeroAmount
                label="Reste"
                value={formatSvXof(reste)}
                emphasize={reste > 0}
              />
            </div>
          </div>

          <div className="mt-5 border-t border-msk-ink/6 pt-4">
            <SvInvoiceDetailActions
              invoiceId={invoice.id}
              clientId={invoice.clientId}
              reste={reste}
              canPay={canPay}
              ged={primaryGed}
            />
          </div>
        </div>
      </Surface>

      <div className="grid gap-5 lg:grid-cols-2">
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
          {invoice.notes ? (
            <p className="border-t border-msk-ink/6 whitespace-pre-wrap px-4 py-3 text-sm text-msk-ink/65">
              {invoice.notes}
            </p>
          ) : null}
        </Surface>

        <Surface className="overflow-hidden p-0">
          <div className="border-b border-msk-ink/6 px-4 py-3">
            <h2 className="text-sm font-semibold">Paiements</h2>
          </div>
          {invoice.payments.length === 0 ? (
            <p className="p-4 text-sm text-msk-ink/45">Aucun paiement.</p>
          ) : (
            <ul className="divide-y divide-msk-ink/6">
              {invoice.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium tabular-nums">
                      {formatSvXof(p.amount)}
                    </p>
                    <p className="text-xs text-msk-ink/50">
                      {fmtDate(p.paidAt)}
                      {p.method ? ` · ${p.method}` : ""}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!primaryGed && invoice.sourceDocument ? (
            <p className="border-t border-msk-ink/6 px-4 py-3 text-xs text-msk-ink/40">
              Source : {invoice.sourceDocument} (GED non lié — relancer seed)
            </p>
          ) : null}
        </Surface>
      </div>
    </PageShell>
  );
}
