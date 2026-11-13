import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import {
  SV_LATE_STATUS_LABEL,
  SV_LATE_STATUS_TONE,
} from "@/lib/suivi/labels";
import { formatSvDateFr } from "@/lib/suivi/dashboard-stats";
import { employeeDisplayName, formatSvTimeFr } from "@/lib/suivi/hr";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { DetailHeroAmount } from "@/components/ui/detail-hero-amount";
import { SvLateDetailActions } from "@/components/suivi/late-detail-actions";

export const metadata: Metadata = { title: "Retard · Suivi" };

export default async function SuiviRetardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.hr.view");
  const { id } = await params;

  const late = await prisma.svLate.findUnique({
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
  if (!late) notFound();

  const canManage =
    hasPermission(user, "sv.hr.manage") || user.isSuperAdmin;
  const name = employeeDisplayName(late.employee);

  const history = await prisma.svLate.findMany({
    where: {
      employeeId: late.employeeId,
      id: { not: late.id },
      status: "ENREGISTRE",
    },
    orderBy: [{ lateDate: "desc" }, { createdAt: "desc" }],
    take: 8,
    select: {
      id: true,
      lateDate: true,
      arrivedAt: true,
      minutesLate: true,
    },
  });

  return (
    <PageShell>
      <PageHeader
        title={name}
        description="Retard Suivi — détail horaire"
        backHref="/suivi/retards"
      />

      <Surface className="mb-5 overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-msk-blue/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-caps text-msk-blue">
                  Retard
                </span>
                <Badge tone={SV_LATE_STATUS_TONE[late.status]}>
                  {SV_LATE_STATUS_LABEL[late.status]}
                </Badge>
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
                    <span className="tabular-nums">
                      {formatSvDateFr(late.lateDate)}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="size-3.5 opacity-50" aria-hidden />
                      Arrivée {formatSvTimeFr(late.arrivedAt)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-56">
              <DetailHeroAmount
                label="Prévu"
                value={formatSvTimeFr(late.expectedAt)}
              />
              <DetailHeroAmount
                label="Retard"
                value={
                  late.minutesLate != null ? `${late.minutesLate} min` : "—"
                }
                emphasize={(late.minutesLate ?? 0) > 0}
              />
            </div>
          </div>

          <div className="mt-5 border-t border-msk-ink/6 pt-4">
            <SvLateDetailActions
              lateId={late.id}
              canManage={canManage}
              cancelled={late.status === "ANNULE"}
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
              <dd className="mt-0.5">{late.employee.jobTitle ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Service
              </dt>
              <dd className="mt-0.5">{late.employee.department ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Note
              </dt>
              <dd className="mt-0.5">{late.note ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Enregistré par
              </dt>
              <dd className="mt-0.5">
                {late.createdBy.firstName} {late.createdBy.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-caps text-msk-ink/45">
                Créé le
              </dt>
              <dd className="mt-0.5 tabular-nums">
                {formatSvDateFr(late.createdAt)}
              </dd>
            </div>
          </dl>
        </Surface>

        <Surface className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Autres retards</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-msk-ink/50">
              Pas d’autre retard pour ce collaborateur.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-msk-ink/6">
              {history.map((h) => (
                <li key={h.id} className="py-2.5 text-sm">
                  <Link
                    prefetch={false}
                    href={`/suivi/retards/${h.id}`}
                    className="font-medium text-msk-blue hover:underline"
                  >
                    {formatSvDateFr(h.lateDate)} · arrivée{" "}
                    {formatSvTimeFr(h.arrivedAt)}
                  </Link>
                  <p className="text-xs text-msk-ink/45">
                    {h.minutesLate != null ? `${h.minutesLate} min` : "—"}
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
