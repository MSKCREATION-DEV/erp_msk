import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { FormShell } from "@/components/ui/form-shell";
import { AbsenceDeclareForm } from "@/components/rh/absence-declare-form";

export const metadata: Metadata = { title: "Déclarer une absence" };

export default async function EspaceAbsencesNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.absence.submit")) redirect("/espace");

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!employee) redirect("/espace");

  return (
    <PageShell>
      <PageHeader
        title="Déclarer une absence"
        description="Indiquez les dates — ce n’est pas une demande de congés."
        backHref="/espace/absences"
        backLabel="Retour aux absences"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Absences", href: "/espace/absences" },
          { label: "Déclarer" },
        ]}
      />
      <FormShell>
        <AbsenceDeclareForm />
      </FormShell>
    </PageShell>
  );
}
