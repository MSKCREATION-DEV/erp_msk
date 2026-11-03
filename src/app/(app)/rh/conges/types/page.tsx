import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Types de congés" };

export default async function RhLeaveTypesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "rh.leave.validate")) redirect("/accueil");

  const types = await prisma.rhLeaveTypeConfig.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return (
    <PageShell>
      <PageHeader
        title="Catalogue des types de congés"
        description="Référentiel métier (Code du travail maliien + params MSK). Les types inactifs ne sont pas proposés aux collaborateurs tant que non validés."
        backHref="/rh/conges"
        backLabel="Retour congés"
        breadcrumbs={[
          { label: "RH", href: "/rh" },
          { label: "Congés", href: "/rh/conges" },
          { label: "Types" },
        ]}
      />

      <Surface className="overflow-x-auto p-0">
        {types.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-msk-ink/50">
            Aucun type — appliquer la migration seed.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-msk-ink/6 text-msk-ink/45">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 font-medium">Base légale</th>
                <th className="px-4 py-3 font-medium">Solde</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="border-b border-msk-ink/6">
                  <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-msk-ink">{t.label}</p>
                    {t.notes ? (
                      <p className="mt-0.5 text-xs text-msk-ink/45">{t.notes}</p>
                    ) : null}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs text-msk-ink/60">
                    {t.legalBasis ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t.impactsLeaveBalance ? "Oui" : "Non"}
                    {t.paid ? " · payé" : " · non payé"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={t.active ? "success" : "muted"}>
                      {t.active ? "Actif" : "À valider"}
                    </Badge>
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
