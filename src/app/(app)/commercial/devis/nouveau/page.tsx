import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comOwnerScopeWhere } from "@/lib/commercial/scope";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuoteCreateForm } from "@/components/commercial/quote-form";

export const metadata: Metadata = { title: "Nouveau devis" };

export default async function CommercialDevisNouveauPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; opportunityId?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "com.devis.create")) {
    redirect("/commercial/devis");
  }
  const sp = await searchParams;

  const [clients, offers] = await Promise.all([
    prisma.comClient.findMany({
      where: comOwnerScopeWhere(user),
      orderBy: { name: "asc" },
      select: { id: true, name: true, includeTravelDefault: true },
    }),
    prisma.catalogOffer.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sku: true, priceXof: true },
    }),
  ]);

  const defaultClient = clients.find((c) => c.id === sp.clientId);

  return (
    <PageShell>
      <PageHeader
        title="Nouveau devis"
        description="Lignes catalogue ou libres — PDF après création."
        backHref="/commercial/devis"
        backLabel="Retour aux devis"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Devis", href: "/commercial/devis" },
          { label: "Nouveau" },
        ]}
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Créer un devis</CardTitle>
          <CardDescription>
            Régime ML (XOF, TVA 18 %) par défaut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-msk-ink/55">
              Créez d’abord un client avant d’émettre un devis.
            </p>
          ) : (
            <QuoteCreateForm
              clients={clients}
              offers={offers}
              defaultClientId={sp.clientId}
              defaultOpportunityId={sp.opportunityId}
              defaultIncludeTravel={defaultClient?.includeTravelDefault}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
