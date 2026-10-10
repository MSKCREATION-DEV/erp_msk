import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  CATALOG_FEATURED_SKU,
  CATALOG_OFFERS_SEED,
} from "@/lib/catalogue/offers-seed";
import { formatXof, PILLAR_LABELS } from "@/lib/crm/labels";
import type { CatalogPillar } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CatalogueToggleButton } from "@/components/catalogue/toggle-button";

export const metadata: Metadata = { title: "Catalogue" };

const RS_SKUS = ["CNT-RS-STD", "CNT-RS-PRO", "CNT-RS-PREMIUM"] as const;

const PILLARS: CatalogPillar[] = [
  "IMAGE_MARQUE",
  "PRESENCE_DIGITALE",
  "CROISSANCE_ACQUISITION",
  "TRANSFORMATION_STRUCTURATION",
  "CONTENU_COMMUNICATION",
];

const linkBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition";
const linkPrimary = `${linkBtn} bg-msk-blue text-white hover:bg-msk-blue/90`;
const linkSecondary = `${linkBtn} border border-msk-ink/15 bg-white text-msk-ink hover:bg-msk-chalk`;

function highlightsFor(sku: string): string[] {
  return CATALOG_OFFERS_SEED.find((o) => o.sku === sku)?.highlights ?? [];
}

export default async function CataloguePage() {
  const user = await requireUser();
  if (!hasPermission(user, "com.catalogue.view")) redirect("/accueil");

  const canManage = hasPermission(user, "com.catalogue.manage");
  const offers = await prisma.catalogOffer.findMany({
    where: canManage ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const rsPlans = RS_SKUS.map((sku) => offers.find((o) => o.sku === sku)).filter(
    Boolean,
  ) as typeof offers;

  const otherByPillar = PILLARS.map((pillar) => ({
    pillar,
    rows: offers.filter(
      (o) =>
        o.pillar === pillar &&
        !(RS_SKUS as readonly string[]).includes(o.sku),
    ),
  })).filter((g) => g.rows.length > 0);

  return (
    <PageShell>
      <PageHeader
        title="Catalogue"
        description="Offres MSK — tarifs réels (devis réseaux Marinas). Engagement RS : 3 mois min. · facturation mensuelle."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Catalogue" },
        ]}
        actions={
          canManage ? (
            <Link prefetch={false} href="/catalogue/nouveau" className={linkPrimary}>
              Nouvelle offre
            </Link>
          ) : null
        }
      />

      {/* Pricing cards — bonnes pratiques : 3 tiers, un recommandé */}
      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
            Gestion des réseaux sociaux
          </p>
          <h2 className="mt-1 text-lg font-semibold text-msk-ink">
            Choisissez l’offre adaptée
          </h2>
          <p className="mt-1 text-sm text-msk-ink/50">
            Facebook · Instagram · TikTok selon formule · Total 3 mois : 300
            000 / 450 000 / 600 000 FCFA
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {rsPlans.map((plan) => {
            const featured = plan.sku === CATALOG_FEATURED_SKU;
            const feats = highlightsFor(plan.sku);
            return (
              <Surface
                key={plan.id}
                className={cn(
                  "relative flex flex-col p-6",
                  featured &&
                    "border-msk-blue/40 ring-2 ring-msk-blue/20 shadow-md shadow-msk-blue/10",
                )}
              >
                {featured ? (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-msk-blue px-3 py-0.5 text-[11px] font-semibold text-white">
                    Recommandé
                  </span>
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-msk-ink">
                      {plan.name.replace(/^Réseaux sociaux — /, "")}
                    </h3>
                    <p className="mt-0.5 font-mono text-[11px] text-msk-ink/35">
                      {plan.sku}
                    </p>
                  </div>
                  {!plan.active ? (
                    <Badge tone="muted">Inactive</Badge>
                  ) : null}
                </div>
                <p className="mt-4">
                  <span className="text-3xl font-semibold tracking-tight text-msk-ink">
                    {formatXof(plan.priceXof).replace(" FCFA", "")}
                  </span>
                  <span className="ml-1 text-sm text-msk-ink/45">FCFA / mois</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {feats.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-msk-ink/70"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-msk-blue"
                        aria-hidden
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {canManage ? (
                  <div className="mt-6 flex gap-2">
                    <Link prefetch={false}
                      href={`/catalogue/${plan.id}/edit`}
                      className={cn(linkSecondary, "flex-1")}
                    >
                      Éditer
                    </Link>
                    <CatalogueToggleButton id={plan.id} active={plan.active} />
                  </div>
                ) : null}
              </Surface>
            );
          })}
        </div>
      </section>

      {/* Autres offres par pilier */}
      {otherByPillar.map(({ pillar, rows }) => (
        <section key={pillar} className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
            {PILLAR_LABELS[pillar]}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((o) => (
              <Surface
                key={o.id}
                className={cn("flex flex-col p-5", !o.active && "opacity-60")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-msk-ink">{o.name}</p>
                    <p className="font-mono text-[11px] text-msk-ink/35">
                      {o.sku}
                    </p>
                  </div>
                  <Badge tone={o.billing === "MONTHLY" ? "success" : "muted"}>
                    {o.billing === "MONTHLY"
                      ? "Mensuel"
                      : o.billing === "PACKAGE"
                        ? "Package"
                        : "One-shot"}
                  </Badge>
                </div>
                {o.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-msk-ink/50">
                    {o.description}
                  </p>
                ) : null}
                <p className="mt-4 text-lg font-semibold text-msk-ink">
                  {o.priceXof != null && o.priceXof < 100_000
                    ? `À partir de ${formatXof(o.priceXof)}`
                    : formatXof(o.priceXof)}
                </p>
                {canManage ? (
                  <div className="mt-4 flex gap-2">
                    <Link prefetch={false}
                      href={`/catalogue/${o.id}/edit`}
                      className={cn(linkSecondary, "flex-1 text-center")}
                    >
                      Éditer
                    </Link>
                    <CatalogueToggleButton id={o.id} active={o.active} />
                  </div>
                ) : null}
              </Surface>
            ))}
          </div>
        </section>
      ))}
    </PageShell>
  );
}
