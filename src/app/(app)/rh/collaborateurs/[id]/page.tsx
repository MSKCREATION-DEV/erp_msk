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
import { EmployeeDocsActions } from "@/components/rh/employee-docs-actions";
import { findLatestLinkedDoc, mapEmployeeDocIds } from "@/lib/rh/docs-query";
import { RH_DOC } from "@/lib/rh/docs";
import { DocDownloadButton } from "@/components/rh/doc-download-button";

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
  const docIds = await mapEmployeeDocIds(employee.id);

  const contractPdfs = await Promise.all(
    employee.contracts.map(async (c) => {
      const linked = await findLatestLinkedDoc(RH_DOC.CONTRACT, c.id);
      return {
        contractId: c.id,
        documentId: linked?.id ?? c.gedDocumentId,
      };
    }),
  );
  const pdfByContract = new Map(
    contractPdfs.map((x) => [x.contractId, x.documentId]),
  );

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
            <Link prefetch={false}
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

      {/* 1. Identité */}
      <Surface className="space-y-2 p-5 text-sm">
        <h2 className="text-sm font-semibold text-msk-ink">Identité</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <p>
            <span className="text-msk-ink/45">E-mail </span>
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
        </div>
      </Surface>

      {/* 2. Contrats */}
      <Surface className="overflow-x-auto p-0">
        <div className="flex items-center justify-between border-b border-msk-ink/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-msk-ink">Contrats</h2>
          {canContracts ? (
            <Link prefetch={false}
              href={`/rh/contrats/nouveau?employeeId=${employee.id}`}
              className="text-xs font-medium text-msk-blue hover:underline"
            >
              Ajouter
            </Link>
          ) : null}
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
                <th className="px-4 py-3 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {employee.contracts.map((c) => {
                const pdfId = pdfByContract.get(c.id);
                const titleLooksStage = /stage/i.test(c.title);
                const typeMismatch =
                  (titleLooksStage && c.type !== "STAGE") ||
                  (!titleLooksStage && c.type === "STAGE" && /cdi|cdd/i.test(c.title));
                return (
                  <tr key={c.id} className="border-b border-msk-ink/5">
                    <td className="px-4 py-2">
                      <Link prefetch={false}
                        href={`/rh/contrats/${c.id}?from=collab&employeeId=${employee.id}`}
                        className="font-medium text-msk-blue hover:underline"
                      >
                        {c.title}
                      </Link>
                      {typeMismatch ? (
                        <p className="text-xs text-msk-coral">
                          Intitulé et type incohérents
                        </p>
                      ) : null}
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
                    <td className="px-4 py-2">
                      {pdfId ? (
                        <DocDownloadButton
                          documentId={pdfId}
                          label="PDF"
                          size="sm"
                        />
                      ) : (
                        <span className="text-xs text-msk-ink/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Surface>

      {/* 3. Documents */}
      {canManage ? (
        <Surface className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-msk-ink">
            Documents RH
          </h2>
          <p className="mb-4 text-xs text-msk-ink/45">
            Charte MSK — classés en GED. Si déjà généré : Voir / Télécharger ;
            Regénérer en secondaire.
          </p>
          <EmployeeDocsActions
            employeeId={employee.id}
            docs={{
              ...docIds,
              reglementSigned: employee.reglementStatus === "SIGNED",
            }}
          />
        </Surface>
      ) : null}

      {/* 4. Cycle de vie */}
      {canManage ? (
        <Surface className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-msk-ink">
            Cycle de vie
          </h2>
          <p className="mb-3 text-xs text-msk-ink/45">
            Onboarding → Actif → Offboarding → Archivé
          </p>
          <EmployeeStatusButtons
            employeeId={employee.id}
            status={employee.status}
          />
        </Surface>
      ) : null}
    </PageShell>
  );
}
