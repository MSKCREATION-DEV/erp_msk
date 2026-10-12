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

  const [clients, offers, opportunity] = await Promise.all([
    prisma.comClient.findMany({
      where: comOwnerScopeWhere(user),
      orderBy: { name: "asc" },
      select: { id: true, name: true, includeTravelDefault: true },
    }),
    prisma.catalogOffer.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        priceXof: true,
        floorPriceXof: true,
      },
    }),
    sp.opportunityId
      ? prisma.crmOpportunity.findUnique({
          where: { id: sp.opportunityId },
          select: {
            id: true,
            title: true,
            organization: { select: { name: true } },
            catalogOffer: {
              select: {
                id: true,
                name: true,
                sku: true,
                priceXof: true,
              },
            },
            opportunityOffers: {
              orderBy: { sortOrder: "asc" },
              select: {
                catalogOffer: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    priceXof: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const defaultClient = clients.find((c) => c.id === sp.clientId);

  const prefillFromOffers = (() => {
    if (!opportunity) return undefined;
    const linked = opportunity.opportunityOffers.map((o) => o.catalogOffer);
    const legacy = opportunity.catalogOffer ? [opportunity.catalogOffer] : [];
    const seen = new Set<string>();
    const rows = [...linked, ...legacy].filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
    if (rows.length === 0) return undefined;
    return rows.map((o) => ({
      label: `${o.sku} · ${o.name}`,
      qty: 1,
      unitPrice: o.priceXof ?? 0,
      catalogOfferId: o.id,
    }));
  })();

  return (
    <PageShell>
      <PageHeader
        title="Nouveau devis"
        description={
          opportunity
            ? `Depuis ${opportunity.organization.name} — lignes préremplies si offres liées.`
            : "Lignes catalogue ou libres — PDF après création."
        }
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
            Régime ML (XOF, TVA 18 %) par défaut. Plancher catalogue respecté.
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
              initialLines={prefillFromOffers}
              defaultObject={
                opportunity
                  ? `Proposition — ${opportunity.organization.name}`
                  : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
