import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { formatXof, PILLAR_LABELS } from "@/lib/crm/labels";
import type { CatalogPillar } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CatalogueOfferForm } from "@/components/catalogue/offer-form";
import { CatalogueToggleButton } from "@/components/catalogue/toggle-button";

export const metadata: Metadata = { title: "Catalogue" };

const PILLARS: CatalogPillar[] = [
  "IMAGE_MARQUE",
  "CONTENU_COMMUNICATION",
  "PRESENCE_DIGITALE",
  "CROISSANCE_ACQUISITION",
  "TRANSFORMATION_STRUCTURATION",
];

export default async function CataloguePage() {
  const user = await requireUser();
  if (!hasPermission(user, "com.catalogue.view")) redirect("/accueil");

  const canManage = hasPermission(user, "com.catalogue.manage");
  const offers = await prisma.catalogOffer.findMany({
    orderBy: [{ pillar: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <PageShell>
      <PageHeader
        title="Catalogue"
        description="5 piliers MSK — offres branchables sur le CRM et les devis (Phase 3)."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Catalogue" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {PILLARS.map((pillar) => {
            const rows = offers.filter((o) => o.pillar === pillar);
            return (
              <section key={pillar} className="space-y-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
                  {PILLAR_LABELS[pillar]}
                </h2>
                <Surface className="divide-y divide-msk-ink/[0.06] overflow-hidden p-0">
                  {rows.length === 0 ? (
                    <p className="p-4 text-sm text-msk-ink/40">Aucune offre</p>
                  ) : (
                    rows.map((o) => (
                      <div
                        key={o.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-msk-ink">
                            {o.name}{" "}
                            <span className="font-mono text-xs text-msk-ink/35">
                              {o.sku}
                            </span>
                          </p>
                          {o.description ? (
                            <p className="text-xs text-msk-ink/45">
                              {o.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={o.active ? "success" : "muted"}>
                            {o.billing === "MONTHLY" ? "Mensuel" : "One-shot"}
                          </Badge>
                          <span className="text-sm font-medium text-msk-ink">
                            {formatXof(o.priceXof)}
                          </span>
                          {canManage ? (
                            <CatalogueToggleButton
                              id={o.id}
                              active={o.active}
                            />
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </Surface>
              </section>
            );
          })}
        </div>

        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Nouvelle offre</CardTitle>
              <CardDescription>SKU unique, prix indicatif FCFA</CardDescription>
            </CardHeader>
            <CardContent>
              <CatalogueOfferForm />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
