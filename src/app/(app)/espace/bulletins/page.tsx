import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { DocDownloadButton } from "@/components/rh/doc-download-button";
import { monthLabel, PAYSLIP_STATUS_LABEL } from "@/lib/paie/labels";

export const metadata: Metadata = { title: "Mes bulletins" };

export default async function EspaceBulletinsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "self.payslip.view") && !hasPermission(user, "self.documents.view")) {
    redirect("/espace");
  }

  const employee = await prisma.rhEmployee.findUnique({
    where: { userId: user.id },
  });
  if (!employee) redirect("/espace");

  const slips = await prisma.rhPayslip.findMany({
    where: {
      employeeId: employee.id,
      status: { in: ["APPROVED", "PAID"] },
    },
    include: { period: true },
    orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
  });

  return (
    <PageShell>
      <PageHeader
        title="Mes bulletins"
        description="Bulletins de paie approuvés — téléchargement direct."
        backHref="/espace"
        backLabel="Retour à Mon espace"
        breadcrumbs={[
          { label: "Mon espace", href: "/espace" },
          { label: "Mes bulletins" },
        ]}
      />

      <Surface className="overflow-x-auto p-0">
        {slips.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-msk-ink/50">
            Aucun bulletin approuvé pour le moment.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Période</th>
                <th className="px-4 py-3 font-medium">Net</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {slips.map((s) => (
                <tr key={s.id} className="border-b border-msk-ink/5">
                  <td className="px-4 py-3 capitalize">
                    {monthLabel(s.period.month)} {s.period.year}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {s.netXof.toLocaleString("fr-FR")} XOF
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="success">
                      {PAYSLIP_STATUS_LABEL[s.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {s.gedDocumentId ? (
                      <DocDownloadButton
                        documentId={s.gedDocumentId}
                        label="Télécharger"
                        variant="primary"
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
