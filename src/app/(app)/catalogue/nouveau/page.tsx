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
import { CatalogueOfferForm } from "@/components/catalogue/offer-form";

export const metadata: Metadata = { title: "Nouvelle offre" };

export default async function CatalogueNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "com.catalogue.manage")) redirect("/catalogue");

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle offre"
        description="SKU unique, pilier, prix indicatif FCFA."
        backHref="/catalogue"
        backLabel="Retour au catalogue"
        breadcrumbs={[
          { label: "Catalogue", href: "/catalogue" },
          { label: "Nouveau" },
        ]}
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Créer une offre</CardTitle>
          <CardDescription>
            Visible dans le CRM et les futurs devis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CatalogueOfferForm redirectTo="/catalogue" />
        </CardContent>
      </Card>
    </PageShell>
  );
}
