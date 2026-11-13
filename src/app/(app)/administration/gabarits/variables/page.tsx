import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { firstParam } from "@/lib/list/search-params";
import {
  listKeyFromSearchParams,
  parseListSort,
  type SortColumnMap,
  type SortDir,
} from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { SortableTh } from "@/components/ui/sortable-th";

export const metadata: Metadata = { title: "Variables du Studio" };

const CATEGORY_LABEL: Record<string, string> = {
  CLIENT: "Client",
  ENTREPRISE: "Entreprise",
  DOCUMENT: "Document",
  COLLABORATEUR: "Collaborateur",
  DIVERS: "Divers",
};

const VAR_SORT_COLUMNS = {
  slug: (dir: SortDir) => ({ slug: dir }),
  category: (dir: SortDir) => ({ category: dir }),
  createdAt: (dir: SortDir) => ({ createdAt: dir }),
} satisfies SortColumnMap<"slug" | "category" | "createdAt">;

export default async function TemplateVariablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cfg.templates")) redirect("/accueil");

  const resultsKey = listKeyFromSearchParams(await searchParams, [
    "q",
    "sort",
    "dir",
    "page",
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Variables du Studio"
        description="Catalogue central des variables {{slug}} disponibles dans tous les gabarits."
        backHref="/administration/gabarits"
        backLabel="Retour aux gabarits"
        breadcrumbs={[
          { label: "Administration" },
          { label: "Gabarits", href: "/administration/gabarits" },
          { label: "Variables" },
        ]}
        actions={
          <Link
            href="/administration/gabarits/variables/nouveau"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-msk-blue px-3 text-sm font-medium text-white transition hover:bg-msk-blue/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle variable
          </Link>
        }
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <Suspense
            fallback={<div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />}
          >
            <ListSearchForm placeholder="Slug ou libellé…" className="sm:max-w-md" />
          </Suspense>
        </div>
        <Suspense key={resultsKey} fallback={<ListTableSkeleton rows={8} cols={4} />}>
          <VariablesResults searchParams={searchParams} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function VariablesResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const requestedPage = parsePage(firstParam(raw.page));
  const pageSize = DEFAULT_PAGE_SIZE;
  const sp: Record<string, string | undefined> = {
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, VAR_SORT_COLUMNS, { key: "slug", dir: "asc" });

  const where = q
    ? {
        OR: [
          { slug: { contains: q, mode: "insensitive" as const } },
          { label: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const total = await prisma.templateVariableDef.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const variables = await prisma.templateVariableDef.findMany({
    where,
    orderBy: sort.orderBy as never,
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });
  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    sort: sort.key,
    dir: sort.dir,
  };

  if (variables.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-msk-ink/50">
        {q ? (
          <>Aucune variable pour « {q} ».</>
        ) : (
          <>
            Aucune variable au catalogue.{" "}
            <Link
              prefetch={false}
              href="/administration/gabarits/variables/nouveau"
              className="font-medium text-msk-blue hover:underline"
            >
              Créer la première
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <ListTableScroll>
        <table className="w-full min-w-150 text-left text-sm">
          <thead className="border-b border-msk-ink/10 bg-msk-chalk/40 text-msk-ink/45">
            <tr>
              <SortableTh
                label="Slug"
                column="slug"
                sort={sort.key}
                dir={sort.dir}
                pathname="/administration/gabarits/variables"
                searchParams={listParams}
              />
              <SortableTh
                label="Catégorie"
                column="category"
                sort={sort.key}
                dir={sort.dir}
                pathname="/administration/gabarits/variables"
                searchParams={listParams}
              />
              <th className="px-4 py-3 font-medium">Libellé / exemple</th>
              <SortableTh
                label="Ajoutée le"
                column="createdAt"
                sort={sort.key}
                dir={sort.dir}
                pathname="/administration/gabarits/variables"
                searchParams={listParams}
                defaultDir="desc"
              />
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => (
              <tr key={v.id} className="border-b border-msk-ink/5">
                <td className="px-4 py-3 font-mono text-xs text-msk-ink">{`{{${v.slug}}}`}</td>
                <td className="px-4 py-3">
                  <Badge tone="ink">{CATEGORY_LABEL[v.category] ?? v.category}</Badge>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-msk-ink">{v.label}</p>
                  {v.sampleValue ? (
                    <p className="text-xs text-msk-ink/45">Exemple : {v.sampleValue}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-msk-ink/50">
                  {v.createdAt.toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListTableScroll>
      <div className="px-4 py-3">
        <ListPagination
          pathname="/administration/gabarits/variables"
          searchParams={listParams}
          page={page}
          totalPages={pages}
          total={total}
          pageSize={pageSize}
        />
      </div>
    </>
  );
}
