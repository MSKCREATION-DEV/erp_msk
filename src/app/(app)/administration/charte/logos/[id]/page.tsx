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
import { brandLogoPreviewUrl } from "@/lib/brand/preview-url";
import {
  BRAND_LOGO_KIND_LABELS,
  BRAND_STATUS_LABELS,
  brandStatusTone,
} from "@/lib/brand/labels";
import {
  LogoArchiveButton,
  LogoDefaultButton,
  LogoMetaForm,
  LogoReplaceFileForm,
} from "@/components/admin/charte/logo-actions";

export const metadata: Metadata = { title: "Logo charte" };

export default async function LogoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  const { id } = await params;
  const logo = await prisma.brandLogo.findUnique({ where: { id } });
  if (!logo) notFound();

  const previewUrl = await brandLogoPreviewUrl(logo);
  let originalUrl: string | null = null;
  let optimizedUrl: string | null = null;
  if (logo.storageOriginal) {
    try {
      originalUrl = await signedGedUrl(logo.storageOriginal, 3600);
    } catch {
      originalUrl = null;
    }
  } else if (logo.publicPath) {
    originalUrl = logo.publicPath;
  }
  if (logo.storageOptimized) {
    try {
      optimizedUrl = await signedGedUrl(logo.storageOptimized, 3600);
    } catch {
      optimizedUrl = null;
    }
  }

  return (
    <PageShell>
      <PageHeader
        title={logo.label}
        description={`Code ${logo.code} · ${logo.mime}`}
        backHref="/administration/charte/logos"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Logos", href: "/administration/charte/logos" },
          { label: logo.label },
        ]}
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-msk-ink">
                  {logo.label}
                </h1>
                <Badge tone={brandStatusTone(logo.status)}>
                  {BRAND_STATUS_LABELS[logo.status]}
                </Badge>
                <Badge tone="muted">
                  {BRAND_LOGO_KIND_LABELS[logo.kind]}
                </Badge>
                {logo.isDefaultDocuments ? (
                  <Badge tone="blue">Défaut documents</Badge>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-msk-ink/45">
                {logo.code}
                {logo.widthPx && logo.heightPx
                  ? ` · ${logo.widthPx}×${logo.heightPx}`
                  : ""}
                {logo.fileSizeBytes
                  ? ` · ${Math.round(logo.fileSizeBytes / 1024)} Ko`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {originalUrl ? (
                <a
                  href={originalUrl}
                  download
                  className="inline-flex h-9 items-center rounded-lg border border-msk-ink/12 px-3 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
                >
                  Télécharger original
                </a>
              ) : null}
              {optimizedUrl ? (
                <a
                  href={optimizedUrl}
                  download
                  className="inline-flex h-9 items-center rounded-lg border border-msk-ink/12 px-3 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
                >
                  Télécharger optimisé
                </a>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex h-32 items-center justify-center rounded-xl bg-msk-ink p-4">
            {previewUrl ? (
              <BrandImg
                src={previewUrl}
                alt={logo.label}
                className="max-h-24 w-auto"
              />
            ) : (
              <span className="text-sm text-white/40">Aperçu indisponible</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-msk-ink/6 pt-4">
            <LogoDefaultButton
              id={logo.id}
              disabled={logo.isDefaultDocuments || logo.status !== "ACTIVE"}
            />
            <LogoArchiveButton
              id={logo.id}
              isDefaultDocuments={logo.isDefaultDocuments}
            />
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold">Métadonnées</h2>
          <LogoMetaForm
            id={logo.id}
            label={logo.label}
            kind={logo.kind}
            status={logo.status}
            description={logo.description}
            isDefaultDocuments={logo.isDefaultDocuments}
          />
        </Surface>
        <Surface className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold">Fichier</h2>
          <LogoReplaceFileForm id={logo.id} />
          {logo.publicPath ? (
            <p className="mt-4 text-xs text-msk-ink/45">
              Chemin public seed : {logo.publicPath} (fallback si Storage
              indisponible)
            </p>
          ) : null}
        </Surface>
      </div>
    </PageShell>
  );
}
