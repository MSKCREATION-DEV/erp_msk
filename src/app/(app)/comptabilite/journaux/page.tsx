import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
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
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { ListPagination } from "@/components/ui/list-pagination";

export const metadata: Metadata = { title: "Journaux" };

const JOURNAL_SORT_COLUMNS = {
  code: (dir: SortDir) => ({ code: dir }),
  label: (dir: SortDir) => ({ label: dir }),
  entries: (dir: SortDir) => ({ entries: { _count: dir } }),
  active: (dir: SortDir) => ({ active: dir }),
  sortOrder: (dir: SortDir) => ({ sortOrder: dir }),
} satisfies SortColumnMap<
  "code" | "label" | "entries" | "active" | "sortOrder"
>;

export default async function ComptabiliteJournauxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.access")) redirect("/accueil");

  const raw = await searchParams;
  const sp: Record<string, string | undefined> = {
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
    page: firstParam(raw.page),
  };
  const sort = parseListSort(sp, JOURNAL_SORT_COLUMNS, {
    key: "sortOrder",
    dir: "asc",
  });
  const pageSize = DEFAULT_PAGE_SIZE;
  const requestedPage = parsePage(sp.page);
  const listParams: Record<string, string | undefined> = {
    sort: sort.key,
    dir: sort.dir,
  };

  const total = await prisma.cptJournal.count();
  const page = clampPage(requestedPage, total, pageSize);
  const journals = await prisma.cptJournal.findMany({
    orderBy: sort.orderBy as Prisma.CptJournalOrderByWithRelationInput,
    include: { _count: { select: { entries: true } } },
    skip: pageSkip(page, pageSize),
    take: pageSize,
  });

  const canCreate = hasPermission(user, "cpt.ecritures.manage");

  return (
    <PageShell>
      <PageHeader
        title="Journaux"
        description="Achats, ventes, banque, caisse, OD, paie, mobile money."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Journaux" },
        ]}
      />

      <Surface className="overflow-x-auto">
        <table className="w-full min-w-140 text-left text-sm">
          <thead className="border-b border-msk-ink/10 text-msk-ink/45">
            <tr>
              <SortableTh
                label="Code"
                column="code"
                sort={sort.key}
                dir={sort.dir}
                pathname="/comptabilite/journaux"
                searchParams={listParams}
              />
              <SortableTh
                label="Libellé"
                column="label"
                sort={sort.key}
                dir={sort.dir}
                pathname="/comptabilite/journaux"
                searchParams={listParams}
              />
              <SortableTh
                label="Écritures"
                column="entries"
                sort={sort.key}
                dir={sort.dir}
                pathname="/comptabilite/journaux"
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Statut"
                column="active"
                sort={sort.key}
                dir={sort.dir}
                pathname="/comptabilite/journaux"
                searchParams={listParams}
              />
              <PlainTh />
            </tr>
          </thead>
          <tbody>
            {journals.map((j) => (
              <tr
                key={j.id}
                className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
              >
                <td className="px-4 py-3 font-medium text-msk-ink">{j.code}</td>
                <td className="px-4 py-3">{j.label}</td>
                <td className="px-4 py-3">{j._count.entries}</td>
                <td className="px-4 py-3">
                  {j.active ? (
                    <Badge tone="success">Actif</Badge>
                  ) : (
                    <Badge tone="muted">Inactif</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    prefetch={false}
                    href={`/comptabilite/ecritures?journalId=${j.id}`}
                    className="font-medium text-msk-blue hover:underline"
                  >
                    Voir les écritures
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 0 ? (
          <ListPagination
            pathname="/comptabilite/journaux"
            searchParams={listParams}
            page={page}
            totalPages={totalPages(total, pageSize)}
            total={total}
            pageSize={pageSize}
          />
        ) : null}
      </Surface>

      {canCreate ? (
        <p className="text-sm text-msk-ink/55">
          Pour saisir une écriture, allez dans{" "}
          <Link
            prefetch={false}
            href="/comptabilite/ecritures/nouveau"
            className="font-medium text-msk-blue hover:underline"
          >
            Écritures → Nouveau
          </Link>
          .
        </p>
      ) : null}
    </PageShell>
  );
}
