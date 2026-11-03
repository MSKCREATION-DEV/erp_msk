import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { FormShell } from "@/components/ui/form-shell";
import { ABSENCE_STATUS_LABEL, absenceStatusTone } from "@/lib/rh/labels";
import { AbsenceDeclareForm } from "@/components/rh/absence-declare-form";
import { RequestHistoryCard } from "@/components/espace/request-history-card";

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
        include: {
          declaredBy: {
            select: { firstName: true, lastName: true },
          },
          reviewedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      })
    : [];

  return (
    <PageShell>
      <PageHeader
        title="Mes absences"
        description="Déclarer une absence et consulter l’historique de traitement RH."
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
          <FormShell>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-msk-ink">
                Déclarer une absence
              </h2>
              <p className="mt-1 text-sm text-msk-ink/55">
                Elle sera examinée par l&apos;administration RH. Les
                justificatifs GED seront disponibles dans une prochaine
                itération.
              </p>
            </div>
            <AbsenceDeclareForm />
          </FormShell>

          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
              Historique des absences
            </h2>
            {absences.length === 0 ? (
              <Surface className="p-6 text-sm text-msk-ink/50">
                Aucune absence déclarée.
              </Surface>
            ) : (
              absences.map((a) => (
                <RequestHistoryCard
                  key={a.id}
                  title={`${a.startDate.toLocaleDateString("fr-FR")} → ${a.endDate.toLocaleDateString("fr-FR")}`}
                  subtitle="Déclaration d’absence"
                  statusLabel={ABSENCE_STATUS_LABEL[a.status]}
                  statusTone={absenceStatusTone(a.status)}
                  submittedAt={a.createdAt}
                  submittedBy={`${a.declaredBy.firstName} ${a.declaredBy.lastName}`}
                  reviewedAt={a.reviewedAt}
                  reviewedBy={
                    a.reviewedBy
                      ? `${a.reviewedBy.firstName} ${a.reviewedBy.lastName}`
                      : null
                  }
                  reviewActionLabel={
                    a.status === "JUSTIFIED"
                      ? "Justifiée le"
                      : a.status === "UNJUSTIFIED"
                        ? "Non justifiée le"
                        : "Traité le"
                  }
                  reason={a.reason}
                  reviewNote={a.justificationNote}
                />
              ))
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
