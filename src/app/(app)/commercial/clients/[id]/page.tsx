import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { canAccessOwned } from "@/lib/commercial/scope";
import {
  formatComMoney,
  INVOICE_STATUS_LABELS,
  QUOTE_STATUS_LABELS,
} from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Fiche client" };

const linkPrimary =
  "inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90";

export default async function CommercialClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.clients.view_own") &&
    !hasPermission(user, "com.clients.manage")
  ) {
    redirect("/commercial");
  }
  const { id } = await params;

  const client = await prisma.comClient.findUnique({
    where: { id },
    include: {
      quotes: { orderBy: { createdAt: "desc" }, take: 20 },
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
      owner: { select: { firstName: true, lastName: true } },
    },
  });
  if (!client) notFound();
  if (!canAccessOwned(user, client.ownerId)) redirect("/commercial/clients");

  return (
    <PageShell>
      <PageHeader
        title={client.name}
        description={[client.contactName, client.city, client.country]
          .filter(Boolean)
          .join(" · ")}
        backHref="/commercial/clients"
        backLabel="Retour aux clients"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Clients", href: "/commercial/clients" },
          { label: client.name },
        ]}
        actions={
          hasPermission(user, "com.devis.create") ? (
            <Link prefetch={false}
              href={`/commercial/devis/nouveau?clientId=${client.id}`}
              className={linkPrimary}
            >
              Nouveau devis
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface className="space-y-2 p-5 text-sm lg:col-span-1">
          <p>
            <span className="text-msk-ink/45">E-mail </span>
            {client.email ?? "—"}
          </p>
          <p>
            <span className="text-msk-ink/45">Tél. </span>
            {client.phone ?? "—"}
          </p>
          <p>
            <span className="text-msk-ink/45">Adresse </span>
            {client.address ?? "—"}
          </p>
          <p>
            <span className="text-msk-ink/45">Owner </span>
            {client.owner.firstName} {client.owner.lastName}
          </p>
          {client.notes ? (
            <p className="pt-2 text-msk-ink/70">{client.notes}</p>
          ) : null}
        </Surface>

        <Surface className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-msk-ink">Devis récents</h2>
          {client.quotes.length === 0 ? (
            <p className="mt-2 text-sm text-msk-ink/45">Aucun devis.</p>
          ) : (
            <ul className="mt-3 divide-y divide-msk-ink/5">
              {client.quotes.map((q) => (
                <li
                  key={q.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <Link prefetch={false}
                    href={`/commercial/devis/${q.id}`}
                    className="font-medium text-msk-blue hover:underline"
                  >
                    {q.number}
                  </Link>
                  <Badge tone="muted">{QUOTE_STATUS_LABELS[q.status]}</Badge>
                  <span>{formatComMoney(q.totalTtc, q.currency)}</span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-6 text-sm font-semibold text-msk-ink">
            Factures récentes
          </h2>
          {client.invoices.length === 0 ? (
            <p className="mt-2 text-sm text-msk-ink/45">Aucune facture.</p>
          ) : (
            <ul className="mt-3 divide-y divide-msk-ink/5">
              {client.invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <Link prefetch={false}
                    href={`/commercial/factures/${inv.id}`}
                    className="font-medium text-msk-blue hover:underline"
                  >
                    {inv.number}
                  </Link>
                  <Badge tone="muted">
                    {INVOICE_STATUS_LABELS[inv.status]}
                  </Badge>
                  <span>{formatComMoney(inv.totalTtc, inv.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </PageShell>
  );
}
