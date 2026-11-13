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
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { brandLogoPreviewUrl } from "@/lib/brand/preview-url";
import {
  BRAND_LOGO_KIND_LABELS,
  BRAND_STATUS_LABELS,
  brandStatusTone,
} from "@/lib/brand/labels";
import { listKeyFromSearchParams } from "@/lib/list/sort";

export const metadata: Metadata = { title: "Charte — Logos" };

export default async function CharteLogosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const status = firstParam(raw.status) ?? "";
  const where: Prisma.BrandLogoWhereInput = {
    AND: [
      status
        ? { status: status as Prisma.EnumBrandItemStatusFilter["equals"] }
        : { status: { not: "ARCHIVED" } },
      q
        ? {
            OR: [
              { label: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.brandLogo.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const logos = await prisma.brandLogo.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });

  const items = await Promise.all(
    logos.map(async (l) => ({
      ...l,
      previewUrl: await brandLogoPreviewUrl(l),
    })),
  );

  const listParams = {
    q: q || undefined,
    status: status || undefined,
  };
  const resultsKey = listKeyFromSearchParams(raw);

  return (
    <PageShell>
      <PageHeader
        title="Logos"
        description="Déclinaisons logo — upload, activation, défaut documents / PDF."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Logos" },
        ]}
        actions={
          <Link
            prefetch={false}
            href="/administration/charte/logos/nouveau"
            className="inline-flex h-10 items-center rounded-lg bg-msk-blue px-4 text-sm font-medium text-white"
          >
            Nouveau logo
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3 pb-3">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Libellé, code…"
            className="sm:max-w-md"
          />
        </Suspense>
        <div className="flex flex-wrap gap-1.5">
          {[
            { v: "", label: "Courants" },
            { v: "ACTIVE", label: "Actifs" },
            { v: "INACTIVE", label: "Inactifs" },
            { v: "ARCHIVED", label: "Archivés" },
          ].map((f) => {
            const active = status === f.v || (!status && f.v === "");
            const href = `/administration/charte/logos?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(f.v ? { status: f.v } : {}),
            }).toString()}`;
            return (
              <Link
                key={f.label}
                prefetch={false}
                href={href}
                className={
                  active
                    ? "rounded-lg bg-msk-blue px-2.5 py-1.5 text-xs font-medium text-white"
                    : "rounded-lg border border-msk-ink/12 px-2.5 py-1.5 text-xs font-medium text-msk-ink/65"
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      <Suspense key={resultsKey} fallback={<div className="h-40 animate-pulse rounded-2xl bg-msk-chalk" />}>
        <Surface className="p-4 sm:p-5">
          {items.length === 0 ? (
            <p className="text-sm text-msk-ink/45">Aucun logo pour ce filtre.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((l) => (
                <Link
                  key={l.id}
                  prefetch={false}
                  href={`/administration/charte/logos/${l.id}`}
                  className="overflow-hidden rounded-xl border border-msk-ink/8 hover:border-msk-blue/30"
                >
                  <div className="relative flex h-28 items-center justify-center bg-msk-ink p-4">
                    {l.previewUrl ? (
                      <BrandImg
                        src={l.previewUrl}
                        alt=""
                        className="max-h-20 w-auto"
                      />
                    ) : (
                      <span className="text-xs text-white/40">Sans fichier</span>
                    )}
                  </div>
                  <div className="space-y-1.5 p-3">
                    <p className="font-medium text-msk-ink">{l.label}</p>
                    <p className="font-mono text-[10px] text-msk-ink/40">
                      {l.code}
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
          <div className="mt-4">
            <ListPagination
              page={page}
              totalPages={totalPages(total, pageSize)}
              total={total}
              pageSize={pageSize}
              pathname="/administration/charte/logos"
              searchParams={listParams}
            />
          </div>
        </Surface>
      </Suspense>
    </PageShell>
  );
}
