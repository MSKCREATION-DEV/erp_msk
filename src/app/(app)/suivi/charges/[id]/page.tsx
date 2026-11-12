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
  SV_EXPENSE_CATEGORY_LABEL,
  SV_EXPENSE_STATUS_LABEL,
  SV_EXPENSE_STATUS_TONE,
} from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { SvExpensePaymentForm } from "@/components/suivi/expense-payment-form";
import { SvGedDocActions } from "@/components/suivi/ged-doc-actions";

export const metadata: Metadata = { title: "Charge · Suivi" };

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR");
}

export default async function SuiviChargeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.expenses.view");
  const { id } = await params;

  const invoice = await prisma.svExpenseInvoice.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const reste = invoiceReste(invoice);
  const canPay =
    hasPermission(user, "sv.expenses.manage") || user.isSuperAdmin;

  const gedLinks = await listSvLinkedDocuments({
    entityType: SV_GED_ENTITY.EXPENSE,
    entityId: invoice.id,
  });
  const primaryGed = gedLinks[0]?.document ?? null;

  const history = await prisma.svExpenseInvoice.findMany({
    where: {
      category: invoice.category,
      vendorName: invoice.vendorName,
      id: { not: invoice.id },
      status: { not: "ANNULEE" },
    },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      id: true,
      number: true,
      periodLabel: true,
      status: true,
      totalTtc: true,
      amountPaid: true,
      issuedAt: true,
    },
  });

  return (
    <PageShell>
      <PageHeader
        title={invoice.number ?? "Charge"}
        description={`${SV_EXPENSE_CATEGORY_LABEL[invoice.category]} · ${invoice.vendorName}${
          invoice.object ? ` · ${invoice.object}` : ""
        }`}
        backHref="/suivi/charges"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={SV_EXPENSE_STATUS_TONE[invoice.status]}>
          {SV_EXPENSE_STATUS_LABEL[invoice.status]}
        </Badge>
        <span className="text-sm text-msk-ink/60">
          TTC {formatSvXof(invoice.totalTtc)} · Payé{" "}
          {formatSvXof(invoice.amountPaid)} · Reste{" "}
          <span className={reste > 0 ? "font-medium text-msk-coral" : ""}>
            {formatSvXof(reste)}
          </span>
        </span>
      </div>

      {canPay ? (
        <SvExpensePaymentForm invoiceId={invoice.id} reste={reste} />
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Surface className="p-4">
          <h2 className="text-sm font-semibold">Détails</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Émission
              </dt>
              <dd>{fmtDate(invoice.issuedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Échéance
              </dt>
              <dd>{fmtDate(invoice.dueAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Période
              </dt>
              <dd>
                {invoice.periodLabel ??
                  (invoice.periodStart
                    ? `${fmtDate(invoice.periodStart)} → ${fmtDate(invoice.periodEnd)}`
                    : "—")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Réf. fournisseur
              </dt>
              <dd>{invoice.vendorRef ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                HT
              </dt>
              <dd className="tabular-nums">{formatSvXof(invoice.totalHt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                TVA
              </dt>
              <dd className="tabular-nums">{formatSvXof(invoice.totalVat)}</dd>
            </div>
          </dl>
          {invoice.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-msk-ink/65">
              {invoice.notes}
            </p>
          ) : null}
        </Surface>

        <Surface className="p-4">
          <h2 className="text-sm font-semibold">Justificatif GED</h2>
          {primaryGed ? (
            <div className="mt-3">
              <p className="text-sm text-msk-ink/70">{primaryGed.originalName}</p>
              <div className="mt-2">
                <SvGedDocActions
                  documentId={primaryGed.id}
                  originalName={primaryGed.originalName}
                  mime={primaryGed.mime}
                  size={primaryGed.size}
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-msk-ink/45">
              Aucun fichier lié. Déposez-le à la création ou via la GED Suivi ·
              Charges.
            </p>
          )}
        </Surface>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
        </Surface>

        <Surface className="overflow-hidden p-0">
          <div className="border-b border-msk-ink/6 px-4 py-3">
            <h2 className="text-sm font-semibold">
              Historique {SV_EXPENSE_CATEGORY_LABEL[invoice.category]}
            </h2>
          </div>
          {history.length === 0 ? (
            <p className="p-4 text-sm text-msk-ink/45">
              Pas d’autre facture de ce type pour ce fournisseur.
            </p>
          ) : (
            <ul className="divide-y divide-msk-ink/6">
              {history.map((h) => (
                <li key={h.id}>
                  <Link
                    prefetch={false}
                    href={`/suivi/charges/${h.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-msk-chalk/50"
                  >
                    <div>
                      <p className="font-medium">
                        {h.number ?? "—"}
                        {h.periodLabel ? (
                          <span className="font-normal text-msk-ink/55">
                            {" "}
                            · {h.periodLabel}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-msk-ink/50">
                        {fmtDate(h.issuedAt)} ·{" "}
                        {SV_EXPENSE_STATUS_LABEL[h.status]}
                      </p>
                    </div>
                    <span className="tabular-nums text-msk-ink/70">
                      {formatSvXof(h.totalTtc)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </PageShell>
  );
}
