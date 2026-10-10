import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comOwnerScopeWhere, comQuoteOwnerScopeWhere, comInvoiceOwnerScopeWhere } from "@/lib/commercial/scope";
import { formatComMoney } from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Commercial" };

const linkPrimary =
  "inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90";
const linkSecondary =
  "inline-flex h-9 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium text-msk-ink hover:bg-msk-chalk";

export default async function CommercialDashboardPage() {
  const user = await requireUser();
  if (!hasPermission(user, "com.access")) redirect("/accueil");

  const clientWhere = comOwnerScopeWhere(user);
  const quoteWhere = comQuoteOwnerScopeWhere(user);
  const invoiceWhere = comInvoiceOwnerScopeWhere(user);

  const [clients, openQuotes, unpaidInvoices, unpaidSum] = await Promise.all([
    prisma.comClient.count({ where: clientWhere }),
    prisma.comQuote.count({
      where: {
        ...quoteWhere,
        status: { in: ["BROUILLON", "ENVOYE"] },
      },
    }),
    prisma.comInvoice.count({
      where: {
        ...invoiceWhere,
        status: { in: ["EMISE", "PARTIELLEMENT_PAYEE"] },
      },
    }),
    prisma.comInvoice.findMany({
      where: {
        ...invoiceWhere,
        status: { in: ["EMISE", "PARTIELLEMENT_PAYEE"] },
      },
      select: { totalTtc: true, amountPaid: true, currency: true },
    }),
  ]);

  const unpaidXof = unpaidSum
    .filter((i) => i.currency !== "EUR")
    .reduce((a, i) => a + (i.totalTtc - i.amountPaid), 0);

  return (
    <PageShell>
      <PageHeader
        title="Commercial"
        description="Clients, devis, factures et paiements — cycle cash documentaire."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Commercial" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/commercial/clients" className={linkSecondary}>
              Clients
            </Link>
            <Link href="/commercial/devis" className={linkSecondary}>
              Devis
            </Link>
            <Link href="/commercial/factures" className={linkSecondary}>
              Factures
            </Link>
            {hasPermission(user, "com.clients.manage") ? (
              <Link href="/commercial/clients/nouveau" className={linkPrimary}>
                Nouveau client
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Surface className="p-5">
          <p className="text-sm text-msk-ink/50">Clients</p>
          <p className="mt-1 text-3xl font-semibold text-msk-ink">{clients}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-sm text-msk-ink/50">Devis ouverts</p>
          <p className="mt-1 text-3xl font-semibold text-msk-ink">{openQuotes}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-sm text-msk-ink/50">Factures impayées</p>
          <p className="mt-1 text-3xl font-semibold text-msk-ink">
            {unpaidInvoices}
          </p>
          <p className="mt-1 text-sm text-msk-ink/45">
            Solde {formatComMoney(unpaidXof, "XOF")}
          </p>
        </Surface>
      </div>
    </PageShell>
  );
}
