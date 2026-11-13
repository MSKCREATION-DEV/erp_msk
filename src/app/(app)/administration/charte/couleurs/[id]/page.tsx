import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ColorEditForm } from "@/components/admin/charte/color-forms";
import {
  BRAND_COLOR_CATEGORY_LABELS,
  BRAND_STATUS_LABELS,
  brandStatusTone,
} from "@/lib/brand/labels";
import { contrastRatio, wcagLevel } from "@/lib/brand/colors";

export const metadata: Metadata = { title: "Couleur charte" };

const CONTRAST_SURFACES: { label: string; hex: string }[] = [
  { label: "Sur blanc", hex: "#FFFFFF" },
  { label: "Sur craie", hex: "#F5F3EF" },
  { label: "Sur encre", hex: "#0D1330" },
];

export default async function CouleurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");
  const { id } = await params;
  const color = await prisma.brandColor.findUnique({ where: { id } });
  if (!color) notFound();

  return (
    <PageShell>
      <PageHeader
        title={color.label}
        description={`Token ${color.tokenKey}`}
        backHref="/administration/charte/couleurs"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Couleurs", href: "/administration/charte/couleurs" },
          { label: color.label },
        ]}
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 bg-gradient-to-br from-msk-blue/6 via-white to-msk-chalk/80 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-msk-ink">
                  {color.label}
                </h1>
                <Badge tone={brandStatusTone(color.status)}>
                  {BRAND_STATUS_LABELS[color.status]}
                </Badge>
                <Badge tone="muted">
                  {BRAND_COLOR_CATEGORY_LABELS[color.category]}
                </Badge>
                {color.isReference ? (
                  <Badge tone="blue">Référence MSK</Badge>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-msk-ink/45">
                {color.hex} · {color.tokenKey}
              </p>
              {color.usageNotes ? (
                <p className="mt-1 text-sm text-msk-ink/60">
                  {color.usageNotes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex h-24 items-center justify-center rounded-xl border border-msk-ink/8">
            <div
              className="h-full w-full rounded-xl"
              style={{ backgroundColor: color.hex }}
            />
          </div>

          <div className="mt-4 border-t border-msk-ink/6 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-caps text-msk-ink/40">
              Contraste WCAG (texte sur fond)
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {CONTRAST_SURFACES.map((s) => {
                const ratio = contrastRatio(color.hex, s.hex);
                const level = ratio != null ? wcagLevel(ratio) : "fail";
                return (
                  <div
                    key={s.label}
                    className="rounded-lg border border-msk-ink/8 p-2.5"
                    style={{ backgroundColor: s.hex, color: color.hex }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: s.hex === "#0D1330" ? "#fff" : undefined }}
                    >
                      {s.label}
                    </p>
                    <p
                      className="mt-0.5 text-[11px] opacity-90"
                      style={{ color: s.hex === "#0D1330" ? "#fff" : undefined }}
                    >
                      {ratio ?? "—"} ·{" "}
                      {level === "fail"
                        ? "insuffisant pour du texte"
                        : `conforme ${level} texte`}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-msk-ink/40">
              « Insuffisant » signifie que la couleur ne doit pas servir de
              texte fin sur ce fond — elle reste utilisable en bouton,
              surface, icône ou texte large/gras selon le contexte.
            </p>
          </div>
        </div>
      </Surface>

      <Surface className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold">Modifier</h2>
        <ColorEditForm
          id={color.id}
          label={color.label}
          hex={color.hex}
          category={color.category}
          usageNotes={color.usageNotes}
          status={color.status}
          isReference={color.isReference}
        />
      </Surface>
    </PageShell>
  );
}
