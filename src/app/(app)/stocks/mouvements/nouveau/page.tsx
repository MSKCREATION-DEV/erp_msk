import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { MovementForm } from "@/components/stocks/movement-form";

export const metadata: Metadata = { title: "Nouveau mouvement stock" };

type Props = { searchParams: Promise<{ articleId?: string }> };

export default async function StocksMouvementNouveauPage({ searchParams }: Props) {
  const user = await requireUser();
  if (!hasPermission(user, "stk.moves.create")) {
    redirect("/stocks/mouvements");
  }

  const { articleId } = await searchParams;
  const articles = await prisma.stkArticle.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      designation: true,
      qtyOnHand: true,
      unit: true,
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Nouveau mouvement"
        description="Entrée, sortie ou ajustement — la quantité article est recalculée atomiquement."
        backHref="/stocks/mouvements"
        backLabel="Retour mouvements"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Mouvements", href: "/stocks/mouvements" },
          { label: "Nouveau" },
        ]}
      />
      <Surface className="max-w-lg p-5">
        {articles.length === 0 ? (
          <p className="text-sm text-msk-ink/55">
            Aucun article actif. Créez d’abord un article.
          </p>
        ) : (
          <MovementForm
            articles={articles.map((a) => ({
              id: a.id,
              code: a.code,
              designation: a.designation,
              qtyOnHand: String(Number(a.qtyOnHand)),
              unit: a.unit,
            }))}
            defaultArticleId={articleId}
          />
        )}
      </Surface>
    </PageShell>
  );
}
