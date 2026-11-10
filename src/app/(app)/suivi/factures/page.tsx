import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Factures · Suivi" };

export default async function SuiviFacturesPlaceholderPage() {
  const user = await requireUser();
  requireSvPermission(user, "sv.invoices.view");
  const canManage =
    hasPermission(user, "sv.invoices.manage") || user.isSuperAdmin;

  return (
    <PageShell>
      <PageHeader
        title="Factures"
        description="Factures tampon — payé / reste / remix."
        backHref="/suivi"
        actions={
          canManage ? (
            <Link
              href="/suivi/factures/nouveau"
              className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
            >
              Nouvelle (remix)
            </Link>
          ) : null
        }
      />
      <Surface className="p-6 text-sm text-msk-ink/60">
        Liste factures à venir. Accès OK.
      </Surface>
    </PageShell>
  );
}
