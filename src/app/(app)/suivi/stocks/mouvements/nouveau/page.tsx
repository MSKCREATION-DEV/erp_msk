import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvStockMoveForm } from "@/components/suivi/stock-move-form";

export const metadata: Metadata = { title: "Mouvement stock · Suivi" };

export default async function SuiviStockMoveNouveauPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.manage");
  const { itemId } = await searchParams;

  const items = await prisma.svStockItem.findMany({
    where: { archivedAt: null },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      label: true,
      quantity: true,
      unit: true,
    },
  });

  const defaultItemId =
    itemId && items.some((i) => i.id === itemId) ? itemId : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Mouvement stock"
        description="Entrée, sortie ou ajustement — toujours traçable."
        backHref={
          defaultItemId
            ? `/suivi/stocks/${defaultItemId}`
            : "/suivi/stocks"
        }
      />
      <SvStockMoveForm items={items} defaultItemId={defaultItemId} />
    </PageShell>
  );
}
