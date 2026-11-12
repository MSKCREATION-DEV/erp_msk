import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comContractScopeWhere } from "@/lib/commercial/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { formatComMoney } from "@/lib/commercial/labels";
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageSkip,
  parsePage,
  totalPages,
} from "@/lib/list/pagination";
import {
  listKey,
  parseListSort,
  type SortColumnMap,
  type SortDir,
} from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh } from "@/components/ui/sortable-th";

export const metadata: Metadata = { title: "Contrats" };

const STATUS_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  RESILIE: "Résilié",
  TERMINE: "Terminé",
};

const CONTRACT_SORT_COLUMNS = {
  reference: (dir: SortDir) => ({ reference: dir }),
  client: (dir: SortDir) => ({ client: { name: dir } }),
  status: (dir: SortDir) => ({ status: dir }),
  lines: (dir: SortDir) => ({ lines: { _count: dir } }),
  invoices: (dir: SortDir) => ({ invoices: { _count: dir } }),
  updatedAt: (dir: SortDir) => ({ updatedAt: dir }),
} satisfies SortColumnMap<
  "reference" | "client" | "status" | "lines" | "invoices" | "updatedAt"
>;

const PATHNAME = "/commercial/contrats";

export default async function ContratsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.contrats.manage") &&
    !hasPermission(user, "com.access")
  ) {
    redirect("/commercial");
  }

  const sp = await searchParams;

  return (
    <PageShell>
      <PageHeader
        title="Contrats"
        description="Engagements clients — snapshots de tarifs, facturation récurrente."
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Contrats" },
        ]}
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-msk-ink/6 px-4 py-3">
          <ListSearchForm
            placeholder="Référence, titre, client…"
            className="sm:max-w-md"
          />
        </div>
        <Suspense
          key={listKey(sp) || "contrats"}
          fallback={<ListTableSkeleton rows={8} cols={6} />}
        >
          <ContratsResults searchParams={searchParams} />
        </Suspense>
      </Surface>
    </PageShell>
  );
}

async function ContratsResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const sort = parseListSort(sp, CONTRACT_SORT_COLUMNS, {
    key: "updatedAt",
    dir: "desc",
  });
  const requestedPage = parsePage(sp.page);
  const pageSize = DEFAULT_PAGE_SIZE;

  const teamIds = await commercialTeamUserIds();
  const memberIds = Array.from(new Set([user.id, ...teamIds]));
  const scope = comContractScopeWhere(user, memberIds);
  const where: Prisma.ComContractWhereInput = {
    ...scope,
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { client: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const total = await prisma.comContract.count({ where });
  const page = clampPage(requestedPage, total, pageSize);
  const contracts = await prisma.comContract.findMany({
    where,
    orderBy: sort.orderBy as Prisma.ComContractOrderByWithRelationInput[],
    skip: pageSkip(page, pageSize),
    take: pageSize,
    include: {
      client: { select: { id: true, name: true } },
      lines: { select: { unitPrice: true, qty: true, status: true } },
      _count: { select: { invoices: true } },
    },
  });

  const listParams: Record<string, string | undefined> = {
    sort: sort.key,
    dir: sort.dir,
  };
  if (q) listParams.q = q;

  if (total === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-msk-ink/50">
        {q
          ? "Aucun contrat pour cette recherche."
          : "Aucun contrat. Acceptez un devis puis créez le contrat depuis la fiche devis."}
      </p>
    );
  }

  return (
    <>
      <ListTableScroll>
        <table className="w-full min-w-160 text-left text-sm">
          <thead className="border-b border-msk-ink/10 bg-msk-chalk/50 text-msk-ink/45">
            <tr>
              <SortableTh
                label="Référence"
                column="reference"
                sort={sort.key}
                dir={sort.dir}
                pathname={PATHNAME}
                searchParams={listParams}
              />
              <SortableTh
                label="Client"
                column="client"
                sort={sort.key}
                dir={sort.dir}
                pathname={PATHNAME}
                searchParams={listParams}
              />
              <SortableTh
                label="Statut"
                column="status"
                sort={sort.key}
                dir={sort.dir}
                pathname={PATHNAME}
                searchParams={listParams}
              />
              <SortableTh
                label="Lignes"
                column="lines"
                sort={sort.key}
                dir={sort.dir}
                pathname={PATHNAME}
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="Factures"
                column="invoices"
                sort={sort.key}
                dir={sort.dir}
                pathname={PATHNAME}
                searchParams={listParams}
                defaultDir="desc"
              />
              <SortableTh
                label="MAJ"
                column="updatedAt"
                sort={sort.key}
                dir={sort.dir}
                pathname={PATHNAME}
                searchParams={listParams}
                defaultDir="desc"
              />
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => {
              const monthly = c.lines
                .filter((l) => l.status === "ACTIF")
                .reduce((s, l) => s + l.qty * l.unitPrice, 0);
              return (
                <tr
                  key={c.id}
                  className="border-b border-msk-ink/5 hover:bg-msk-blue/4"
                >
                  <td className="px-5 py-3">
                    <Link
                      prefetch={false}
                      href={`/commercial/contrats/${c.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {c.reference}
                    </Link>
                    {c.title ? (
                      <p className="text-xs text-msk-ink/45">{c.title}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      prefetch={false}
                      href={`/commercial/clients/${c.client.id}`}
                      className="hover:underline"
                    >
                      {c.client.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={c.status === "ACTIF" ? "success" : "muted"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {c.lines.length}
                    {monthly > 0 ? (
                      <span className="block text-xs text-msk-ink/45">
                        ~{formatComMoney(monthly, c.currency)}/mois
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{c._count.invoices}</td>
                  <td className="px-5 py-3 text-msk-ink/50">
                    {c.updatedAt.toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ListTableScroll>
      <ListPagination
        pathname={PATHNAME}
        searchParams={listParams}
        page={page}
        totalPages={totalPages(total, pageSize)}
        total={total}
        pageSize={pageSize}
      />
    </>
  );
}
