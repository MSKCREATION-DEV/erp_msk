import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Globe2,
  Mail,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  canMutateCrmDeal,
  canReassignCrmDeal,
} from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  ACTIVITY_LABELS,
  formatXof,
  SOURCE_LABELS,
  STAGE_HINTS,
  STAGE_LABELS,
} from "@/lib/crm/labels";
import { isTestOrgName } from "@/lib/crm/test-data";
import { isDevisSlaBreached } from "@/lib/crm/devis-sla";
import {
  formatComMoney,
  INVOICE_STATUS_LABELS,
  QUOTE_STATUS_LABELS,
} from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ProspectDetailActions } from "@/components/crm/prospect-detail-actions";
import { ProspectReassignForm } from "@/components/crm/prospect-reassign-form";
import { OriginChip } from "@/components/crm/origin-chip";
import { OfferConfigBadges } from "@/components/crm/offer-config-badges";
import { DocPdfThumb } from "@/components/commercial/doc-pdf-thumb";
import {
  COM_DOCS_GATED,
  COM_DOCS_GATED_HINT,
} from "@/lib/commercial/gates";
import { cn } from "@/lib/utils";

const SCRIPT_CHANNELS = new Set([
  "INSTAGRAM",
  "LINKEDIN",
  "WHATSAPP",
  "EMAIL",
  "TELEPHONE",
]);

function buildScriptsHref(opts: {
  source: string | null | undefined;
  prenom?: string | null;
  entreprise: string;
  offre?: string | null;
  secteur?: string | null;
  ville?: string | null;
}): string {
  const q = new URLSearchParams();
  const source = opts.source ?? "";
  if (SCRIPT_CHANNELS.has(source)) q.set("canal", source);
  if (opts.prenom) q.set("prenom", opts.prenom);
  if (opts.entreprise) q.set("entreprise", opts.entreprise);
  if (opts.offre) q.set("offre", opts.offre);
  if (opts.secteur) q.set("secteur", opts.secteur);
  if (opts.ville) q.set("ville", opts.ville);
  if (source && source in SOURCE_LABELS) {
    q.set("source", SOURCE_LABELS[source as keyof typeof SOURCE_LABELS]);
  }
  const qs = q.toString();
  return qs ? `/crm/scripts?${qs}` : "/crm/scripts";
}

export const metadata: Metadata = { title: "Fiche prospect" };

function stageTone(
  stage: string,
): "muted" | "success" | "coral" | "blue" {
  if (stage === "GAGNE") return "success";
  if (stage === "PERDU") return "coral";
  if (stage === "INTERESSE" || stage === "DEVIS_ENVOYE") return "blue";
  return "muted";
}

function Section({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Surface className={cn("flex h-full flex-col p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-msk-ink">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Surface>
  );
}

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

export default async function CrmProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");
  const { id } = await params;

  const deal = await prisma.crmOpportunity.findUnique({
    where: { id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          sector: true,
          city: true,
          country: true,
          website: true,
          notes: true,
          contacts: {
            orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
              phone: true,
              email: true,
              isPrimary: true,
            },
          },
        },
      },
      catalogOffer: {
        select: {
          id: true,
          name: true,
          sku: true,
          priceXof: true,
          floorPriceXof: true,
        },
      },
      opportunityOffers: {
        orderBy: { sortOrder: "asc" },
        include: {
          catalogOffer: {
            select: {
              id: true,
              name: true,
              sku: true,
              priceXof: true,
              floorPriceXof: true,
            },
          },
        },
      },
      owner: { select: { firstName: true, lastName: true, id: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 30,
        include: {
          actor: { select: { firstName: true, lastName: true } },
        },
      },
      _count: { select: { activities: true } },
      tasks: {
        where: { status: "OPEN" },
        orderBy: { dueAt: "asc" },
        take: 8,
        select: { id: true, title: true, dueAt: true },
      },
      comQuotes: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          number: true,
          status: true,
          currency: true,
          totalTtc: true,
          gedDocumentId: true,
          invoices: {
            take: 3,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              number: true,
              status: true,
              currency: true,
              totalTtc: true,
            },
          },
        },
      },
    },
  });
  if (!deal) notFound();

  /** LOT-E : lecture partagée — tout crm.access peut ouvrir la fiche. */
  if (!hasPermission(user, "crm.access") && !user.isSuperAdmin) {
    redirect("/crm/prospects");
  }

  const canMutate = canMutateCrmDeal(user, deal.ownerId);
  const canEdit =
    canMutate &&
    (user.isSuperAdmin || hasPermission(user, "crm.prospect.edit_own"));
  const canReassign = canReassignCrmDeal(user);

  const linkedClient = await prisma.comClient.findFirst({
    where: {
      OR: [
        { sourceOpportunityId: deal.id },
        { crmOrganizationId: deal.organizationId },
      ],
    },
    select: { id: true, name: true, includeTravelDefault: true },
  });

  const canCreateQuote =
    canMutate && hasPermission(user, "com.devis.create");
  const canManageClients =
    canMutate && hasPermission(user, "com.clients.manage");

  const [catalogOffers, quoteDocs] = await Promise.all([
    canCreateQuote
      ? prisma.catalogOffer.findMany({
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            sku: true,
            priceXof: true,
            floorPriceXof: true,
          },
        })
      : Promise.resolve([]),
    deal.comQuotes.some((q) => q.gedDocumentId)
      ? prisma.document.findMany({
          where: {
            id: {
              in: deal.comQuotes
                .map((q) => q.gedDocumentId)
                .filter((x): x is string => Boolean(x)),
            },
          },
          select: {
            id: true,
            originalName: true,
            mime: true,
            size: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const docById = new Map(quoteDocs.map((d) => [d.id, d]));

  const lastActivity = deal.activities[0];
  const now = new Date();
  const overdue =
    deal.followUpAt != null &&
    deal.followUpAt < now &&
    deal.stage !== "GAGNE" &&
    deal.stage !== "PERDU";
  const uiStage = deal.stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : deal.stage;
  const devisDue = isDevisSlaBreached({
    stage: deal.stage,
    interestedAt: deal.interestedAt,
    updatedAt: deal.updatedAt,
    quoteCount: deal.comQuotes.length,
  });
  const primaryContact =
    deal.organization.contacts.find((c) => c.isPrimary) ??
    deal.organization.contacts[0] ??
    null;
  const sameOwnerAsCreator = deal.ownerId === deal.createdById;

  const canLog =
    canMutate && hasPermission(user, "crm.activity.log");
  const requireFollowUp =
    deal.followUpAt == null &&
    uiStage !== "NOUVEAU" &&
    uiStage !== "GAGNE" &&
    uiStage !== "PERDU";
  const readOnlyShared = !canMutate;

  const teamIds = canReassign ? await commercialTeamUserIds() : [];
  const reassignCandidates = canReassign
    ? await prisma.user.findMany({
        where: {
          id: { in: Array.from(new Set([user.id, ...teamIds])) },
          status: "ACTIVE",
        },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      })
    : [];

  const quotePrefill = (() => {
    const seen = new Set<string>();
    const rows = [
      ...deal.opportunityOffers.map((o) => o.catalogOffer),
      ...(deal.catalogOffer ? [deal.catalogOffer] : []),
    ].filter((o) => {
      if (!("priceXof" in o)) return false;
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    }) as {
      id: string;
      name: string;
      sku: string;
      priceXof: number | null;
    }[];
    if (rows.length === 0) return undefined;
    return rows.map((o) => ({
      label: `${o.sku} · ${o.name}`,
      qty: 1,
      unitPrice: o.priceXof ?? 0,
      catalogOfferId: o.id,
    }));
  })();

  const quoteClients = linkedClient
    ? [
        {
          id: linkedClient.id,
          name: linkedClient.name,
          includeTravelDefault: linkedClient.includeTravelDefault,
        },
      ]
    : [];

  return (
    <PageShell>
      <PageHeader
        title={deal.organization.name}
        description={
          deal.title !== deal.organization.name ? deal.title : undefined
        }
        backHref="/crm/prospects"
        backLabel="Retour aux prospects"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Prospects", href: "/crm/prospects" },
          { label: deal.organization.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stageTone(uiStage)}>{STAGE_LABELS[uiStage]}</Badge>
            {linkedClient ? (
              <Badge tone="success">Client commercial</Badge>
            ) : null}
            {isTestOrgName(deal.organization.name) ? (
              <Badge tone="coral">TEST</Badge>
            ) : null}
            {overdue ? <Badge tone="coral">Relance en retard</Badge> : null}
            {canEdit ? (
              <Link
                prefetch={false}
                href={`/crm/prospects/${deal.id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-ink transition hover:bg-msk-chalk"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Modifier
              </Link>
            ) : null}
            {canReassign ? (
              <ProspectReassignForm
                opportunityId={deal.id}
                currentOwnerId={deal.ownerId}
                candidates={reassignCandidates}
              />
            ) : null}
            {hasPermission(user, "crm.scripts.view") ? (
              <Link
                prefetch={false}
                href={buildScriptsHref({
                  source: deal.source,
                  prenom:
                    deal.organization.contacts[0]?.firstName ?? null,
                  entreprise: deal.organization.name,
                  offre:
                    deal.opportunityOffers[0]?.catalogOffer.name ??
                    deal.catalogOffer?.name ??
                    null,
                  secteur: deal.organization.sector,
                  ville: deal.organization.city,
                })}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-ink transition hover:bg-msk-chalk"
              >
                <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
                Scripts
              </Link>
            ) : null}
            <ProspectDetailActions
              opportunityId={deal.id}
              stage={deal.stage}
              activityCount={deal._count.activities}
              hasFollowUp={deal.followUpAt != null}
              canEditStage={canEdit}
              canLogActivity={canLog}
              requireFollowUp={requireFollowUp}
              quote={{
                existingQuoteId: deal.comQuotes[0]?.id ?? null,
                existingClientId: linkedClient?.id,
                canCreateQuote,
                canManageClients,
                clients: quoteClients,
                offers: catalogOffers,
                initialLines: quotePrefill,
                defaultObject: `Proposition — ${deal.organization.name}`,
              }}
            />
          </div>
        }
      />

      {uiStage === "QUALIFICATION" && STAGE_HINTS.QUALIFICATION ? (
        <p className="rounded-xl border border-msk-blue/15 bg-msk-blue/[0.04] px-4 py-2.5 text-sm text-msk-ink/65">
          {STAGE_HINTS.QUALIFICATION}
        </p>
      ) : null}

      {readOnlyShared ? (
        <Surface className="border border-msk-ink/10 bg-msk-chalk/50 px-5 py-3.5">
          <p className="text-sm font-semibold text-msk-ink">
            Lecture seule — suivi par {deal.owner.firstName}{" "}
            {deal.owner.lastName}
          </p>
          <p className="mt-0.5 text-xs text-msk-ink/55">
            Vous voyez ce dossier pour éviter les doublons. Pour journaliser ou
            modifier, demandez une affectation à la Direction / Admin CRM.
          </p>
        </Surface>
      ) : null}

      {linkedClient ? (
        <Surface className="flex flex-wrap items-center justify-between gap-3 border border-msk-blue/20 bg-msk-blue/[0.04] px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-msk-ink">
              Ce prospect est un client commercial
            </p>
            <p className="mt-0.5 text-xs text-msk-ink/55">
              Dossier lié — pas de double saisie. Statut CRM attendu : Client.
            </p>
          </div>
          <Link
            prefetch={false}
            href={`/commercial/clients/${linkedClient.id}`}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white transition hover:bg-msk-blue/90"
          >
            Ouvrir la fiche client
          </Link>
        </Surface>
      ) : null}

      {/* Bandeau identité — origine explicite + méta sans doublons */}
      <Surface className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 border-b border-msk-ink/[0.06] p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-3">
              <OriginChip source={deal.source} />
              {deal.budgetXof != null ? (
                <div className="inline-flex flex-col rounded-xl border border-msk-ink/[0.08] bg-msk-chalk/40 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-msk-ink/40">
                    Budget estimé
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-msk-ink">
                    {formatXof(deal.budgetXof)}
                  </span>
                </div>
              ) : null}
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetaItem label="Suivi par">
                {deal.owner.firstName} {deal.owner.lastName}
              </MetaItem>
              <MetaItem label="Créé">
                {deal.createdAt.toLocaleDateString("fr-FR")}
                {!sameOwnerAsCreator ? (
                  <span className="text-msk-ink/50">
                    {" "}
                    · {deal.createdBy.firstName} {deal.createdBy.lastName}
                  </span>
                ) : null}
              </MetaItem>
              <MetaItem label="Prochaine action">
                {deal.nextAction || "—"}
              </MetaItem>
              <MetaItem label="Relance">
                <span
                  className={cn(
                    overdue && "font-semibold text-msk-coral",
                  )}
                >
                  {deal.followUpAt
                    ? deal.followUpAt.toLocaleDateString("fr-FR")
                    : "—"}
                  {overdue ? " · retard" : ""}
                </span>
              </MetaItem>
            </dl>
          </div>

          <div className="bg-msk-chalk/40 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
              Contact principal
            </p>
            {primaryContact ? (
              <div className="mt-3 space-y-2">
                <p className="flex items-center gap-2 text-base font-semibold text-msk-ink">
                  <UserRound
                    className="h-4 w-4 shrink-0 text-msk-blue"
                    aria-hidden
                  />
                  {primaryContact.firstName} {primaryContact.lastName}
                </p>
                {primaryContact.jobTitle ? (
                  <p className="text-sm text-msk-ink/55">
                    {primaryContact.jobTitle}
                  </p>
                ) : null}
                <div className="flex flex-col gap-1.5 pt-1 text-sm">
                  {primaryContact.phone ? (
                    <a
                      href={`tel:${primaryContact.phone}`}
                      className="inline-flex items-center gap-2 text-msk-blue hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {primaryContact.phone}
                    </a>
                  ) : null}
                  {primaryContact.email ? (
                    <a
                      href={`mailto:${primaryContact.email}`}
                      className="inline-flex items-center gap-2 text-msk-blue hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      {primaryContact.email}
                    </a>
                  ) : null}
                  {!primaryContact.phone && !primaryContact.email ? (
                    <p className="text-msk-ink/40">Aucun moyen de contact</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-msk-ink/40">Aucun contact</p>
            )}
          </div>
        </div>
      </Surface>

      {devisDue ? (
        <Surface className="border-msk-coral/30 bg-msk-coral/[0.04] p-4 sm:p-5">
          <p className="text-sm font-semibold text-msk-coral">
            GUIDE — devis sous 24h
          </p>
          <p className="mt-1 text-sm text-msk-ink/70">
            Prospect Intéressé sans devis lié. Créez le client commercial puis le
            devis, ou envoyez la proposition dès maintenant.
          </p>
        </Surface>
      ) : null}

      {/* Grille plein largeur */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <Section title="Entreprise">
            <ul className="space-y-3 text-sm text-msk-ink">
              <li className="flex gap-2.5">
                <Building2
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                <span>
                  <span className="font-medium">{deal.organization.name}</span>
                  {deal.organization.sector ? (
                    <span className="block text-msk-ink/50">
                      {deal.organization.sector}
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
                  {[deal.organization.city, deal.organization.country]
                    .filter(Boolean)
                    .join(" · ") || "Ville non renseignée"}
                </span>
              </li>
              <li className="flex gap-2.5">
                <Globe2
                  className="mt-0.5 h-4 w-4 shrink-0 text-msk-ink/35"
                  aria-hidden
                />
                {deal.organization.website ? (
                  <a
                    href={deal.organization.website}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-msk-blue hover:underline"
                  >
                    {deal.organization.website}
                  </a>
                ) : (
                  <span className="text-msk-ink/40">Pas de site web</span>
                )}
              </li>
            </ul>
            <div className="mt-4 border-t border-msk-ink/[0.06] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                Résumé entreprise
              </p>
              {deal.organization.notes ? (
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-msk-ink/70">
                  {deal.organization.notes}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-msk-ink/40">
                  Aucun résumé — utile pour situer l’activité sans confondre avec
                  le contact.
                </p>
              )}
            </div>
          </Section>
        </div>

        <div className="xl:col-span-4">
          <Section title="Contacts">
            {deal.organization.contacts.length === 0 ? (
              <p className="text-sm text-msk-ink/40">Aucun contact</p>
            ) : (
              <ul className="space-y-2.5">
                {deal.organization.contacts.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-msk-ink/[0.06] bg-msk-chalk/30 px-3.5 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-msk-ink">
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
                    <p className="mt-1.5 text-xs text-msk-ink/55">
                      {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="xl:col-span-3">
          <Section title="Suivi">
            <dl className="space-y-4">
              <MetaItem label="Dernière action">
                {lastActivity ? (
                  <>
                    <span className="font-medium">{lastActivity.summary}</span>
                    <span className="mt-0.5 block text-xs text-msk-ink/40">
                      {ACTIVITY_LABELS[lastActivity.type]} ·{" "}
                      {lastActivity.occurredAt.toLocaleString("fr-FR")}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </MetaItem>
              {deal.probability != null || deal.expectedCloseAt ? (
                <>
                  <MetaItem label="Probabilité">
                    {deal.probability != null ? `${deal.probability} %` : "—"}
                  </MetaItem>
                  <MetaItem label="Clôture prévue">
                    {deal.expectedCloseAt
                      ? deal.expectedCloseAt.toLocaleDateString("fr-FR")
                      : "—"}
                  </MetaItem>
                </>
              ) : null}
            </dl>
            {deal.tasks.length > 0 ? (
              <div className="mt-4 border-t border-msk-ink/[0.06] pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                  Relances ouvertes
                </p>
                <ul className="space-y-2">
                  {deal.tasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-2 text-sm text-msk-ink/75"
                    >
                      <CalendarClock
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-msk-ink/35"
                        aria-hidden
                      />
                      <span>
                        {t.title}
                        <span className="block text-xs text-msk-ink/40">
                          {t.dueAt.toLocaleDateString("fr-FR")}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Section>
        </div>

        <div className="xl:col-span-6">
          <Section title="Offres proposées">
            {deal.opportunityOffers.length === 0 && !deal.catalogOffer ? (
              <p className="text-sm text-msk-ink/40">
                Aucune offre liée — ajoutez-en lors d’une prochaine mise à jour.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {deal.opportunityOffers.length > 0
                  ? deal.opportunityOffers.map((link) => (
                      <li
                        key={link.id}
                        className="rounded-2xl border border-msk-ink/[0.08] bg-white p-4 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-msk-ink">
                          {link.catalogOffer.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-msk-ink/40">
                          {link.catalogOffer.sku}
                        </p>
                        <OfferConfigBadges
                          sku={link.catalogOffer.sku}
                          config={
                            (link.config as Record<string, unknown>) ?? null
                          }
                        />
                      </li>
                    ))
                  : deal.catalogOffer ? (
                      <li className="rounded-2xl border border-msk-ink/[0.08] bg-white p-4 text-sm font-medium text-msk-ink shadow-sm">
                        {deal.catalogOffer.name}
                      </li>
                    ) : null}
              </ul>
            )}
          </Section>
        </div>

        <div className="xl:col-span-6">
          <Section title="Devis & factures">
            {COM_DOCS_GATED ? (
              <div className="rounded-xl border border-dashed border-msk-ink/12 bg-msk-chalk/30 px-4 py-6 text-center">
                <p className="text-sm text-msk-ink/50">
                  Devis et factures temporairement gelés
                </p>
                <p className="mt-1 text-xs text-msk-ink/40">{COM_DOCS_GATED_HINT}</p>
                <p className="mt-2 text-xs text-msk-ink/45">
                  Utilisez « Transformer en client » dès le statut{" "}
                  <strong>Intéressé</strong>.
                </p>
              </div>
            ) : deal.comQuotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-msk-ink/12 bg-msk-chalk/30 px-4 py-6 text-center">
                <p className="text-sm text-msk-ink/50">
                  Aucun devis lié à ce prospect.
                </p>
                <p className="mt-1 text-xs text-msk-ink/40">
                  Disponible au statut <strong>Intéressé</strong> via « Créer un
                  devis ».
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {deal.comQuotes.map((q) => {
                  const doc = q.gedDocumentId
                    ? docById.get(q.gedDocumentId)
                    : null;
                  return (
                    <li
                      key={q.id}
                      className="flex flex-col gap-3 rounded-2xl border border-msk-ink/[0.08] bg-white p-4 sm:flex-row sm:items-start"
                    >
                      {doc ? (
                        <DocPdfThumb
                          documentId={doc.id}
                          title={doc.originalName || q.number}
                          subtitle={`${QUOTE_STATUS_LABELS[q.status]} · ${formatComMoney(q.totalTtc, q.currency)}`}
                          className="max-w-[9rem] shrink-0"
                        />
                      ) : (
                        <div className="flex h-28 w-24 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-msk-ink/15 bg-msk-chalk/40 text-center text-[10px] text-msk-ink/40">
                          PDF
                          <br />
                          en attente
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          prefetch={false}
                          href={`/commercial/devis/${q.id}`}
                          className="text-sm font-semibold text-msk-blue hover:underline"
                        >
                          Devis {q.number}
                        </Link>
                        <p className="mt-0.5 text-xs text-msk-ink/45">
                          {QUOTE_STATUS_LABELS[q.status]} ·{" "}
                          {formatComMoney(q.totalTtc, q.currency)}
                        </p>
                        {!doc ? (
                          <p className="mt-2 text-xs text-msk-ink/45">
                            Ouvrez le devis pour générer le PDF (une seule fois).
                          </p>
                        ) : null}
                        {q.invoices.length > 0 ? (
                          <ul className="mt-2 space-y-1 border-t border-msk-ink/[0.05] pt-2">
                            {q.invoices.map((inv) => (
                              <li
                                key={inv.id}
                                className="flex justify-between gap-2 text-xs"
                              >
                                <Link
                                  prefetch={false}
                                  href={`/commercial/factures/${inv.id}`}
                                  className="text-msk-blue hover:underline"
                                >
                                  Facture {inv.number}
                                </Link>
                                <span className="text-msk-ink/45">
                                  {INVOICE_STATUS_LABELS[inv.status]} ·{" "}
                                  {formatComMoney(inv.totalTtc, inv.currency)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <div className="xl:col-span-12">
          <Section title="Journal d’activités">
            {deal.activities.length === 0 ? (
              <p className="text-sm text-msk-ink/40">
                Aucune activité — utilisez « Enregistrer une action ».
              </p>
            ) : (
              <ol className="relative space-y-0 border-l border-msk-blue/25 pl-5">
                {deal.activities.map((a) => (
                  <li key={a.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[1.41rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-msk-blue shadow-sm" />
                    <p className="text-sm font-semibold text-msk-ink">
                      {a.summary}
                    </p>
                    {a.body ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-msk-ink/60">
                        {a.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-msk-ink/40">
                      {ACTIVITY_LABELS[a.type]} ·{" "}
                      {a.occurredAt.toLocaleString("fr-FR")} ·{" "}
                      {a.actor.firstName} {a.actor.lastName}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </PageShell>
  );
}
