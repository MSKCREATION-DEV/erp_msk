import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  FontFileUploadForm,
  TypographyEditForm,
} from "@/components/admin/charte/typography-forms";
import {
  BRAND_STATUS_LABELS,
  BRAND_TYPO_ROLE_LABELS,
  brandStatusTone,
} from "@/lib/brand/labels";

export const metadata: Metadata = { title: "Typographie charte" };

export default async function TypoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");
  const { id } = await params;
  const typo = await prisma.brandTypography.findUnique({
    where: { id },
    include: { files: { orderBy: [{ weight: "asc" }, { style: "asc" }] } },
  });
  if (!typo) notFound();

  return (
    <PageShell>
      <PageHeader
        title={typo.familyName}
        description={`Rôle ${BRAND_TYPO_ROLE_LABELS[typo.role]}`}
        backHref="/administration/charte/typographies"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Typographies", href: "/administration/charte/typographies" },
          { label: typo.familyName },
        ]}
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-msk-ink">
              {typo.familyName}
            </h1>
            <Badge tone={brandStatusTone(typo.status)}>
              {BRAND_STATUS_LABELS[typo.status]}
            </Badge>
            <Badge tone="muted">{BRAND_TYPO_ROLE_LABELS[typo.role]}</Badge>
            {typo.isDefaultErp ? <Badge tone="blue">Défaut ERP</Badge> : null}
            {typo.isDefaultPdf ? <Badge tone="blue">Défaut PDF</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-msk-ink/45">
            {typo.files.length
              ? `${typo.files.length} fichier(s) de graisse`
              : "Stack CSS / police système — pas de fichier uploadé"}
          </p>

          <div className="mt-4 rounded-xl border border-msk-ink/8 bg-white p-5">
            <p
              className="text-3xl font-semibold text-msk-ink"
              style={typo.cssStack ? { fontFamily: typo.cssStack } : undefined}
            >
              Agence de création et de digitalisation
            </p>
            <p
              className="mt-2 text-sm text-msk-ink/60"
              style={typo.cssStack ? { fontFamily: typo.cssStack } : undefined}
            >
              ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
            </p>
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold">Paramètres</h2>
          <TypographyEditForm
            id={typo.id}
            familyName={typo.familyName}
            role={typo.role}
            notes={typo.notes}
            cssStack={typo.cssStack}
            status={typo.status}
            isDefaultErp={typo.isDefaultErp}
            isDefaultPdf={typo.isDefaultPdf}
          />
        </Surface>
        <Surface className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold">Fichiers de graisses</h2>
          {typo.files.length === 0 ? (
            <p className="mb-4 text-sm text-msk-ink/45">
              Aucun fichier — stack CSS / police système utilisée.
            </p>
          ) : (
            <ul className="mb-6 divide-y divide-msk-ink/6">
              {typo.files.map((f) => (
                <li
                  key={f.id}
                  className="flex justify-between gap-3 py-2 text-sm"
                >
                  <span>
                    {f.weight} · {f.style}
                  </span>
                  <span className="truncate text-msk-ink/45">
                    {f.originalFileName ?? f.mime}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <FontFileUploadForm typographyId={typo.id} />
          <p className="mt-4 text-xs text-msk-ink/40">
            Note : l’embedding PDF custom (fontkit) n’est pas activé — le PDF
            reste sur Helvetica tant que ce chantier n’est pas ouvert.
          </p>
        </Surface>
      </div>
    </PageShell>
  );
}
