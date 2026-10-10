import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Patrimoine" };

const STATUS_LABEL: Record<string, string> = {
  IN_SERVICE: "En service",
  MAINTENANCE: "Maintenance",
  DISPOSED: "Sorti",
};

function xof(n: number) {
  return n.toLocaleString("fr-FR") + " XOF";
}

export default async function PatrimoinePage() {
  const user = await requireUser();
  if (!hasPermission(user, "pat.access")) redirect("/accueil");
  const canManage = hasPermission(user, "pat.manage");

  const assets = await prisma.patAsset.findMany({
    take: 100,
    orderBy: { code: "asc" },
    include: {
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Patrimoine"
        description="Biens immobilisés, assignation et sortie d’actif."
        breadcrumbs={[{ label: "Patrimoine" }]}
        actions={
          canManage ? (
            <Link prefetch={false}
              href="/patrimoine/nouveau"
              className="inline-flex rounded-lg bg-msk-blue px-3 py-2 text-sm font-semibold text-white"
            >
              Nouveau bien
            </Link>
          ) : null
        }
      />

      <Surface className="overflow-x-auto p-0">
        {assets.length === 0 ? (
          <p className="p-6 text-sm text-msk-ink/45">
            Aucun bien.{" "}
            {canManage ? (
              <Link prefetch={false} href="/patrimoine/nouveau" className="text-msk-blue">
                Enregistrer le premier
              </Link>
            ) : null}
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-msk-paper bg-msk-chalk/60 text-xs tracking-caps uppercase text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Désignation</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Valeur</th>
                <th className="px-4 py-3 font-semibold">Assigné</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-paper">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-msk-chalk/40">
                  <td className="px-4 py-3">
                    <Link prefetch={false}
                      href={`/patrimoine/${a.id}`}
                      className="font-medium text-msk-blue hover:underline"
                    >
                      {a.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{a.designation}</td>
                  <td className="px-4 py-3 text-msk-ink/55">{a.category}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-msk-ink/5 px-2 py-0.5 text-xs font-medium">
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{xof(a.valueXof)}</td>
                  <td className="px-4 py-3 text-msk-ink/55">
                    {a.assignedTo
                      ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>
    </PageShell>
  );
}
