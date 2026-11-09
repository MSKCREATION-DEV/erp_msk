import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, FolderOpen } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  TEMPLATE_FAMILY,
  TEMPLATE_PURPOSE,
  TEMPLATE_TYPE_LABEL,
  TEMPLATE_TYPE_TONE,
  templateGenerator,
  templateRef,
  templateSlots,
} from "@/lib/templates/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { GenerateDemoButton } from "@/components/admin/generate-demo-pdf";

export const metadata: Metadata = { title: "Gabarit" };

export default async function GabaritDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  const { id } = await params;
  const template = await prisma.documentTemplate.findUnique({
    where: { id },
  });
  if (!template) notFound();

  const slots = templateSlots(template.structureJson);
  const ref = templateRef(template.structureJson);
  const generator = templateGenerator(template.structureJson);

  const recentDemos = await prisma.document.findMany({
    where: {
      status: "ACTIVE",
      links: {
        some: { entityType: "template", entityId: template.id },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      originalName: true,
      createdAt: true,
      size: true,
    },
  });

  return (
    <PageShell>
      <PageHeader
        title={template.name}
        description={TEMPLATE_PURPOSE[template.type]}
        backHref="/administration/gabarits"
        backLabel="Retour aux gabarits"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits", href: "/administration/gabarits" },
          { label: template.name },
        ]}
        actions={
          template.active ? null : (
            <Badge tone="muted">Inactif — génération désactivée</Badge>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface className="space-y-4 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TEMPLATE_TYPE_TONE[template.type]}>
              {TEMPLATE_TYPE_LABEL[template.type]}
            </Badge>
            <Badge tone="ink">{TEMPLATE_FAMILY[template.type]}</Badge>
            <Badge tone={template.active ? "success" : "muted"}>
              {template.active ? "Actif" : "Inactif"}
            </Badge>
            <span className="text-xs tabular-nums text-msk-ink/45">
              v{template.version}
            </span>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-caps text-msk-ink/40">
                Code
              </dt>
              <dd className="mt-1 font-mono text-sm text-msk-ink">
                {template.code}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-caps text-msk-ink/40">
                Générateur
              </dt>
              <dd className="mt-1 font-mono text-sm text-msk-ink">
                {generator ?? "selon type (actions/templates)"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-caps text-msk-ink/40">
                Référence docs/
              </dt>
              <dd className="mt-1 text-sm text-msk-ink/80">
                {ref ?? "— non renseignée dans structureJson"}
              </dd>
            </div>
          </dl>

          <div>
            <h2 className="text-sm font-semibold text-msk-ink">
              Structure (slots)
            </h2>
            <p className="mt-1 text-xs text-msk-ink/45">
              Métadonnées du gabarit — le texte juridique est dans le générateur
              PDF, pas dans cette fiche.
            </p>
            {slots.length === 0 ? (
              <p className="mt-3 text-sm text-msk-ink/45">Aucun slot déclaré.</p>
            ) : (
              <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {slots.map((slot, i) => (
                  <li
                    key={`${slot}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-msk-ink/6 bg-msk-chalk/60 px-3 py-2 text-sm text-msk-ink"
                  >
                    <span className="tabular-nums text-xs text-msk-ink/35">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-xs">{slot}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Surface>

        <div className="space-y-4">
          <Surface className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-msk-ink">
              <FileText className="h-4 w-4 text-msk-blue" aria-hidden />
              PDF démo
            </h2>
            <p className="text-xs leading-relaxed text-msk-ink/55">
              Génère un PDF avec données fictives, même layout que les documents
              métier. Classé automatiquement dans GED · 04_MODELES.
            </p>
            {template.active ? (
              <GenerateDemoButton templateId={template.id} />
            ) : (
              <p className="text-xs text-msk-coral">
                Gabarit inactif — réactiver via seed avant génération.
              </p>
            )}
          </Surface>

          <Surface className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-msk-ink">
              <FolderOpen className="h-4 w-4 text-msk-blue" aria-hidden />
              Dernières démos
            </h2>
            {recentDemos.length === 0 ? (
              <p className="text-xs text-msk-ink/45">
                Aucun PDF démo lié à ce gabarit.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentDemos.map((doc) => (
                  <li
                    key={doc.id}
                    className="rounded-md border border-msk-ink/6 px-3 py-2"
                  >
                    <p className="truncate text-sm font-medium text-msk-ink">
                      {doc.originalName}
                    </p>
                    <p className="text-xs text-msk-ink/45">
                      {doc.createdAt.toLocaleString("fr-FR")} ·{" "}
                      {Math.round(doc.size / 1024)} Ko
                    </p>
                    <Link
                      prefetch={false}
                      href="/ged"
                      className="mt-2 inline-flex h-9 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-ink transition hover:bg-msk-chalk"
                    >
                      Ouvrir la GED
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </div>
      </div>
    </PageShell>
  );
}
