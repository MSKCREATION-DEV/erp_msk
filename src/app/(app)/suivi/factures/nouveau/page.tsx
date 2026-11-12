import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SvInvoiceRemixForm } from "@/components/suivi/invoice-remix-form";

export const metadata: Metadata = { title: "Nouvelle facture · Suivi" };

export default async function SuiviFactureNouveauPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.invoices.manage");
  const { clientId } = await searchParams;

  const [clients, invoices] = await Promise.all([
    prisma.svClient.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.svInvoice.findMany({
      where: { status: { not: "ANNULEE" } },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        number: true,
        clientId: true,
        object: true,
        lines: {
          orderBy: { sortOrder: "asc" },
          select: {
            label: true,
            description: true,
            qty: true,
            unitPrice: true,
          },
        },
      },
    }),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Nouvelle facture"
        description="Choisir un client, reprendre l’historique, ajuster les lignes."
        backHref="/suivi/factures"
      />
      <SvInvoiceRemixForm
        clients={clients}
        invoices={invoices}
        initialClientId={clientId}
      />
    </PageShell>
  );
}
