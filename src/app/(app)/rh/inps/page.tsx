import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_INPS_RATES,
  INPS_PROVISIONAL_NOTE,
  type InpsRateLine,
} from "@/lib/paie/rates";
import { monthLabel } from "@/lib/paie/labels";
import { MarkInpsDeclaredButton } from "@/components/paie/mark-inps-declared";

export const metadata: Metadata = { title: "INPS" };

export default async function RhInpsPage() {
  const user = await requireUser();
  if (
    !hasAnyPermission(user, ["rh.inps.manage", "rh.payroll.view", "rh.payroll.approve"])
  ) {
    redirect("/accueil");
  }

  const settings = await prisma.rhInpsSettings.findFirst({
    orderBy: { effectiveFrom: "desc" },
  });
  const rates = (settings?.ratesJson as InpsRateLine[] | null) ?? DEFAULT_INPS_RATES;

  const periods = await prisma.rhPayrollPeriod.findMany({
    where: { status: { in: ["CALCULATED", "APPROVED", "CLOSED"] } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 12,
    include: {
      inpsLines: true,
    },
  });

  const canManage = hasPermission(user, "rh.inps.manage");

  return (
    <PageShell>
      <PageHeader
        title="INPS / cotisations"
        description="Paramètres et récapitulatif mensuel des cotisations sociales."
        backHref="/rh"
        backLabel="Retour RH"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "INPS" },
        ]}
      />

      <Surface className="border-msk-coral/20 bg-msk-coral/5 p-4 text-xs text-msk-ink/70">
        {settings?.note ?? INPS_PROVISIONAL_NOTE}
      </Surface>

      <Surface className="overflow-x-auto p-0">
        <div className="border-b border-msk-ink/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-msk-ink">
            Taux en vigueur
          </h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-msk-ink/10 text-msk-ink/45">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Libellé</th>
              <th className="px-4 py-3 font-medium">Taux</th>
              <th className="px-4 py-3 font-medium">Part</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.code} className="border-b border-msk-ink/5">
                <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-4 py-2">{(r.rate * 100).toFixed(2)} %</td>
                <td className="px-4 py-2">
                  <Badge tone="muted">
                    {r.party === "EMPLOYEE" ? "Salarié" : "Employeur"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>

      <Surface className="overflow-x-auto p-0">
        <div className="border-b border-msk-ink/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-msk-ink">
            Récapitulatif par période
          </h2>
        </div>
        {periods.length === 0 ? (
          <p className="px-4 py-8 text-sm text-msk-ink/50">
            Aucune période calculée.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Période</th>
                <th className="px-4 py-3 font-medium">Assiette</th>
                <th className="px-4 py-3 font-medium">Part sal.</th>
                <th className="px-4 py-3 font-medium">Part emp.</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const base = p.inpsLines.reduce((s, l) => s + l.baseAmountXof, 0);
                const emp = p.inpsLines.reduce(
                  (s, l) => s + l.employeeContributionXof,
                  0,
                );
                const patron = p.inpsLines.reduce(
                  (s, l) => s + l.employerContributionXof,
                  0,
                );
                const allDeclared =
                  p.inpsLines.length > 0 &&
                  p.inpsLines.every((l) => l.status === "DECLARED" || l.status === "PAID");
                return (
                  <tr key={p.id} className="border-b border-msk-ink/5">
                    <td className="px-4 py-2 capitalize">
                      {monthLabel(p.month)} {p.year}
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {base.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {emp.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {patron.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2">
                      {canManage && !allDeclared && p.inpsLines.length > 0 ? (
                        <MarkInpsDeclaredButton periodId={p.id} />
                      ) : allDeclared ? (
                        <Badge tone="success">Déclaré</Badge>
                      ) : (
                        <span className="text-xs text-msk-ink/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Surface>
    </PageShell>
  );
}
