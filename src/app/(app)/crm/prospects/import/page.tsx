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
import { CrmImportForm } from "@/components/crm/crm-import-form";

export const metadata: Metadata = { title: "Import prospects" };

export default async function CrmProspectImportPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.import")) redirect("/crm/prospects");

  return (
    <PageShell>
      <PageHeader
        title="Importer des prospects"
        description="Excel CRM_Prospection_MSK (.xlsx) ou CSV « ; » — max 500, doublons ignorés, responsables résolus."
        backHref="/crm/prospects"
        backLabel="Retour aux prospects"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Prospects", href: "/crm/prospects" },
          { label: "Import" },
        ]}
      />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Fichier Excel ou CSV</CardTitle>
          <CardDescription>
            Même format que le fichier terrain MSK. Colonnes détectées par
            en-têtes. Entreprises déjà présentes (nom normalisé) sont sautées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrmImportForm redirectTo="/crm/prospects" />
        </CardContent>
      </Card>
    </PageShell>
  );
}
