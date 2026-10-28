import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/list/search-params";
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { SortableTh, PlainTh } from "@/components/ui/sortable-th";
import { formatXof } from "@/lib/comptabilite/money";
import { ENTRY_STATUS_LABEL } from "@/lib/comptabilite/labels";

export const metadata: Metadata = { title: "Écritures" };

const ENTRY_SORT_COLUMNS = {
  number: (dir: SortDir) => ({ number: dir }),
  entryDate: (dir: SortDir) => ({ entryDate: dir }),
  journal: (dir: SortDir) => ({ journal: { code: dir } }),
  label: (dir: SortDir) => ({ label: dir }),
  status: (dir: SortDir) => ({ status: dir }),
} satisfies SortColumnMap<
  "number" | "entryDate" | "journal" | "label" | "status"
>;

export default async function ComptabiliteEcrituresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.access")) redirect("/accueil");

  const raw = await searchParams;
  const journalId = firstParam(raw.journalId);
  const status = firstParam(raw.status);
  const sp: Record<string, string | undefined> = {
    journalId: journalId || undefined,
    status: status || undefined,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, ENTRY_SORT_COLUMNS, {
    key: "entryDate",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    ...sp,
    sort: sort.key,
    dir: sort.dir,
  };

  const entries = await prisma.cptEntry.findMany({
    where: {
      ...(journalId ? { journalId } : {}),
      ...(status === "DRAFT" || status === "VALIDATED" ? { status } : {}),
    },
    orderBy: sort.orderBy as Prisma.CptEntryOrderByWithRelationInput,
    take: 200,
    include: {
      journal: { select: { code: true } },
      lines: { select: { debit: true } },
    },
  });

  const canCreate = hasPermission(user, "cpt.ecritures.manage");

  return (
    <PageShell>
      <PageHeader
        title="Écritures"
        description="Saisie, brouillons et écritures validées."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Écritures" },
        ]}
        actions={
          canCreate ? (
            <Link prefetch={false}
              href="/comptabilite/ecritures/nouveau"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Nouvelle écriture
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          prefetch={false}
          href={
            listParams.sort
              ? `/comptabilite/ecritures?sort=${listParams.sort}&dir=${listParams.dir}`
              : "/comptabilite/ecritures"
          }
          className={`rounded-lg px-3 py-1.5 ${!status ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
        >
          Toutes
        </Link>
        <Link
          prefetch={false}
          href={`/comptabilite/ecritures?status=DRAFT&sort=${sort.key}&dir=${sort.dir}`}
          className={`rounded-lg px-3 py-1.5 ${status === "DRAFT" ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
        >
          Brouillons
        </Link>
        <Link
          prefetch={false}
          href={`/comptabilite/ecritures?status=VALIDATED&sort=${sort.key}&dir=${sort.dir}`}
          className={`rounded-lg px-3 py-1.5 ${status === "VALIDATED" ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
        >
          Validées
        </Link>
      </div>

      {entries.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucune écriture pour ce filtre.
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <SortableTh
                  label="N° pièce"
                  column="number"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/comptabilite/ecritures"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Date"
                  column="entryDate"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/comptabilite/ecritures"
                  searchParams={listParams}
                  defaultDir="desc"
                />
                <SortableTh
                  label="Journal"
                  column="journal"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/comptabilite/ecritures"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Libellé"
                  column="label"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/comptabilite/ecritures"
                  searchParams={listParams}
                />
                <PlainTh>Montant</PlainTh>
                <SortableTh
                  label="Statut"
                  column="status"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/comptabilite/ecritures"
                  searchParams={listParams}
                />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const total = e.lines.reduce((s, l) => s + l.debit, 0);
                return (
                  <tr
                    key={e.id}
                    className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
                  >
                    <td className="px-4 py-3">
                      <Link prefetch={false}
                        href={`/comptabilite/ecritures/${e.id}`}
                        className="font-medium text-msk-blue hover:underline"
                      >
                        {e.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-msk-ink/70">
                      {e.entryDate.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="muted">{e.journal.code}</Badge>
                    </td>
                    <td className="px-4 py-3">{e.label}</td>
                    <td className="px-4 py-3">{formatXof(total)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={e.status === "VALIDATED" ? "success" : "ink"}>
                        {ENTRY_STATUS_LABEL[e.status]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Surface>
      )}
    </PageShell>
  );
}
