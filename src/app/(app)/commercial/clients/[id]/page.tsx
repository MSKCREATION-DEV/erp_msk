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
import { canAccessClient } from "@/lib/commercial/scope";
import {
  commercialTeamUserIds,
  formatCollaboratorOptionLabel,
  listCommercialRoster,
} from "@/lib/crm/team";
import { computeClientFinancials } from "@/lib/billing/client-financials";
import { displayDocNumber } from "@/lib/commercial/doc-display";
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
import { DetailHeroAmount } from "@/components/ui/detail-hero-amount";
import { DocPdfThumb } from "@/components/commercial/doc-pdf-thumb";
import { ContractDocActions } from "@/components/commercial/contract-doc-actions";
import { ClientDetailActions } from "@/components/commercial/client-detail-actions";
import { ClientReassignForm } from "@/components/commercial/client-reassign-form";
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
import { USER_STATUS_LABEL, USER_STATUS_TONE } from "@/lib/users/status";
import { cn } from "@/lib/utils";

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
  const teamIds = await commercialTeamUserIds();
  const memberIds = Array.from(new Set([user.id, ...teamIds]));

  const client = await prisma.comClient.findUnique({
    where: { id },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          number: true,
          draftCode: true,
          status: true,
          totalTtc: true,
          currency: true,
          gedDocumentId: true,
          createdAt: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          number: true,
          draftCode: true,
          status: true,
          totalTtc: true,
          amountPaid: true,
          currency: true,
          gedDocumentId: true,
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
        take: 50,
        select: {
          id: true,
          amount: true,
          paidAt: true,
          allocations: { select: { amount: true } },
        },
      },
      contracts: {
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          reference: true,
          status: true,
          title: true,
          family: true,
          serviceKind: true,
          gedDocumentId: true,
        },
      },
      owner: {
        select: { id: true, firstName: true, lastName: true, status: true },
      },
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
  if (!canAccessClient(user, client.ownerId, memberIds)) {
    redirect("/commercial/clients");
  }

  const canEdit = hasPermission(user, "com.clients.manage");
  const canCreateQuote = hasPermission(user, "com.devis.create");
  const canReassignOwner = canEdit;
  const canManageContracts = hasPermission(user, "com.contrats.manage");

  const crmTrailWhere =
    client.crmOrganizationId || client.sourceOpportunityId
      ? {
          OR: [
            ...(client.crmOrganizationId
              ? [{ organizationId: client.crmOrganizationId }]
              : []),
            ...(client.sourceOpportunityId
              ? [{ opportunityId: client.sourceOpportunityId }]
              : []),
          ],
        }
      : null;

  const [assignRoster, events, crmActivities] = await Promise.all([
    canReassignOwner
      ? listCommercialRoster({ mode: "assign", extraIds: [client.ownerId] })
      : Promise.resolve([] as Awaited<ReturnType<typeof listCommercialRoster>>),
    prisma.comClientEvent.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    crmTrailWhere
      ? prisma.crmActivity.findMany({
          where: crmTrailWhere,
          orderBy: { occurredAt: "desc" },
          take: 60,
          include: {
            actor: { select: { id: true, firstName: true, lastName: true } },
          },
        })
      : Promise.resolve(
          [] as {
            id: string;
            occurredAt: Date;
            summary: string;
            body: string | null;
            actor: { id: string; firstName: string; lastName: string };
          }[],
        ),
  ]);

  /** P1.2 — trail CRM fusionné à l’historique client (pas de perte d’historique à la convert). */
  type TimelineItem = {
    id: string;
    at: Date;
    summary: string;
    body?: string | null;
    actorName: string;
    source: "crm" | "client";
  };
  const timeline: TimelineItem[] = [
    ...events.map((ev): TimelineItem => ({
      id: `client-${ev.id}`,
      at: ev.createdAt,
      summary: ev.summary,
      actorName: ev.actor
        ? `${ev.actor.firstName} ${ev.actor.lastName}`
        : "(acteur inconnu)",
      source: "client",
    })),
    ...crmActivities.map((a): TimelineItem => ({
      id: `crm-${a.id}`,
      at: a.occurredAt,
      summary: a.summary,
      body: a.body,
      actorName: `${a.actor.firstName} ${a.actor.lastName}`,
      source: "crm",
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const assignOptions = assignRoster.map((u) => ({
    value: u.id,
    label: formatCollaboratorOptionLabel(
      u.firstName,
      u.lastName,
      u.status,
    ),
  }));

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
  });

  const ownerLabel = client.owner
    ? `${client.owner.firstName} ${client.owner.lastName}`
    : null;

  return (
    <PageShell>
      <PageHeader
        title={client.name}
        description="Client commercial — devis, factures et contrats"
        backHref="/commercial/clients"
        backLabel="Retour aux clients"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Clients", href: "/commercial/clients" },
          { label: client.name },
        ]}
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
                {fin.overdueAmount > 0 ? (
                  <Badge tone="coral">En retard</Badge>
                ) : fin.openReceivable > 0 ? (
                  <Badge tone="blue">Créances ouvertes</Badge>
                ) : (
                  <Badge tone="success">À jour</Badge>
                )}
                {client.includeTravelDefault ? (
                  <Badge tone="muted">Frais déplacement</Badge>
                ) : null}
                {originSource ? <OriginChip source={originSource} /> : null}
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
                    {ownerLabel ? (
                      <span className="text-msk-ink/45">
                        Suivi par {ownerLabel}
                      </span>
                    ) : null}
                    {fin.nextDueDate ? (
                      <span className="tabular-nums">
                        Prochaine échéance{" "}
                        {fin.nextDueDate.toLocaleDateString("fr-FR")}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-80 sm:grid-cols-4">
              <DetailHeroAmount
                label="Facturé"
                value={formatComMoney(fin.totalInvoiced)}
              />
              <DetailHeroAmount
                label="Encaissé"
                value={formatComMoney(fin.totalPaidAllocated)}
              />
              <DetailHeroAmount
                label="Créances"
                value={formatComMoney(fin.openReceivable)}
                emphasize={fin.openReceivable > 0}
              />
              <DetailHeroAmount
                label="Retard"
                value={formatComMoney(fin.overdueAmount)}
                emphasize={fin.overdueAmount > 0}
              />
            </div>
          </div>

          <div className="mt-5 border-t border-msk-ink/6 pt-4">
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
        </div>
      </Surface>

      {client.contracts.length > 0 ? (
        <Section title="Contrats">
          <ul className="space-y-2">
            {client.contracts.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-2.5 rounded-xl border border-msk-ink/8 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Link
                    prefetch={false}
                    href={`/commercial/contrats/${c.id}`}
                    className="font-medium text-msk-blue hover:underline"
                  >
                    {c.reference}
                  </Link>
                  <Badge tone={c.status === "ACTIF" ? "success" : "muted"}>
                    {c.status}
                  </Badge>
                  {c.title ? (
                    <span className="truncate text-sm text-msk-ink/50">
                      {c.title}
                    </span>
                  ) : null}
                </div>
                <ContractDocActions
                  contractId={c.id}
                  reference={c.reference}
                  gedDocumentId={c.gedDocumentId}
                  family={c.family}
                  serviceKind={c.serviceKind}
                  canManage={canManageContracts}
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Bandeau identité — même structure que fiche prospect */}
      <Surface className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 border-b border-msk-ink/6 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-3">
              <OriginChip source={originSource} />
            </div>
            <dl className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
              <MetaItem label="Suivi par">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {client.owner.firstName} {client.owner.lastName}
                    </span>
                    <Badge
                      tone={
                        USER_STATUS_TONE[client.owner.status] ?? "muted"
                      }
                      className="text-[10px]"
                    >
                      {USER_STATUS_LABEL[client.owner.status] ??
                        client.owner.status}
                    </Badge>
                  </div>
                  {canReassignOwner ? (
                    <ClientReassignForm
                      clientId={client.id}
                      currentOwnerId={client.ownerId}
                      assignOptions={assignOptions}
                    />
                  ) : null}
                </div>
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

      <div className="grid gap-4 @lg:grid-cols-12">
        <div className="@lg:col-span-5">
          <Section title="Entreprise">
            <ul className="space-y-3.5 text-sm text-msk-ink">
              <li className="flex gap-2.5">
                <Building2
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span>
                  <span className="font-medium">{client.name}</span>
                  {org?.sector ? (
                    <span className="block text-msk-ink/50">{org.sector}</span>
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
              <li className="border-t border-msk-ink/6 pt-3.5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
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
              </li>
            </ul>
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

        <div className="@lg:col-span-3">
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
                        title={displayDocNumber(q.number, q.draftCode)}
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
                          {displayDocNumber(q.number, q.draftCode)}
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

        <div className="@lg:col-span-4">
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
                        title={displayDocNumber(inv.number, inv.draftCode)}
                        subtitle={INVOICE_STATUS_LABELS[inv.status]}
                        className="max-w-26 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          prefetch={false}
                          href={`/comptabilite/factures/${inv.id}`}
                          className="font-medium text-msk-blue hover:underline"
                        >
                          {displayDocNumber(inv.number, inv.draftCode)}
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

      <Section
        title="Historique"
        action={
          client.sourceOpportunityId ? (
            <p className="text-xs text-msk-ink/40">
              Fusion commercial + trail CRM
            </p>
          ) : undefined
        }
      >
        {timeline.length === 0 ? (
          <p className="text-sm text-msk-ink/45">Aucun événement enregistré.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-msk-ink/8 pl-5">
            {timeline.map((ev) => (
              <li key={ev.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 bg-white",
                    ev.source === "crm" ? "border-msk-coral" : "border-msk-blue",
                  )}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ev.source === "crm" ? "coral" : "blue"}>
                    {ev.source === "crm" ? "CRM" : "Client"}
                  </Badge>
                  <p className="text-xs text-msk-ink/45">
                    {ev.at.toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}{" "}
                    · {ev.actorName}
                  </p>
                </div>
                <p className="mt-1 text-sm text-msk-ink">{ev.summary}</p>
                {ev.body ? (
                  <p className="mt-0.5 text-xs text-msk-ink/55">{ev.body}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </PageShell>
  );
}
