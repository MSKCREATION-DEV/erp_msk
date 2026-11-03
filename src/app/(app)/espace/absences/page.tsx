import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { KpiGrid } from "@/components/ui/kpi-card";
import { ABSENCE_STATUS_LABEL, absenceStatusTone } from "@/lib/rh/labels";
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

  const declared = absences.filter((a) => a.status === "DECLARED").length;
  const justified = absences.filter((a) => a.status === "JUSTIFIED").length;
  const unjustified = absences.filter((a) => a.status === "UNJUSTIFIED").length;

  return (
    <PageShell>
      <PageHeader
        title="Mes absences"
        description="Déclarations distinctes des congés — qualification par les RH."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Absences" },
        ]}
        actions={
          <Link
            prefetch={false}
            href="/espace/absences/nouveau"
            className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
          >
            Déclarer une absence
          </Link>
        }
      />

      {!employee ? (
        <Surface className="p-6 text-sm text-msk-ink/60">
          Aucune fiche RH n&apos;est liée à votre compte.
        </Surface>
      ) : (
        <>
          <KpiGrid
            items={[
              {
                label: "À qualifier",
                value: String(declared),
                hint: "Déclarées",
              },
              {
                label: "Justifiées",
                value: String(justified),
                hint: "Validées RH",
              },
              {
                label: "Non justifiées",
                value: String(unjustified),
                hint: "Décision RH",
              },
            ]}
          />

          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
              Historique
            </h2>
            {absences.length === 0 ? (
              <Surface className="p-6 text-sm text-msk-ink/50">
                Aucune absence —{" "}
                <Link
                  prefetch={false}
                  href="/espace/absences/nouveau"
                  className="text-msk-blue hover:underline"
                >
                  déclarer
                </Link>
                .
              </Surface>
            ) : (
              absences.map((a) => (
                <RequestHistoryCard
                  key={a.id}
                  title="Absence"
                  subtitle={`${a.startDate.toLocaleDateString("fr-FR")} → ${a.endDate.toLocaleDateString("fr-FR")}`}
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
