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
        <div className="flex flex-col sm:flex-row">
          <div className="flex h-40 items-center justify-center bg-msk-chalk sm:w-56">
            {previewUrl ? (
              <BrandImg
                src={previewUrl}
                alt={res.label}
                className="max-h-32 w-auto"
              />
            ) : (
              <span className="text-sm text-msk-ink/35">Sans aperçu</span>
            )}
          </div>
          <div className="flex-1 space-y-3 p-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={brandStatusTone(res.status)}>
                {BRAND_STATUS_LABELS[res.status]}
              </Badge>
              <Badge tone="muted">
                {BRAND_RESOURCE_KIND_LABELS[res.kind]}
              </Badge>
            </div>
            <p className="font-mono text-xs text-msk-ink/45">{res.code}</p>
            {downloadUrl ? (
              <a
                href={downloadUrl}
                download
                className="inline-flex h-9 items-center rounded-lg border border-msk-ink/12 px-3 text-sm font-medium"
              >
                Télécharger
              </a>
            ) : null}
          </div>
        </div>
      </Surface>

      <Surface className="p-5 sm:p-6">
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
