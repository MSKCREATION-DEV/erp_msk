import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ProjectForm } from "@/components/projets/project-form";

export const metadata: Metadata = { title: "Nouveau projet" };

export default async function ProjetsNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "prj.manage")) redirect("/projets");

  return (
    <PageShell>
      <PageHeader
        title="Nouveau projet"
        description="Code unique, budget et dates — vous serez responsable par défaut."
        backHref="/projets"
        backLabel="Retour projets"
        breadcrumbs={[
          { label: "Projets", href: "/projets" },
          { label: "Nouveau" },
        ]}
      />
      <Surface className="max-w-lg p-5">
        <ProjectForm />
      </Surface>
    </PageShell>
  );
}
