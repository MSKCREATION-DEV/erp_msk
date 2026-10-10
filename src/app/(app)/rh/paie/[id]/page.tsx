import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  PERIOD_STATUS_LABEL,
  PAYSLIP_STATUS_LABEL,
  monthLabel,
  periodStatusTone,
} from "@/lib/paie/labels";
import { PeriodActions } from "@/components/paie/period-actions";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import { INPS_PROVISIONAL_NOTE } from "@/lib/paie/rates";

export const metadata: Metadata = { title: "Période de paie" };

export default async function RhPaiePeriodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (
    !hasAnyPermission(user, [
      "rh.payroll.view",
      "rh.payroll.run",
      "rh.payroll.approve",
    ])
  ) {
    redirect("/accueil");
  }
  const { id } = await params;

  const period = await prisma.rhPayrollPeriod.findUnique({
    where: { id },
    include: {
      slips: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { employee: { lastName: "asc" } },
      },
    },
  });
  if (!period) notFound();

  const canRun = hasPermission(user, "rh.payroll.run");
  const canApprove = hasPermission(user, "rh.payroll.approve");

  const totalNet = period.slips.reduce((s, x) => s + x.netXof, 0);

  return (
    <PageShell>
      <PageHeader
        title={`${monthLabel(period.month)} ${period.year}`}
        description="Calcul, validation, PDF GED et écritures journal PA."
        backHref="/rh/paie"
        backLabel="Retour aux périodes"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Paie", href: "/rh/paie" },
          { label: `${monthLabel(period.month)} ${period.year}` },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={periodStatusTone(period.status)}>
          {PERIOD_STATUS_LABEL[period.status]}
        </Badge>
        <span className="text-sm text-msk-ink/50">
          {period.slips.length} bulletin(s) · net total{" "}
          {totalNet.toLocaleString("fr-FR")} XOF
        </span>
      </div>

      <Surface className="border-msk-coral/20 bg-msk-coral/5 p-4 text-xs text-msk-ink/70">
        {INPS_PROVISIONAL_NOTE}
      </Surface>

      <Surface className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-msk-ink">Actions</h2>
        <PeriodActions
          periodId={period.id}
          canRun={canRun}
          canApprove={canApprove}
          status={period.status}
        />
      </Surface>

      <Surface className="overflow-x-auto p-0">
        <div className="border-b border-msk-ink/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-msk-ink">Bulletins</h2>
        </div>
        {period.slips.length === 0 ? (
          <p className="px-4 py-8 text-sm text-msk-ink/50">
            Aucun bulletin — lancer le calcul (contrats ACTIVE avec salaire).
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Collaborateur</th>
                <th className="px-4 py-3 font-medium">Brut</th>
                <th className="px-4 py-3 font-medium">Net</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {period.slips.map((s) => (
                <tr key={s.id} className="border-b border-msk-ink/5">
                  <td className="px-4 py-2">
                    <Link
                      href={`/rh/collaborateurs/${s.employee.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {s.employee.lastName} {s.employee.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {s.brutXof.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 tabular-nums font-medium">
                    {s.netXof.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone="muted">
                      {PAYSLIP_STATUS_LABEL[s.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    {s.gedDocumentId ? (
                      <DocDownloadButton
                        documentId={s.gedDocumentId}
                        label="PDF"
                      />
                    ) : (
                      <span className="text-xs text-msk-ink/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>
    </PageShell>
  );
}
