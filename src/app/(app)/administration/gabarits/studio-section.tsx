import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { firstParam } from "@/lib/list/search-params";
import { buildSortHref, type SortDir } from "@/lib/list/sort";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/ui/list-pagination";
import { GenerateDemoButton } from "@/components/admin/generate-demo-pdf";
import { TemplateCardActions } from "@/components/admin/template-card-actions";

const PAGE_PARAM = "spage";

/**
 * Bibliothèque Studio — gabarits `ENGINE_BLOCKS` (créés dans le Studio).
 * Recherche + tri + pagination serveur (règle `list-pagination-search`),
 * cartes cliquables + `ActionMenu` (règle `list-actions-commercial-ref`).
 */
export async function StudioTemplatesSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = (firstParam(raw.q) ?? "").trim();
  const sortKey = firstParam(raw.ssort) === "name" ? "name" : "updatedAt";
  const sortDir: SortDir = firstParam(raw.sdir) === "asc" ? "asc" : "desc";
  const requestedPage = parsePage(firstParam(raw[PAGE_PARAM]));
  const pageSize = DEFAULT_PAGE_SIZE;

  const where = {
    generatorKind: "ENGINE_BLOCKS" as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const total = await prisma.documentTemplate.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const templates = await prisma.documentTemplate.findMany({
    where,
    orderBy:
      sortKey === "name" ? { name: sortDir } : [{ updatedAt: sortDir }, { id: "asc" }],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      versions: {
        where: { status: "DRAFT" },
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, version: true },
      },
    },
  });
  const pages = totalPages(total, pageSize);
  const listParams: Record<string, string | undefined> = {
    q: q || undefined,
    ssort: sortKey,
    sdir: sortDir,
  };

  const sortHrefName = buildSortHref({
    pathname: "/administration/gabarits",
    searchParams: { q: q || undefined },
    column: "name",
    currentSort: sortKey,
    currentDir: sortDir,
    sortKey: "ssort",
    dirKey: "sdir",
    pageKey: PAGE_PARAM,
  });
  const sortHrefRecent = buildSortHref({
    pathname: "/administration/gabarits",
    searchParams: { q: q || undefined },
    column: "updatedAt",
    currentSort: sortKey,
    currentDir: sortDir,
    defaultDir: "desc",
    sortKey: "ssort",
    dirKey: "sdir",
    pageKey: PAGE_PARAM,
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-msk-ink/8 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-msk-ink">Studio</h2>
            <Badge tone="success">{total}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-msk-ink/50">
            Gabarits créés dans le Studio — blocs + variables, versionnés, publication explicite.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/administration/gabarits/variables"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink transition hover:bg-msk-chalk"
          >
            Catalogue variables
          </Link>
          <Link
            href="/administration/gabarits/nouveau"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-msk-blue px-4 text-sm font-medium text-white transition hover:bg-msk-blue/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau gabarit
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-msk-ink/45">
        <span>Trier par :</span>
        <Link
          href={sortHrefName}
          scroll={false}
          prefetch={false}
          className={
            sortKey === "name"
              ? "font-semibold text-msk-blue"
              : "hover:text-msk-ink"
          }
        >
          Nom {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </Link>
        <span aria-hidden>·</span>
        <Link
          href={sortHrefRecent}
          scroll={false}
          prefetch={false}
          className={
            sortKey === "updatedAt"
              ? "font-semibold text-msk-blue"
              : "hover:text-msk-ink"
          }
        >
          Dernière modif. {sortKey === "updatedAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </Link>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-msk-ink/10 bg-white px-5 py-8 text-center text-sm text-msk-ink/45">
          {q ? (
            <>Aucun gabarit Studio pour « {q} ».</>
          ) : (
            <>
              Aucun gabarit Studio.{" "}
              <Link href="/administration/gabarits/nouveau" className="font-medium text-msk-blue hover:underline">
                Créer le premier
              </Link>
            </>
          )}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const hasDraft = t.versions.length > 0;
            const isPublished = Boolean(t.publishedVersionId);
            return (
              <Card key={t.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle>
                        <Link
                          prefetch={false}
                          href={`/administration/gabarits/${t.id}`}
                          className="text-msk-blue hover:underline"
                        >
                          {t.name}
                        </Link>
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">{t.code}</CardDescription>
                    </div>
                    <TemplateCardActions
                      templateId={t.id}
                      active={t.active}
                      signatureEnabled={t.signatureEnabled}
                      hasDraft={hasDraft}
                      editHref={`/administration/gabarits/${t.id}/edit`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={t.active ? "success" : "muted"}>
                      {t.active ? "Actif" : "Inactif"}
                    </Badge>
                    <Badge tone={isPublished ? "blue" : "coral"}>
                      {isPublished ? "Publié" : "Non publié"}
                    </Badge>
                    {hasDraft ? <Badge tone="ink">Brouillon en attente</Badge> : null}
                    <Badge tone={t.signatureEnabled ? "success" : "muted"}>
                      {t.signatureEnabled ? "Signature ON" : "Signature OFF"}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-msk-ink/55">
                    {t.description ?? "—"}
                  </p>
                  <div className="flex items-center justify-between gap-2 border-t border-msk-ink/6 pt-3">
                    <Link
                      prefetch={false}
                      href={`/administration/gabarits/${t.id}`}
                      className="text-xs font-medium text-msk-blue hover:underline"
                    >
                      Voir la fiche →
                    </Link>
                    {isPublished ? <GenerateDemoButton templateId={t.id} compact /> : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ListPagination
        pathname="/administration/gabarits"
        searchParams={listParams}
        page={page}
        totalPages={pages}
        total={total}
        pageSize={pageSize}
        pageParam={PAGE_PARAM}
      />
    </section>
  );
}
