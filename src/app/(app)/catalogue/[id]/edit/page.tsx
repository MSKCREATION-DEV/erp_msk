import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CatalogueOfferForm } from "@/components/catalogue/offer-form";

export const metadata: Metadata = { title: "Éditer offre" };

export default async function CatalogueEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "com.catalogue.manage")) redirect("/catalogue");
  const { id } = await params;
  const offer = await prisma.catalogOffer.findUnique({ where: { id } });
  if (!offer) notFound();

  return (
    <PageShell>
      <PageHeader
        title={offer.name}
        description={offer.sku}
        backHref="/catalogue"
        backLabel="Retour au catalogue"
        breadcrumbs={[
          { label: "Catalogue", href: "/catalogue" },
          { label: "Éditer" },
        ]}
      />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Modifier l’offre</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogueOfferForm
            redirectTo="/catalogue"
            initial={{
              id: offer.id,
              sku: offer.sku,
              name: offer.name,
              description: offer.description ?? "",
              pillar: offer.pillar,
              billing: offer.billing,
              priceXof: offer.priceXof != null ? String(offer.priceXof) : "",
              floorPriceXof:
                offer.floorPriceXof != null
                  ? String(offer.floorPriceXof)
                  : "",
            }}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
