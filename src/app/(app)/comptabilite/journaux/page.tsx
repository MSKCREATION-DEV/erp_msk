import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Journaux" };

export default async function ComptabiliteJournauxPage() {
  const user = await requireUser();
  if (!hasPermission(user, "cpt.access")) redirect("/accueil");

  const journals = await prisma.cptJournal.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { entries: true } } },
  });

  const canCreate = hasPermission(user, "cpt.ecritures.manage");

  return (
    <PageShell>
      <PageHeader
        title="Journaux"
        description="Achats, ventes, banque, caisse, OD, paie, mobile money."
        backHref="/comptabilite"
        backLabel="Retour Comptabilité"
        breadcrumbs={[
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Journaux" },
        ]}
      />

      <Surface className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-msk-ink/10 text-msk-ink/45">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Libellé</th>
              <th className="px-4 py-3 font-medium">Écritures</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {journals.map((j) => (
              <tr
                key={j.id}
                className="border-b border-msk-ink/5 hover:bg-msk-chalk/60"
              >
                <td className="px-4 py-3 font-medium text-msk-ink">
                  {j.code}
                </td>
                <td className="px-4 py-3">{j.label}</td>
                <td className="px-4 py-3">{j._count.entries}</td>
                <td className="px-4 py-3">
                  {j.active ? (
                    <Badge tone="success">Actif</Badge>
                  ) : (
                    <Badge tone="muted">Inactif</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link prefetch={false}
                    href={`/comptabilite/ecritures?journalId=${j.id}`}
                    className="font-medium text-msk-blue hover:underline"
                  >
                    Voir les écritures
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>

      {canCreate ? (
        <p className="text-sm text-msk-ink/55">
          Pour saisir une écriture, allez dans{" "}
          <Link prefetch={false}
            href="/comptabilite/ecritures/nouveau"
            className="font-medium text-msk-blue hover:underline"
          >
            Écritures → Nouveau
          </Link>
          .
        </p>
      ) : null}
    </PageShell>
  );
}
