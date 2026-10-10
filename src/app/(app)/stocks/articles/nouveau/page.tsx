import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { ArticleForm } from "@/components/stocks/article-form";

export const metadata: Metadata = { title: "Nouvel article stock" };

export default async function StocksArticleNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "stk.articles.manage")) {
    redirect("/stocks/articles");
  }

  return (
    <PageShell>
      <PageHeader
        title="Nouvel article"
        description="Créer une fiche catalogue. Le stock démarre à 0 — utiliser une entrée ensuite."
        backHref="/stocks/articles"
        backLabel="Retour articles"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Articles", href: "/stocks/articles" },
          { label: "Nouveau" },
        ]}
      />
      <Surface className="max-w-2xl p-5">
        <ArticleForm />
      </Surface>
    </PageShell>
  );
}
