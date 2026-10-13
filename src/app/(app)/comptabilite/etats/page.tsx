import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/rbac/resolve";
import { fetchTrialBalance, buildBilanCr } from "@/lib/comptabilite/reports";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { GetFilterForm } from "@/components/ui/get-filter-form";
import { formatXof } from "@/lib/comptabilite/money";
import { classLabel } from "@/lib/comptabilite/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "États financiers" };

export default async function ComptabiliteEtatsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  if (!hasAnyPermission(user, ["cpt.etats.view", "cpt.access"])) {
    redirect("/accueil");
  }

  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : new Date().getFullYear();
  const effectiveYear = Number.isFinite(year) ? year : new Date().getFullYear();

  const balance = await fetchTrialBalance({ year: effectiveYear });
  const bilanCr = buildBilanCr(balance);

  return (
    <PageShell>
      <PageHeader
        title="États financiers"
        description="Balance générale, bilan et compte de résultat simplifiés."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "États financiers" },
        ]}
      />

      <GetFilterForm submitLabel="Afficher">
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
      </GetFilterForm>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-msk-ink">
          Balance générale
        </h2>
        {balance.length === 0 ? (
          <Surface className="p-8 text-center text-sm text-msk-ink/50">
            Aucun mouvement validé sur cet exercice.
          </Surface>
        ) : (
          <Surface className="overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="border-b border-msk-ink/10 text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Compte</th>
                  <th className="px-4 py-3 font-medium">Classe</th>
                  <th className="px-4 py-3 font-medium">Débit</th>
                  <th className="px-4 py-3 font-medium">Crédit</th>
                  <th className="px-4 py-3 font-medium">Solde</th>
                </tr>
              </thead>
              <tbody>
                {balance.map((r) => (
                  <tr
                    key={r.accountCode}
                    className="border-b border-msk-ink/5"
                  >
                    <td className="px-4 py-2">
                      <span className="font-medium text-msk-ink">
                        {r.accountCode}
                      </span>{" "}
                      <span className="text-msk-ink/50">
                        {r.accountLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-msk-ink/60">
                      {classLabel(r.classNum)}
                    </td>
                    <td className="px-4 py-2">{formatXof(r.debit)}</td>
                    <td className="px-4 py-2">{formatXof(r.credit)}</td>
                    <td
                      className={cn(
                        "px-4 py-2 font-medium",
                        r.solde >= 0 ? "text-msk-ink" : "text-msk-coral",
                      )}
                    >
                      {formatXof(r.solde)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-msk-ink">Bilan</h2>
          <Surface className="p-5">
            <p className="text-sm font-semibold text-msk-ink/70">Actif</p>
            <ul className="mt-2 divide-y divide-msk-ink/5 text-sm">
              {bilanCr.actif.map((a) => (
                <li key={a.code} className="flex justify-between py-1.5">
                  <span className="text-msk-ink/70">
                    {a.code} · {a.label}
                  </span>
                  <span>{formatXof(a.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-msk-ink/10 pt-2 text-sm font-semibold text-msk-ink">
              <span>Total actif</span>
              <span>{formatXof(bilanCr.totalActif)}</span>
            </p>

            <p className="mt-5 text-sm font-semibold text-msk-ink/70">
              Passif
            </p>
            <ul className="mt-2 divide-y divide-msk-ink/5 text-sm">
              {bilanCr.passif.map((p) => (
                <li key={p.code} className="flex justify-between py-1.5">
                  <span className="text-msk-ink/70">
                    {p.code} · {p.label}
                  </span>
                  <span>{formatXof(p.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-msk-ink/10 pt-2 text-sm font-semibold text-msk-ink">
              <span>Total passif</span>
              <span>{formatXof(bilanCr.totalPassif)}</span>
            </p>
          </Surface>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-msk-ink">
            Compte de résultat
          </h2>
          <Surface className="p-5">
            <p className="text-sm font-semibold text-msk-ink/70">Charges</p>
            <ul className="mt-2 divide-y divide-msk-ink/5 text-sm">
              {bilanCr.charges.map((c) => (
                <li key={c.code} className="flex justify-between py-1.5">
                  <span className="text-msk-ink/70">
                    {c.code} · {c.label}
                  </span>
                  <span>{formatXof(c.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-msk-ink/10 pt-2 text-sm font-semibold text-msk-ink">
              <span>Total charges</span>
              <span>{formatXof(bilanCr.totalCharges)}</span>
            </p>

            <p className="mt-5 text-sm font-semibold text-msk-ink/70">
              Produits
            </p>
            <ul className="mt-2 divide-y divide-msk-ink/5 text-sm">
              {bilanCr.produits.map((p) => (
                <li key={p.code} className="flex justify-between py-1.5">
                  <span className="text-msk-ink/70">
                    {p.code} · {p.label}
                  </span>
                  <span>{formatXof(p.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-msk-ink/10 pt-2 text-sm font-semibold text-msk-ink">
              <span>Total produits</span>
              <span>{formatXof(bilanCr.totalProduits)}</span>
            </p>

            <p
              className={cn(
                "mt-5 flex justify-between rounded-lg px-3 py-2 text-sm font-semibold",
                bilanCr.resultat >= 0
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-msk-coral/10 text-msk-coral",
              )}
            >
              <span>Résultat net</span>
              <span>{formatXof(bilanCr.resultat)}</span>
            </p>
          </Surface>
        </section>
      </div>
    </PageShell>
  );
}
