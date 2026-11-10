import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvStockMoveForm } from "@/components/suivi/stock-move-form";

export const metadata: Metadata = { title: "Mouvement stock · Suivi" };

export default async function SuiviStockMoveNouveauPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.manage");

  const items = await prisma.svStockItem.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, label: true, quantity: true },
  });

  return (
    <PageShell>
      <PageHeader
        title="Mouvement stock"
        description="Entrée, sortie ou ajustement."
        backHref="/suivi/stocks"
      />
      <SvStockMoveForm items={items} />
    </PageShell>
  );
}
