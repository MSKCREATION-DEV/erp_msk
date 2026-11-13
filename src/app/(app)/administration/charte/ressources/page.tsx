import type { Metadata } from "next";
import Link from "next/link";
import { BrandImg } from "@/components/admin/charte/brand-img";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/list/search-params";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { listKeyFromSearchParams } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { brandResourcePreviewUrl } from "@/lib/brand/preview-url";
import {
  BRAND_RESOURCE_KIND_LABELS,
  BRAND_STATUS_LABELS,
  brandStatusTone,
} from "@/lib/brand/labels";

export const metadata: Metadata = { title: "Charte — Ressources" };

export default async function CharteRessourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const where: Prisma.BrandResourceWhereInput = {
    status: { not: "ARCHIVED" },
    ...(q
      ? {
          OR: [
            { label: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.brandResource.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const rows = await prisma.brandResource.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });

  const items = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      previewUrl: await brandResourcePreviewUrl(r),
    })),
  );

  return (
    <PageShell>
      <PageHeader
        title="Autres ressources"
        description="Icônes, pictos, illustrations, motifs, fonds…"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Ressources" },
        ]}
        actions={
          <Link
            prefetch={false}
            href="/administration/charte/ressources/nouveau"
            className="inline-flex h-10 items-center rounded-lg bg-msk-blue px-4 text-sm font-medium text-white"
          >
            Nouvelle ressource
          </Link>
        }
      />

      <Suspense
        fallback={
          <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
        }
      >
        <ListSearchForm placeholder="Libellé, code…" className="sm:max-w-md" />
      </Suspense>

      <Suspense key={listKeyFromSearchParams(raw)}>
        <Surface className="p-4 sm:p-5">
          {items.length === 0 ? (
            <p className="text-sm text-msk-ink/45">
              Aucune ressource — ajoutez icônes, motifs ou fonds.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <Link
                  key={r.id}
                  prefetch={false}
                  href={`/administration/charte/ressources/${r.id}`}
                  className="overflow-hidden rounded-xl border border-msk-ink/8 hover:border-msk-blue/30"
                >
                  <div className="flex h-28 items-center justify-center bg-msk-chalk p-3">
                    {r.previewUrl ? (
                      <BrandImg
                        src={r.previewUrl}
                        alt=""
                        className="max-h-20 w-auto"
                      />
                    ) : (
                      <span className="text-xs text-msk-ink/35">Sans aperçu</span>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="text-sm font-medium">{r.label}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={brandStatusTone(r.status)}>
                        {BRAND_STATUS_LABELS[r.status]}
                      </Badge>
                      <Badge tone="muted">
                        {BRAND_RESOURCE_KIND_LABELS[r.kind]}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-4">
            <ListPagination
              page={page}
              totalPages={totalPages(total, pageSize)}
              total={total}
              pageSize={pageSize}
              pathname="/administration/charte/ressources"
              searchParams={{ q: q || undefined }}
            />
          </div>
        </Surface>
      </Suspense>
    </PageShell>
  );
}
