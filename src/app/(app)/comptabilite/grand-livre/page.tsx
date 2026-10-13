import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { fetchGrandLivre } from "@/lib/comptabilite/reports";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { GetFilterForm } from "@/components/ui/get-filter-form";
import { formatXof } from "@/lib/comptabilite/money";

export const metadata: Metadata = { title: "Grand livre" };

export default async function ComptabiliteGrandLivrePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; accountId?: string }>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["cpt.etats.view", "cpt.access"])) {
    redirect("/accueil");
  }

  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : new Date().getFullYear();
  const accountId = sp.accountId || undefined;

  const [rows, accounts] = await Promise.all([
    fetchGrandLivre({ year: Number.isFinite(year) ? year : undefined, accountId }),
    prisma.cptAccount.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, label: true },
    }),
  ]);

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <PageShell>
      <PageHeader
        title="Grand livre"
        description="Mouvements validés, détaillés par compte."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Grand livre" },
        ]}
      />

      <GetFilterForm submitLabel="Filtrer">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-msk-ink/80">
            Exercice
          </label>
          <input
            type="number"
            name="year"
            defaultValue={year}
            className="h-11 w-28 rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-msk-ink/80">
            Compte
          </label>
          <select
            name="accountId"
            defaultValue={accountId ?? ""}
            className="h-11 min-w-55 rounded-lg border border-msk-ink/15 bg-white px-3 text-sm"
          >
            <option value="">Tous les comptes</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.label}
              </option>
            ))}
          </select>
        </div>
      </GetFilterForm>

      {rows.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucun mouvement validé pour ce filtre.
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Compte</th>
                <th className="px-4 py-3 font-medium">N° pièce</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 font-medium">Débit</th>
                <th className="px-4 py-3 font-medium">Crédit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.entryNumber}-${i}`}
                  className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
                >
                  <td className="px-4 py-2">
                    <span className="font-medium text-msk-ink">
                      {r.accountCode}
                    </span>{" "}
                    <span className="text-msk-ink/50">{r.accountLabel}</span>
                  </td>
                  <td className="px-4 py-2 text-msk-ink/70">
                    {r.entryNumber}
                  </td>
                  <td className="px-4 py-2 text-msk-ink/70">
                    {r.entryDate.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2">{r.label}</td>
                  <td className="px-4 py-2">
                    {r.debit > 0 ? formatXof(r.debit) : ""}
                  </td>
                  <td className="px-4 py-2">
                    {r.credit > 0 ? formatXof(r.credit) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-msk-ink/10 font-semibold text-msk-ink">
                <td className="px-4 py-2" colSpan={4}>
                  Total
                </td>
                <td className="px-4 py-2">{formatXof(totalDebit)}</td>
                <td className="px-4 py-2">{formatXof(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </Surface>
      )}
    </PageShell>
  );
}
