import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TIMESHEET_STATUS_LABEL,
  formatMinutes,
  timesheetStatusTone,
} from "@/lib/rh/labels";
import { TimesheetForm } from "@/components/rh/timesheet-form";

export const metadata: Metadata = { title: "Mes heures" };

export default async function EspaceHeuresPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.timesheet.submit")) redirect("/espace");

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });

  const sheets = employee
    ? await prisma.rhTimesheet.findMany({
        where: { employeeId: employee.id },
        orderBy: { weekStart: "desc" },
        take: 20,
      })
    : [];

  return (
    <PageShell>
      <PageHeader
        title="Mes heures"
        description="Saisir ma semaine et suivre mes feuilles."
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
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Nouvelle semaine</CardTitle>
              <CardDescription>
                Saisissez vos heures par jour (0 si non travaillé).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimesheetForm />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
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
