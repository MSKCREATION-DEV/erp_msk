import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import { dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import {
  formatXof,
  SOURCE_LABELS,
  STAGE_LABELS,
} from "@/lib/crm/labels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Prospects" };

const linkBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition";
const linkPrimary = `${linkBtn} bg-msk-blue text-white hover:bg-msk-blue/90`;
const linkSecondary = `${linkBtn} border border-msk-ink/15 bg-white text-msk-ink hover:bg-msk-chalk`;

export default async function CrmProspectsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "crm.access")) redirect("/accueil");

  const teamIds = await commercialTeamUserIds();
  const deals = await prisma.crmOpportunity.findMany({
    where: dealOwnerScopeWhere(user, teamIds),
    include: {
      organization: {
        select: {
          name: true,
          contacts: { where: { isPrimary: true }, take: 1 },
        },
      },
      owner: { select: { firstName: true, lastName: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const canCreate = hasPermission(user, "crm.prospect.create");
  const canImport = hasPermission(user, "crm.import");

  return (
    <PageShell>
      <PageHeader
        title="Prospects"
        description="Organisations & opportunités du pipeline."
        backHref="/crm"
        backLabel="Retour au CRM"
        breadcrumbs={[
          { label: "CRM", href: "/crm" },
          { label: "Prospects" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canImport ? (
              <Link href="/crm/prospects/import" className={linkSecondary}>
                Importer CSV
              </Link>
            ) : null}
            {canCreate ? (
              <Link href="/crm/prospects/nouveau" className={linkPrimary}>
                Nouveau prospect
              </Link>
            ) : null}
          </div>
        }
      />

      <Surface className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-msk-ink/[0.08] bg-msk-chalk/50 text-[11px] uppercase tracking-wide text-msk-ink/40">
              <tr>
                <th className="px-4 py-3 font-semibold">Entreprise</th>
                <th className="px-4 py-3 font-semibold">Étape</th>
                <th className="px-4 py-3 font-semibold">Budget</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-msk-ink/[0.06]">
              {deals.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-msk-ink/40"
                  >
                    Aucun prospect.
                    {canCreate ? (
                      <>
                        {" "}
                        <Link
                          href="/crm/prospects/nouveau"
                          className="font-medium text-msk-blue hover:underline"
                        >
                          Créer le premier
                        </Link>
                      </>
                    ) : null}
                  </td>
                </tr>
              ) : (
                deals.map((d) => {
                  const c = d.organization.contacts[0];
                  return (
                    <tr key={d.id} className="hover:bg-msk-chalk/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/crm/prospects/${d.id}`}
                          className="font-medium text-msk-blue hover:underline"
                        >
                          {d.organization.name}
                        </Link>
                        <p className="text-xs text-msk-ink/45">
                          {c
                            ? `${c.firstName} ${c.lastName}`
                            : d.source
                              ? SOURCE_LABELS[d.source]
                              : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="muted">{STAGE_LABELS[d.stage]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-msk-ink/70">
                        {formatXof(d.budgetXof)}
                      </td>
                      <td className="px-4 py-3 text-msk-ink/55">
                        {d.owner.firstName} {d.owner.lastName.charAt(0)}.
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Surface>
    </PageShell>
  );
}
