import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { OpenPeriodForm } from "@/components/paie/open-period-form";

export const metadata: Metadata = { title: "Ouvrir une période de paie" };

export default async function RhPaieNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "rh.payroll.run")) redirect("/rh/paie");

  return (
    <PageShell>
      <PageHeader
        title="Ouvrir une période"
        description="Créer le run de paie mensuel (contrats ACTIVE CDI/CDD/STAGE)."
        backHref="/rh/paie"
        backLabel="Retour à la paie"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Paie", href: "/rh/paie" },
          { label: "Nouveau" },
        ]}
      />
      <Surface className="max-w-lg p-5">
        <OpenPeriodForm />
      </Surface>
    </PageShell>
  );
}
