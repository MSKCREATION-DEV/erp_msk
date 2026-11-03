import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { formatLeaveDays } from "@/lib/espace/overview";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { FormShell } from "@/components/ui/form-shell";
import { LeaveRequestForm } from "@/components/rh/leave-request-form";

export const metadata: Metadata = { title: "Nouvelle demande de congé" };

export default async function EspaceCongesNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.leave.request")) redirect("/espace");

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
    select: { leaveBalanceDays: true },
  });
  if (!employee) redirect("/espace");

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle demande de congé"
        description={`Solde actuel : ${formatLeaveDays(Number(employee.leaveBalanceDays))}. Consommation après validation RH.`}
        backHref="/espace/conges"
        backLabel="Retour aux congés"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Congés", href: "/espace/conges" },
          { label: "Nouvelle demande" },
        ]}
      />
      <FormShell>
        <LeaveRequestForm />
      </FormShell>
    </PageShell>
  );
}
