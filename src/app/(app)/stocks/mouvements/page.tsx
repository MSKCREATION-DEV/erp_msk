import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Mouvements stock" };

function qtyStr(d: Prisma.Decimal | number) {
  return Number(d).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

export default async function StocksMouvementsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "stk.access")) redirect("/accueil");
  const canMove = hasPermission(user, "stk.moves.create");

  const moves = await prisma.stkMovement.findMany({
    take: 100,
    orderBy: { movedAt: "desc" },
    include: {
      article: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Mouvements"
        description="Historique des entrées, sorties et ajustements."
        backHref="/stocks"
        backLabel="Retour stocks"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Mouvements" },
        ]}
        actions={
          canMove ? (
            <Link prefetch={false}
              href="/stocks/mouvements/nouveau"
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Nouveau mouvement
            </Link>
          ) : null
        }
      />

      <Surface className="overflow-x-auto p-0">
        {moves.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/45">
            Aucun mouvement.{" "}
            {canMove ? (
              <Link prefetch={false} href="/stocks/mouvements/nouveau" className="text-msk-blue">
                Enregistrer le premier
              </Link>
            ) : null}
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-msk-paper bg-msk-chalk/60 text-xs tracking-caps uppercase text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold text-right">Qté</th>
                <th className="px-4 py-3 font-semibold text-right">Avant → Après</th>
                <th className="px-4 py-3 font-semibold">Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {m.movedAt.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 font-medium">{m.type}</td>
                  <td className="px-4 py-3">
                    <Link prefetch={false}
                      href={`/stocks/articles/${m.articleId}`}
                      className="text-msk-blue hover:underline"
                    >
                      {m.article.code}
                    </Link>{" "}
                    <span className="text-msk-ink/45">{m.article.designation}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {qtyStr(m.quantity)} {m.article.unit}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-msk-ink/70">
                    {qtyStr(m.qtyBefore)} → {qtyStr(m.qtyAfter)}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {m.createdBy.firstName} {m.createdBy.lastName}
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
