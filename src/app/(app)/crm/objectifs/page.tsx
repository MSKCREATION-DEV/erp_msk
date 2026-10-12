import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { resolveGoals } from "@/lib/crm/goals";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { GoalsForm } from "@/components/crm/goals-form";

export const metadata: Metadata = { title: "Objectifs hebdo" };

export default async function CrmObjectifsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const goals = await resolveGoals(user.id);
  const canTeam =
    user.isSuperAdmin || hasPermission(user, "crm.reports.global");

  return (
    <PageShell>
      <PageHeader
        title="Objectifs hebdomadaires"
        description="Cibles paramétrables — utilisées sur le tableau de bord et le rapport de semaine."
        backHref="/crm"
        backLabel="Retour tableau de bord"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Objectifs" },
        ]}
      />

      <Surface className="p-5">
        <h2 className="text-sm font-semibold text-msk-ink">Mes objectifs</h2>
        <p className="mt-1 mb-4 text-xs text-msk-ink/45">
          Surchargent l’objectif équipe s’il existe.
        </p>
        <GoalsForm scope="USER" initial={goals} />
      </Surface>

      {canTeam ? (
        <Surface className="p-5">
          <h2 className="text-sm font-semibold text-msk-ink">
            Objectifs équipe
          </h2>
          <p className="mt-1 mb-4 text-xs text-msk-ink/45">
            Défaut pour tout le pôle commercial.
          </p>
          <GoalsForm scope="TEAM" initial={goals} />
        </Surface>
      ) : null}
    </PageShell>
  );
}
