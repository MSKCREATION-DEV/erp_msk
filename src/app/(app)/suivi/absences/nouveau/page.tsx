import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { listSvHrEmployeeOptions } from "@/lib/suivi/hr-employees";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvAbsenceForm } from "@/components/suivi/absence-form";

export const metadata: Metadata = { title: "Nouvelle absence · Suivi" };

export default async function SuiviAbsenceNouveauPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.hr.manage");
  const employeeOptions = await listSvHrEmployeeOptions();

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle absence"
        description="Collaborateur, motif, dates — justificatif optionnel."
        backHref="/suivi/absences"
      />
      <SvAbsenceForm mode="create" employeeOptions={employeeOptions} />
    </PageShell>
  );
}
