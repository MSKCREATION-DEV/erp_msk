import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireSvResourceCountry } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { withSvCountryQuery } from "@/lib/suivi/country";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvStockItemForm } from "@/components/suivi/stock-item-form";

export const metadata: Metadata = { title: "Modifier article · Stocks Suivi" };

export default async function SuiviStockEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const rawSp = await searchParams;

  const item = await prisma.svStockItem.findUnique({ where: { id } });
  if (!item || item.archivedAt) notFound();

  const country = requireSvResourceCountry(
    user,
    "sv.stock.manage",
    rawSp,
    item.country,
  );

  return (
    <PageShell>
      <PageHeader
        title="Modifier l’article"
        description={`${item.code} · ${item.label}`}
        backHref={withSvCountryQuery(`/suivi/stocks/${item.id}`, country)}
      />
      <SvStockItemForm
        mode="edit"
        itemId={item.id}
        initial={item}
        country={country}
      />
    </PageShell>
  );
}
