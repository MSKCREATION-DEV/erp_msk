import type { Metadata } from "next";
import Link from "next/link";
import { BrandImg } from "@/components/admin/charte/brand-img";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { brandLogoPreviewUrl } from "@/lib/brand/preview-url";
import {
  BRAND_COLOR_CATEGORY_LABELS,
  BRAND_LOGO_KIND_LABELS,
  BRAND_STATUS_LABELS,
  BRAND_TYPO_ROLE_LABELS,
  brandStatusTone,
} from "@/lib/brand/labels";
import { contrastRatio, wcagLevel } from "@/lib/brand/colors";
import { runSeries } from "@/lib/db/serial";

export const metadata: Metadata = { title: "Charte MSK" };

export default async function CharteOverviewPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  const [logos, colors, typos, resources, config] = await runSeries([
    () =>
      prisma.brandLogo.findMany({
        where: { status: { not: "ARCHIVED" } },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        take: 12,
      }),
    () =>
      prisma.brandColor.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ sortOrder: "asc" }, { tokenKey: "asc" }],
        take: 24,
      }),
    () =>
      prisma.brandTypography.findMany({
        where: { status: { not: "ARCHIVED" } },
        orderBy: [{ sortOrder: "asc" }, { familyName: "asc" }],
        include: { files: { select: { id: true, weight: true } } },
        take: 12,
      }),
    () =>
      prisma.brandResource.count({
        where: { status: { not: "ARCHIVED" } },
      }),
    () =>
      prisma.brandConfiguration.findUnique({
        where: { id: "default" },
        include: {
          defaultDocumentsLogo: {
            select: { id: true, label: true, code: true },
          },
        },
      }),
  ]);

  const logoPreviews = await Promise.all(
    logos.map(async (l) => ({
      ...l,
      previewUrl: await brandLogoPreviewUrl(l),
    })),
  );

  const defaultLogo = config?.defaultDocumentsLogo;
  const blue = colors.find((c) => c.tokenKey === "msk-blue")?.hex ?? "#1D73BC";
  const ink = colors.find((c) => c.tokenKey === "msk-ink")?.hex ?? "#0D1330";
  const chalk =
    colors.find((c) => c.tokenKey === "msk-chalk")?.hex ?? "#F5F3EF";
  const docContrast = contrastRatio(ink, chalk);
  const primaryOnChalk = contrastRatio(blue, chalk);

  return (
    <PageShell>
      <PageHeader
        title="Charte graphique"
        description="Identité visuelle MSK — logos, palette, typographies et ressources pour l’ERP et les documents."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Surface className="overflow-hidden p-0 lg:col-span-8">
          <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-caps text-msk-blue">
              Brand Preview
            </p>
            <h2 className="mt-1 text-xl font-semibold text-msk-ink">
              MSK <span className="font-accent">CREATION</span>
            </h2>
            <p className="mt-1 text-sm text-msk-ink/55">
              Aperçu cohérent ERP · facture / devis · documents admin
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: chalk, color: ink }}
            >
              <p className="text-xs font-medium uppercase tracking-caps opacity-60">
                Interface ERP
              </p>
              <p className="mt-2 text-lg font-semibold">Tableau de bord</p>
              <button
                type="button"
                className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: blue }}
                tabIndex={-1}
              >
                Action primaire
              </button>
            </div>
            <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
                Document / PDF
              </p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-msk-ink">FACTURE</p>
                  <p className="text-xs text-msk-ink/45">Aperçu en-tête</p>
                </div>
                {defaultLogo ? (
                  <Badge tone="blue">Logo défaut</Badge>
                ) : (
                  <Badge tone="coral">Fallback public</Badge>
                )}
              </div>
              <p className="mt-3 text-xs text-msk-ink/50">
                {defaultLogo
                  ? `${defaultLogo.label} (${defaultLogo.code})`
                  : "public/brand/lockup.png jusqu’à configuration"}
              </p>
            </div>
          </div>
        </Surface>

        <Surface className="space-y-4 p-5 lg:col-span-4 sm:p-6">
          <h3 className="text-sm font-semibold text-msk-ink">État config</h3>
          <ul className="space-y-2 text-sm text-msk-ink/70">
            <li>
              Logos actifs :{" "}
              <strong className="text-msk-ink">
                {logos.filter((l) => l.status === "ACTIVE").length}
              </strong>
            </li>
            <li>
              Couleurs actives :{" "}
              <strong className="text-msk-ink">{colors.length}</strong>
            </li>
            <li>
              Typographies :{" "}
              <strong className="text-msk-ink">{typos.length}</strong>
            </li>
            <li>
              Autres ressources :{" "}
              <strong className="text-msk-ink">{resources}</strong>
            </li>
            <li>
              Contraste encre / craie :{" "}
              <strong className="text-msk-ink">
                {docContrast ?? "—"} ({docContrast ? wcagLevel(docContrast) : "—"})
              </strong>
            </li>
            <li>
              Bleu sur craie :{" "}
              <strong className="text-msk-ink">
                {primaryOnChalk ?? "—"} (
                {primaryOnChalk ? wcagLevel(primaryOnChalk) : "—"})
              </strong>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              prefetch={false}
              href="/administration/charte/logos/nouveau"
              className="rounded-lg bg-msk-blue px-3 py-2 text-xs font-medium text-white"
            >
              Nouveau logo
            </Link>
            <Link
              prefetch={false}
              href="/administration/charte/couleurs/nouveau"
              className="rounded-lg border border-msk-ink/12 px-3 py-2 text-xs font-medium text-msk-ink"
            >
              Nouvelle couleur
            </Link>
          </div>
        </Surface>
      </div>

      <Surface className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-msk-ink">Logos</h3>
          <Link
            prefetch={false}
            href="/administration/charte/logos"
            className="text-sm font-medium text-msk-blue hover:underline"
          >
            Tout voir
          </Link>
        </div>
        {logoPreviews.length === 0 ? (
          <p className="text-sm text-msk-ink/45">
            Aucun logo — lancez le seed ou ajoutez-en un.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {logoPreviews.map((l) => (
              <Link
                key={l.id}
                prefetch={false}
                href={`/administration/charte/logos/${l.id}`}
                className="group overflow-hidden rounded-xl border border-msk-ink/8 transition hover:border-msk-blue/30"
              >
                <div className="relative flex h-24 items-center justify-center bg-msk-ink p-3">
                  {l.previewUrl ? (
                    <BrandImg
                      src={l.previewUrl}
                      alt={l.label}
                      className="max-h-16 w-auto"
                    />
                  ) : (
                    <span className="text-xs text-white/40">Sans aperçu</span>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <p className="text-sm font-medium text-msk-ink group-hover:text-msk-blue">
                    {l.label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={brandStatusTone(l.status)}>
                      {BRAND_STATUS_LABELS[l.status]}
                    </Badge>
                    <Badge tone="muted">
                      {BRAND_LOGO_KIND_LABELS[l.kind]}
                    </Badge>
                    {l.isDefaultDocuments ? (
                      <Badge tone="blue">Défaut docs</Badge>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Palette</h3>
            <Link
              prefetch={false}
              href="/administration/charte/couleurs"
              className="text-sm font-medium text-msk-blue hover:underline"
            >
              Gérer
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {colors.slice(0, 9).map((c) => (
              <Link
                key={c.id}
                prefetch={false}
                href={`/administration/charte/couleurs/${c.id}`}
                className="overflow-hidden rounded-lg border border-msk-ink/8"
              >
                <div className="h-12" style={{ backgroundColor: c.hex }} />
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium text-msk-ink">
                    {c.label}
                  </p>
                  <p className="font-mono text-[10px] text-msk-ink/45">
                    {c.hex}
                  </p>
                  <p className="text-[10px] text-msk-ink/35">
                    {BRAND_COLOR_CATEGORY_LABELS[c.category]}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Surface>

        <Surface className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Typographies</h3>
            <Link
              prefetch={false}
              href="/administration/charte/typographies"
              className="text-sm font-medium text-msk-blue hover:underline"
            >
              Gérer
            </Link>
          </div>
          <ul className="divide-y divide-msk-ink/6">
            {typos.map((t) => (
              <li key={t.id}>
                <Link
                  prefetch={false}
                  href={`/administration/charte/typographies/${t.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-msk-blue"
                >
                  <div>
                    <p className="text-sm font-medium">{t.familyName}</p>
                    <p className="text-xs text-msk-ink/45">
                      {BRAND_TYPO_ROLE_LABELS[t.role]}
                      {t.isDefaultErp ? " · défaut ERP" : ""}
                      {t.isDefaultPdf ? " · défaut PDF" : ""}
                      {t.files.length
                        ? ` · ${t.files.length} fichier(s)`
                        : " · stack système"}
                    </p>
                  </div>
                  <Badge tone={brandStatusTone(t.status)}>
                    {BRAND_STATUS_LABELS[t.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      </div>
    </PageShell>
  );
}
