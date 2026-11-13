import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { listSvLinkedDocuments, SV_GED_ENTITY } from "@/lib/suivi/ged";
import {
  SV_ABSENCE_REASON_LABEL,
  SV_ABSENCE_STATUS_LABEL,
  SV_ABSENCE_STATUS_TONE,
} from "@/lib/suivi/labels";
import { formatSvDateFr } from "@/lib/suivi/dashboard-stats";
import { absenceDaySpan, employeeDisplayName } from "@/lib/suivi/hr";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { DetailHeroAmount } from "@/components/ui/detail-hero-amount";
import { SvAbsenceDetailActions } from "@/components/suivi/absence-detail-actions";

export const metadata: Metadata = { title: "Absence · Suivi" };

export default async function SuiviAbsenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.hr.view");
  const { id } = await params;

  const absence = await prisma.svAbsence.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          jobTitle: true,
          department: true,
        },
      },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!absence) notFound();

  const canManage =
    hasPermission(user, "sv.hr.manage") || user.isSuperAdmin;
  const days = absenceDaySpan(absence.startDate, absence.endDate);
  const name = employeeDisplayName(absence.employee);

  const gedLinks = await listSvLinkedDocuments({
    entityType: SV_GED_ENTITY.ABSENCE,
    entityId: absence.id,
  });
  const primaryGed = gedLinks[0]?.document ?? null;

  const history = await prisma.svAbsence.findMany({
    where: {
      employeeId: absence.employeeId,
      id: { not: absence.id },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    take: 8,
    select: {
      id: true,
      reason: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });

  return (
    <PageShell>
      <PageHeader
        title={name}
        description="Absence Suivi — détail et justificatif"
        backHref="/suivi/absences"
      />

      <Surface className="mb-5 overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-msk-blue/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-caps text-msk-blue">
                  Absence
                </span>
                <Badge tone={SV_ABSENCE_STATUS_TONE[absence.status]}>
                  {SV_ABSENCE_STATUS_LABEL[absence.status]}
                </Badge>
                {absence.deductLeave ? (
                  <Badge tone="coral">Déduire congés</Badge>
                ) : null}
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-msk-blue shadow-sm ring-1 ring-msk-ink/6">
                  <UserRound className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-caps text-msk-ink/40">
                    Collaborateur
                  </p>
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-msk-ink sm:text-3xl">
                    {name}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-msk-ink/55">
                    <span>{SV_ABSENCE_REASON_LABEL[absence.reason]}</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <CalendarRange className="size-3.5 opacity-50" aria-hidden />
                      {formatSvDateFr(absence.startDate)} →{" "}
                      {formatSvDateFr(absence.endDate)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-56">
              <DetailHeroAmount label="Jours" value={String(days)} />
              <DetailHeroAmount
                label="Justificatif"
                value={primaryGed ? "Oui" : "Non"}
                emphasize={!primaryGed && absence.status !== "ANNULEE"}
              />
            </div>
          </div>

          <div className="mt-5 border-t border-msk-ink/6 pt-4">
            <SvAbsenceDetailActions
              absenceId={absence.id}
              canManage={canManage}
              cancelled={absence.status === "ANNULEE"}
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
                Poste
              </dt>
              <dd className="mt-0.5">
                {absence.employee.jobTitle ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Service
              </dt>
              <dd className="mt-0.5">
                {absence.employee.department ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Précision
              </dt>
              <dd className="mt-0.5">{absence.reasonNote ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Congés
              </dt>
              <dd className="mt-0.5">
                {absence.deductLeave
                  ? `Oui — ${absence.deductLeaveNote ?? "sans note"}`
                  : "Non (pas de déduction RH automatique)"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Enregistré par
              </dt>
              <dd className="mt-0.5">
                {absence.createdBy.firstName} {absence.createdBy.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Créé le
              </dt>
              <dd className="mt-0.5 tabular-nums">
                {formatSvDateFr(absence.createdAt)}
              </dd>
            </div>
          </dl>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Autres absences</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-msk-ink/50">
              Pas d’autre absence pour ce collaborateur.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-msk-ink/6">
              {history.map((h) => (
                <li key={h.id} className="py-2.5 text-sm">
                  <Link
                    prefetch={false}
                    href={`/suivi/absences/${h.id}`}
                    className="font-medium text-msk-blue hover:underline"
                  >
                    {SV_ABSENCE_REASON_LABEL[h.reason]} ·{" "}
                    {formatSvDateFr(h.startDate)} → {formatSvDateFr(h.endDate)}
                  </Link>
                  <p className="text-xs text-msk-ink/45">
                    {SV_ABSENCE_STATUS_LABEL[h.status]}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </PageShell>
  );
}
