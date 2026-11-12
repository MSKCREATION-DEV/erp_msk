import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { SignatureStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { signedGedUrl } from "@/lib/ged/storage";
import { recleanActiveSignatures } from "@/lib/signatures/resolve";
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
import { Card, CardContent } from "@/components/ui/card";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { RevokeSignatureButton } from "@/components/admin/revoke-signature-button";
import { SignaturePreviewCard } from "@/components/admin/signature-preview";

export const metadata: Metadata = { title: "Signatures" };

export default async function AdminSignaturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.signatures")) redirect("/accueil");

  await recleanActiveSignatures(30).catch(() => null);

  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const where: Prisma.SignatureAssetWhereInput = q
    ? {
        OR: [
          { label: { contains: q, mode: "insensitive" } },
          { owner: { firstName: { contains: q, mode: "insensitive" } } },
          { owner: { lastName: { contains: q, mode: "insensitive" } } },
          { owner: { email: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  const pageSize = DEFAULT_PAGE_SIZE;
  const total = await prisma.signatureAsset.count({ where });
  const page = clampPage(parsePage(firstParam(raw.page)), total, pageSize);
  const signatures = await prisma.signatureAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { firstName: true, lastName: true, email: true } },
    },
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
  };

  const items = await Promise.all(
    signatures.map(async (s) => {
      let previewUrl: string | null = null;
      try {
        previewUrl = await signedGedUrl(
          s.storageCleaned ?? s.storageOriginal,
          3600,
        );
      } catch {
        previewUrl = null;
      }
      return {
        id: s.id,
        label: s.label,
        status: s.status,
        mime: s.mime,
        previewUrl,
        createdAt: s.createdAt.toISOString(),
        subtitle: s.owner
          ? `${s.owner.firstName} ${s.owner.lastName} · ${s.owner.email}`
          : s.orgOwned
            ? "Société"
            : null,
        canRevoke: s.status !== SignatureStatus.REVOKED,
      };
    }),
  );

  return (
    <PageShell>
      <PageHeader
        title="Signatures"
        description="Bibliothèque signatures — aperçu et révocation admin."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Signatures" },
        ]}
      />

      <div className="pb-3">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Libellé, propriétaire…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-msk-ink/40">
              {q
                ? `Aucune signature pour « ${q} ».`
                : "Aucune signature déposée."}
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <SignaturePreviewCard
                  key={item.id}
                  item={item}
                  actions={
                    item.canRevoke ? (
                      <RevokeSignatureButton signatureId={item.id} />
                    ) : null
                  }
                />
              ))}
            </ul>
          )}
          <ListPagination
            pathname="/administration/signatures"
            searchParams={listParams}
            page={page}
            totalPages={totalPages(total, pageSize)}
            total={total}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
