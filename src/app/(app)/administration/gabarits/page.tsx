import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GenerateDemoButton } from "@/components/admin/generate-demo-pdf";

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

export default async function GabaritsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  const templates = await prisma.documentTemplate.findMany();

  return (
    <PageShell>
      <PageHeader
        title="Gabarits"
        description="Modèles PDF Commercial et RH — même layout que les documents métier. Démo classée dans GED · 04_MODELES."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits" },
        ]}
      />

      <div className="flex flex-col gap-10">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((t) => (
                    <Card key={t.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle>{t.name}</CardTitle>
                            <CardDescription className="font-mono text-xs">
                              {t.code} · v{t.version}
                            </CardDescription>
                          </div>
                          <Badge tone={TEMPLATE_TYPE_TONE[t.type]}>
                            {TEMPLATE_TYPE_LABEL[t.type]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-3">
                        <p className="text-xs leading-relaxed text-msk-ink/55">
                          {t.active
                            ? TEMPLATE_PURPOSE[t.type]
                            : "Inactif — non proposé en génération démo."}
                        </p>
                        {t.active ? (
                          <GenerateDemoButton templateId={t.id} />
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-msk-ink/45">
              Aucun gabarit — relancer le seed (
              <code className="text-xs">npm run db:seed</code>).
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
