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
import { EmployeeCreateForm } from "@/components/rh/employee-form";

export const metadata: Metadata = { title: "Nouveau collaborateur" };

export default async function RhCollaborateurNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "rh.employees.manage")) {
    redirect("/rh/collaborateurs");
  }

  const users = await prisma.user.findMany({
    where: { rhEmployee: null, status: { not: "ARCHIVED" } },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 500,
  });

  return (
    <PageShell>
      <PageHeader
        title="Nouveau collaborateur"
        description="Créer une fiche RH."
        backHref="/rh/collaborateurs"
        backLabel="Retour aux collaborateurs"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Collaborateurs", href: "/rh/collaborateurs" },
          { label: "Nouveau" },
        ]}
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Créer une fiche</CardTitle>
          <CardDescription>
            Informations collaborateur et compte utilisateur lié (optionnel).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeCreateForm
            users={users.map((u) => ({
              id: u.id,
              label: `${u.firstName} ${u.lastName} — ${u.email}`,
            }))}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
