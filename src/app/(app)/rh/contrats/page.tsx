import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { SortableTh } from "@/components/ui/sortable-th";
import type { Prisma, RhContractStatus } from "@prisma/client";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_TYPE_LABEL,
  contractStatusTone,
} from "@/lib/rh/labels";

export const metadata: Metadata = { title: "Contrats" };

const STATUS_FILTERS: RhContractStatus[] = [
  "DRAFT",
  "ACTIVE",
  "ENDED",
  "CANCELLED",
];

const CONTRACT_SORT_COLUMNS = {
  title: (dir: SortDir) => ({ title: dir }),
  employee: (dir: SortDir) => ({ employee: { lastName: dir } }),
  type: (dir: SortDir) => ({ type: dir }),
  startDate: (dir: SortDir) => ({ startDate: dir }),
  status: (dir: SortDir) => ({ status: dir }),
} satisfies SortColumnMap<
  "title" | "employee" | "type" | "startDate" | "status"
>;

export default async function RhContratsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; dir?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.contracts.manage")) redirect("/accueil");

  const sp = await searchParams;
  const statusFilter = STATUS_FILTERS.includes(sp.status as RhContractStatus)
    ? (sp.status as RhContractStatus)
    : undefined;

  const sort = parseListSort(sp, CONTRACT_SORT_COLUMNS, {
    key: "startDate",
    dir: "desc",
  });
  const listParams: Record<string, string | undefined> = {
    status: statusFilter,
    sort: sort.key,
    dir: sort.dir,
  };

  const contracts = await prisma.rhContract.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: sort.orderBy as Prisma.RhContractOrderByWithRelationInput,
    take: 300,
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Contrats"
        description="CDI, CDD, stage, prestation, avenants."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[{ label: "RH", href: "/rh" }, { label: "Contrats" }]}
        actions={
          <Link prefetch={false}
            href="/rh/contrats/nouveau"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Nouveau contrat
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link prefetch={false}
          href={`/rh/contrats?sort=${sort.key}&dir=${sort.dir}`}
          className={`rounded-lg px-3 py-1.5 ${!statusFilter ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
        >
          Tous
        </Link>
        {STATUS_FILTERS.map((s) => (
          <Link prefetch={false}
            key={s}
            href={`/rh/contrats?status=${s}&sort=${sort.key}&dir=${sort.dir}`}
            className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
          >
            {CONTRACT_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {contracts.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucun contrat trouvé.
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <SortableTh
                  label="Intitulé"
                  column="title"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/rh/contrats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Collaborateur"
                  column="employee"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/rh/contrats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Type"
                  column="type"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/rh/contrats"
                  searchParams={listParams}
                />
                <SortableTh
                  label="Début"
                  column="startDate"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/rh/contrats"
                  searchParams={listParams}
                  defaultDir="desc"
                />
                <SortableTh
                  label="Statut"
                  column="status"
                  sort={sort.key}
                  dir={sort.dir}
                  pathname="/rh/contrats"
                  searchParams={listParams}
                />
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
                >
                  <td className="px-4 py-3">
                    <Link prefetch={false}
                      href={`/rh/contrats/${c.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">
                    {c.employee.firstName} {c.employee.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="muted">{CONTRACT_TYPE_LABEL[c.type]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">
                    {c.startDate.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={contractStatusTone(c.status)}>
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      )}
    </PageShell>
  );
}
