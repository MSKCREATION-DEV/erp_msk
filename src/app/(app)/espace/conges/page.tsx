import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, leaveStatusTone } from "@/lib/rh/labels";
import { LeaveRequestForm } from "@/components/rh/leave-request-form";

export const metadata: Metadata = { title: "Mes congés" };

export default async function EspaceCongesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.leave.request")) redirect("/espace");

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });

  const leaves = employee
    ? await prisma.rhLeaveRequest.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <PageShell>
      <PageHeader
        title="Mes congés"
        description="Demander un congé et suivre mes demandes."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Congés" },
        ]}
      />

      {!employee ? (
        <Surface className="p-6 text-sm text-msk-ink/60">
          Aucune fiche RH n&apos;est liée à votre compte — contactez
          l&apos;administration RH.
        </Surface>
      ) : (
        <>
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Nouvelle demande</CardTitle>
              <CardDescription>
                Solde actuel : {Number(employee.leaveBalanceDays)} jours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveRequestForm />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
              Historique
            </h2>
            {leaves.length === 0 ? (
              <Surface className="p-6 text-sm text-msk-ink/50">
                Aucune demande pour le moment.
              </Surface>
            ) : (
              leaves.map((l) => (
                <Surface
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-msk-ink">
                      {LEAVE_TYPE_LABEL[l.type]}
                    </p>
                    <p className="text-sm text-msk-ink/55">
                      {l.startDate.toLocaleDateString("fr-FR")} →{" "}
                      {l.endDate.toLocaleDateString("fr-FR")} ·{" "}
                      {Number(l.days)} j
                    </p>
                  </div>
                  <Badge tone={leaveStatusTone(l.status)}>
                    {LEAVE_STATUS_LABEL[l.status]}
                  </Badge>
                </Surface>
              ))
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
