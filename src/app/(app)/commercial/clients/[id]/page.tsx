import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Building2,
  ExternalLink,
  FolderOpen,
  Globe2,
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
import { CHANNEL_TYPE_LABELS } from "@/lib/crm/channels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { DocPdfThumb } from "@/components/commercial/doc-pdf-thumb";
import { ClientDetailActions } from "@/components/commercial/client-detail-actions";
import { OriginChip } from "@/components/crm/origin-chip";
import { SocialNetworkBadges } from "@/components/crm/social-network-badges";
import {
  canViewFolderPath,
  hasGedAccess,
} from "@/lib/ged/scope";
import { ensureClientRootFolder } from "@/lib/commercial/ged-client";
import {
  COM_DOCS_GATED,
  COM_DOCS_GATED_HINT,
} from "@/lib/commercial/gates";

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
      owner: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      sourceOpportunity: {
        select: { id: true, source: true },
      },
      crmOrganization: {
        select: {
          id: true,
          sector: true,
          website: true,
          source: true,
          notes: true,
          instagramUrl: true,
          linkedinUrl: true,
          tiktokUrl: true,
          facebookUrl: true,
          whatsappUrl: true,
          contacts: {
            orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
              email: true,
              phone: true,
              isPrimary: true,
              channels: {
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  type: true,
                  value: true,
                  isPrimary: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!client) notFound();
  if (!canAccessOwned(user, client.ownerId)) redirect("/commercial/clients");

  const canEdit = hasPermission(user, "com.clients.manage");
  const canCreateQuote = hasPermission(user, "com.devis.create");

  const location = [client.city, client.country].filter(Boolean).join(" · ");
  const org = client.crmOrganization;
  const originSource =
    org?.source ?? client.sourceOpportunity?.source ?? null;
  const socialUrls = {
    instagramUrl: org?.instagramUrl ?? null,
    linkedinUrl: org?.linkedinUrl ?? null,
    tiktokUrl: org?.tiktokUrl ?? null,
    facebookUrl: org?.facebookUrl ?? null,
    whatsappUrl: org?.whatsappUrl ?? null,
  };

  /**
   * Lien GED : crée le dossier client s’il manque (lazy, comme devis/factures),
   * puis n’expose le lien que si l’utilisateur peut le voir.
   */
  let gedFolderHref: string | null = null;
  if (hasGedAccess(user) && client.gedFolderCode) {
    try {
      const folder = await ensureClientRootFolder({
        clientId: client.id,
        createdById: user.id,
      });
      if (await canViewFolderPath(user, folder.path)) {
        gedFolderHref = `/ged?folder=${folder.id}`;
      }
    } catch {
      // Année GED absente / erreur tree — on garde le code sans lien.
    }
  }

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

      {/* Bandeau identité — même structure que fiche prospect */}
      <Surface className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 border-b border-msk-ink/6 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-3">
              <OriginChip source={originSource} />
            </div>
            <dl className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
              <MetaItem label="Suivi par">
                {client.owner.firstName} {client.owner.lastName}
              </MetaItem>
              <MetaItem label="Créé">
                {client.createdAt.toLocaleDateString("fr-FR")}
                {client.createdBy.id !== client.ownerId ? (
                  <span className="text-msk-ink/50">
                    {" "}
                    · {client.createdBy.firstName} {client.createdBy.lastName}
                  </span>
                ) : null}
              </MetaItem>
              <MetaItem label="Mis à jour">
                {client.updatedAt.toLocaleDateString("fr-FR")}
              </MetaItem>
              {org?.sector ? (
                <MetaItem label="Secteur">{org.sector}</MetaItem>
              ) : null}
              <MetaItem label="Dossier GED">
                {gedFolderHref ? (
                  <Link
                    prefetch={false}
                    href={gedFolderHref}
                    className="inline-flex items-center gap-1.5 font-medium text-msk-blue hover:underline"
                  >
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="font-mono text-xs">
                      {client.gedFolderCode}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-msk-ink/70">
                    <FolderOpen
                      className="h-3.5 w-3.5 text-msk-ink/40"
                      aria-hidden
                    />
                    {client.gedFolderCode}
                  </span>
                )}
              </MetaItem>
              <MetaItem label="Déplacement défaut">
                {client.includeTravelDefault ? "Oui" : "Non"}
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
            </dl>
          </div>

          <div className="bg-msk-chalk/40 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Contacts
            </p>
            {org && org.contacts.length > 0 ? (
              <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                {org.contacts.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-msk-ink/6 bg-white/80 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-msk-ink">
                        <UserRound
                          className="h-3.5 w-3.5 shrink-0 text-msk-blue"
                          aria-hidden
                        />
                        {c.firstName} {c.lastName}
                      </p>
                      {c.isPrimary ? (
                        <Badge tone="blue">Principal</Badge>
                      ) : null}
                    </div>
                    {c.jobTitle ? (
                      <p className="mt-0.5 text-xs font-medium text-msk-ink/55">
                        {c.jobTitle}
                      </p>
                    ) : null}
                    {c.channels.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {c.channels.map((ch) => (
                          <li
                            key={ch.id}
                            className="flex flex-wrap items-center gap-1.5 text-xs text-msk-ink/65"
                          >
                            <span className="font-medium text-msk-ink/45">
                              {CHANNEL_TYPE_LABELS[ch.type]}
                            </span>
                            {ch.type === "EMAIL" ? (
                              <a
                                href={`mailto:${ch.value}`}
                                className="text-msk-blue hover:underline"
                              >
                                {ch.value}
                              </a>
                            ) : ch.type === "PHONE" ||
                              ch.type === "WHATSAPP" ? (
                              <a
                                href={`tel:${ch.value}`}
                                className="text-msk-blue hover:underline"
                              >
                                {ch.value}
                              </a>
                            ) : (
                              <span>{ch.value}</span>
                            )}
                            {ch.isPrimary ? (
                              <Badge tone="muted">Principal</Badge>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-1.5 flex flex-col gap-1 text-xs">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex items-center gap-1.5 text-msk-blue hover:underline"
                          >
                            <Phone className="h-3 w-3" aria-hidden />
                            {c.phone}
                          </a>
                        ) : null}
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            className="inline-flex items-center gap-1.5 text-msk-blue hover:underline"
                          >
                            <Mail className="h-3 w-3" aria-hidden />
                            {c.email}
                          </a>
                        ) : null}
                        {!c.phone && !c.email ? (
                          <span className="text-msk-ink/40">—</span>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : client.contactName || client.phone || client.email ? (
              <ul className="mt-3 space-y-3">
                <li className="rounded-xl border border-msk-ink/6 bg-white/80 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {client.contactName ? (
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-msk-ink">
                        <UserRound
                          className="h-3.5 w-3.5 shrink-0 text-msk-blue"
                          aria-hidden
                        />
                        {client.contactName}
                      </p>
                    ) : null}
                    <Badge tone="blue">Principal</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1 text-xs">
                    {client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="inline-flex items-center gap-1.5 text-msk-blue hover:underline"
                      >
                        <Phone className="h-3 w-3" aria-hidden />
                        {client.phone}
                      </a>
                    ) : null}
                    {client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        className="inline-flex items-center gap-1.5 text-msk-blue hover:underline"
                      >
                        <Mail className="h-3 w-3" aria-hidden />
                        {client.email}
                      </a>
                    ) : null}
                    {!client.phone && !client.email ? (
                      <span className="text-msk-ink/40">—</span>
                    ) : null}
                  </div>
                </li>
              </ul>
            ) : (
              <p className="mt-3 text-sm text-msk-ink/40">Aucun contact</p>
            )}
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Section title="Entreprise">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-xl border border-msk-ink/6 bg-msk-chalk/40 p-3 sm:p-4">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                  Réseaux sociaux
                </p>
                <SocialNetworkBadges
                  urls={socialUrls}
                  emptyLabel={
                    org
                      ? "Aucun réseau — renseignez-les sur l’organisation CRM."
                      : "Pas d’organisation CRM liée."
                  }
                />
              </div>
              <ul className="space-y-3 text-sm text-msk-ink">
                <li className="flex gap-2.5">
                  <Building2
                    className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium">{client.name}</span>
                    {org?.sector ? (
                      <span className="block text-msk-ink/50">
                        {org.sector}
                      </span>
                    ) : null}
                  </span>
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
                <li className="flex gap-2.5">
                  <Globe2
                    className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                    aria-hidden
                  />
                  {org?.website ? (
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-msk-blue hover:underline"
                    >
                      {org.website}
                    </a>
                  ) : (
                    <span className="text-msk-ink/40">Pas de site web</span>
                  )}
                </li>
              </ul>
            </div>
            {(client.notes || org?.notes) ? (
              <div className="mt-4 border-t border-msk-ink/6 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                  Notes
                </p>
                {client.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-msk-ink/75">
                    {client.notes}
                  </p>
                ) : null}
                {org?.notes && org.notes !== client.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-msk-ink/60">
                    <span className="text-[11px] font-medium uppercase text-msk-ink/35">
                      Note CRM ·{" "}
                    </span>
                    {org.notes}
                  </p>
                ) : null}
              </div>
            ) : null}
          </Section>
        </div>

        <div className="lg:col-span-3">
          <Section
            title="Devis récents"
            action={
              canCreateQuote && !COM_DOCS_GATED ? (
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
            {COM_DOCS_GATED ? (
              <p className="text-sm text-msk-ink/50">
                Devis gelés — {COM_DOCS_GATED_HINT}
              </p>
            ) : client.quotes.length === 0 ? (
              <p className="text-sm text-msk-ink/45">Aucun devis</p>
            ) : (
              <ul className="space-y-3">
                {client.quotes.map((q) => (
                  <li
                    key={q.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-start"
                  >
                    {q.gedDocumentId ? (
                      <DocPdfThumb
                        documentId={q.gedDocumentId}
                        title={q.number}
                        subtitle={QUOTE_STATUS_LABELS[q.status]}
                        className="max-w-26 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1">
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
            {COM_DOCS_GATED ? (
              <p className="text-sm text-msk-ink/50">
                Factures gelées — {COM_DOCS_GATED_HINT}
              </p>
            ) : client.invoices.length === 0 ? (
              <p className="text-sm text-msk-ink/45">Aucune facture</p>
            ) : (
              <ul className="space-y-3">
                {client.invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-start"
                  >
                    {inv.gedDocumentId ? (
                      <DocPdfThumb
                        documentId={inv.gedDocumentId}
                        title={inv.number}
                        subtitle={INVOICE_STATUS_LABELS[inv.status]}
                        className="max-w-26 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1">
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
