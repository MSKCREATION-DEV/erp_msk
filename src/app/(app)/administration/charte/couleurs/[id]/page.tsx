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

export const metadata: Metadata = { title: "Couleur charte" };

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
        <div className="flex flex-wrap items-stretch gap-0">
          <div
            className="min-h-28 w-full sm:w-40"
            style={{ backgroundColor: color.hex }}
          />
          <div className="flex-1 space-y-2 p-5">
            <div className="flex flex-wrap gap-2">
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
            <p className="font-mono text-lg font-semibold text-msk-ink">
              {color.hex}
            </p>
            <p className="font-mono text-xs text-msk-ink/45">{color.tokenKey}</p>
            {color.usageNotes ? (
              <p className="text-sm text-msk-ink/60">{color.usageNotes}</p>
            ) : null}
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
