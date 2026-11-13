import type { Metadata } from "next";
import Link from "next/link";
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
import {
  BRAND_COLOR_CATEGORY_LABELS,
  BRAND_STATUS_LABELS,
  brandStatusTone,
} from "@/lib/brand/labels";

export const metadata: Metadata = { title: "Charte — Couleurs" };

export default async function CharteCouleursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const where: Prisma.BrandColorWhereInput = {
    status: { not: "ARCHIVED" },
    ...(q
      ? {
          OR: [
            { label: { contains: q, mode: "insensitive" } },
            { tokenKey: { contains: q, mode: "insensitive" } },
            { hex: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.brandColor.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const colors = await prisma.brandColor.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { tokenKey: "asc" }, { id: "asc" }],
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });

  return (
    <PageShell>
      <PageHeader
        title="Couleurs"
        description="Palette et tokens — référence MSK protégée ; sync CSS runtime."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Couleurs" },
        ]}
        actions={
          <Link
            prefetch={false}
            href="/administration/charte/couleurs/nouveau"
            className="inline-flex h-10 items-center rounded-lg bg-msk-blue px-4 text-sm font-medium text-white"
          >
            Nouvelle couleur
          </Link>
        }
      />

      <Suspense
        fallback={
          <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
        }
      >
        <ListSearchForm placeholder="Token, libellé, HEX…" className="sm:max-w-md" />
      </Suspense>

      <Suspense
        key={listKeyFromSearchParams(raw)}
        fallback={<div className="h-40 animate-pulse rounded-2xl bg-msk-chalk" />}
      >
        <Surface className="p-4 sm:p-5">
          {colors.length === 0 ? (
            <p className="text-sm text-msk-ink/45">Aucune couleur.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {colors.map((c) => (
                <Link
                  key={c.id}
                  prefetch={false}
                  href={`/administration/charte/couleurs/${c.id}`}
                  className="overflow-hidden rounded-xl border border-msk-ink/8 hover:border-msk-blue/30"
                >
                  <div className="h-16" style={{ backgroundColor: c.hex }} />
                  <div className="space-y-1 p-3">
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="font-mono text-xs text-msk-ink/50">{c.hex}</p>
                    <p className="font-mono text-[10px] text-msk-ink/35">
                      {c.tokenKey}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <Badge tone={brandStatusTone(c.status)}>
                        {BRAND_STATUS_LABELS[c.status]}
                      </Badge>
                      <Badge tone="muted">
                        {BRAND_COLOR_CATEGORY_LABELS[c.category]}
                      </Badge>
                      {c.isReference ? (
                        <Badge tone="blue">Référence</Badge>
                      ) : null}
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
              pathname="/administration/charte/couleurs"
              searchParams={{ q: q || undefined }}
            />
          </div>
        </Surface>
      </Suspense>
    </PageShell>
  );
}
