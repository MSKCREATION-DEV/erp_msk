import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { FormShell } from "@/components/ui/form-shell";
import { TimesheetForm } from "@/components/rh/timesheet-form";
import { getDefaultWorkSchedule } from "@/lib/rh/work-schedule-db";

export const metadata: Metadata = { title: "Saisir une semaine" };

export default async function EspaceHeuresNouvellePage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.timesheet.submit")) redirect("/espace");

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!employee) redirect("/espace");

  const schedule = await getDefaultWorkSchedule();

  return (
    <PageShell>
      <PageHeader
        title="Saisir une semaine"
        description={`Référence ${schedule.label} — ${schedule.weeklyHours} h / semaine (${schedule.startTime}–${schedule.endTime}, pause ${schedule.breakStart}–${schedule.breakEnd}).`}
        backHref="/espace/heures"
        backLabel="Retour aux heures"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Heures", href: "/espace/heures" },
          { label: "Nouvelle semaine" },
        ]}
      />
      <FormShell>
        <TimesheetForm />
      </FormShell>
    </PageShell>
  );
}
