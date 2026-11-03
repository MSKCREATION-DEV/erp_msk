import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { KpiGrid } from "@/components/ui/kpi-card";
import {
  TIMESHEET_STATUS_LABEL,
  formatMinutes,
  timesheetStatusTone,
} from "@/lib/rh/labels";
import { HoursWeekCompare } from "@/components/espace/hours-week-compare";
import {
  getDefaultWorkSchedule,
  getHolidayDateKeys,
} from "@/lib/rh/work-schedule-db";
import { compareWeekHours } from "@/lib/rh/work-schedule";
import { MonthCalendar } from "@/components/ui/month-calendar";

export const metadata: Metadata = { title: "Mes heures" };

function mondayUtc(d = new Date()): Date {
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = x.getUTCDay();
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
    (s) =>
      s.weekStart.toISOString().slice(0, 10) ===
      weekStart.toISOString().slice(0, 10),
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
  const approvedSheets = sheets.filter((s) => s.status === "APPROVED");
  const validatedMinutes = approvedSheets.reduce(
    (s, x) => s + x.totalMinutes,
    0,
  );
  const hasDeclaration = Boolean(currentWeek);
  const nothingDeclared = !hasDeclaration || decl === 0;

  const marks = [
    ...[...holidays].map((dateKey) => ({
      dateKey,
      tone: "muted" as const,
      label: "Férié",
    })),
    ...compare
      .filter((d) => d.declaredMinutes > 0)
      .map((d) => ({
        dateKey: d.dateKey,
        tone:
          d.deltaMinutes < 0
            ? ("coral" as const)
            : d.deltaMinutes > 0
              ? ("blue" as const)
              : ("success" as const),
        label: formatMinutes(d.declaredMinutes),
      })),
  ];

  const statusLabel = currentWeek
    ? TIMESHEET_STATUS_LABEL[currentWeek.status]
    : "À saisir";

  return (
    <PageShell>
      <PageHeader
        title="Mes heures"
        description="Déclarez vos heures chaque semaine et suivez leur validation."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Heures" },
        ]}
        actions={
          <Link
            prefetch={false}
            href="/espace/heures/nouvelle-semaine"
            className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Saisir une semaine
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
            items={[
              {
                label: "Horaire prévu",
                value: formatMinutes(theo),
                hint: `Cette semaine · ${schedule.label}`,
              },
              {
                label: "Heures saisies",
                value: nothingDeclared ? "—" : formatMinutes(decl),
                hint: nothingDeclared ? "Pas encore déclaré" : statusLabel,
              },
              {
                label: "Statut",
                value: statusLabel,
                hint: nothingDeclared
                  ? "À compléter"
                  : currentWeek?.status === "APPROVED"
                    ? "Validé par les RH"
                    : "Suivi RH",
              },
              {
                label: "Heures validées",
                value: formatMinutes(validatedMinutes),
                hint:
                  approvedSheets.length > 0
                    ? `${approvedSheets.length} semaine(s)`
                    : "Aucune pour l’instant",
              },
            ]}
          />

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <HoursWeekCompare
                scheduleLabel={schedule.label}
                weeklyHours={schedule.weeklyHours}
                days={compare}
                hasDeclaration={hasDeclaration}
              />
            </div>
            <Surface className="p-5 lg:col-span-5">
              <h2 className="mb-1 text-sm font-semibold text-msk-ink">
                Ce mois-ci
              </h2>
              <p className="mb-3 text-xs text-msk-ink/50">
                Jours fériés et jours déjà saisis.
              </p>
              <MonthCalendar marks={marks} />
            </Surface>
          </div>

          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
              Mes semaines déclarées
            </h2>
            {sheets.length === 0 ? (
              <Surface className="p-6 text-sm text-msk-ink/50">
                Aucune déclaration pour le moment —{" "}
                <Link
                  prefetch={false}
                  href="/espace/heures/nouvelle-semaine"
                  className="text-msk-blue hover:underline"
                >
                  saisir une semaine
                </Link>
                .
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
