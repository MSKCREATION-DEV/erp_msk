import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { comContractOwnerScopeWhere } from "@/lib/commercial/scope";
import { formatComMoney } from "@/lib/commercial/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ListTableScroll } from "@/components/ui/list-table-scroll";

export const metadata: Metadata = { title: "Contrats" };

const STATUS_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  RESILIE: "Résilié",
  TERMINE: "Terminé",
};

export default async function ContratsPage() {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.contrats.manage") &&
    !hasPermission(user, "com.access")
  ) {
    redirect("/commercial");
  }

  const scope = comContractOwnerScopeWhere(user);
  const contracts = await prisma.comContract.findMany({
    where: scope,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      client: { select: { id: true, name: true } },
      lines: { select: { unitPrice: true, qty: true, status: true } },
      _count: { select: { invoices: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Contrats"
        description="Engagements clients — snapshots de tarifs, facturation récurrente."
        breadcrumbs={[
          { label: "Commercial", href: "/commercial" },
          { label: "Contrats" },
        ]}
      />

      <Surface className="overflow-hidden p-0">
        {contracts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-msk-ink/50">
            Aucun contrat. Acceptez un devis puis créez le contrat depuis la
            fiche devis.
          </p>
        ) : (
          <ListTableScroll>
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-msk-ink/10 text-msk-ink/45">
                <tr>
                  <th className="px-5 py-3 font-medium">Référence</th>
                  <th className="px-3 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-3 py-3 font-medium">Lignes</th>
                  <th className="px-3 py-3 font-medium">Factures</th>
                  <th className="px-5 py-3 font-medium">MAJ</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const monthly = c.lines
                    .filter((l) => l.status === "ACTIF")
                    .reduce((s, l) => s + l.qty * l.unitPrice, 0);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-msk-ink/5 hover:bg-msk-blue/4"
                    >
                      <td className="px-5 py-3">
                        <Link
                          prefetch={false}
                          href={`/commercial/contrats/${c.id}`}
                          className="font-medium text-msk-blue hover:underline"
                        >
                          {c.reference}
                        </Link>
                        {c.title ? (
                          <p className="text-xs text-msk-ink/45">{c.title}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          prefetch={false}
                          href={`/commercial/clients/${c.client.id}`}
                          className="hover:underline"
                        >
                          {c.client.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          tone={c.status === "ACTIF" ? "success" : "muted"}
                        >
                          {STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {c.lines.length}
                        {monthly > 0 ? (
                          <span className="block text-xs text-msk-ink/45">
                            ~{formatComMoney(monthly, c.currency)}/mois
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {c._count.invoices}
                      </td>
                      <td className="px-5 py-3 text-msk-ink/50">
                        {c.updatedAt.toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ListTableScroll>
        )}
      </Surface>
    </PageShell>
  );
}
