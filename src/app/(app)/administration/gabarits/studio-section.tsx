import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { runSeries } from "@/lib/db/serial";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import { firstParam } from "@/lib/list/search-params";
import { buildSortHref, type SortDir } from "@/lib/list/sort";
import {
  COMMERCIAL_TEMPLATE_ORDER,
  RH_TEMPLATE_ORDER,
  TEMPLATE_FAMILY,
  TEMPLATE_TYPE_LABEL,
  TEMPLATE_TYPE_TONE,
  sortTemplatesByFamilyOrder,
  type TemplateFamily,
} from "@/lib/templates/labels";
import { computeTemplateListMeta } from "@/lib/templates/list-meta";
import { ListPagination } from "@/components/ui/list-pagination";
import { TemplateFolderGroup } from "@/components/admin/template-folder-group";
import { TemplateLibraryRow } from "@/components/admin/template-library-row";
import type { TemplateType } from "@/generated/prisma/client";

const PAGE_PARAM = "spage";

const FOLDER_SECTIONS: {
  family: TemplateFamily;
  title: string;
  hint: string;
  order: TemplateType[];
  headingTone: "blue" | "ink";
}[] = [
  {
    family: "Commercial",
    title: "Commercial",
    hint: "Devis, facture et contrat client (agence → client).",
    order: COMMERCIAL_TEMPLATE_ORDER,
    headingTone: "blue",
  },
  {
    family: "RH",
    title: "RH",
    hint: "Contrats collaborateurs / stage / prestataire, attestations et paie.",
    order: RH_TEMPLATE_ORDER,
    headingTone: "ink",
  },
];

function formatFrDate(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Bibliothèque Studio documentaire — dossiers (Commercial / RH / Studio)
 * + lignes denses + recherche / tri / pagination Studio.
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

  const legacyTypes = [...COMMERCIAL_TEMPLATE_ORDER, ...RH_TEMPLATE_ORDER];
  const qFilter = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { code: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const studioWhere = {
    generatorKind: "ENGINE_BLOCKS" as const,
    type: "DOCUMENT_LIBRE" as const,
    ...qFilter,
  };

  const templateSelect = {
    id: true,
    name: true,
    code: true,
    type: true,
    version: true,
    active: true,
    generatorKind: true,
    signatureEnabled: true,
    publishedVersionId: true,
    description: true,
    structureJson: true,
    createdAt: true,
    updatedAt: true,
    publishedVersion: {
      select: { bodyJson: true, variablesJson: true },
    },
    versions: {
      where: { status: "DRAFT" as const },
      orderBy: { version: "desc" as const },
      take: 1,
      select: { id: true },
    },
  };

  const [legacyTemplates, studioTotal] = await runSeries([
    () =>
      prisma.documentTemplate.findMany({
        where: { type: { in: legacyTypes }, ...qFilter },
        select: templateSelect,
      }),
    () => prisma.documentTemplate.count({ where: studioWhere }),
  ]);

  const page = clampPage(requestedPage, studioTotal, pageSize);
  const studioTemplates = await prisma.documentTemplate.findMany({
    where: studioWhere,
    orderBy:
      sortKey === "name"
        ? { name: sortDir }
        : [{ updatedAt: sortDir }, { id: "asc" }],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    select: templateSelect,
  });

  const pages = totalPages(studioTotal, pageSize);
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

  const totalVisible = legacyTemplates.length + studioTotal;

  return (
    <div className="space-y-6">
      <p className="text-xs text-msk-ink/45">
        {totalVisible === 0
          ? q
            ? `Aucun gabarit pour « ${q} ».`
            : "Aucun gabarit."
          : `${totalVisible} document${totalVisible > 1 ? "s" : ""} — dossiers Commercial, RH et Studio.`}
      </p>

      {FOLDER_SECTIONS.map((section) => {
        const items = sortTemplatesByFamilyOrder(
          legacyTemplates.filter(
            (t) => TEMPLATE_FAMILY[t.type] === section.family,
          ),
          section.order,
        );

        return (
          <TemplateFolderGroup
            key={section.family}
            title={section.title}
            hint={section.hint}
            count={items.length}
            tone={section.headingTone}
            empty={
              q ? (
                <>Aucun gabarit {section.family} pour « {q} ».</>
              ) : (
                <>Aucun gabarit {section.family} — relancer le seed.</>
              )
            }
          >
            {items.map((t) => {
              const meta = computeTemplateListMeta({
                generatorKind: t.generatorKind,
                structureJson: t.structureJson,
                publishedVersion: t.publishedVersion,
              });
              const isPublished = Boolean(t.publishedVersionId);
              const hasDraft = t.versions.length > 0;
              return (
                <TemplateLibraryRow
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  code={`${t.code} · v${t.version}`}
                  active={t.active}
                  generatorKind={t.generatorKind}
                  signatureEnabled={t.signatureEnabled}
                  published={isPublished}
                  hasDraft={hasDraft}
                  typeLabel={TEMPLATE_TYPE_LABEL[t.type]}
                  typeTone={TEMPLATE_TYPE_TONE[t.type]}
                  meta={meta}
                  dateLabel={formatFrDate(t.createdAt)}
                  editHref={
                    t.generatorKind === "ENGINE_BLOCKS"
                      ? `/administration/gabarits/${t.id}/edit`
                      : undefined
                  }
                />
              );
            })}
          </TemplateFolderGroup>
        );
      })}

      <TemplateFolderGroup
        title="Studio"
        hint="Gabarits libres créés dans le Studio — blocs + variables, versionnés."
        count={studioTotal}
        tone="success"
        empty={
          q ? (
            <>Aucun gabarit Studio pour « {q} ».</>
          ) : (
            <>
              Aucun gabarit Studio.{" "}
              <Link
                href="/administration/gabarits/nouveau"
                className="font-medium text-msk-blue hover:underline"
              >
                Créer le premier
              </Link>
            </>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-msk-ink/6 bg-white px-4 py-2 text-xs text-msk-ink/45">
          <span>Trier :</span>
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
            Dernière modif.{" "}
            {sortKey === "updatedAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </Link>
        </div>
        {studioTemplates.map((t) => {
          const meta = computeTemplateListMeta({
            generatorKind: "ENGINE_BLOCKS",
            structureJson: t.structureJson,
            publishedVersion: t.publishedVersion,
          });
          const isPublished = Boolean(t.publishedVersionId);
          const hasDraft = t.versions.length > 0;
          return (
            <TemplateLibraryRow
              key={t.id}
              id={t.id}
              name={t.name}
              code={t.code}
              active={t.active}
              generatorKind="ENGINE_BLOCKS"
              signatureEnabled={t.signatureEnabled}
              published={isPublished}
              hasDraft={hasDraft}
              typeLabel={TEMPLATE_TYPE_LABEL.DOCUMENT_LIBRE}
              typeTone={TEMPLATE_TYPE_TONE.DOCUMENT_LIBRE}
              meta={meta}
              dateLabel={formatFrDate(t.updatedAt)}
              editHref={`/administration/gabarits/${t.id}/edit`}
            />
          );
        })}
      </TemplateFolderGroup>

      {studioTotal > 0 ? (
        <ListPagination
          pathname="/administration/gabarits"
          searchParams={listParams}
          page={page}
          totalPages={pages}
          total={studioTotal}
          pageSize={pageSize}
          pageParam={PAGE_PARAM}
        />
      ) : null}

      {totalVisible === 0 && !q ? (
        <p className="rounded-2xl border border-dashed border-msk-ink/10 bg-white px-5 py-8 text-center text-sm text-msk-ink/45">
          Aucun gabarit — relancer le seed (
          <code className="text-xs">npm run db:seed</code>).
        </p>
      ) : null}
    </div>
  );
}
