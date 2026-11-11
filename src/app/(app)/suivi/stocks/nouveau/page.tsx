import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvStockItemForm } from "@/components/suivi/stock-item-form";

export const metadata: Metadata = { title: "Nouvel article · Stocks Suivi" };

export default async function SuiviStockNouveauPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.manage");

  return (
    <PageShell>
      <PageHeader
        title="Nouvel article"
        description="Identité, unité et quantité d’ouverture."
        backHref="/suivi/stocks"
      />
      <SvStockItemForm mode="create" />
    </PageShell>
  );
}
