import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { requireSvPermission } from "@/lib/suivi/access";
import { prisma } from "@/lib/prisma";
import { clientBalance, invoiceReste } from "@/lib/suivi/balances";
import {
  formatSvXof,
  SV_INVOICE_STATUS_LABEL,
  SV_INVOICE_STATUS_TONE,
} from "@/lib/suivi/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Fiche client · Suivi" };

export default async function SuiviClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireSvPermission(user, "sv.clients.view");
  const { id } = await params;

  const client = await prisma.svClient.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { issuedAt: "desc" },
        include: { payments: { orderBy: { paidAt: "desc" } } },
      },
      contracts: { orderBy: { effectiveFrom: "desc" } },
    },
  });
  if (!client) notFound();

  const bal = clientBalance(client.invoices);
  const canInvoice =
    hasPermission(user, "sv.invoices.manage") || user.isSuperAdmin;
  const canEdit =
    hasPermission(user, "sv.clients.manage") || user.isSuperAdmin;

  return (
    <PageShell>
      <PageHeader
        title={client.name}
        description={[client.contactName, client.city, client.country]
          .filter(Boolean)
          .join(" · ")}
        backHref="/suivi/clients"
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Link
                href={`/suivi/clients/${client.id}/edit`}
                className="inline-flex h-9 items-center rounded-lg border border-msk-ink/15 bg-white px-3 text-sm font-medium hover:bg-msk-chalk"
              >
                Modifier
              </Link>
            ) : null}
            {canInvoice ? (
              <Link
                href={`/suivi/factures/nouveau?clientId=${client.id}`}
                className="inline-flex h-9 items-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90"
              >
                Nouvelle facture (remix)
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Totale", value: bal.totale },
          { label: "Payé", value: bal.paye },
          { label: "Restant", value: bal.restant, accent: bal.restant > 0 },
          { label: "À venir", value: bal.aVenir },
        ].map((k) => (
          <Surface key={k.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-caps text-msk-ink/45">
              {k.label}
            </p>
            <p
              className={`mt-1 text-xl font-semibold tabular-nums ${
                k.accent ? "text-msk-coral" : "text-msk-ink"
              }`}
            >
              {formatSvXof(k.value)}
            </p>
          </Surface>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Surface className="p-0 overflow-hidden">
          <div className="border-b border-msk-ink/6 px-4 py-3">
            <h2 className="text-sm font-semibold text-msk-ink">Factures</h2>
          </div>
          {client.invoices.length === 0 ? (
            <p className="p-4 text-sm text-msk-ink/55">Aucune facture.</p>
          ) : (
            <ul className="divide-y divide-msk-ink/6">
              {client.invoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/suivi/factures/${inv.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-msk-blue/4"
                  >
                    <div>
                      <p className="font-medium text-msk-ink">
                        {inv.number ?? "Sans n°"}
                      </p>
                      <p className="text-xs text-msk-ink/50">
                        {inv.object ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge tone={SV_INVOICE_STATUS_TONE[inv.status]}>
                        {SV_INVOICE_STATUS_LABEL[inv.status]}
                      </Badge>
                      <p className="mt-1 text-sm tabular-nums">
                        reste {formatSvXof(invoiceReste(inv))}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <div className="space-y-5">
          <Surface className="p-0 overflow-hidden">
            <div className="border-b border-msk-ink/6 px-4 py-3">
              <h2 className="text-sm font-semibold text-msk-ink">Contrats</h2>
            </div>
            {client.contracts.length === 0 ? (
              <p className="p-4 text-sm text-msk-ink/55">Aucun contrat lié.</p>
            ) : (
              <ul className="divide-y divide-msk-ink/6">
                {client.contracts.map((ct) => (
                  <li key={ct.id} className="px-4 py-3">
                    <p className="font-medium text-msk-ink">{ct.title}</p>
                    <p className="text-xs text-msk-ink/50">
                      {ct.partyName ?? "—"}
                      {ct.monthlyAmount != null
                        ? ` · ${formatSvXof(ct.monthlyAmount)} / mois`
                        : ""}
                    </p>
                    {ct.sourceDocument ? (
                      <p className="mt-1 text-xs text-msk-ink/40">
                        Source : {ct.sourceDocument}
                      </p>
                    ) : null}
                    {ct.notes ? (
                      <p className="mt-1 text-xs text-msk-coral/90">{ct.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="p-0 overflow-hidden">
            <div className="border-b border-msk-ink/6 px-4 py-3">
              <h2 className="text-sm font-semibold text-msk-ink">Paiements</h2>
            </div>
            {client.invoices.flatMap((i) => i.payments).length === 0 ? (
              <p className="p-4 text-sm text-msk-ink/55">Aucun paiement.</p>
            ) : (
              <ul className="divide-y divide-msk-ink/6">
                {client.invoices
                  .flatMap((i) =>
                    i.payments.map((p) => ({
                      ...p,
                      invoiceNumber: i.number,
                      invoiceId: i.id,
                    })),
                  )
                  .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
                  .map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {p.invoiceNumber ?? "Facture"}
                        </p>
                        <p className="text-xs text-msk-ink/50">
                          {p.paidAt.toLocaleDateString("fr-FR")}
                          {p.method ? ` · ${p.method}` : ""}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </p>
                      </div>
                      <span className="tabular-nums font-medium">
                        {formatSvXof(p.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Surface>
        </div>
      </div>
    </PageShell>
  );
}
