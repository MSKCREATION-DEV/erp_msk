import type { Metadata } from "next";
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

export const metadata: Metadata = { title: "Fiche prospect" };

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
      owner: { select: { firstName: true, lastName: true, id: true } },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 40,
        include: {
          actor: { select: { firstName: true, lastName: true } },
        },
      },
      tasks: {
        where: { status: "OPEN" },
        orderBy: { dueAt: "asc" },
        take: 10,
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
      hasPermission(user, "crm.reports.global") ||
      user.isSuperAdmin);

  return (
    <PageShell>
      <PageHeader
        title={deal.organization.name}
        description={deal.title}
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Prospects", href: "/crm/prospects" },
          { label: deal.organization.name },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone="success">{STAGE_LABELS[deal.stage]}</Badge>
        {deal.source ? (
          <Badge tone="muted">{SOURCE_LABELS[deal.source]}</Badge>
        ) : null}
        <Badge tone="muted">{formatXof(deal.budgetXof)}</Badge>
        <Badge tone="muted">
          Owner {deal.owner.firstName} {deal.owner.lastName}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Surface className="p-5">
            <h2 className="text-sm font-semibold text-msk-ink">Contacts</h2>
            <ul className="mt-3 space-y-2">
              {deal.organization.contacts.map((c) => (
                <li key={c.id} className="text-sm text-msk-ink/75">
                  <span className="font-medium text-msk-ink">
                    {c.firstName} {c.lastName}
                  </span>
                  {c.jobTitle ? ` · ${c.jobTitle}` : ""}
                  {c.phone ? ` · ${c.phone}` : ""}
                  {c.email ? ` · ${c.email}` : ""}
                </li>
              ))}
            </ul>
            {deal.offerLabel || deal.catalogOffer ? (
              <p className="mt-4 text-sm text-msk-ink/60">
                Offre :{" "}
                <span className="font-medium text-msk-ink">
                  {deal.catalogOffer?.name ?? deal.offerLabel}
                </span>
              </p>
            ) : null}
            {deal.organization.notes ? (
              <p className="mt-3 text-sm text-msk-ink/55">
                {deal.organization.notes}
              </p>
            ) : null}
          </Surface>

          <Surface className="p-5">
            <h2 className="text-sm font-semibold text-msk-ink">Timeline</h2>
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
                <CardTitle>Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <StageForm opportunityId={deal.id} stage={deal.stage} />
              </CardContent>
            </Card>
          ) : null}

          {hasPermission(user, "crm.activity.log") ? (
            <Card>
              <CardHeader>
                <CardTitle>Quick-log</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityForm opportunityId={deal.id} />
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
