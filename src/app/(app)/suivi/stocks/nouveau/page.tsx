import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermissionFromPaysParam } from "@/lib/suivi/access";
import {
  svCountryDisplayLabel,
  withSvCountryQuery,
} from "@/lib/suivi/country";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvStockItemForm } from "@/components/suivi/stock-item-form";

export const metadata: Metadata = { title: "Nouvel article · Stocks Suivi" };

export default async function SuiviStockNouveauPage({
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

  return (
    <PageShell>
      <PageHeader
        title="Nouvel article"
        description={`Identité, unité et quantité d’ouverture · ${svCountryDisplayLabel(country)}.`}
        backHref={withSvCountryQuery("/suivi/stocks", country)}
      />
      <SvStockItemForm mode="create" country={country} />
    </PageShell>
  );
}
