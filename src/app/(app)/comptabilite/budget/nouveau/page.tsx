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
import { BudgetLineForm } from "@/components/comptabilite/budget-line-form";

export const metadata: Metadata = { title: "Nouvelle ligne budget" };

export default async function ComptabiliteBudgetNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "bud.manage")) {
    redirect("/comptabilite/budget");
  }
  const year = new Date().getFullYear();

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle ligne budget"
        description={`Exercice ${year}.`}
        backHref="/comptabilite/budget"
        backLabel="Retour au budget"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Budget", href: "/comptabilite/budget" },
          { label: "Nouvelle ligne" },
        ]}
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Créer une ligne</CardTitle>
          <CardDescription>
            Une ligne par mois / catégorie / nature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetLineForm year={year} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
