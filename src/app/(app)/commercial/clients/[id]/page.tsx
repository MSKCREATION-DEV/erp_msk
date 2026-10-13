import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { canAccessOwned } from "@/lib/commercial/scope";
import {
  formatComMoney,
  invoiceStatusTone,
  INVOICE_STATUS_LABELS,
  quoteStatusTone,
  QUOTE_STATUS_LABELS,
} from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { DocPdfThumb } from "@/components/commercial/doc-pdf-thumb";
import { ClientDetailActions } from "@/components/commercial/client-detail-actions";

export const metadata: Metadata = { title: "Fiche client" };

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
      <div className="flex items-center justify-between gap-3 border-b border-msk-ink/[0.06] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold tracking-tight text-msk-ink">
          {title}
        </h2>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </Surface>
  );
}

export default async function CommercialClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.clients.view_own") &&
    !hasPermission(user, "com.clients.manage")
  ) {
    redirect("/commercial");
  }
  const { id } = await params;

  const client = await prisma.comClient.findUnique({
    where: { id },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          number: true,
          status: true,
          totalTtc: true,
          currency: true,
          gedDocumentId: true,
          createdAt: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          number: true,
          status: true,
          totalTtc: true,
          currency: true,
          gedDocumentId: true,
          createdAt: true,
        },
      },
      owner: { select: { firstName: true, lastName: true } },
    },
  });
  if (!client) notFound();
  if (!canAccessOwned(user, client.ownerId)) redirect("/commercial/clients");

  const canEdit = hasPermission(user, "com.clients.manage");
  const canCreateQuote = hasPermission(user, "com.devis.create");

  const location = [client.city, client.country].filter(Boolean).join(" · ");

  return (
    <PageShell>
      <PageHeader
        title={client.name}
        description={[client.contactName, location].filter(Boolean).join(" · ")}
        backHref="/commercial/clients"
        backLabel="Retour aux clients"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Clients", href: "/commercial/clients" },
          { label: client.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {client.includeTravelDefault ? (
              <Badge tone="muted">Frais déplacement</Badge>
            ) : null}
            <ClientDetailActions
              clientId={client.id}
              canEdit={canEdit}
              canCreateQuote={canCreateQuote}
              initial={{
                name: client.name,
                contactName: client.contactName ?? "",
                phone: client.phone ?? "",
                email: client.email ?? "",
                city: client.city ?? "",
                country: client.country,
                address: client.address ?? "",
                notes: client.notes ?? "",
                includeTravelDefault: client.includeTravelDefault,
              }}
            />
          </div>
        }
      />

      <Surface className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="space-y-4 p-5 sm:p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <MetaItem label="Suivi par">
                {client.owner.firstName} {client.owner.lastName}
              </MetaItem>
              <MetaItem label="Créé le">
                {client.createdAt.toLocaleDateString("fr-FR")}
              </MetaItem>
              {client.sourceOpportunityId ? (
                <MetaItem label="Prospect">
                  <Link
                    prefetch={false}
                    href={`/crm/prospects/${client.sourceOpportunityId}`}
                    className="font-medium text-msk-blue hover:underline"
                  >
                    Voir la fiche CRM
                  </Link>
                </MetaItem>
              ) : null}
              <MetaItem label="Mis à jour">
                {client.updatedAt.toLocaleDateString("fr-FR")}
              </MetaItem>
            </dl>
          </div>

          <div className="bg-msk-chalk/40 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Contact
            </p>
            <div className="mt-3 space-y-2">
              {client.contactName ? (
                <p className="flex items-center gap-2 text-base font-semibold text-msk-ink">
                  <UserRound
                    className="h-4 w-4 shrink-0 text-msk-blue"
                    aria-hidden
                  />
                  {client.contactName}
                </p>
              ) : (
                <p className="text-sm text-msk-ink/40">Aucun contact nommé</p>
              )}
              <div className="flex flex-col gap-1.5 pt-1 text-sm">
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center gap-2 text-msk-blue hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {client.phone}
                  </a>
                ) : null}
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-2 text-msk-blue hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                    {client.email}
                  </a>
                ) : null}
                {!client.phone && !client.email ? (
                  <p className="text-msk-ink/40">Aucun moyen de contact</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Section title="Coordonnées">
            <ul className="space-y-3 text-sm text-msk-ink">
              <li className="flex gap-2.5">
                <Building2
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span className="font-medium">{client.name}</span>
              </li>
              <li className="flex gap-2.5">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span>
                  {[client.address, client.city, client.country]
                    .filter(Boolean)
                    .join(" · ") || "Adresse non renseignée"}
                </span>
              </li>
            </ul>
            {client.notes ? (
              <div className="mt-5 border-t border-msk-ink/[0.06] pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-msk-ink/75">
                  {client.notes}
                </p>
              </div>
            ) : null}
          </Section>
        </div>

        <div className="lg:col-span-4">
          <Section
            title="Devis récents"
            action={
              canCreateQuote ? (
                <Link
                  prefetch={false}
                  href={`/commercial/devis/nouveau?clientId=${client.id}`}
                  className="text-xs font-medium text-msk-blue hover:underline"
                >
                  Nouveau
                </Link>
              ) : null
            }
          >
            {client.quotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-msk-ink/12 bg-msk-chalk/30 px-4 py-8 text-center">
                <p className="text-sm text-msk-ink/50">Aucun devis</p>
                <p className="mt-1 text-xs text-msk-ink/40">
                  Créez une proposition depuis ce client.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {client.quotes.map((q) => (
                  <li
                    key={q.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-start"
                  >
                    {q.gedDocumentId ? (
                      <DocPdfThumb
                        documentId={q.gedDocumentId}
                        title={q.number}
                        subtitle={QUOTE_STATUS_LABELS[q.status]}
                        className="max-w-[7.5rem] shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          prefetch={false}
                          href={`/commercial/devis/${q.id}`}
                          className="font-medium text-msk-blue hover:underline"
                        >
                          {q.number}
                        </Link>
                        <Badge tone={quoteStatusTone(q.status)}>
                          {QUOTE_STATUS_LABELS[q.status]}
                        </Badge>
                      </div>
                      <p className="text-sm tabular-nums text-msk-ink/70">
                        {formatComMoney(q.totalTtc, q.currency)}
                      </p>
                      <p className="text-xs text-msk-ink/45">
                        {q.createdAt.toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="lg:col-span-4">
          <Section title="Factures récentes">
            {client.invoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-msk-ink/12 bg-msk-chalk/30 px-4 py-8 text-center">
                <p className="text-sm text-msk-ink/50">Aucune facture</p>
                <p className="mt-1 text-xs text-msk-ink/40">
                  Émise depuis un devis accepté.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {client.invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-start"
                  >
                    {inv.gedDocumentId ? (
                      <DocPdfThumb
                        documentId={inv.gedDocumentId}
                        title={inv.number}
                        subtitle={INVOICE_STATUS_LABELS[inv.status]}
                        className="max-w-[7.5rem] shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          prefetch={false}
                          href={`/commercial/factures/${inv.id}`}
                          className="font-medium text-msk-blue hover:underline"
                        >
                          {inv.number}
                        </Link>
                        <Badge tone={invoiceStatusTone(inv.status)}>
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </Badge>
                      </div>
                      <p className="text-sm tabular-nums text-msk-ink/70">
                        {formatComMoney(inv.totalTtc, inv.currency)}
                      </p>
                      <p className="text-xs text-msk-ink/45">
                        {inv.createdAt.toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </PageShell>
  );
}
