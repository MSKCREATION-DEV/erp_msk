import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { KpiGrid } from "@/components/ui/kpi-card";
import { formatXof } from "@/lib/comptabilite/money";
import { MONTH_LABELS } from "@/lib/comptabilite/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Budget" };

export default async function ComptabiliteBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "bud.view")) redirect("/accueil");

  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : new Date().getFullYear();
  const effectiveYear = Number.isFinite(year) ? year : new Date().getFullYear();

  const exercise = await prisma.budExercise.findUnique({
    where: { year: effectiveYear },
    include: { lines: { orderBy: [{ month: "asc" }, { category: "asc" }] } },
  });

  const lines = exercise?.lines ?? [];
  const totalPlanned = lines.reduce((s, l) => s + l.planned, 0);
  const totalActual = lines.reduce((s, l) => s + l.actual, 0);
  const canManage = hasPermission(user, "bud.manage");

  return (
    <PageShell>
      <PageHeader
        title="Budget"
        description={`Exercice ${effectiveYear} — CAPEX / OPEX.`}
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Budget" },
        ]}
        actions={
          canManage ? (
            <Link prefetch={false}
              href="/comptabilite/budget/nouveau"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Nouvelle ligne
            </Link>
          ) : null
        }
      />

      <form method="GET" className="flex items-end gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-msk-ink/80">
            Exercice
          </label>
          <input
            type="number"
            name="year"
            defaultValue={effectiveYear}
            className="h-11 w-28 rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-msk-blue px-4 text-sm font-medium text-white hover:bg-msk-blue/90"
        >
          Afficher
        </button>
      </form>

      <KpiGrid
        items={[
          { label: "Prévu cumulé", value: formatXof(totalPlanned) },
          { label: "Réalisé cumulé", value: formatXof(totalActual) },
          {
            label: "Écart",
            value: formatXof(totalPlanned - totalActual),
            hint: totalActual <= totalPlanned ? "Sous budget" : "Dépassement",
          },
        ]}
      />

      {lines.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucune ligne budgétaire pour {effectiveYear}.
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Mois</th>
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 font-medium">Nature</th>
                <th className="px-4 py-3 font-medium">Prévu</th>
                <th className="px-4 py-3 font-medium">Réalisé</th>
                <th className="px-4 py-3 font-medium">Écart</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const ecart = l.planned - l.actual;
                return (
                  <tr key={l.id} className="border-b border-msk-ink/5">
                    <td className="px-4 py-3 text-msk-ink/70">
                      {MONTH_LABELS[l.month]}
                    </td>
                    <td className="px-4 py-3">{l.category}</td>
                    <td className="px-4 py-3">
                      <Badge tone={l.nature === "CAPEX" ? "blue" : "muted"}>
                        {l.nature}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatXof(l.planned)}</td>
                    <td className="px-4 py-3">{formatXof(l.actual)}</td>
                    <td
                      className={cn(
                        "px-4 py-3 font-medium",
                        ecart >= 0 ? "text-emerald-700" : "text-msk-coral",
                      )}
                    >
                      {formatXof(ecart)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Surface>
      )}
    </PageShell>
  );
}
