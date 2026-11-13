import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { formatSvDateInput } from "@/lib/suivi/hr";
import { listSvHrEmployeeOptions } from "@/lib/suivi/hr-employees";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvAbsenceForm } from "@/components/suivi/absence-form";

export const metadata: Metadata = { title: "Modifier absence · Suivi" };

export default async function SuiviAbsenceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.hr.manage");
  const { id } = await params;

  const absence = await prisma.svAbsence.findUnique({
    where: { id },
    select: {
      id: true,
      employeeId: true,
      reason: true,
      reasonNote: true,
      startDate: true,
      endDate: true,
      deductLeave: true,
      deductLeaveNote: true,
      status: true,
      gedDocumentId: true,
    },
  });
  if (!absence) notFound();
  if (absence.status === "ANNULEE") {
    redirect(`/suivi/absences/${id}`);
  }

  const employeeOptions = await listSvHrEmployeeOptions();

  return (
    <PageShell>
      <PageHeader
        title="Modifier l’absence"
        description="Mettre à jour les dates, le motif ou le justificatif. Statut Justifiée = document GED obligatoire."
        backHref={`/suivi/absences/${id}`}
      />
      <SvAbsenceForm
        mode="edit"
        absenceId={absence.id}
        employeeOptions={employeeOptions}
        initial={{
          employeeId: absence.employeeId,
          reason: absence.reason,
          reasonNote: absence.reasonNote,
          startDate: formatSvDateInput(absence.startDate),
          endDate: formatSvDateInput(absence.endDate),
          deductLeave: absence.deductLeave,
          deductLeaveNote: absence.deductLeaveNote,
          status: absence.status,
          hasGed: Boolean(absence.gedDocumentId),
        }}
      />
    </PageShell>
  );
}
