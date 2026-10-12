import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  ACTIVITY_LABELS,
  formatXof,
  SOURCE_LABELS,
  STAGE_LABELS,
} from "@/lib/crm/labels";
import { isTestOrgName } from "@/lib/crm/test-data";
import { isDevisSlaBreached } from "@/lib/crm/devis-sla";
import {
  schemaForSku,
  summarizeConfig,
} from "@/lib/crm/offer-option-schemas";
import { QUOTE_STATUS_LABELS } from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StageForm } from "@/components/crm/stage-form";
import { ActivityForm } from "@/components/crm/activity-form";
import { CrmConvertButtons } from "@/components/commercial/crm-convert-buttons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fiche prospect" };

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-msk-ink">{children}</dd>
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
      organization: { include: { contacts: true } },
      catalogOffer: true,
      opportunityOffers: {
        orderBy: { sortOrder: "asc" },
        include: {
          catalogOffer: {
            select: { id: true, name: true, sku: true },
          },
        },
      },
      owner: { select: { firstName: true, lastName: true, id: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 40,
        include: {
          actor: { select: { firstName: true, lastName: true } },
        },
      },
      _count: { select: { activities: true } },
      tasks: {
        where: { status: "OPEN" },
        orderBy: { dueAt: "asc" },
        take: 10,
      },
      comQuotes: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          number: true,
          status: true,
          totalTtc: true,
          currency: true,
          gedDocumentId: true,
          invoices: {
            take: 3,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              number: true,
              status: true,
              totalTtc: true,
              gedDocumentId: true,
            },
          },
        },
      },
    },
  });
  if (!deal) notFound();

  const vis = crmVisibility(user);
  if (vis === "own" && deal.ownerId !== user.id) redirect("/crm/prospects");
  if (vis === "team") {
    const team = await commercialTeamUserIds();
    if (deal.ownerId !== user.id && !team.includes(deal.ownerId)) {
      redirect("/crm/prospects");
    }
  }

  const canEdit =
    hasPermission(user, "crm.prospect.edit_own") &&
    (deal.ownerId === user.id ||
      hasPermission(user, "crm.view_team") ||
      hasPermission(user, "crm.reports.global") ||
      user.isSuperAdmin);

  const linkedClient = await prisma.comClient.findFirst({
    where: {
      OR: [
        { sourceOpportunityId: deal.id },
        { crmOrganizationId: deal.organizationId },
      ],
    },
    select: { id: true },
  });

  const lastActivity = deal.activities[0];
  const overdue =
    deal.followUpAt != null &&
    deal.followUpAt < new Date() &&
    deal.stage !== "GAGNE" &&
    deal.stage !== "PERDU";
  const uiStage = deal.stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : deal.stage;
  const devisDue = isDevisSlaBreached({
    stage: deal.stage,
    interestedAt: deal.interestedAt,
    updatedAt: deal.updatedAt,
    quoteCount: deal.comQuotes.length,
  });

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
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={uiStage === "GAGNE" ? "success" : "muted"}>
              {STAGE_LABELS[uiStage]}
            </Badge>
            {isTestOrgName(deal.organization.name) ? (
              <Badge tone="coral">Données de test</Badge>
            ) : null}
            {overdue ? <Badge tone="coral">Relance en retard</Badge> : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {deal.source ? (
          <Badge tone="blue">Origine · {SOURCE_LABELS[deal.source]}</Badge>
        ) : (
          <Badge tone="muted">Origine · —</Badge>
        )}
        <Badge tone="muted">{formatXof(deal.budgetXof)}</Badge>
        <Badge tone="muted">
          Créé le {deal.createdAt.toLocaleDateString("fr-FR")}
        </Badge>
        <Badge tone="muted">
          Créé par {deal.createdBy.firstName} {deal.createdBy.lastName}
        </Badge>
        <Badge tone="muted">
          Suivi par {deal.owner.firstName} {deal.owner.lastName}
        </Badge>
      </div>

      {devisDue ? (
        <Surface className="border-msk-coral/30 bg-msk-coral/[0.04] p-4">
          <p className="text-sm font-semibold text-msk-coral">
            GUIDE — devis sous 24h
          </p>
          <p className="mt-1 text-sm text-msk-ink/70">
            Prospect Intéressé sans devis lié. Créez le client commercial puis le
            devis (bouton ci-dessous), ou envoyez la proposition dès maintenant.
          </p>
        </Surface>
      ) : null}

      {uiStage === "GAGNE" ||
      uiStage === "INTERESSE" ||
      uiStage === "DEVIS_ENVOYE" ||
      linkedClient ? (
        <CrmConvertButtons
          opportunityId={deal.id}
          existingClientId={linkedClient?.id}
          canManage={
            hasPermission(user, "com.clients.manage") &&
            (uiStage === "GAGNE" ||
              uiStage === "INTERESSE" ||
              uiStage === "DEVIS_ENVOYE")
          }
          canViewClient={hasPermission(user, "com.clients.view_own")}
          canCreateQuote={hasPermission(user, "com.devis.create")}
          preferQuoteAfterConvert={
            uiStage === "INTERESSE" || uiStage === "DEVIS_ENVOYE"
          }
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Surface className="p-5">
            <h2 className="text-sm font-semibold text-msk-ink">Identité</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Entreprise">{deal.organization.name}</Field>
              <Field label="Secteur">
                {deal.organization.sector || "—"}
              </Field>
              <Field label="Ville / pays">
                {[deal.organization.city, deal.organization.country]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Field>
              <Field label="Site web">
                {deal.organization.website ? (
                  <a
                    href={deal.organization.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-msk-blue hover:underline"
                  >
                    {deal.organization.website}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Origine">
                {deal.source ? SOURCE_LABELS[deal.source] : "—"}
              </Field>
              <Field label="Créé le">
                {deal.createdAt.toLocaleDateString("fr-FR")}
                {deal.createdBy
                  ? ` · par ${deal.createdBy.firstName} ${deal.createdBy.lastName}`
                  : ""}
              </Field>
            </dl>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-sm font-semibold text-msk-ink">Contacts</h2>
            <ul className="mt-3 space-y-3">
              {deal.organization.contacts.length === 0 ? (
                <li className="text-sm text-msk-ink/40">Aucun contact</li>
              ) : (
                deal.organization.contacts.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-msk-ink/[0.06] bg-msk-chalk/30 px-3 py-2.5 text-sm"
                  >
                    <p className="font-medium text-msk-ink">
                      {c.firstName} {c.lastName}
                      {c.isPrimary ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-msk-blue">
                          Principal
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-msk-blue">
                      {c.jobTitle || "Poste non renseigné"}
                    </p>
                    <p className="mt-0.5 text-msk-ink/55">
                      {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-sm font-semibold text-msk-ink">
              Offre & enjeu
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Offre proposée">
                {deal.catalogOffer?.name ?? deal.offerLabel ?? "—"}
              </Field>
              <Field label="Budget">{formatXof(deal.budgetXof)}</Field>
              <Field label="Probabilité">
                {deal.probability != null ? `${deal.probability} %` : "—"}
              </Field>
              <Field label="Clôture prévue">
                {deal.expectedCloseAt
                  ? deal.expectedCloseAt.toLocaleDateString("fr-FR")
                  : "—"}
              </Field>
            </dl>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-sm font-semibold text-msk-ink">Suivi</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Dernière action">
                {lastActivity ? (
                  <>
                    {lastActivity.summary}
                    <span className="mt-0.5 block text-xs text-msk-ink/40">
                      {ACTIVITY_LABELS[lastActivity.type]} ·{" "}
                      {lastActivity.occurredAt.toLocaleString("fr-FR")}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Prochaine action">
                {deal.nextAction || "—"}
              </Field>
              <Field label="Date relance">
                <span className={cn(overdue && "font-semibold text-msk-coral")}>
                  {deal.followUpAt
                    ? deal.followUpAt.toLocaleDateString("fr-FR")
                    : "—"}
                  {overdue ? " · en retard" : ""}
                </span>
              </Field>
              <Field label="Suivi par (porte le dossier)">
                {deal.owner.firstName} {deal.owner.lastName}
              </Field>
              <Field label="Créé par">
                {deal.createdBy.firstName} {deal.createdBy.lastName}
              </Field>
            </dl>
            {deal.organization.notes ? (
              <div className="mt-4 border-t border-msk-ink/[0.06] pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-msk-ink/70">
                  {deal.organization.notes}
                </p>
              </div>
            ) : null}
          </Surface>

          {deal.opportunityOffers.length > 0 || deal.catalogOffer ? (
            <Surface className="p-5">
              <h2 className="text-sm font-semibold text-msk-ink">
                Offres proposées
              </h2>
              <ul className="mt-3 space-y-2">
                {deal.opportunityOffers.length > 0
                  ? deal.opportunityOffers.map((link) => {
                      const schema = schemaForSku(link.catalogOffer.sku);
                      const summary = summarizeConfig(
                        schema,
                        (link.config as Record<string, unknown>) ?? null,
                      );
                      return (
                        <li
                          key={link.id}
                          className="rounded-lg border border-msk-ink/[0.06] bg-msk-chalk/30 px-3 py-2"
                        >
                          <p className="text-sm font-medium text-msk-ink">
                            {link.catalogOffer.name}
                          </p>
                          <p className="text-xs text-msk-ink/45">
                            {link.catalogOffer.sku}
                            {summary ? ` · ${summary}` : ""}
                          </p>
                        </li>
                      );
                    })
                  : deal.catalogOffer ? (
                      <li className="text-sm text-msk-ink">
                        {deal.catalogOffer.name}
                      </li>
                    ) : null}
              </ul>
            </Surface>
          ) : null}

          <Surface className="p-5">
            <h2 className="text-sm font-semibold text-msk-ink">
              Devis & factures
            </h2>
            {deal.comQuotes.length === 0 ? (
              <p className="mt-3 text-sm text-msk-ink/40">
                Aucun devis lié à ce prospect.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {deal.comQuotes.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-lg border border-msk-ink/[0.06] px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link
                          prefetch={false}
                          href={`/commercial/devis/${q.id}`}
                          className="text-sm font-medium text-msk-blue hover:underline"
                        >
                          Devis {q.number ?? q.id.slice(0, 8)}
                        </Link>
                        <p className="text-xs text-msk-ink/45">
                          {QUOTE_STATUS_LABELS[q.status]} ·{" "}
                          {formatXof(q.totalTtc)}
                        </p>
                      </div>
                      {q.gedDocumentId ? (
                        <Link
                          prefetch={false}
                          href={`/api/documents/${q.gedDocumentId}/download`}
                          className="text-xs font-medium text-msk-blue hover:underline"
                        >
                          Voir PDF
                        </Link>
                      ) : (
                        <Link
                          prefetch={false}
                          href={`/commercial/devis/${q.id}`}
                          className="text-xs font-medium text-msk-ink/50 hover:underline"
                        >
                          Ouvrir pour générer PDF
                        </Link>
                      )}
                    </div>
                    {q.invoices.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-t border-msk-ink/[0.05] pt-2">
                        {q.invoices.map((inv) => (
                          <li
                            key={inv.id}
                            className="flex justify-between text-xs"
                          >
                            <Link
                              prefetch={false}
                              href={`/commercial/factures/${inv.id}`}
                              className="text-msk-blue hover:underline"
                            >
                              Facture {inv.number}
                            </Link>
                            <span className="text-msk-ink/45">
                              {inv.status} · {formatXof(inv.totalTtc)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="p-5">
            <h2 className="text-sm font-semibold text-msk-ink">Journal</h2>
            <ul className="mt-3 space-y-3">
              {deal.activities.length === 0 ? (
                <li className="text-sm text-msk-ink/40">Aucune activité</li>
              ) : (
                deal.activities.map((a) => (
                  <li
                    key={a.id}
                    className="border-l-2 border-msk-blue/30 pl-3 text-sm"
                  >
                    <p className="font-medium text-msk-ink">{a.summary}</p>
                    {a.body ? (
                      <p className="mt-0.5 text-msk-ink/55">{a.body}</p>
                    ) : null}
                    <p className="text-xs text-msk-ink/40">
                      {ACTIVITY_LABELS[a.type]} ·{" "}
                      {a.occurredAt.toLocaleString("fr-FR")} ·{" "}
                      {a.actor.firstName}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </Surface>
        </div>

        <div className="space-y-4">
          {canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>Statut</CardTitle>
              </CardHeader>
              <CardContent>
                <StageForm
                  opportunityId={deal.id}
                  stage={deal.stage}
                  activityCount={deal._count.activities}
                  hasFollowUp={deal.followUpAt != null}
                />
              </CardContent>
            </Card>
          ) : null}

          {hasPermission(user, "crm.activity.log") ? (
            <Card>
              <CardHeader>
                <CardTitle>Enregistrer une action</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityForm
                  opportunityId={deal.id}
                  requireFollowUp={
                    deal.followUpAt == null &&
                    uiStage !== "NOUVEAU" &&
                    uiStage !== "GAGNE" &&
                    uiStage !== "PERDU"
                  }
                />
              </CardContent>
            </Card>
          ) : null}

          {deal.tasks.length > 0 ? (
            <Surface className="p-5">
              <h2 className="text-sm font-semibold text-msk-ink">
                Relances ouvertes
              </h2>
              <ul className="mt-2 space-y-2 text-sm text-msk-ink/70">
                {deal.tasks.map((t) => (
                  <li key={t.id}>
                    {t.title}{" "}
                    <span className="text-xs text-msk-ink/40">
                      · {t.dueAt.toLocaleDateString("fr-FR")}
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
