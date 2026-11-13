import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { clientBalance, invoiceReste } from "@/lib/suivi/balances";
import { SV_GED_ENTITY } from "@/lib/suivi/ged";
import {
  formatSvXof,
  SV_INVOICE_STATUS_LABEL,
  SV_INVOICE_STATUS_TONE,
} from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { DetailHeroAmount } from "@/components/ui/detail-hero-amount";
import { SvGedDocActions } from "@/components/suivi/ged-doc-actions";
import { SvClientDetailActions } from "@/components/suivi/client-detail-actions";
import { SvPaymentForm } from "@/components/suivi/payment-form";

export const metadata: Metadata = { title: "Fiche client · Suivi" };

export default async function SuiviClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.clients.view");
  const { id } = await params;
  const { focus } = await searchParams;

  const client = await prisma.svClient.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { issuedAt: "desc" },
        include: { payments: { orderBy: { paidAt: "desc" } } },
      },
      contracts: { orderBy: { effectiveFrom: "desc" } },
      movements: {
        orderBy: { movedAt: "desc" },
        take: 10,
      },
    },
  });
  if (!client) notFound();

  const bal = clientBalance(client.invoices);
  const canInvoice =
    hasPermission(user, "sv.invoices.manage") || user.isSuperAdmin;
  const canEdit =
    hasPermission(user, "sv.clients.manage") || user.isSuperAdmin;

  const unpaidInvoices = client.invoices.filter(
    (i) => i.status !== "ANNULEE" && invoiceReste(i) > 0,
  );

  const gedLinks = await prisma.documentLink.findMany({
    where: {
      OR: [
        {
          entityType: SV_GED_ENTITY.CLIENT,
          entityId: client.id,
        },
        {
          entityType: SV_GED_ENTITY.INVOICE,
          entityId: { in: client.invoices.map((i) => i.id) },
        },
        {
          entityType: SV_GED_ENTITY.CONTRACT,
          entityId: { in: client.contracts.map((c) => c.id) },
        },
      ],
      document: { status: "ACTIVE", softDeletedAt: null },
    },
    include: {
      document: {
        select: {
          id: true,
          originalName: true,
          mime: true,
          size: true,
        },
      },
    },
    orderBy: { document: { createdAt: "desc" } },
  });

  const docByInvoice = new Map<string, (typeof gedLinks)[number]["document"]>();
  const docByContract = new Map<string, (typeof gedLinks)[number]["document"]>();
  const clientDocs = gedLinks.filter(
    (l) => l.entityType === SV_GED_ENTITY.CLIENT,
  );
  for (const link of gedLinks) {
    if (link.entityType === SV_GED_ENTITY.INVOICE) {
      if (!docByInvoice.has(link.entityId)) {
        docByInvoice.set(link.entityId, link.document);
      }
    }
    if (link.entityType === SV_GED_ENTITY.CONTRACT) {
      if (!docByContract.has(link.entityId)) {
        docByContract.set(link.entityId, link.document);
      }
    }
  }

  const location = [client.city, client.country].filter(Boolean).join(", ");

  return (
    <PageShell>
      <PageHeader
        title={client.name}
        description="Client Suivi — solde et encaissements"
        backHref="/suivi/clients"
      />

      <Surface className="mb-5 overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-msk-blue/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-caps text-msk-blue">
                  <Building2 className="size-3.5" aria-hidden />
                  Client
                </span>
                {bal.restant > 0 ? (
                  <Badge tone="coral">Reste dû</Badge>
                ) : (
                  <Badge tone="success">À jour</Badge>
                )}
                {bal.aVenir > 0 ? (
                  <Badge tone="blue">À venir {formatSvXof(bal.aVenir)}</Badge>
                ) : null}
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-msk-blue shadow-sm ring-1 ring-msk-ink/6">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-caps text-msk-ink/40">
                    Entreprise
                  </p>
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-msk-ink sm:text-3xl">
                    {client.name}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-msk-ink/55">
                    {client.contactName ? (
                      <span className="inline-flex items-center gap-1">
                        <UserRound
                          className="size-3.5 opacity-50"
                          aria-hidden
                        />
                        {client.contactName}
                      </span>
                    ) : null}
                    {client.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3.5 opacity-50" aria-hidden />
                        {client.phone}
                      </span>
                    ) : null}
                    {client.email ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3.5 opacity-50" aria-hidden />
                        {client.email}
                      </span>
                    ) : null}
                    {location ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5 opacity-50" aria-hidden />
                        {location}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-72">
              <DetailHeroAmount
                label="Facturé"
                value={formatSvXof(bal.totale)}
              />
              <DetailHeroAmount label="Payé" value={formatSvXof(bal.paye)} />
              <DetailHeroAmount
                label="Reste"
                value={formatSvXof(bal.restant)}
                emphasize={bal.restant > 0}
              />
            </div>
          </div>

          <div className="mt-5 border-t border-msk-ink/6 pt-4">
            <SvClientDetailActions
              clientId={client.id}
              canEdit={canEdit}
              canInvoice={canInvoice}
            />
          </div>
        </div>
      </Surface>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Surface className="p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-msk-ink">Identité</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            {client.contactName ? (
              <li className="text-msk-ink/80">{client.contactName}</li>
            ) : null}
            {client.email ? (
              <li className="flex items-center gap-2 text-msk-ink/70">
                <Mail className="size-3.5 shrink-0 text-msk-ink/35" aria-hidden />
                <a
                  href={`mailto:${client.email}`}
                  className="hover:text-msk-blue"
                >
                  {client.email}
                </a>
              </li>
            ) : null}
            {client.phone ? (
              <li className="flex items-center gap-2 text-msk-ink/70">
                <Phone className="size-3.5 shrink-0 text-msk-ink/35" aria-hidden />
                {client.phone}
              </li>
            ) : null}
            {location ? (
              <li className="flex items-center gap-2 text-msk-ink/70">
                <MapPin className="size-3.5 shrink-0 text-msk-ink/35" aria-hidden />
                {location}
              </li>
            ) : null}
            {client.notes ? (
              <li className="flex items-start gap-2 text-msk-ink/60">
                <StickyNote className="mt-0.5 size-3.5 shrink-0 text-msk-ink/35" aria-hidden />
                <span>{client.notes}</span>
              </li>
            ) : null}
            {!client.contactName &&
            !client.email &&
            !client.phone &&
            !location &&
            !client.notes ? (
              <li className="text-msk-ink/45">Aucune coordonnée.</li>
            ) : null}
          </ul>
        </Surface>

        <Surface
          id="paiements"
          className={`p-4 lg:col-span-2 ${
            focus === "paiements" ? "ring-2 ring-msk-blue/30" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-msk-ink">
              Paiements à encaisser
            </h2>
          </div>
          {unpaidInvoices.length === 0 ? (
            <p className="mt-3 text-sm text-msk-ink/55">
              Aucune facture avec reste à payer.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-msk-ink/6">
              {unpaidInvoices.map((inv) => (
                <li key={inv.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link
                        href={`/suivi/factures/${inv.id}`}
                        className="font-medium text-msk-ink hover:text-msk-blue"
                      >
                        {inv.number ?? "Sans n°"}
                      </Link>
                      <p className="text-xs text-msk-ink/50">
                        reste {formatSvXof(invoiceReste(inv))}
                      </p>
                    </div>
                    {canInvoice ? (
                      <SvPaymentForm
                        invoiceId={inv.id}
                        reste={invoiceReste(inv)}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-msk-ink/6 px-4 py-3">
            <h2 className="text-sm font-semibold text-msk-ink">Factures</h2>
          </div>
          {client.invoices.length === 0 ? (
            <p className="p-4 text-sm text-msk-ink/55">Aucune facture.</p>
          ) : (
            <ul className="divide-y divide-msk-ink/6">
              {client.invoices.map((inv) => {
                const ged = docByInvoice.get(inv.id);
                return (
                  <li key={inv.id} className="px-4 py-3">
                    <Link
                      href={`/suivi/factures/${inv.id}`}
                      className="flex items-center justify-between gap-3 hover:text-msk-blue"
                    >
                      <div>
                        <p className="font-medium text-msk-ink">
                          {inv.number ?? "Sans n°"}
                        </p>
                        <p className="text-xs text-msk-ink/50">
                          {inv.object ?? "—"}
                          {inv.issuedAt
                            ? ` · ${inv.issuedAt.toLocaleDateString("fr-FR")}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={SV_INVOICE_STATUS_TONE[inv.status]}>
                          {SV_INVOICE_STATUS_LABEL[inv.status]}
                        </Badge>
                        <p className="mt-1 text-sm tabular-nums">
                          {formatSvXof(inv.totalTtc)} · reste{" "}
                          {formatSvXof(invoiceReste(inv))}
                        </p>
                      </div>
                    </Link>
                    {ged ? (
                      <SvGedDocActions
                        documentId={ged.id}
                        originalName={ged.originalName}
                        mime={ged.mime}
                        size={ged.size}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Surface>

        <div className="space-y-5">
          <Surface className="overflow-hidden p-0">
            <div className="border-b border-msk-ink/6 px-4 py-3">
              <h2 className="text-sm font-semibold text-msk-ink">
                Contrats / GED
              </h2>
            </div>
            {client.contracts.length === 0 && clientDocs.length === 0 ? (
              <p className="p-4 text-sm text-msk-ink/55">Aucun contrat lié.</p>
            ) : (
              <ul className="divide-y divide-msk-ink/6">
                {client.contracts.map((ct) => {
                  const ged =
                    (ct.gedDocumentId
                      ? gedLinks.find((l) => l.document.id === ct.gedDocumentId)
                          ?.document
                      : null) ?? docByContract.get(ct.id);
                  return (
                    <li key={ct.id} className="px-4 py-3">
                      <p className="font-medium text-msk-ink">{ct.title}</p>
                      <p className="text-xs text-msk-ink/50">
                        {ct.partyName ?? "—"}
                        {ct.monthlyAmount != null
                          ? ` · ${formatSvXof(ct.monthlyAmount)} / mois`
                          : ""}
                      </p>
                      {ged ? (
                        <SvGedDocActions
                          documentId={ged.id}
                          originalName={ged.originalName}
                          mime={ged.mime}
                          size={ged.size}
                        />
                      ) : ct.sourceDocument ? (
                        <p className="mt-1 text-xs text-msk-ink/40">
                          Source : {ct.sourceDocument} (GED non lié)
                        </p>
                      ) : null}
                      {ct.notes ? (
                        <p className="mt-1 text-xs text-msk-coral/90">
                          {ct.notes}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
                {clientDocs.map((link) => (
                  <li key={link.id} className="px-4 py-3">
                    <p className="font-medium text-msk-ink">
                      {link.document.originalName}
                    </p>
                    <SvGedDocActions
                      documentId={link.document.id}
                      originalName={link.document.originalName}
                      mime={link.document.mime}
                      size={link.document.size}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="overflow-hidden p-0">
            <div className="border-b border-msk-ink/6 px-4 py-3">
              <h2 className="text-sm font-semibold text-msk-ink">
                Historique paiements
              </h2>
            </div>
            {client.invoices.flatMap((i) => i.payments).length === 0 ? (
              <p className="p-4 text-sm text-msk-ink/55">Aucun paiement.</p>
            ) : (
              <ul className="divide-y divide-msk-ink/6">
                {client.invoices
                  .flatMap((i) =>
                    i.payments.map((p) => ({
                      ...p,
                      invoiceNumber: i.number,
                      invoiceId: i.id,
                    })),
                  )
                  .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
                  .map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {p.invoiceNumber ?? "Facture"}
                        </p>
                        <p className="text-xs text-msk-ink/50">
                          {p.paidAt.toLocaleDateString("fr-FR")}
                          {p.method ? ` · ${p.method}` : ""}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </p>
                      </div>
                      <span className="tabular-nums font-medium">
                        {formatSvXof(p.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Surface>

          {client.movements.length > 0 ? (
            <Surface className="overflow-hidden p-0">
              <div className="border-b border-msk-ink/6 px-4 py-3">
                <h2 className="text-sm font-semibold text-msk-ink">
                  Mouvements liés
                </h2>
              </div>
              <ul className="divide-y divide-msk-ink/6">
                {client.movements.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{m.category}</p>
                      <p className="text-xs text-msk-ink/50">
                        {m.movedAt.toLocaleDateString("fr-FR")} · {m.direction}
                      </p>
                    </div>
                    <span className="tabular-nums font-medium">
                      {m.direction === "OUT" ? "−" : "+"}
                      {formatSvXof(m.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </Surface>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
