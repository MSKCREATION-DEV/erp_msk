import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { FormShell } from "@/components/ui/form-shell";
import { Badge } from "@/components/ui/badge";
import { KpiGrid } from "@/components/ui/kpi-card";
import {
  TIMESHEET_STATUS_LABEL,
  formatMinutes,
  timesheetStatusTone,
} from "@/lib/rh/labels";
import { TimesheetForm } from "@/components/rh/timesheet-form";
import { HoursWeekCompare } from "@/components/espace/hours-week-compare";
import {
  getDefaultWorkSchedule,
  getHolidayDateKeys,
} from "@/lib/rh/work-schedule-db";
import { compareWeekHours } from "@/lib/rh/work-schedule";

export const metadata: Metadata = { title: "Mes heures" };

function mondayUtc(d = new Date()): Date {
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = x.getUTCDay(); // 0=dim
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

function addUtcDays(d: Date, n: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n),
  );
}

export default async function EspaceHeuresPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.timesheet.submit")) redirect("/espace");

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });

  const weekStart = mondayUtc();
  const weekEnd = addUtcDays(weekStart, 6);
  const schedule = await getDefaultWorkSchedule();
  const holidays = await getHolidayDateKeys(weekStart, weekEnd);

  const sheets = employee
    ? await prisma.rhTimesheet.findMany({
        where: { employeeId: employee.id },
        orderBy: { weekStart: "desc" },
        take: 20,
        include: { lines: true },
      })
    : [];

  const currentWeek = sheets.find(
    (s) => s.weekStart.toISOString().slice(0, 10) === weekStart.toISOString().slice(0, 10),
  );

  const declaredByDate = new Map<string, number>();
  for (const line of currentWeek?.lines ?? []) {
    const key = line.workDate.toISOString().slice(0, 10);
    declaredByDate.set(key, (declaredByDate.get(key) ?? 0) + line.minutes);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addUtcDays(weekStart, i),
  );
  const compare = compareWeekHours(
    weekDays,
    schedule,
    declaredByDate,
    holidays,
  );

  const theo = compare.reduce((s, d) => s + d.theoreticalMinutes, 0);
  const decl = compare.reduce((s, d) => s + d.declaredMinutes, 0);

  return (
    <PageShell>
      <PageHeader
        title="Mes heures"
        description="Référence théorique 40 h et saisie hebdomadaire déclarée."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Heures" },
        ]}
      />

      {!employee ? (
        <Surface className="p-6 text-sm text-msk-ink/60">
          Aucune fiche RH n&apos;est liée à votre compte — contactez
          l&apos;administration RH.
        </Surface>
      ) : (
        <>
          <KpiGrid
            items={[
              {
                label: "Théorique (semaine)",
                value: formatMinutes(theo),
                hint: schedule.label,
              },
              {
                label: "Déclaré (semaine)",
                value: formatMinutes(decl),
                hint: currentWeek
                  ? TIMESHEET_STATUS_LABEL[currentWeek.status]
                  : "Non saisi",
              },
              {
                label: "Écart",
                value:
                  decl - theo > 0
                    ? `+${formatMinutes(decl - theo)}`
                    : formatMinutes(decl - theo),
                hint: "Déclaré − théorique",
              },
              {
                label: "Feuilles",
                value: String(sheets.length),
                hint: "Historique affiché",
              },
            ]}
          />

          <HoursWeekCompare
            scheduleLabel={schedule.label}
            weeklyHours={schedule.weeklyHours}
            days={compare}
          />

          <FormShell>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-msk-ink">
                Nouvelle semaine
              </h2>
              <p className="mt-1 text-sm text-msk-ink/55">
                Saisissez vos heures par jour (0 si non travaillé). La
                comparaison ci-dessus se met à jour après soumission.
              </p>
            </div>
            <TimesheetForm />
          </FormShell>

          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
              Historique
            </h2>
            {sheets.length === 0 ? (
              <Surface className="p-6 text-sm text-msk-ink/50">
                Aucune feuille soumise.
              </Surface>
            ) : (
              sheets.map((s) => (
                <Surface
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-msk-ink">
                      Semaine du {s.weekStart.toLocaleDateString("fr-FR")}
                    </p>
                    <p className="text-sm text-msk-ink/55">
                      {formatMinutes(s.totalMinutes)}
                    </p>
                  </div>
                  <Badge tone={timesheetStatusTone(s.status)}>
                    {TIMESHEET_STATUS_LABEL[s.status]}
                  </Badge>
                </Surface>
              ))
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
