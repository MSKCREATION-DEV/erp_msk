import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { formatLeaveDays } from "@/lib/espace/overview";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { KpiGrid } from "@/components/ui/kpi-card";
import { FormShell } from "@/components/ui/form-shell";
import {
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  leaveStatusTone,
} from "@/lib/rh/labels";
import { LeaveRequestForm } from "@/components/rh/leave-request-form";
import { RequestHistoryCard } from "@/components/espace/request-history-card";

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
        include: {
          validatedBy: {
            select: { firstName: true, lastName: true },
          },
          requester: {
            select: { firstName: true, lastName: true },
          },
        },
      })
    : [];

  const pending = leaves.filter((l) => l.status === "PENDING").length;
  const approved = leaves.filter((l) => l.status === "APPROVED").length;
  const rejected = leaves.filter((l) => l.status === "REJECTED").length;

  return (
    <PageShell>
      <PageHeader
        title="Mes congés"
        description="Solde, nouvelle demande et historique complet des validations."
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
          <KpiGrid
            items={[
              {
                label: "Solde disponible",
                value: formatLeaveDays(Number(employee.leaveBalanceDays)),
                hint: "Jours restants",
              },
              {
                label: "En attente",
                value: String(pending),
                hint: "Demandes",
              },
              {
                label: "Approuvés",
                value: String(approved),
                hint: "Historique affiché",
              },
              {
                label: "Refusés",
                value: String(rejected),
                hint: "Historique affiché",
              },
            ]}
          />

          <FormShell>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-msk-ink">
                Nouvelle demande
              </h2>
              <p className="mt-1 text-sm text-msk-ink/55">
                Solde actuel :{" "}
                {formatLeaveDays(Number(employee.leaveBalanceDays))}. La
                consommation n&apos;intervient qu&apos;après validation RH.
              </p>
            </div>
            <LeaveRequestForm />
          </FormShell>

          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-caps text-msk-ink/35">
              Historique des demandes
            </h2>
            {leaves.length === 0 ? (
              <Surface className="p-6 text-sm text-msk-ink/50">
                Aucune demande pour le moment.
              </Surface>
            ) : (
              leaves.map((l) => (
                <RequestHistoryCard
                  key={l.id}
                  title={LEAVE_TYPE_LABEL[l.type]}
                  subtitle={`${l.startDate.toLocaleDateString("fr-FR")} → ${l.endDate.toLocaleDateString("fr-FR")} · ${formatLeaveDays(Number(l.days))}`}
                  statusLabel={LEAVE_STATUS_LABEL[l.status]}
                  statusTone={leaveStatusTone(l.status)}
                  submittedAt={l.createdAt}
                  submittedBy={`${l.requester.firstName} ${l.requester.lastName}`}
                  reviewedAt={l.validatedAt}
                  reviewedBy={
                    l.validatedBy
                      ? `${l.validatedBy.firstName} ${l.validatedBy.lastName}`
                      : null
                  }
                  reviewActionLabel={
                    l.status === "REJECTED"
                      ? "Refusé le"
                      : l.status === "APPROVED"
                        ? "Approuvé le"
                        : "Traité le"
                  }
                  reason={l.reason}
                  reviewNote={l.reviewNote}
                />
              ))
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
