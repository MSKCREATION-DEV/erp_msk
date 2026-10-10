import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_TYPE_LABEL,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYEE_TYPE_LABEL,
  REGLEMENT_STATUS_LABEL,
  contractStatusTone,
  employeeStatusTone,
  reglementStatusTone,
} from "@/lib/rh/labels";
import { EmployeeStatusButtons } from "@/components/rh/employee-status-buttons";

export const metadata: Metadata = { title: "Collaborateur" };

export default async function RhCollaborateurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["rh.employees.view", "rh.employees.manage"])) {
    redirect("/accueil");
  }
  const { id } = await params;

  const employee = await prisma.rhEmployee.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      contracts: { orderBy: { startDate: "desc" } },
    },
  });
  if (!employee) notFound();

  const canManage = hasPermission(user, "rh.employees.manage");
  const canContracts = hasPermission(user, "rh.contracts.manage");

  return (
    <PageShell>
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.jobTitle ?? undefined}
        backHref="/rh/collaborateurs"
        backLabel="Retour aux collaborateurs"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Collaborateurs", href: "/rh/collaborateurs" },
          { label: `${employee.firstName} ${employee.lastName}` },
        ]}
        actions={
          canContracts ? (
            <Link
              href={`/rh/contrats/nouveau?employeeId=${employee.id}`}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Nouveau contrat
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={employeeStatusTone(employee.status)}>
          {EMPLOYEE_STATUS_LABEL[employee.status]}
        </Badge>
        <Badge tone="muted">{EMPLOYEE_TYPE_LABEL[employee.employeeType]}</Badge>
        <Badge tone={reglementStatusTone(employee.reglementStatus)}>
          Règlement — {REGLEMENT_STATUS_LABEL[employee.reglementStatus]}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface className="space-y-2 p-5 text-sm lg:col-span-1">
          <p>
            <span className="text-msk-ink/45">Email </span>
            {employee.email ?? employee.user?.email ?? "—"}
          </p>
          <p>
            <span className="text-msk-ink/45">Téléphone </span>
            {employee.phone ?? "—"}
          </p>
          <p>
            <span className="text-msk-ink/45">Embauché le </span>
            {employee.hireDate
              ? employee.hireDate.toLocaleDateString("fr-FR")
              : "—"}
          </p>
          <p>
            <span className="text-msk-ink/45">Solde congés </span>
            {Number(employee.leaveBalanceDays)} jours
          </p>
          <p>
            <span className="text-msk-ink/45">Compte lié </span>
            {employee.user ? "Oui" : "Non"}
          </p>
        </Surface>

        <Surface className="overflow-x-auto p-0 lg:col-span-2">
          <div className="border-b border-msk-ink/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-msk-ink">Contrats</h2>
          </div>
          {employee.contracts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-msk-ink/50">
              Aucun contrat enregistré.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-msk-ink/10 text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Intitulé</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Début</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {employee.contracts.map((c) => (
                  <tr key={c.id} className="border-b border-msk-ink/5">
                    <td className="px-4 py-2">
                      <Link
                        href={`/rh/contrats/${c.id}`}
                        className="font-medium text-msk-blue hover:underline"
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-msk-ink/70">
                      {CONTRACT_TYPE_LABEL[c.type]}
                    </td>
                    <td className="px-4 py-2 text-msk-ink/70">
                      {c.startDate.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={contractStatusTone(c.status)}>
                        {CONTRACT_STATUS_LABEL[c.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Surface>
      </div>

      {canManage ? (
        <Surface className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-msk-ink">Statut</h2>
          <EmployeeStatusButtons
            employeeId={employee.id}
            status={employee.status}
          />
        </Surface>
      ) : null}
    </PageShell>
  );
}
