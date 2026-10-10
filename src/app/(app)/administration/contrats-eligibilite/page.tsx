import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ensureContractTypeRules } from "@/lib/paie/contract-rules";
import { ContractRulesForm } from "@/components/admin/contract-rules-form";

export const metadata: Metadata = { title: "Éligibilité contrats" };

export default async function ContratsEligibilitePage() {
  const user = await requireUser();
  if (
    !hasAnyPermission(user, ["rh.payroll.run", "cfg.lists", "cfg.org"])
  ) {
    redirect("/accueil");
  }

  const rules = await ensureContractTypeRules();

  return (
    <PageShell>
      <PageHeader
        title="Éligibilité par type de contrat"
        description="Activer ou désactiver paie, cotisations INPS et congés payés selon CDI, CDD, STAGE, PRESTA…"
        backHref="/administration/gabarits"
        backLabel="Administration"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Éligibilité contrats" },
        ]}
      />

      <Surface className="border-msk-coral/20 bg-msk-coral/5 p-4 text-xs text-msk-ink/70">
        Exemple : un stagiaire peut être inclus en paie avec cotisations, sans
        accrual de congés payés. Les prestataires sont exclus du run par défaut.
      </Surface>

      <ContractRulesForm rules={rules} />
    </PageShell>
  );
}
