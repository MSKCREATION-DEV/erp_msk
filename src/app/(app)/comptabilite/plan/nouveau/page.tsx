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
import { AccountCreateForm } from "@/components/comptabilite/account-form";

export const metadata: Metadata = { title: "Nouveau compte" };

export default async function ComptabilitePlanNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.plan.configure")) {
    redirect("/comptabilite/plan");
  }

  return (
    <PageShell>
      <PageHeader
        title="Nouveau compte"
        description="Ajouter un compte au plan SYSCOHADA."
        backHref="/comptabilite/plan"
        backLabel="Retour au plan de comptes"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Plan de comptes", href: "/comptabilite/plan" },
          { label: "Nouveau" },
        ]}
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Créer un compte</CardTitle>
          <CardDescription>
            Code unique, classe 1 à 8, nature comptable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountCreateForm />
        </CardContent>
      </Card>
    </PageShell>
  );
}
