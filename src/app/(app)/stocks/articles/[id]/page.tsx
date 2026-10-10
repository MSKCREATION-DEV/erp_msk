import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ArticleForm } from "@/components/stocks/article-form";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Article stock" };

function qtyStr(d: Prisma.Decimal | number) {
  return Number(d).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

export default async function StocksArticleDetailPage({ params }: Props) {
  const user = await requireUser();
  if (!hasPermission(user, "stk.access")) redirect("/accueil");
  const { id } = await params;

  const article = await prisma.stkArticle.findUnique({
    where: { id },
    include: {
      movements: {
        take: 20,
        orderBy: { movedAt: "desc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!article) notFound();

  const canManage = hasPermission(user, "stk.articles.manage");
  const canMove = hasPermission(user, "stk.moves.create");
  const low =
    Number(article.stockMin) > 0 &&
    new Prisma.Decimal(article.qtyOnHand).lte(article.stockMin);

  return (
    <PageShell>
      <PageHeader
        title={article.designation}
        description={`${article.code} · ${article.family}${article.subFamily ? ` / ${article.subFamily}` : ""}`}
        backHref="/stocks/articles"
        backLabel="Retour articles"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Articles", href: "/stocks/articles" },
          { label: article.code },
        ]}
        actions={
          canMove ? (
            <Link prefetch={false}
              href={`/stocks/mouvements/nouveau?articleId=${article.id}`}
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Mouvement
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="p-5">
          <p className="text-xs font-semibold tracking-caps uppercase text-msk-ink/45">
            Stock actuel
          </p>
          <p
            className={`mt-2 text-3xl font-semibold tabular-nums ${low ? "text-msk-coral" : "text-msk-ink"}`}
          >
            {qtyStr(article.qtyOnHand)}{" "}
            <span className="text-lg font-medium text-msk-ink/45">
              {article.unit}
            </span>
          </p>
          <p className="mt-2 text-sm text-msk-ink/50">
            Min {qtyStr(article.stockMin)} · {article.location ?? "Sans emplacement"}
            {!article.active ? " · Inactif" : ""}
          </p>
        </Surface>

        <Surface className="p-5">
          <p className="mb-3 text-xs font-semibold tracking-caps uppercase text-msk-ink/45">
            Derniers mouvements
          </p>
          {article.movements.length === 0 ? (
            <p className="text-sm text-msk-ink/45">Aucun mouvement.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {article.movements.map((m) => (
                <li key={m.id} className="flex justify-between gap-2">
                  <span>
                    <span className="font-medium">{m.type}</span>{" "}
                    <span className="text-msk-ink/45">
                      {m.movedAt.toLocaleDateString("fr-FR")}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {qtyStr(m.qtyBefore)} → {qtyStr(m.qtyAfter)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

      {canManage ? (
        <Surface className="max-w-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-msk-ink">Modifier</h2>
          <ArticleForm
            initial={{
              id: article.id,
              code: article.code,
              family: article.family,
              subFamily: article.subFamily,
              designation: article.designation,
              unit: article.unit,
              stockMin: String(Number(article.stockMin)),
              location: article.location,
              unitCostXof: article.unitCostXof,
              observations: article.observations,
              active: article.active,
            }}
          />
        </Surface>
      ) : null}
    </PageShell>
  );
}
