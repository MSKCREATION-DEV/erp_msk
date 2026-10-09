import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScriptForm } from "@/components/crm/script-form";

export const metadata: Metadata = { title: "Nouveau script" };

export default async function CrmScriptNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.scripts.manage")) redirect("/crm/scripts");

  return (
    <PageShell>
      <PageHeader
        title="Nouveau script"
        description="Modèle de message ou trame d’appel pour les commerciaux."
        backHref="/crm/scripts"
        backLabel="Retour aux scripts"
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Scripts", href: "/crm/scripts" },
          { label: "Nouveau" },
        ]}
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Créer un script</CardTitle>
          <CardDescription>
            Code unique stable (slug) — utilisé pour le seed et les références.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScriptForm redirectTo="/crm/scripts" />
        </CardContent>
      </Card>
    </PageShell>
  );
}
