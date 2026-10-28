import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Prisma, RhEmployeeStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { parseListSort, type SortColumnMap, type SortDir } from "@/lib/list/sort";
import { firstParam } from "@/lib/list/search-params";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListSearchForm } from "@/components/ui/list-search-form";
import { ListTableSkeleton } from "@/components/ui/list-table-skeleton";
import { SortableTh } from "@/components/ui/sortable-th";
import {
  EMPLOYEE_STATUS_LABEL,
  EMPLOYEE_TYPE_LABEL,
  employeeStatusTone,
} from "@/lib/rh/labels";

const EMP_SORT_COLUMNS = {
  name: (dir: SortDir) => [{ lastName: dir }, { firstName: dir }],
  jobTitle: (dir: SortDir) => ({ jobTitle: dir }),
  type: (dir: SortDir) => ({ employeeType: dir }),
  status: (dir: SortDir) => ({ status: dir }),
  hireDate: (dir: SortDir) => ({ hireDate: dir }),
} satisfies SortColumnMap<
  "name" | "jobTitle" | "type" | "status" | "hireDate"
>;

export const metadata: Metadata = { title: "Collaborateurs" };

const STATUS_FILTERS: RhEmployeeStatus[] = [
  "ACTIVE",
  "ONBOARDING",
  "OFFBOARDING",
  "ARCHIVED",
];

export default async function RhCollaborateursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["rh.employees.view", "rh.employees.manage"])) {
    redirect("/accueil");
  }

  const canManage = hasPermission(user, "rh.employees.manage");

  return (
    <PageShell>
      <PageHeader
        title="Collaborateurs"
        description="Fiches RH — statut, type, règlement intérieur."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Collaborateurs" },
        ]}
        actions={
          canManage ? (
            <Link
              prefetch={false}
              href="/rh/collaborateurs/nouveau"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Nouveau collaborateur
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Suspense
          fallback={
            <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-msk-chalk" />
          }
        >
          <ListSearchForm
            placeholder="Rechercher nom, prénom, poste…"
            className="sm:max-w-md"
          />
        </Suspense>
      </div>

      <Suspense fallback={<StatusFiltersSkeleton />}>
        <StatusFilters searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<ListTableSkeleton rows={8} cols={5} />}>
        <CollaborateursResults searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

function StatusFiltersSkeleton() {
  return <div className="h-9 w-full max-w-lg animate-pulse rounded-lg bg-msk-chalk" />;
}

async function StatusFilters({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = (firstParam(raw.q) ?? "").trim();
  const status = firstParam(raw.status);
  const statusFilter = STATUS_FILTERS.includes(status as RhEmployeeStatus)
    ? (status as RhEmployeeStatus)
    : undefined;
  const sort = firstParam(raw.sort);
  const dir = firstParam(raw.dir);

  function hrefFor(nextStatus?: RhEmployeeStatus) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (nextStatus) p.set("status", nextStatus);
    if (sort) p.set("sort", sort);
    if (dir) p.set("dir", dir);
    const qs = p.toString();
    return qs ? `/rh/collaborateurs?${qs}` : "/rh/collaborateurs";
  }

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <Link
        prefetch={false}
        href={hrefFor()}
        className={`rounded-lg px-3 py-1.5 ${!statusFilter ? "bg-msk-blue text-white" : "border border-msk-ink/15 bg-white text-msk-ink/60"}`}
      >
        Tous
      </Link>
      {STATUS_FILTERS.map((s) => (
        <Link
          prefetch={false}
          key={s}
          href={hrefFor(s)}
          className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-msk-blue text-white" : "border border-msk-ink/15 bg-white text-msk-ink/60"}`}
        >
          {EMPLOYEE_STATUS_LABEL[s]}
        </Link>
      ))}
    </div>
  );
}

async function CollaborateursResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const raw = await searchParams;
  const query = (firstParam(raw.q) ?? "").trim();
  const status = firstParam(raw.status);
  const statusFilter = STATUS_FILTERS.includes(status as RhEmployeeStatus)
    ? (status as RhEmployeeStatus)
    : undefined;
  const sp: Record<string, string | undefined> = {
    q: query || undefined,
    status: statusFilter,
    sort: firstParam(raw.sort),
    dir: firstParam(raw.dir),
  };
  const sort = parseListSort(sp, EMP_SORT_COLUMNS, {
    key: "name",
    dir: "asc",
  });
  const listParams: Record<string, string | undefined> = {
    ...sp,
    sort: sort.key,
    dir: sort.dir,
  };

  const employees = await prisma.rhEmployee.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { jobTitle: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: sort.orderBy as Prisma.RhEmployeeOrderByWithRelationInput,
    take: 300,
  });

  if (employees.length === 0) {
    return (
      <Surface className="p-8 text-center text-sm text-msk-ink/50">
        Aucun collaborateur trouvé.
      </Surface>
    );
  }

  return (
    <Surface className="overflow-x-auto">
      <table className="w-full min-w-180 text-left text-sm">
        <thead className="border-b border-msk-ink/10 text-msk-ink/45">
          <tr>
            <SortableTh
              label="Nom"
              column="name"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/collaborateurs"
              searchParams={listParams}
            />
            <SortableTh
              label="Poste"
              column="jobTitle"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/collaborateurs"
              searchParams={listParams}
            />
            <SortableTh
              label="Type"
              column="type"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/collaborateurs"
              searchParams={listParams}
            />
            <SortableTh
              label="Statut"
              column="status"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/collaborateurs"
              searchParams={listParams}
            />
            <SortableTh
              label="Embauché le"
              column="hireDate"
              sort={sort.key}
              dir={sort.dir}
              pathname="/rh/collaborateurs"
              searchParams={listParams}
              defaultDir="desc"
            />
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr
              key={e.id}
              className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
            >
              <td className="px-4 py-3">
                <Link
                  prefetch={false}
                  href={`/rh/collaborateurs/${e.id}`}
                  className="font-medium text-msk-blue hover:underline"
                >
                  {e.firstName} {e.lastName}
                </Link>
              </td>
              <td className="px-4 py-3 text-msk-ink/70">
                {e.jobTitle ?? "—"}
              </td>
              <td className="px-4 py-3">
                <Badge tone="muted">
                  {EMPLOYEE_TYPE_LABEL[e.employeeType]}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={employeeStatusTone(e.status)}>
                  {EMPLOYEE_STATUS_LABEL[e.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-msk-ink/70">
                {e.hireDate ? e.hireDate.toLocaleDateString("fr-FR") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Surface>
  );
}
