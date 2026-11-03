import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { loadEmployeeDocumentVault } from "@/lib/espace/documents-vault";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { KpiGrid } from "@/components/ui/kpi-card";
import { DocumentsVault } from "@/components/espace/documents-vault";
import { countByCategory } from "@/lib/espace/documents-vault-types";

export const metadata: Metadata = { title: "Mes documents" };

export default async function EspaceDocumentsPage() {
  const user = await requireUser();
  if (
    !hasPermission(user, "self.documents.view") &&
    !hasPermission(user, "self.payslip.view")
  ) {
    redirect("/espace");
  }

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
    include: {
      contracts: { select: { id: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!employee) redirect("/espace");

  const docs = await loadEmployeeDocumentVault({
    employeeId: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    userFirstName: employee.user?.firstName,
    userLastName: employee.user?.lastName,
    contractIds: employee.contracts.map((c) => c.id),
    reglementStatus: employee.reglementStatus,
  });
  const counts = countByCategory(docs);

  // Sérialiser dates pour client
  const serialized = docs.map((d) => ({
    ...d,
    createdAt: d.createdAt,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Mes documents"
        description="Vos contrats, bulletins de paie, règlement et pièces jointes."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Documents" },
        ]}
      />

      <KpiGrid
        items={[
          {
            label: "Documents",
            value: String(counts.all),
            hint: "Tous documents",
          },
          {
            label: "À signer",
            value: String(counts.a_signer),
            hint: "Action requise",
          },
          {
            label: "Paie",
            value: String(counts.paie),
            hint: "Bulletins",
          },
          {
            label: "Professionnels",
            value: String(counts.pro),
            hint: "Contrats & attestations",
          },
        ]}
      />

      <Suspense
        fallback={
          <Surface className="h-40 animate-pulse bg-msk-ink/4" />
        }
      >
        <DocumentsVault docs={serialized} />
      </Suspense>
    </PageShell>
  );
}
