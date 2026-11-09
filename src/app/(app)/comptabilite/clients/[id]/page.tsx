import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Mail, Phone, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { computeClientFinancials } from "@/lib/billing/client-financials";
import { computeInvoiceBalance } from "@/lib/billing/allocations";
import type { AgingBucket } from "@/lib/billing/ar-aging";
import { displayDocNumber } from "@/lib/commercial/doc-display";
import {
  formatComMoney,
  invoiceStatusTone,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/commercial/labels";
import {
  CLIENT_ACCOUNT_STATUT_LABELS,
  deriveClientAccountStatut,
} from "@/lib/comptabilite/client-accounts";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Compte client" };

const STATUT_TONE: Record<string, BadgeTone> = {
  RETARD: "coral",
  OUVERT: "blue",
  SOLDE: "success",
};

const AGING_BUCKET_LABELS: Record<AgingBucket, string> = {
  "0_30": "0–30 j",
  "31_60": "31–60 j",
  "61_90": "61–90 j",
  "90_PLUS": "90 j +",
};

type InvoiceBucket = "paye" | "impaye" | "attente" | "autre";

function invoiceBucket(
  status: string,
  openBalance: number,
  dueDate: Date | null,
  now: Date,
): InvoiceBucket {
  if (status === "ANNULEE" || status === "BROUILLON") return "autre";
  if (openBalance === 0) return "paye";
  const due = dueDate ?? now;
  return due < now ? "impaye" : "attente";
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Surface className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-msk-ink/6 px-5 py-3.5 sm:px-6">
        <h2 className="text-sm font-semibold tracking-tight text-msk-ink">
          {title}
        </h2>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </Surface>
  );
}

function FactureFilterChip({
  label,
  count,
  value,
  current,
  baseParams,
}: {
  label: string;
  count: number;
  value: "all" | InvoiceBucket;
  current: string;
  baseParams: URLSearchParams;
}) {
  const active = current === value;
  const params = new URLSearchParams(baseParams);
  if (value === "all") params.delete("inv");
  else params.set("inv", value);
  const qs = params.toString();
  return (
    <Link
      prefetch={false}
      href={qs ? `?${qs}` : "?"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-msk-blue bg-msk-blue/8 text-msk-blue"
          : "border-msk-ink/10 bg-white text-msk-ink/65 hover:border-msk-ink/15 hover:bg-msk-chalk",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-[11px] tabular-nums",
          active ? "bg-msk-blue/15" : "bg-msk-ink/6",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

export default async function ComptabiliteClientCompteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "cpt.access") &&
    !hasPermission(user, "cpt.etats.view") &&
    !hasPermission(user, "com.reports.view")
  ) {
    redirect("/comptabilite");
  }

  const { id } = await params;
  const sp = await searchParams;

  const client = await prisma.comClient.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      contactName: true,
      email: true,
      phone: true,
      city: true,
      country: true,
      createdAt: true,
      owner: { select: { firstName: true, lastName: true } },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          number: true,
          draftCode: true,
          status: true,
          totalTtc: true,
          amountPaid: true,
          currency: true,
          dueDate: true,
          issuedAt: true,
          createdAt: true,
          allocations: {
            select: { paymentId: true, invoiceId: true, amount: true },
          },
          creditNotes: { select: { amount: true } },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        take: 200,
        select: {
          id: true,
          amount: true,
          method: true,
          paidAt: true,
          reference: true,
          allocations: { select: { amount: true } },
        },
      },
      creditNotes: {
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          number: true,
          draftCode: true,
          amount: true,
          reason: true,
          issuedAt: true,
          createdAt: true,
        },
      },
    },
  });
  if (!client) notFound();

  /** Retour intelligent : vers la liste avec filtres préservés si on vient de là. */
  const backHref = (() => {
    if (sp.from !== "list") return "/comptabilite/clients";
    const params = new URLSearchParams();
    for (const key of ["q", "statut", "sort", "dir", "page"]) {
      const v = sp[key];
      if (v) params.set(key, v);
    }
    const qs = params.toString();
    return qs ? `/comptabilite/clients?${qs}` : "/comptabilite/clients";
  })();

  const now = new Date();

  const fin = computeClientFinancials({
    invoices: client.invoices.map((inv) => ({
      id: inv.id,
      status: inv.status,
      totalTtc: inv.totalTtc,
      amountPaid: inv.amountPaid,
      dueDate: inv.dueDate,
      issuedAt: inv.issuedAt,
      createdAt: inv.createdAt,
      allocations: inv.allocations,
      creditNotesApplied: inv.creditNotes.reduce((s, n) => s + n.amount, 0),
    })),
    payments: client.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paidAt: p.paidAt,
      allocationsSum: p.allocations.reduce((s, a) => s + a.amount, 0),
    })),
    asOf: now,
  });
  const statutValue = deriveClientAccountStatut(fin);

  const invoicesWithBalance = client.invoices.map((inv) => {
    const bal = computeInvoiceBalance({
      invoiceId: inv.id,
      totalTtc: inv.totalTtc,
      creditNotesApplied: inv.creditNotes.reduce((s, n) => s + n.amount, 0),
      allocations: inv.allocations,
    });
    return {
      ...inv,
      bal,
      bucket: invoiceBucket(inv.status, bal.openBalance, inv.dueDate, now),
    };
  });

  const bucketCounts: Record<InvoiceBucket, number> = {
    paye: 0,
    impaye: 0,
    attente: 0,
    autre: 0,
  };
  for (const inv of invoicesWithBalance) bucketCounts[inv.bucket] += 1;

  const invFilter = sp.inv as InvoiceBucket | undefined;
  const filteredInvoices = invFilter
    ? invoicesWithBalance.filter((inv) => inv.bucket === invFilter)
    : invoicesWithBalance;

  const invBaseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "inv") invBaseParams.set(k, v);
  }

  /** Mouvements — factures (dette), paiements et avoirs (réduction dette), triés. */
  type Movement = {
    id: string;
    at: Date;
    label: string;
    amount: number;
    tone: BadgeTone;
    kind: string;
  };
  const movements: Movement[] = [
    ...client.invoices
      .filter((inv) => inv.status !== "ANNULEE" && inv.status !== "BROUILLON")
      .map((inv): Movement => ({
        id: `inv-${inv.id}`,
        at: inv.issuedAt ?? inv.createdAt,
        label: `Facture ${displayDocNumber(inv.number, inv.draftCode)}`,
        amount: inv.totalTtc,
        tone: "blue",
        kind: "Facture",
      })),
    ...client.payments.map((p): Movement => ({
      id: `pay-${p.id}`,
      at: p.paidAt,
      label: `Paiement${p.reference ? ` · ${p.reference}` : ""} — ${PAYMENT_METHOD_LABELS[p.method]}`,
      amount: -p.amount,
      tone: "success",
      kind: "Paiement",
    })),
    ...client.creditNotes.map((n): Movement => ({
      id: `cn-${n.id}`,
      at: n.issuedAt ?? n.createdAt,
      label: `Avoir ${displayDocNumber(n.number, n.draftCode)}${n.reason ? ` · ${n.reason}` : ""}`,
      amount: -n.amount,
      tone: "coral",
      kind: "Avoir",
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const canViewCommercialFiche = hasAnyPermission(user, [
    "com.clients.view_own",
    "com.clients.manage",
  ]);

  const location = [client.city, client.country].filter(Boolean).join(" · ");

  return (
    <PageShell>
      <PageHeader
        title={client.name}
        description={[client.contactName, location].filter(Boolean).join(" · ")}
        backHref={backHref}
        backLabel="Retour aux clients"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Clients", href: "/comptabilite/clients" },
          { label: client.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUT_TONE[statutValue]}>
              {CLIENT_ACCOUNT_STATUT_LABELS[statutValue]}
            </Badge>
            {canViewCommercialFiche ? (
              <Link
                prefetch={false}
                href={`/commercial/clients/${client.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-ink transition hover:border-msk-blue/30 hover:text-msk-blue"
              >
                Fiche commerciale
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Surface className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Facturé
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatComMoney(fin.totalInvoiced)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Encaissé (imputé)
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatComMoney(fin.totalPaidAllocated)}
          </p>
          {fin.unallocatedCredit > 0 ? (
            <p className="mt-1 text-xs text-msk-ink/45">
              + {formatComMoney(fin.unallocatedCredit)} non imputé
            </p>
          ) : null}
        </Surface>
        <Surface className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Créances ouvertes
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-msk-blue">
            {formatComMoney(fin.openReceivable)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Dont en retard
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-msk-coral">
            {formatComMoney(fin.overdueAmount)}
          </p>
          {fin.nextDueDate ? (
            <p className="mt-1 text-xs text-msk-ink/45">
              Prochaine échéance {fin.nextDueDate.toLocaleDateString("fr-FR")}
            </p>
          ) : null}
        </Surface>
      </div>

      {fin.openReceivable > 0 ? (
        <Surface className="p-4 sm:p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-msk-ink/40">
            Balance âgée — créances ouvertes
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(fin.aging.byBucket) as AgingBucket[]).map((bucket) => (
              <div
                key={bucket}
                className="rounded-xl border border-msk-ink/8 px-3 py-2.5"
              >
                <p className="text-[11px] text-msk-ink/45">
                  {AGING_BUCKET_LABELS[bucket]}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm font-semibold tabular-nums",
                    bucket === "90_PLUS" && fin.aging.byBucket[bucket] > 0
                      ? "text-msk-coral"
                      : "text-msk-ink",
                  )}
                >
                  {formatComMoney(fin.aging.byBucket[bucket])}
                </p>
              </div>
            ))}
          </div>
        </Surface>
      ) : null}

      <div className="grid gap-4 @lg:grid-cols-12">
        <div className="@lg:col-span-4">
          <Section title="Identité">
            <ul className="space-y-3 text-sm text-msk-ink">
              <li className="flex gap-2.5">
                <UserRound
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span>
                  {client.contactName || (
                    <span className="text-msk-ink/40">Contact non renseigné</span>
                  )}
                  <span className="block text-msk-ink/50">
                    Suivi par {client.owner.firstName} {client.owner.lastName}
                  </span>
                </span>
              </li>
              {client.phone ? (
                <li className="flex gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35" aria-hidden />
                  <a href={`tel:${client.phone}`} className="text-msk-blue hover:underline">
                    {client.phone}
                  </a>
                </li>
              ) : null}
              {client.email ? (
                <li className="flex gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35" aria-hidden />
                  <a href={`mailto:${client.email}`} className="text-msk-blue hover:underline">
                    {client.email}
                  </a>
                </li>
              ) : null}
              <li className="border-t border-msk-ink/6 pt-3 text-xs text-msk-ink/45">
                Client depuis le {client.createdAt.toLocaleDateString("fr-FR")}
              </li>
            </ul>
          </Section>
        </div>

        <div className="@lg:col-span-8">
          <Section
            title="Factures"
            action={
              <div className="flex flex-wrap gap-1.5">
                <FactureFilterChip
                  label="Toutes"
                  count={invoicesWithBalance.length}
                  value="all"
                  current={invFilter ?? "all"}
                  baseParams={invBaseParams}
                />
                <FactureFilterChip
                  label="Payées"
                  count={bucketCounts.paye}
                  value="paye"
                  current={invFilter ?? "all"}
                  baseParams={invBaseParams}
                />
                <FactureFilterChip
                  label="Non payées"
                  count={bucketCounts.impaye}
                  value="impaye"
                  current={invFilter ?? "all"}
                  baseParams={invBaseParams}
                />
                <FactureFilterChip
                  label="En attente"
                  count={bucketCounts.attente}
                  value="attente"
                  current={invFilter ?? "all"}
                  baseParams={invBaseParams}
                />
              </div>
            }
          >
            {filteredInvoices.length === 0 ? (
              <p className="text-sm text-msk-ink/45">Aucune facture pour ce filtre.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-150 text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-msk-ink/40">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Numéro</th>
                      <th className="py-2 pr-3 font-medium">Statut</th>
                      <th className="py-2 pr-3 text-right font-medium">Montant</th>
                      <th className="py-2 pr-3 text-right font-medium">Solde</th>
                      <th className="py-2 pr-3 font-medium">Échéance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-msk-ink/6">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2.5 pr-3">
                          <Link
                            prefetch={false}
                            href={`/commercial/factures/${inv.id}`}
                            className="font-medium text-msk-blue hover:underline"
                          >
                            {displayDocNumber(inv.number, inv.draftCode)}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={invoiceStatusTone(inv.status)}>
                            {INVOICE_STATUS_LABELS[inv.status]}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatComMoney(inv.totalTtc, inv.currency)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {inv.bal.openBalance > 0
                            ? formatComMoney(inv.bal.openBalance, inv.currency)
                            : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-msk-ink/50">
                          {inv.dueDate ? inv.dueDate.toLocaleDateString("fr-FR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>

      <Section title="Paiements">
        {client.payments.length === 0 ? (
          <p className="text-sm text-msk-ink/45">Aucun paiement enregistré.</p>
        ) : (
          <ul className="space-y-2.5">
            {client.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-msk-ink/6 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-msk-ink">
                    {formatComMoney(p.amount)}
                    <span className="ml-2 text-xs font-normal text-msk-ink/50">
                      {PAYMENT_METHOD_LABELS[p.method]}
                    </span>
                  </p>
                  {p.reference ? (
                    <p className="text-xs text-msk-ink/45">Réf. {p.reference}</p>
                  ) : null}
                </div>
                <p className="text-xs text-msk-ink/45">
                  {p.paidAt.toLocaleDateString("fr-FR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Historique des mouvements">
        {movements.length === 0 ? (
          <p className="text-sm text-msk-ink/45">Aucun mouvement enregistré.</p>
        ) : (
          <ol className="relative space-y-3.5 border-l border-msk-ink/8 pl-5">
            {movements.map((m) => (
              <li key={m.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 bg-white",
                    m.tone === "coral" && "border-msk-coral",
                    m.tone === "success" && "border-emerald-500",
                    m.tone === "blue" && "border-msk-blue",
                  )}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={m.tone}>{m.kind}</Badge>
                  <p className="text-xs text-msk-ink/45">
                    {m.at.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <p className="mt-1 flex items-center justify-between gap-3 text-sm text-msk-ink">
                  <span className="min-w-0 truncate">{m.label}</span>
                  <span
                    className={cn(
                      "shrink-0 font-medium tabular-nums",
                      m.amount < 0 ? "text-emerald-700" : "text-msk-ink",
                    )}
                  >
                    {m.amount < 0 ? "− " : "+ "}
                    {formatComMoney(Math.abs(m.amount))}
                  </span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </PageShell>
  );
}
