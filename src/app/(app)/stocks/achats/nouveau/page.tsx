import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { PurchaseForm } from "@/components/stocks/purchase-form";

export const metadata: Metadata = { title: "Nouvel achat" };

export default async function StocksAchatNouveauPage() {
  const user = await requireUser();
  if (!hasPermission(user, "stk.achats.manage")) {
    redirect("/stocks/achats");
  }

  const articles = await prisma.stkArticle.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, designation: true },
  });

  return (
    <PageShell>
      <PageHeader
        title="Nouvel achat"
        description="Brouillon fournisseur + lignes — commande et réception depuis la fiche."
        backHref="/stocks/achats"
        backLabel="Retour achats"
        breadcrumbs={[
          { label: "Stocks", href: "/stocks" },
          { label: "Achats", href: "/stocks/achats" },
          { label: "Nouveau" },
        ]}
      />
      <Surface className="max-w-2xl p-5">
        <PurchaseForm articles={articles} />
      </Surface>
    </PageShell>
  );
}
