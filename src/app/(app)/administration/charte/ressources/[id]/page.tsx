import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BrandImg } from "@/components/admin/charte/brand-img";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { signedGedUrl } from "@/lib/ged/storage";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ResourceEditForm } from "@/components/admin/charte/resource-forms";
import { brandResourcePreviewUrl } from "@/lib/brand/preview-url";
import {
  BRAND_RESOURCE_KIND_LABELS,
  BRAND_STATUS_LABELS,
  brandStatusTone,
} from "@/lib/brand/labels";

export const metadata: Metadata = { title: "Ressource brand" };

export default async function RessourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");
  const { id } = await params;
  const res = await prisma.brandResource.findUnique({ where: { id } });
  if (!res) notFound();

  const previewUrl = await brandResourcePreviewUrl(res);
  let downloadUrl = previewUrl;
  if (res.storagePath) {
    try {
      downloadUrl = await signedGedUrl(res.storagePath, 3600);
    } catch {
      /* keep preview */
    }
  }

  return (
    <PageShell>
      <PageHeader
        title={res.label}
        description={BRAND_RESOURCE_KIND_LABELS[res.kind]}
        backHref="/administration/charte/ressources"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Ressources", href: "/administration/charte/ressources" },
          { label: res.label },
        ]}
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-msk-ink">
                  {res.label}
                </h1>
                <Badge tone={brandStatusTone(res.status)}>
                  {BRAND_STATUS_LABELS[res.status]}
                </Badge>
                <Badge tone="muted">
                  {BRAND_RESOURCE_KIND_LABELS[res.kind]}
                </Badge>
              </div>
              <p className="mt-1 font-mono text-xs text-msk-ink/45">
                {res.code}
              </p>
              {res.description ? (
                <p className="mt-1 text-sm text-msk-ink/60">
                  {res.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex h-9 items-center rounded-lg border border-msk-ink/12 bg-white px-3 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
                >
                  Télécharger
                </a>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-msk-ink/8 bg-white p-4">
            {previewUrl ? (
              <BrandImg
                src={previewUrl}
                alt={res.label}
                className="max-h-24 w-auto"
              />
            ) : (
              <span className="text-sm text-msk-ink/35">
                Aperçu indisponible
              </span>
            )}
          </div>
        </div>
      </Surface>

      <Surface className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold">Modifier</h2>
        <ResourceEditForm
          id={res.id}
          label={res.label}
          kind={res.kind}
          description={res.description}
          status={res.status}
        />
      </Surface>
    </PageShell>
  );
}
