import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAppointmentStatus, type Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { crmVisibility } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { AppointmentActions } from "@/components/crm/appointment-actions";

export const metadata: Metadata = { title: "RDV" };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default async function CrmRdvPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const vis = crmVisibility(user);
  const teamIds =
    vis === "team" ? await commercialTeamUserIds() : ([] as string[]);
  const assigneeWhere: Prisma.CrmAppointmentWhereInput =
    vis === "global"
      ? {}
      : vis === "team"
        ? { assigneeId: { in: Array.from(new Set([user.id, ...teamIds])) } }
        : { assigneeId: user.id };

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const include = {
    opportunity: {
      select: {
        id: true,
        organization: { select: { name: true } },
      },
    },
    assignee: { select: { firstName: true, lastName: true } },
  } as const;

  const [today, upcoming, past] = await Promise.all([
    prisma.crmAppointment.findMany({
      where: {
        ...assigneeWhere,
        status: CrmAppointmentStatus.SCHEDULED,
        startsAt: { gte: todayStart, lte: todayEnd },
      },
      include,
      orderBy: { startsAt: "asc" },
      take: 50,
    }),
    prisma.crmAppointment.findMany({
      where: {
        ...assigneeWhere,
        status: CrmAppointmentStatus.SCHEDULED,
        startsAt: { gt: todayEnd },
      },
      include,
      orderBy: { startsAt: "asc" },
      take: 50,
    }),
    prisma.crmAppointment.findMany({
      where: {
        ...assigneeWhere,
        status: { not: CrmAppointmentStatus.SCHEDULED },
      },
      include,
      orderBy: { startsAt: "desc" },
      take: 30,
    }),
  ]);

  type Row = (typeof today)[number];

  function Section({
    title,
    items,
    empty,
    actionable,
  }: {
    title: string;
    items: Row[];
    empty: string;
    actionable?: boolean;
  }) {
    return (
      <Surface className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-msk-ink">{title}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-msk-ink/45">{empty}</p>
        ) : (
          <ul className="divide-y divide-msk-ink/6">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-msk-ink">{a.title}</p>
                  <p className="text-sm text-msk-ink/60">
                    {a.opportunity.organization.name} ·{" "}
                    {a.startsAt.toLocaleString("fr-FR")}
                    {a.location ? ` · ${a.location}` : ""}
                  </p>
                  <p className="text-xs text-msk-ink/40">
                    {a.assignee.firstName} {a.assignee.lastName}
                    {a.status !== "SCHEDULED" ? (
                      <>
                        {" "}
                        ·{" "}
                        <Badge
                          tone={
                            a.status === "DONE"
                              ? "success"
                              : a.status === "NO_SHOW"
                                ? "coral"
                                : "muted"
                          }
                        >
                          {a.status === "DONE"
                            ? "Tenu"
                            : a.status === "NO_SHOW"
                              ? "No-show"
                              : "Annulé"}
                        </Badge>
                      </>
                    ) : null}
                  </p>
                </div>
                {actionable ? (
                  <AppointmentActions
                    appointmentId={a.id}
                    opportunityId={a.opportunityId}
                    className="shrink-0"
                  />
                ) : (
                  <Link
                    href={`/crm/prospects/${a.opportunityId}`}
                    className="text-sm font-medium text-msk-blue hover:underline"
                  >
                    Fiche
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Surface>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="RDV"
        description={
          vis === "own"
            ? "Vos rendez-vous prospects / clients."
            : "Agenda RDV de l’équipe commerciale."
        }
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "RDV" },
        ]}
        actions={
          <Link
            href="/crm/rdv/nouveau"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-msk-blue px-3 text-sm font-medium text-white transition hover:bg-msk-blue/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau RDV
          </Link>
        }
      />
      <div className="space-y-6">
        <Section
          title="Aujourd’hui"
          items={today}
          empty="Aucun RDV aujourd’hui."
          actionable
        />
        <Section
          title="À venir"
          items={upcoming}
          empty="Aucun RDV planifié."
          actionable
        />
        <Section
          title="Récents (clos)"
          items={past}
          empty="Pas encore d’historique RDV."
        />
      </div>
    </PageShell>
  );
}
