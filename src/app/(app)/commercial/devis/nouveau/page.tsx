import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comOwnerScopeWhere } from "@/lib/commercial/scope";
import { STAGE_LABELS } from "@/lib/crm/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
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
            stage: true,
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
            _count: { select: { comQuotes: true } },
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

  const oppStage =
    opportunity?.stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : opportunity?.stage;
  const oppBlocked =
    opportunity != null &&
    (oppStage !== "INTERESSE" || opportunity._count.comQuotes > 0);

  return (
    <PageShell>
      <PageHeader
        title="Nouveau devis"
        description={
          opportunity
            ? `Depuis ${opportunity.organization.name} — lignes préremplies si offres liées.`
            : "Proposition commerciale — client, lignes, régime fiscal."
        }
        backHref="/commercial/devis"
        backLabel="Retour aux devis"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Devis", href: "/commercial/devis" },
          { label: "Nouveau" },
        ]}
      />

      {clients.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/55">
          Créez d’abord un{" "}
          <Link
            prefetch={false}
            href="/commercial/clients"
            className="font-medium text-msk-blue hover:underline"
          >
            client commercial
          </Link>{" "}
          avant d’émettre un devis.
        </Surface>
      ) : oppBlocked && opportunity ? (
        <Surface className="space-y-3 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-msk-ink">
            Devis non disponible
          </h2>
          {opportunity._count.comQuotes > 0 ? (
            <p className="text-sm text-msk-ink/70">
              Un devis existe déjà pour{" "}
              <strong>{opportunity.organization.name}</strong>. Ouvrez la fiche
              prospect pour le consulter.
            </p>
          ) : (
            <p className="text-sm text-msk-ink/70">
              Statut actuel :{" "}
              <strong>{STAGE_LABELS[opportunity.stage]}</strong>. Un devis lié
              au prospect n’est possible qu’au statut <strong>Intéressé</strong>
              .
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              prefetch={false}
              href={`/crm/prospects/${opportunity.id}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-msk-blue px-4 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Ouvrir la fiche prospect
            </Link>
            <Link
              prefetch={false}
              href="/commercial/devis"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk/60"
            >
              Retour aux devis
            </Link>
          </div>
        </Surface>
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
    </PageShell>
  );
}
