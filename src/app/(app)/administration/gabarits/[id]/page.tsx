import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, FileText, FolderOpen, History } from "lucide-react";
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
import { TemplateCardActions } from "@/components/admin/template-card-actions";
import { GabaritsStickyChrome } from "@/components/admin/gabarits-sticky-chrome";
import { TemplateDetailSidebar } from "@/components/admin/template-detail-sidebar";
import { canGenerateExemplaire } from "@/lib/studio/generate-sample-pdf";
import { parseBlocks, parseDeclaredVariables } from "@/lib/studio/types";

export const metadata: Metadata = { title: "Gabarit" };

type RecentDemo = {
  id: string;
  originalName: string;
  createdAt: Date;
  size: number;
};

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
    include: {
      publishedVersion: true,
      versions: { orderBy: { version: "desc" } },
    },
  });
  if (!template) notFound();

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

  if (template.generatorKind === "ENGINE_BLOCKS") {
    return (
      <StudioTemplateDetail template={template} recentDemos={recentDemos} />
    );
  }

  const slots = templateSlots(template.structureJson);
  const ref = templateRef(template.structureJson);
  const generator = templateGenerator(template.structureJson);
  const exemplaireOk = canGenerateExemplaire(template);

  return (
    <PageShell>
      <GabaritsStickyChrome
        header={
          <>
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

            <Surface className="overflow-hidden p-0">
              <div className="bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold tracking-tight text-msk-ink sm:text-xl">
                    {template.name}
                  </p>
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
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
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
                    <dd className="mt-1 truncate font-mono text-sm text-msk-ink">
                      {generator ?? "selon type"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-caps text-msk-ink/40">
                      Slots
                    </dt>
                    <dd className="mt-1 text-sm text-msk-ink">{slots.length}</dd>
                  </div>
                </dl>
              </div>
            </Surface>
          </>
        }
      >
        {/* Pas de items-start : sticky a besoin d’une plage de hauteur. */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-8 xl:col-span-9">
            <Surface className="space-y-4 p-5">
              <div>
                <h2 className="text-sm font-semibold text-msk-ink">
                  Structure (slots)
                </h2>
                <p className="mt-1 text-xs text-msk-ink/45">
                  Métadonnées du gabarit — le texte juridique est dans le
                  générateur PDF, pas dans cette fiche.
                </p>
              </div>
              {slots.length === 0 ? (
                <p className="text-sm text-msk-ink/45">Aucun slot déclaré.</p>
              ) : (
                <ol className="grid gap-1.5 sm:grid-cols-2">
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

              <div className="border-t border-msk-ink/6 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-caps text-msk-ink/45">
                  Référence métier
                </h3>
                {ref ? (
                  <div className="mt-2">
                    <p className="font-mono text-xs text-msk-ink">{ref}</p>
                    <p className="mt-1 text-xs text-msk-ink/45">
                      Fichier hors dépôt Git — conserver une copie locale
                      sécurisée si besoin de relecture.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-msk-ink/45">
                    — non renseignée dans structureJson
                  </p>
                )}
              </div>
            </Surface>

            <Surface className="space-y-3 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-msk-ink">
                <FolderOpen className="h-4 w-4 text-msk-blue" aria-hidden />
                Dernières démos GED
              </h2>
              {recentDemos.length === 0 ? (
                <p className="text-xs text-msk-ink/45">
                  Aucun PDF démo lié à ce gabarit.
                </p>
              ) : (
                <ul className="divide-y divide-msk-ink/6">
                  {recentDemos.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-msk-ink">
                          {doc.originalName}
                        </p>
                        <p className="text-xs text-msk-ink/45">
                          {doc.createdAt.toLocaleString("fr-FR")} ·{" "}
                          {Math.round(doc.size / 1024)} Ko
                        </p>
                      </div>
                      <Link
                        prefetch={false}
                        href="/ged"
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-ink transition hover:bg-msk-chalk"
                      >
                        Ouvrir la GED
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </div>

          <div className="lg:col-span-4 xl:col-span-3">
            <TemplateDetailSidebar
              templateId={template.id}
              templateName={template.name}
              exemplaireAvailable={exemplaireOk}
            >
              <Surface className="space-y-3 p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-msk-ink">
                  <FileText className="h-4 w-4 text-msk-blue" aria-hidden />
                  PDF démo GED
                </h2>
                <p className="text-xs leading-relaxed text-msk-ink/55">
                  Génère un PDF fictif (même layout métier) classé dans GED ·
                  04_MODELES.
                </p>
                {template.active ? (
                  <GenerateDemoButton templateId={template.id} />
                ) : (
                  <p className="text-xs text-msk-coral">
                    Gabarit inactif — réactiver avant génération.
                  </p>
                )}
              </Surface>

              <Surface className="space-y-3 p-4">
                <h2 className="text-sm font-semibold text-msk-ink">
                  Règles courtes
                </h2>
                <ul className="space-y-2 text-xs leading-relaxed text-msk-ink/55">
                  <li>
                    Exemplaire = aperçu à la volée,{" "}
                    <span className="font-medium text-msk-ink/70">sans GED</span>
                    .
                  </li>
                  <li>
                    PDF démo = exemplaire archivé dans la GED pour partage.
                  </li>
                  <li>
                    Slots = métadonnées — le contenu juridique vit dans le
                    générateur.
                  </li>
                </ul>
              </Surface>
            </TemplateDetailSidebar>
          </div>
        </div>
      </GabaritsStickyChrome>
    </PageShell>
  );
}

type StudioTemplate = NonNullable<
  Awaited<ReturnType<typeof prisma.documentTemplate.findUnique>>
> & {
  publishedVersion: Awaited<
    ReturnType<typeof prisma.documentTemplateVersion.findFirst>
  > | null;
  versions: Awaited<
    ReturnType<typeof prisma.documentTemplateVersion.findMany>
  >;
};

function StudioTemplateDetail({
  template,
  recentDemos,
}: {
  template: StudioTemplate;
  recentDemos: RecentDemo[];
}) {
  const published = template.publishedVersion;
  const blocks = parseBlocks(published?.bodyJson);
  const variables = parseDeclaredVariables(published?.variablesJson);
  const draft = template.versions.find((v) => v.status === "DRAFT");
  const exemplaireOk = canGenerateExemplaire(template);

  return (
    <PageShell>
      <GabaritsStickyChrome
        header={
          <>
            <PageHeader
              title={template.name}
              description={
                template.description ??
                "Gabarit créé dans le Studio documentaire."
              }
              backHref="/administration/gabarits"
              backLabel="Retour aux gabarits"
              breadcrumbs={[
                { label: "Administration" },
                { label: "Gabarits", href: "/administration/gabarits" },
                { label: template.name },
              ]}
              actions={
                <TemplateCardActions
                  templateId={template.id}
                  active={template.active}
                  signatureEnabled={template.signatureEnabled}
                  hasDraft={Boolean(draft)}
                  editHref={`/administration/gabarits/${template.id}/edit`}
                />
              }
            />

            <Surface className="overflow-hidden p-0">
              <div className="bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold tracking-tight text-msk-ink sm:text-xl">
                    {template.name}
                  </p>
                  <Badge tone="success">Studio</Badge>
                  <Badge tone={template.active ? "success" : "muted"}>
                    {template.active ? "Actif" : "Inactif"}
                  </Badge>
                  <Badge tone={published ? "blue" : "coral"}>
                    {published
                      ? `Publié · v${published.version}`
                      : "Non publié"}
                  </Badge>
                  {draft ? (
                    <Badge tone="ink">Brouillon v{draft.version}</Badge>
                  ) : null}
                  <Badge tone={template.signatureEnabled ? "success" : "muted"}>
                    {template.signatureEnabled
                      ? "Signature ON"
                      : "Signature OFF"}
                  </Badge>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
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
                      Variables
                    </dt>
                    <dd className="mt-1 text-sm text-msk-ink">
                      {variables.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-caps text-msk-ink/40">
                      Versions
                    </dt>
                    <dd className="mt-1 text-sm text-msk-ink">
                      {template.versions.length}
                    </dd>
                  </div>
                </dl>
              </div>
            </Surface>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-8 xl:col-span-9">
            <Surface className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-msk-ink">
                Contenu publié{" "}
                {published ? `(v${published.version})` : ""}
              </h2>
              {!published ? (
                <p className="rounded-xl border border-dashed border-msk-coral/30 bg-msk-coral/5 p-4 text-sm text-msk-coral">
                  Aucune version publiée — ce gabarit ne peut pas encore générer
                  de document officiel.{" "}
                  {draft
                    ? "Publiez le brouillon pour l’activer."
                    : "Éditez son contenu pour créer un brouillon."}
                </p>
              ) : blocks.length === 0 ? (
                <p className="text-sm text-msk-ink/45">
                  Aucun bloc dans cette version.
                </p>
              ) : (
                <ol className="space-y-2">
                  {blocks.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-md border border-msk-ink/6 bg-msk-chalk/60 px-3 py-2 text-sm"
                    >
                      <Badge tone="ink" className="mt-0.5 shrink-0">
                        {b.kind}
                      </Badge>
                      <span className="text-msk-ink/80">
                        {b.kind === "paragraph" ||
                        b.kind === "heading" ||
                        b.kind === "highlight"
                          ? b.text
                          : b.kind === "signature"
                            ? `${b.leftLabel} / ${b.rightLabel}${
                                !template.signatureEnabled
                                  ? " — ignoré (signature OFF)"
                                  : ""
                              }`
                            : "— espace —"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {variables.length > 0 ? (
                <div className="border-t border-msk-ink/6 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-caps text-msk-ink/45">
                    Variables utilisées
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {variables.map((v) => (
                      <li key={v.slug}>
                        <Badge tone={v.required ? "coral" : "muted"}>
                          {`{{${v.slug}}}`}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-msk-ink/40">
                    Obligatoires manquantes à la génération officielle → erreur
                    explicite (jamais de document avec un trou silencieux).
                  </p>
                </div>
              ) : null}
            </Surface>

            <Surface className="space-y-3 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-msk-ink">
                <History className="h-4 w-4 text-msk-blue" aria-hidden />
                Historique des versions
              </h2>
              <ul className="space-y-1.5">
                {template.versions.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-msk-ink/6 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-msk-ink">
                      v{v.version}
                    </span>
                    <Badge
                      tone={
                        v.status === "PUBLISHED"
                          ? "success"
                          : v.status === "DRAFT"
                            ? "ink"
                            : "muted"
                      }
                    >
                      {v.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Surface>

            <Surface className="space-y-3 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-msk-ink">
                <FolderOpen className="h-4 w-4 text-msk-blue" aria-hidden />
                Derniers PDF générés
              </h2>
              {recentDemos.length === 0 ? (
                <p className="text-xs text-msk-ink/45">
                  Aucun PDF généré depuis ce gabarit.
                </p>
              ) : (
                <ul className="divide-y divide-msk-ink/6">
                  {recentDemos.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-msk-ink">
                          {doc.originalName}
                        </p>
                        <p className="text-xs text-msk-ink/45">
                          {doc.createdAt.toLocaleString("fr-FR")} ·{" "}
                          {Math.round(doc.size / 1024)} Ko
                        </p>
                      </div>
                      <Link
                        prefetch={false}
                        href="/ged"
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-ink transition hover:bg-msk-chalk"
                      >
                        Ouvrir la GED
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </div>

          <div className="lg:col-span-4 xl:col-span-3">
            <TemplateDetailSidebar
              templateId={template.id}
              templateName={template.name}
              exemplaireAvailable={exemplaireOk}
              engineBlocks
            >
              <Surface className="space-y-3 p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-msk-ink">
                  <FileText className="h-4 w-4 text-msk-blue" aria-hidden />
                  Aperçu réel GED
                </h2>
                <p className="text-xs leading-relaxed text-msk-ink/55">
                  PDF via le moteur central (catalogue variables), classé dans
                  la GED.
                </p>
                {!template.active ? (
                  <p className="text-xs text-msk-coral">
                    Gabarit inactif — activez-le pour générer.
                  </p>
                ) : !published ? (
                  <p className="text-xs text-msk-coral">
                    Publiez une version pour générer un aperçu.
                  </p>
                ) : (
                  <GenerateDemoButton templateId={template.id} />
                )}
              </Surface>

              <Surface className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-msk-ink">
                    Règles gabarit
                  </h2>
                  <BookOpen
                    className="h-4 w-4 shrink-0 text-msk-blue"
                    aria-hidden
                  />
                </div>
                <dl className="space-y-2.5 text-xs">
                  <div>
                    <dt className="font-medium text-msk-ink/70">Variable</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-msk-blue">
                      {"{{client.nom}}"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-msk-ink/70">Titre</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-msk-ink/60">
                      # Titre du document
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-msk-ink/70">Signature</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-msk-ink/60">
                      {"[[SIGNATURE: Client | MSK]]"}
                    </dd>
                  </div>
                </dl>
                <Link
                  href="/administration/gabarits/variables"
                  prefetch={false}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-msk-ink/15 bg-white px-3 text-xs font-medium text-msk-ink transition hover:bg-msk-chalk"
                >
                  Catalogue variables
                </Link>
              </Surface>
            </TemplateDetailSidebar>
          </div>
        </div>
      </GabaritsStickyChrome>
    </PageShell>
  );
}
