import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { formatSvXof } from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ListTableScroll } from "@/components/ui/list-table-scroll";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Mouvements · Suivi" };

export default async function SuiviMouvementsPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.movements.view");
  const canManage =
    hasPermission(user, "sv.movements.manage") || user.isSuperAdmin;

  const [movements, inAgg, outAgg] = await Promise.all([
    prisma.svCashMovement.findMany({
      orderBy: [{ movedAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.svCashMovement.aggregate({
      where: { direction: "IN" },
      _sum: { amount: true },
    }),
    prisma.svCashMovement.aggregate({
      where: { direction: "OUT" },
      _sum: { amount: true },
    }),
  ]);

  const solde = (inAgg._sum.amount ?? 0) - (outAgg._sum.amount ?? 0);

  return (
    <PageShell>
      <PageHeader
        title="Mouvements"
        description="Registre entrées / sorties — trésorerie tampon (pas de caisse métier)."
        backHref="/suivi"
        actions={
          canManage ? (
            <Link
              href="/suivi/mouvements/nouveau"
              className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Nouveau mouvement
            </Link>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Entrées
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatSvXof(inAgg._sum.amount ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Sorties
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatSvXof(outAgg._sum.amount ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-msk-ink/8 bg-white p-4">
          <p className="text-xs uppercase tracking-caps text-msk-ink/45">
            Solde
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatSvXof(solde)}
          </p>
        </div>
      </div>

      <Surface className="overflow-hidden p-0">
        {movements.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/55">Aucun mouvement.</p>
        ) : (
          <ListTableScroll>
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-msk-ink/6 bg-msk-chalk/60 text-xs uppercase tracking-caps text-msk-ink/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Sens</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Projet</th>
                  <th className="px-4 py-3 font-medium text-right">Montant</th>
                  <th className="px-4 py-3 font-medium">Réf.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-msk-ink/6">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.movedAt.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={m.direction === "IN" ? "success" : "coral"}>
                        {m.direction === "IN" ? "IN" : "OUT"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{m.category}</td>
                    <td className="px-4 py-3 text-msk-ink/70">
                      {m.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/60">
                      {m.clientProject ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatSvXof(m.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-msk-ink/45">
                      {m.reference ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ListTableScroll>
        )}
      </Surface>
    </PageShell>
  );
}
