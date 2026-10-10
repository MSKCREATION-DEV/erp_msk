import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContractCreateForm } from "@/components/rh/contract-form";

export const metadata: Metadata = { title: "Nouveau contrat" };

export default async function RhContratNouveauPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "rh.contracts.manage")) {
    redirect("/rh/contrats");
  }

  const { employeeId } = await searchParams;

  const employees = await prisma.rhEmployee.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 500,
  });

  return (
    <PageShell>
      <PageHeader
        title="Nouveau contrat"
        description="Lier un contrat à un collaborateur."
        backHref="/rh/contrats"
        backLabel="Retour aux contrats"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Contrats", href: "/rh/contrats" },
          { label: "Nouveau" },
        ]}
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Créer un contrat</CardTitle>
          <CardDescription>
            Type, dates, salaire et statut initial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContractCreateForm
            employees={employees.map((e) => ({
              id: e.id,
              name: `${e.firstName} ${e.lastName}`,
            }))}
            defaultEmployeeId={employeeId}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
