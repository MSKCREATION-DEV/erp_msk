import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { TemplateType } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  COMMERCIAL_TEMPLATE_ORDER,
  RH_TEMPLATE_ORDER,
  TEMPLATE_FAMILY,
  TEMPLATE_PURPOSE,
  TEMPLATE_TYPE_LABEL,
  TEMPLATE_TYPE_TONE,
  sortTemplatesByFamilyOrder,
  type TemplateFamily,
} from "@/lib/templates/labels";
import { listKeyFromSearchParams } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { TemplateLibraryCard } from "@/components/admin/template-library-card";
import { StudioTemplatesSection } from "./studio-section";

export const metadata: Metadata = { title: "Gabarits" };

const SECTIONS: {
  family: TemplateFamily;
  title: string;
  hint: string;
  order: TemplateType[];
  headingTone: "blue" | "ink";
}[] = [
  {
    family: "Commercial",
    title: "Commercial",
    hint: "Devis, facture et contrat client (agence → client).",
    order: COMMERCIAL_TEMPLATE_ORDER,
    headingTone: "blue",
  },
  {
    family: "RH",
    title: "RH",
    hint: "Contrats collaborateurs / stage / prestataire, attestations et paie.",
    order: RH_TEMPLATE_ORDER,
    headingTone: "ink",
  },
];

export default async function GabaritsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  const templates = await prisma.documentTemplate.findMany({
    where: {
      type: { in: [...COMMERCIAL_TEMPLATE_ORDER, ...RH_TEMPLATE_ORDER] },
    },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      version: true,
      active: true,
      generatorKind: true,
      signatureEnabled: true,
      publishedVersionId: true,
      description: true,
    },
  });
  const resultsKey = listKeyFromSearchParams(await searchParams, [
    "q",
    "ssort",
    "sdir",
    "spage",
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Studio documentaire"
        description="Gabarits centralisés — exemplaires toujours disponibles, Playground et génération PDF pour tout l’ERP."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits" },
        ]}
      />

      <Surface className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-msk-blue/8 via-white to-msk-chalk/90 p-6 sm:p-8">
          <p className="max-w-3xl text-sm leading-relaxed text-msk-ink/70">
            Un document = un gabarit. Les modules métier consomment le registre central (
            <code className="text-xs">requireActiveTemplate</code>) — jamais de mise en page improvisée.
            Chaque carte : fiche, téléchargement d’exemplaire et Playground.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="blue">Variables {"{{slug}}"}</Badge>
            <Badge tone="muted">Signature OFF par défaut</Badge>
            <Badge tone="success">Exemplaire à la demande</Badge>
          </div>
        </div>
      </Surface>

      <div className="flex flex-col gap-10">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm placeholder="Rechercher un gabarit Studio…" className="sm:max-w-md" />
        </Suspense>

        <Suspense
          key={resultsKey}
          fallback={
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl bg-msk-chalk" />
              ))}
            </div>
          }
        >
          <StudioTemplatesSection searchParams={searchParams} />
        </Suspense>
        {SECTIONS.map((section) => {
          const items = sortTemplatesByFamilyOrder(
            templates.filter((t) => TEMPLATE_FAMILY[t.type] === section.family),
            section.order,
          );

          return (
            <section key={section.family} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-msk-ink/8 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-msk-ink">
                      {section.title}
                    </h2>
                    <Badge tone={section.headingTone}>{items.length}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-msk-ink/50">{section.hint}</p>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-msk-ink/10 bg-white px-5 py-8 text-center text-sm text-msk-ink/45">
                  Aucun gabarit {section.family} — relancer le seed.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((t) => (
                    <TemplateLibraryCard
                      key={t.id}
                      id={t.id}
                      name={t.name}
                      code={`${t.code} · v${t.version}`}
                      description={
                        t.description ??
                        (t.active
                          ? TEMPLATE_PURPOSE[t.type]
                          : "Inactif — génération métier refusée.")
                      }
                      active={t.active}
                      generatorKind={t.generatorKind}
                      signatureEnabled={t.signatureEnabled}
                      published={Boolean(t.publishedVersionId)}
                      editHref={
                        t.generatorKind === "ENGINE_BLOCKS"
                          ? `/administration/gabarits/${t.id}/edit`
                          : undefined
                      }
                      typeLabel={TEMPLATE_TYPE_LABEL[t.type]}
                      typeTone={TEMPLATE_TYPE_TONE[t.type]}
                      familyLabel={section.family}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {templates.length === 0 ? (
          <Surface className="py-10 text-center text-sm text-msk-ink/45">
            Aucun gabarit — relancer le seed (
            <code className="text-xs">npm run db:seed</code>).
          </Surface>
        ) : null}
      </div>
    </PageShell>
  );
}
