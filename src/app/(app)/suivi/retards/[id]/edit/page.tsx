import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { formatSvDateInput, formatSvTimeInput } from "@/lib/suivi/hr";
import { listSvHrEmployeeOptions } from "@/lib/suivi/hr-employees";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvLateForm } from "@/components/suivi/late-form";

export const metadata: Metadata = { title: "Modifier retard · Suivi" };

export default async function SuiviRetardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.hr.manage");
  const { id } = await params;

  const late = await prisma.svLate.findUnique({
    where: { id },
    select: {
      id: true,
      employeeId: true,
      lateDate: true,
      expectedAt: true,
      arrivedAt: true,
      note: true,
      status: true,
    },
  });
  if (!late) notFound();
  if (late.status === "ANNULE") {
    redirect(`/suivi/retards/${id}`);
  }

  const employeeOptions = await listSvHrEmployeeOptions();

  return (
    <PageShell>
      <PageHeader
        title="Modifier le retard"
        description="Corriger la date ou les heures."
        backHref={`/suivi/retards/${id}`}
      />
      <SvLateForm
        mode="edit"
        lateId={late.id}
        employeeOptions={employeeOptions}
        initial={{
          employeeId: late.employeeId,
          lateDate: formatSvDateInput(late.lateDate),
          expectedTime: late.expectedAt
            ? formatSvTimeInput(late.expectedAt)
            : "08:00",
          arrivedTime: formatSvTimeInput(late.arrivedAt),
          note: late.note,
        }}
      />
    </PageShell>
  );
}
