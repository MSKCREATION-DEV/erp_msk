import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  PERIOD_STATUS_LABEL,
  monthLabel,
  periodStatusTone,
} from "@/lib/paie/labels";

export const metadata: Metadata = { title: "Paie" };

export default async function RhPaiePage() {
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

  const canRun = hasPermission(user, "rh.payroll.run");
  const periods = await prisma.rhPayrollPeriod.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { slips: true } } },
  });

  return (
    <PageShell>
      <PageHeader
        title="Paie"
        description="Périodes mensuelles, bulletins, PDF et écritures journal PA."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Paie" },
        ]}
        actions={
          canRun ? (
            <Link
              href="/rh/paie/nouveau"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Ouvrir une période
            </Link>
          ) : null
        }
      />

      <Surface className="overflow-x-auto p-0">
        {periods.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-msk-ink/50">
            Aucune période — ouvrir le mois en cours pour calculer la paie.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Période</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Bulletins</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-b border-msk-ink/5">
                  <td className="px-4 py-3">
                    <Link
                      href={`/rh/paie/${p.id}`}
                      className="font-medium capitalize text-msk-blue hover:underline"
                    >
                      {monthLabel(p.month)} {p.year}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={periodStatusTone(p.status)}>
                      {PERIOD_STATUS_LABEL[p.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">
                    {p._count.slips}
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
