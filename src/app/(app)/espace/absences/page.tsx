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
import { ABSENCE_STATUS_LABEL, absenceStatusTone } from "@/lib/rh/labels";
import { AbsenceDeclareForm } from "@/components/rh/absence-declare-form";

export const metadata: Metadata = { title: "Mes absences" };

export default async function EspaceAbsencesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.absence.submit")) redirect("/espace");

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });

  const absences = employee
    ? await prisma.rhAbsence.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <PageShell>
      <PageHeader
        title="Mes absences"
        description="Déclarer une absence et suivre son traitement."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Absences" },
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
              <CardTitle>Déclarer une absence</CardTitle>
              <CardDescription>
                Elle sera examinée par l&apos;administration RH.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AbsenceDeclareForm />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
              Historique
            </h2>
            {absences.length === 0 ? (
              <Surface className="p-6 text-sm text-msk-ink/50">
                Aucune absence déclarée.
              </Surface>
            ) : (
              absences.map((a) => (
                <Surface
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-msk-ink">
                      {a.startDate.toLocaleDateString("fr-FR")} →{" "}
                      {a.endDate.toLocaleDateString("fr-FR")}
                    </p>
                    <p className="text-sm text-msk-ink/55">{a.reason}</p>
                  </div>
                  <Badge tone={absenceStatusTone(a.status)}>
                    {ABSENCE_STATUS_LABEL[a.status]}
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
