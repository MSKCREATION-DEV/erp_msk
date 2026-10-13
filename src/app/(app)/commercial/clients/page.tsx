import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comOwnerScopeWhere } from "@/lib/commercial/scope";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Clients" };

const linkPrimary =
  "inline-flex h-9 items-center justify-center rounded-lg bg-msk-blue px-3 text-sm font-medium text-white hover:bg-msk-blue/90";

export default async function CommercialClientsPage() {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.clients.view_own") &&
    !hasPermission(user, "com.clients.manage")
  ) {
    redirect("/commercial");
  }

  const clients = await prisma.comClient.findMany({
    where: comOwnerScopeWhere(user),
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      _count: { select: { quotes: true, invoices: true } },
      owner: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Clients"
        description="Clients signés — Commercial."
        backHref="/commercial"
        backLabel="Retour Commercial"
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Clients" },
        ]}
        actions={
          hasPermission(user, "com.clients.manage") ? (
            <Link prefetch={false} href="/commercial/clients/nouveau" className={linkPrimary}>
              Nouveau client
            </Link>
          ) : null
        }
      />

      {clients.length === 0 ? (
        <Surface className="p-8 text-center text-sm text-msk-ink/50">
          Aucun client pour l’instant.{" "}
          {hasPermission(user, "com.clients.manage") ? (
            <Link prefetch={false}
              href="/commercial/clients/nouveau"
              className="font-medium text-msk-blue hover:underline"
            >
              Créer le premier
            </Link>
          ) : null}
        </Surface>
      ) : (
        <Surface className="overflow-x-auto">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="border-b border-msk-ink/10 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Ville</th>
                <th className="px-4 py-3 font-medium">Devis</th>
                <th className="px-4 py-3 font-medium">Factures</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
                >
                  <td className="px-4 py-3">
                    <Link prefetch={false}
                      href={`/commercial/clients/${c.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">
                    {c.contactName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-msk-ink/70">{c.city ?? "—"}</td>
                  <td className="px-4 py-3">{c._count.quotes}</td>
                  <td className="px-4 py-3">{c._count.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      )}
    </PageShell>
  );
}
