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
  BRAND_STATUS_LABELS,
  BRAND_TYPO_ROLE_LABELS,
  brandStatusTone,
} from "@/lib/brand/labels";

export const metadata: Metadata = { title: "Charte — Typographies" };

export default async function CharteTypographiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.brand")) redirect("/accueil");

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const where: Prisma.BrandTypographyWhereInput = {
    status: { not: "ARCHIVED" },
    ...(q
      ? {
          OR: [
            { familyName: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.brandTypography.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const rows = await prisma.brandTypography.findMany({
    where,
    include: { _count: { select: { files: true } } },
    orderBy: [{ sortOrder: "asc" }, { familyName: "asc" }, { id: "asc" }],
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });

  return (
    <PageShell>
      <PageHeader
        title="Typographies"
        description="Familles, rôles ERP/PDF et fichiers de graisses."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Charte", href: "/administration/charte" },
          { label: "Typographies" },
        ]}
        actions={
          <Link
            prefetch={false}
            href="/administration/charte/typographies/nouveau"
            className="inline-flex h-10 items-center rounded-lg bg-msk-blue px-4 text-sm font-medium text-white"
          >
            Nouvelle typo
          </Link>
        }
      />

      <Suspense
        fallback={
          <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
        }
      >
        <ListSearchForm placeholder="Famille, code…" className="sm:max-w-md" />
      </Suspense>

      <Suspense key={listKeyFromSearchParams(raw)}>
        <Surface className="overflow-hidden p-0">
          {rows.length === 0 ? (
            <p className="p-5 text-sm text-msk-ink/45">Aucune typographie.</p>
          ) : (
            <ul className="divide-y divide-msk-ink/6">
              {rows.map((t) => (
                <li key={t.id}>
                  <Link
                    prefetch={false}
                    href={`/administration/charte/typographies/${t.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-msk-chalk/50"
                  >
                    <div>
                      <p
                        className="text-lg font-semibold text-msk-ink"
                        style={
                          t.cssStack
                            ? { fontFamily: t.cssStack }
                            : undefined
                        }
                      >
                        {t.familyName}
                      </p>
                      <p className="text-xs text-msk-ink/45">
                        {BRAND_TYPO_ROLE_LABELS[t.role]} ·{" "}
                        {t._count.files} fichier(s)
                        {t.isDefaultErp ? " · défaut ERP" : ""}
                        {t.isDefaultPdf ? " · défaut PDF" : ""}
                      </p>
                    </div>
                    <Badge tone={brandStatusTone(t.status)}>
                      {BRAND_STATUS_LABELS[t.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-msk-ink/6 px-5 py-3">
            <ListPagination
              page={page}
              totalPages={totalPages(total, pageSize)}
              total={total}
              pageSize={pageSize}
              pathname="/administration/charte/typographies"
              searchParams={{ q: q || undefined }}
            />
          </div>
        </Surface>
      </Suspense>
    </PageShell>
  );
}
