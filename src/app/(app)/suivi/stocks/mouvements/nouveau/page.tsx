import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermissionFromPaysParam } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import {
  svCountryDisplayLabel,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import { firstParam } from "@/lib/list/search-params";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvStockMoveForm } from "@/components/suivi/stock-move-form";

export const metadata: Metadata = { title: "Mouvement stock · Suivi" };

export default async function SuiviStockMoveNouveauPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const rawSp = await searchParams;
  const country = requireSvPermissionFromPaysParam(
    user,
    "sv.stock.manage",
    rawSp,
  );
  const itemIdParam = firstParam(rawSp.itemId);

  const items = await prisma.svStockItem.findMany({
    where: { country, archivedAt: null },
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
    itemIdParam && items.some((i) => i.id === itemIdParam)
      ? itemIdParam
      : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Mouvement stock"
        description={`Entrée, sortie ou ajustement — toujours traçable · ${svCountryDisplayLabel(country)}.`}
        backHref={
          defaultItemId
            ? withSvCountryQuery(`/suivi/stocks/${defaultItemId}`, country)
            : withSvCountryQuery("/suivi/stocks", country)
        }
      />
      <SvStockMoveForm
        items={items}
        defaultItemId={defaultItemId}
        country={country}
      />
    </PageShell>
  );
}
