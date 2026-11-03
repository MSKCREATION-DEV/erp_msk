import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { formatLeaveDays } from "@/lib/espace/overview";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { KpiGrid } from "@/components/ui/kpi-card";
import { gridKpi5 } from "@/lib/ui/layout-grids";
import {
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  leaveStatusTone,
} from "@/lib/rh/labels";
import { RequestHistoryCard } from "@/components/espace/request-history-card";
import { LeaveMovementsList } from "@/components/espace/leave-movements-list";
import { MonthCalendar } from "@/components/ui/month-calendar";
import { LEAVE_MOVEMENT_LABEL } from "@/lib/rh/leave-ledger";

export const metadata: Metadata = { title: "Mes congés" };

function eachDateKey(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cur = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  while (cur <= last) {
    keys.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return keys;
}

export default async function EspaceCongesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.leave.request")) redirect("/espace");

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });

  const [leaves, movements, holidays] = employee
    ? await Promise.all([
        prisma.rhLeaveRequest.findMany({
          where: { employeeId: employee.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            validatedBy: {
              select: { firstName: true, lastName: true },
            },
            requester: {
              select: { firstName: true, lastName: true },
            },
          },
        }),
        prisma.rhLeaveMovement.findMany({
          where: { employeeId: employee.id },
          orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
          take: 100,
        }),
        prisma.rhPublicHoliday.findMany({
          where: {
            year: {
              in: [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1],
            },
          },
          select: { date: true, label: true },
        }),
      ])
    : [[], [], []];

  const pending = leaves.filter((l) => l.status === "PENDING");
  const approved = leaves.filter((l) => l.status === "APPROVED");
  const accrued = movements
    .filter((m) => m.type === "ACCRUAL")
    .reduce((s, m) => s + Number(m.days), 0);
  const consumed = movements
    .filter((m) => m.type === "CONSUMPTION")
    .reduce((s, m) => s + Math.abs(Number(m.days)), 0);
  const reserved = pending
    .filter((l) => l.type === "CONGES_PAYES")
    .reduce((s, l) => s + Number(l.days), 0);

  const marks = [
    ...holidays.map((h) => ({
      dateKey: h.date.toISOString().slice(0, 10),
      tone: "muted" as const,
      label: h.label,
    })),
    ...approved.flatMap((l) =>
      eachDateKey(l.startDate, l.endDate).map((dateKey) => ({
        dateKey,
        tone: "success" as const,
        label: LEAVE_TYPE_LABEL[l.type],
      })),
    ),
    ...pending.flatMap((l) =>
      eachDateKey(l.startDate, l.endDate).map((dateKey) => ({
        dateKey,
        tone: "blue" as const,
        label: `${LEAVE_TYPE_LABEL[l.type]} (attente)`,
      })),
    ),
  ];

  return (
    <PageShell>
      <PageHeader
        title="Mes congés"
        description="Solde, calendrier, mouvements et historique des demandes."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Congés" },
        ]}
        actions={
          <Link
            prefetch={false}
            href="/espace/conges/nouveau"
            className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Nouvelle demande
          </Link>
        }
      />

      {!employee ? (
        <Surface className="p-6 text-sm text-msk-ink/60">
          Aucune fiche RH n&apos;est liée à votre compte.
        </Surface>
      ) : (
        <>
          <KpiGrid
            className={gridKpi5}
            items={[
              {
                label: "Solde disponible",
                value: formatLeaveDays(Number(employee.leaveBalanceDays)),
                hint: "Jours restants",
              },
              {
                label: "Jours acquis",
                value: formatLeaveDays(accrued),
                hint: "Mouvements acquisition",
              },
              {
                label: "Jours consommés",
                value: formatLeaveDays(consumed),
                hint: "Congés approuvés",
              },
              {
                label: "Jours réservés",
                value: formatLeaveDays(reserved),
                hint: "Demandes en attente",
              },
              {
                label: "En attente",
                value: String(pending.length),
                hint: "Demandes",
              },
            ]}
          />

          <div className="grid gap-4 lg:grid-cols-12">
            <Surface className="p-5 lg:col-span-5">
              <h2 className="mb-3 text-sm font-semibold text-msk-ink">
                Calendrier
              </h2>
              <MonthCalendar marks={marks} />
              <ul className="mt-4 flex flex-wrap gap-3 text-xs text-msk-ink/50">
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500/40" />{" "}
                  Approuvé
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-msk-blue/40" /> En
                  attente
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-msk-chalk" /> Férié
                </li>
              </ul>
            </Surface>

            <div className="space-y-3 lg:col-span-7">
              <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
                Mouvements de solde
              </h2>
              <LeaveMovementsList
                movements={movements.map((m) => ({
                  id: m.id,
                  type: m.type,
                  days: Number(m.days),
                  effectiveDate: m.effectiveDate,
                  note: m.note ?? LEAVE_MOVEMENT_LABEL[m.type],
                }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
              Demandes
            </h2>
            {leaves.length === 0 ? (
              <Surface className="p-6 text-sm text-msk-ink/50">
                Aucune demande —{" "}
                <Link
                  prefetch={false}
                  href="/espace/conges/nouveau"
                  className="text-msk-blue hover:underline"
                >
                  créer une demande
                </Link>
                .
              </Surface>
            ) : (
              leaves.map((l) => (
                <RequestHistoryCard
                  key={l.id}
                  title={LEAVE_TYPE_LABEL[l.type]}
                  subtitle={`${l.startDate.toLocaleDateString("fr-FR")} → ${l.endDate.toLocaleDateString("fr-FR")} · ${formatLeaveDays(Number(l.days))}`}
                  statusLabel={LEAVE_STATUS_LABEL[l.status]}
                  statusTone={leaveStatusTone(l.status)}
                  submittedAt={l.createdAt}
                  submittedBy={`${l.requester.firstName} ${l.requester.lastName}`}
                  reviewedAt={l.validatedAt}
                  reviewedBy={
                    l.validatedBy
                      ? `${l.validatedBy.firstName} ${l.validatedBy.lastName}`
                      : null
                  }
                  reviewActionLabel={
                    l.status === "REJECTED"
                      ? "Refusé le"
                      : l.status === "APPROVED"
                        ? "Approuvé le"
                        : "Traité le"
                  }
                  reason={l.reason}
                  reviewNote={l.reviewNote}
                />
              ))
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
