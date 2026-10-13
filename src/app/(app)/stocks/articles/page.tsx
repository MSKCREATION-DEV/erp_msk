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

export const metadata: Metadata = { title: "Articles stock" };

function qtyStr(d: Prisma.Decimal | number) {
  return Number(d).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

export default async function StocksArticlesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "stk.access")) redirect("/accueil");
  const canManage = hasPermission(user, "stk.articles.manage");

  const articles = await prisma.stkArticle.findMany({
    orderBy: [{ active: "desc" }, { code: "asc" }],
  });

  return (
    <PageShell>
      <PageHeader
        title="Articles"
        description="Catalogue stock — quantités mises à jour via les mouvements."
        backHref="/stocks"
        backLabel="Retour stocks"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Articles" },
        ]}
        actions={
          canManage ? (
            <Link prefetch={false}
              href="/stocks/articles/nouveau"
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Nouvel article
            </Link>
          ) : null
        }
      />

      <Surface className="overflow-x-auto p-0">
        {articles.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/45">
            Aucun article.{" "}
            {canManage ? (
              <Link prefetch={false} href="/stocks/articles/nouveau" className="text-msk-blue">
                Créer le premier
              </Link>
            ) : null}
          </p>
        ) : (
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="border-b border-msk-paper bg-msk-chalk/60 text-xs tracking-caps uppercase text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Désignation</th>
                <th className="px-4 py-3 font-semibold">Famille</th>
                <th className="px-4 py-3 font-semibold text-right">Stock</th>
                <th className="px-4 py-3 font-semibold text-right">Min</th>
                <th className="px-4 py-3 font-semibold">Lieu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {articles.map((a) => {
                const low =
                  Number(a.stockMin) > 0 &&
                  new Prisma.Decimal(a.qtyOnHand).lte(a.stockMin);
                return (
                  <tr key={a.id} className={!a.active ? "opacity-50" : undefined}>
                    <td className="px-4 py-3 font-medium">
                      <Link prefetch={false}
                        href={`/stocks/articles/${a.id}`}
                        className="text-msk-blue hover:underline"
                      >
                        {a.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-msk-ink/80">{a.designation}</td>
                    <td className="px-4 py-3 text-msk-ink/55">
                      {a.family}
                      {a.subFamily ? ` / ${a.subFamily}` : ""}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${low ? "font-semibold text-msk-coral" : ""}`}
                    >
                      {qtyStr(a.qtyOnHand)} {a.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-msk-ink/55">
                      {qtyStr(a.stockMin)}
                    </td>
                    <td className="px-4 py-3 text-msk-ink/55">{a.location ?? "—"}</td>
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
