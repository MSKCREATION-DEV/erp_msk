import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { RhEmployeeStatus } from "@prisma/client";
import {
  EMPLOYEE_STATUS_LABEL,
  EMPLOYEE_TYPE_LABEL,
  employeeStatusTone,
} from "@/lib/rh/labels";

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
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["rh.employees.view", "rh.employees.manage"])) {
    redirect("/accueil");
  }

  const { q, status } = await searchParams;
  const query = (q ?? "").trim();
  const statusFilter = STATUS_FILTERS.includes(status as RhEmployeeStatus)
    ? (status as RhEmployeeStatus)
    : undefined;

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
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 300,
  });

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
            <Link prefetch={false}
              href="/rh/collaborateurs/nouveau"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Nouveau collaborateur
            </Link>
          ) : null
        }
      />

      <form method="GET" className="max-w-sm">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Rechercher nom, prénom, poste…"
        />
        {statusFilter ? (
          <input type="hidden" name="status" value={statusFilter} />
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link prefetch={false}
          href="/rh/collaborateurs"
          className={`rounded-lg px-3 py-1.5 ${!statusFilter ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
        >
          Tous
        </Link>
        {STATUS_FILTERS.map((s) => (
          <Link prefetch={false}
            key={s}
            href={`/rh/collaborateurs?status=${s}`}
            className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-msk-blue text-white" : "bg-white text-msk-ink/60 border border-msk-ink/15"}`}
          >
            {EMPLOYEE_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {employees.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucun collaborateur trouvé.
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Poste</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Embauché le</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
                >
                  <td className="px-4 py-3">
                    <Link prefetch={false}
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
                    {e.hireDate
                      ? e.hireDate.toLocaleDateString("fr-FR")
                      : "—"}
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
