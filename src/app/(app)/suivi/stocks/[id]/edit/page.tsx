import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvStockItemForm } from "@/components/suivi/stock-item-form";

export const metadata: Metadata = { title: "Modifier article · Stocks Suivi" };

export default async function SuiviStockEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.manage");
  const { id } = await params;

  const item = await prisma.svStockItem.findUnique({ where: { id } });
  if (!item || item.archivedAt) notFound();

  return (
    <PageShell>
      <PageHeader
        title="Modifier l’article"
        description={`${item.code} · ${item.label}`}
        backHref={`/suivi/stocks/${item.id}`}
      />
      <SvStockItemForm mode="edit" itemId={item.id} initial={item} />
    </PageShell>
  );
}
