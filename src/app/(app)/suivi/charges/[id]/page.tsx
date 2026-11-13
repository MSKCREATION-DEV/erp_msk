import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CalendarClock, Hash, Layers } from "lucide-react";
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
import {
  expenseDueBucket,
  formatExpenseDueAlertDetail,
  formatSvDateFr,
} from "@/lib/suivi/dashboard-stats";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { SvExpenseDetailActions } from "@/components/suivi/expense-detail-actions";

export const metadata: Metadata = { title: "Charge · Suivi" };

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return formatSvDateFr(d);
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

  const now = new Date();
  const due = invoice.dueAt ?? invoice.issuedAt;
  const bucket = expenseDueBucket(invoice, now);
  const dueHint =
    due && bucket ? formatExpenseDueAlertDetail(due, now, bucket) : null;
  const typeLabel = SV_EXPENSE_CATEGORY_LABEL[invoice.category];

  return (
    <PageShell>
      <PageHeader
        title={invoice.number ?? "Charge"}
        description="Facture fournisseur — détail et paiement"
        backHref="/suivi/charges"
      />

      {/* Hero : fournisseur + type mis en avant */}
      <Surface className="mb-5 overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-msk-blue/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-caps text-msk-blue">
                  <Layers className="size-3.5" aria-hidden />
                  {typeLabel}
                </span>
                <Badge tone={SV_EXPENSE_STATUS_TONE[invoice.status]}>
                  {SV_EXPENSE_STATUS_LABEL[invoice.status]}
                </Badge>
                {bucket === "retard" ? (
                  <Badge tone="coral" title={dueHint ?? undefined}>
                    Retard
                  </Badge>
                ) : null}
                {bucket === "bientot" ? (
                  <Badge tone="blue" title={dueHint ?? undefined}>
                    Bientôt due
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-msk-blue shadow-sm ring-1 ring-msk-ink/6">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-caps text-msk-ink/40">
                    Fournisseur
                  </p>
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-msk-ink sm:text-3xl">
                    {invoice.vendorName}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-msk-ink/55">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Hash className="size-3.5 opacity-50" aria-hidden />
                      {invoice.number ?? "Sans n°"}
                    </span>
                    {invoice.periodLabel ? (
                      <span>{invoice.periodLabel}</span>
                    ) : null}
                    {due ? (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          bucket === "retard" ? "font-medium text-msk-coral" : ""
                        }`}
                        title={dueHint ?? undefined}
                      >
                        <CalendarClock className="size-3.5 opacity-50" aria-hidden />
                        Échéance {fmtDate(due)}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-72">
              <HeroAmount label="TTC" value={formatSvXof(invoice.totalTtc)} />
              <HeroAmount label="Payé" value={formatSvXof(invoice.amountPaid)} />
              <HeroAmount
                label="Reste"
                value={formatSvXof(reste)}
                emphasize={reste > 0}
              />
            </div>
          </div>

          <div className="mt-5 border-t border-msk-ink/6 pt-4">
            <SvExpenseDetailActions
              invoiceId={invoice.id}
              reste={reste}
              canPay={canPay}
              ged={primaryGed}
            />
          </div>
        </div>
      </Surface>

      <div className="grid gap-5 lg:grid-cols-2">
        <Surface className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Détails</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Émission
              </dt>
              <dd className="mt-0.5">{fmtDate(invoice.issuedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Échéance
              </dt>
              <dd
                className={`mt-0.5 ${
                  bucket === "retard" ? "font-medium text-msk-coral" : ""
                }`}
              >
                {fmtDate(invoice.dueAt)}
                {dueHint ? (
                  <span className="mt-0.5 block text-xs font-normal text-msk-ink/45">
                    {dueHint}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Période
              </dt>
              <dd className="mt-0.5">
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
              <dd className="mt-0.5">{invoice.vendorRef ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                HT
              </dt>
              <dd className="mt-0.5 tabular-nums">
                {formatSvXof(invoice.totalHt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                TVA
              </dt>
              <dd className="mt-0.5 tabular-nums">
                {formatSvXof(invoice.totalVat)}
              </dd>
            </div>
          </dl>
          {invoice.notes ? (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-msk-chalk/60 px-3 py-2 text-sm text-msk-ink/65">
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
        </Surface>
      </div>

      <Surface className="mt-5 overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <h2 className="text-sm font-semibold">
            Autres {typeLabel} · {invoice.vendorName}
          </h2>
          <p className="mt-0.5 text-xs text-msk-ink/45">
            Historique du même type et fournisseur
          </p>
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
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-msk-chalk/50"
                >
                  <div className="min-w-0">
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
                  <span className="shrink-0 tabular-nums text-msk-ink/70">
                    {formatSvXof(h.totalTtc)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </PageShell>
  );
}

function HeroAmount({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-msk-ink/6">
      <p className="text-[10px] font-medium uppercase tracking-caps text-msk-ink/40">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums sm:text-base ${
          emphasize ? "text-msk-coral" : "text-msk-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
