import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Stocks · Suivi" };

export default async function SuiviStocksPlaceholderPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.stock.view");
  const canManage =
    hasPermission(user, "sv.stock.manage") || user.isSuperAdmin;

  return (
    <PageShell>
      <PageHeader
        title="Stocks"
        description="Articles et quantités tampon."
        backHref="/suivi"
        actions={
          canManage ? (
            <Link
              href="/suivi/stocks/mouvements/nouveau"
              className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Mouvement stock
            </Link>
          ) : null
        }
      />
      <Surface className="p-6 text-sm text-msk-ink/60">
        Liste stocks à venir. Accès OK.
      </Surface>
    </PageShell>
  );
}
