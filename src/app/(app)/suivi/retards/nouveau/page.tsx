import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { listSvHrEmployeeOptions } from "@/lib/suivi/hr-employees";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvLateForm } from "@/components/suivi/late-form";

export const metadata: Metadata = { title: "Nouveau retard · Suivi" };

export default async function SuiviRetardNouveauPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.hr.manage");
  const employeeOptions = await listSvHrEmployeeOptions();

  return (
    <PageShell>
      <PageHeader
        title="Nouveau retard"
        description="Collaborateur, date et heures d’arrivée."
        backHref="/suivi/retards"
      />
      <SvLateForm mode="create" employeeOptions={employeeOptions} />
    </PageShell>
  );
}
