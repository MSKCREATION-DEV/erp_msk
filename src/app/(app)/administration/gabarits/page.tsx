import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FileStack } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  COMMERCIAL_TEMPLATE_ORDER,
  RH_TEMPLATE_ORDER,
} from "@/lib/templates/labels";
import { listKeyFromSearchParams } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { TemplateStudioSidebar } from "@/components/admin/template-studio-sidebar";
import { StudioTemplatesSection } from "./studio-section";

export const metadata: Metadata = { title: "Studio documentaire" };

export default async function GabaritsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  const totalCount = await prisma.documentTemplate.count({
    where: {
      OR: [
        { type: { in: [...COMMERCIAL_TEMPLATE_ORDER, ...RH_TEMPLATE_ORDER] } },
        { type: "DOCUMENT_LIBRE", generatorKind: "ENGINE_BLOCKS" },
      ],
    },
  });

  const sp = await searchParams;
  const resultsKey = listKeyFromSearchParams(sp, [
    "q",
    "ssort",
    "sdir",
    "spage",
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Studio documentaire"
        description="Bibliothèque centrale des gabarits PDF — dossiers Commercial, RH et Studio."
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits" },
        ]}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-msk-ink/8 bg-white px-3.5 py-2 shadow-sm">
            <FileStack className="h-4 w-4 text-msk-blue" aria-hidden />
            <div className="text-right leading-tight">
              <p className="text-lg font-semibold tabular-nums text-msk-ink">
                {totalCount}
              </p>
              <p className="text-[11px] text-msk-ink/45">
                document{totalCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-md animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Rechercher un gabarit (nom, code…)"
            className="w-full sm:max-w-md"
          />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 space-y-4 lg:col-span-8 xl:col-span-9">
          <Suspense key={resultsKey} fallback={<ListTableSkeleton rows={8} cols={4} />}>
            <StudioTemplatesSection searchParams={searchParams} />
          </Suspense>
        </div>
        <div className="lg:col-span-4 xl:col-span-3">
          <TemplateStudioSidebar />
        </div>
      </div>
    </PageShell>
  );
}
