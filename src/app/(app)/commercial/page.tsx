import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  comOwnerScopeWhere,
  comQuoteOwnerScopeWhere,
  comInvoiceOwnerScopeWhere,
} from "@/lib/commercial/scope";
import { dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { COMMERCIAL_MODULES } from "@/lib/commercial/modules";
import { canSeeCrmTeamView } from "@/lib/commercial/nav";
import { CommercialHubGrid } from "@/components/commercial/commercial-hub-cards";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = { title: "Commercial" };

const linkBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition";
const linkPrimary = `${linkBtn} bg-msk-blue text-white hover:bg-msk-blue/90`;
const linkSecondary = `${linkBtn} border border-msk-ink/15 bg-white text-msk-ink hover:bg-msk-chalk`;

export default async function CommercialHubPage() {
  const user = await requireUser();
  if (
    !hasPermission(user, "com.access") &&
    !hasPermission(user, "crm.access")
  ) {
    redirect("/accueil");
  }

  const teamIds = await commercialTeamUserIds();
  const dealScope = dealOwnerScopeWhere(user, teamIds);
  const clientWhere = comOwnerScopeWhere(user);
  const quoteWhere = comQuoteOwnerScopeWhere(user);
  const invoiceWhere = comInvoiceOwnerScopeWhere(user);

  const canCrm = hasPermission(user, "crm.access");
  const canCom = hasPermission(user, "com.access");
  const canCreateProspect = hasPermission(user, "crm.prospect.create");
  const canCreateQuote = hasPermission(user, "com.devis.create");

  const [prospects, overdue, scripts, clients, openQuotes, unpaid] =
    await Promise.all([
      canCrm
        ? prisma.crmOpportunity.count({
            where: {
              ...dealScope,
              stage: { notIn: ["GAGNE", "PERDU"] },
            },
          })
        : Promise.resolve(0),
      canCrm
        ? prisma.crmTask.count({
            where: {
              status: "OPEN",
              dueAt: { lt: new Date() },
              ...(hasPermission(user, "crm.reports.global") || user.isSuperAdmin
                ? {}
                : hasPermission(user, "crm.view_team")
                  ? { assigneeId: { in: [user.id, ...teamIds] } }
                  : { assigneeId: user.id }),
            },
          })
        : Promise.resolve(0),
      hasPermission(user, "crm.scripts.view")
        ? prisma.crmScript.count({ where: { active: true } })
        : Promise.resolve(0),
      canCom
        ? prisma.comClient.count({ where: clientWhere })
        : Promise.resolve(0),
      canCom
        ? prisma.comQuote.count({
            where: {
              ...quoteWhere,
              status: { in: ["BROUILLON", "ENVOYE"] },
            },
          })
        : Promise.resolve(0),
      canCom
        ? prisma.comInvoice.count({
            where: {
              ...invoiceWhere,
              status: { in: ["EMISE", "PARTIELLEMENT_PAYEE"] },
            },
          })
        : Promise.resolve(0),
    ]);

  const modules = COMMERCIAL_MODULES.filter((m) => {
    if (m.id === "equipe" && !canSeeCrmTeamView(user)) return false;
    if (!m.permission) return true;
    return hasPermission(user, m.permission);
  });

  const counts: Partial<Record<string, number>> = {
    prospects,
    relances: overdue,
    scripts,
    clients,
    devis: openQuotes,
    factures: unpaid,
  };

  return (
    <PageShell>
      <PageHeader
        title="Commercial"
        description="Prospection, vente et pilotage — indicateurs en direct."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Commercial" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreateProspect ? (
              <Link
                prefetch={false}
                href="/crm/prospects/nouveau"
                className={linkPrimary}
              >
                + Nouveau prospect
              </Link>
            ) : null}
            {canCreateQuote ? (
              <Link
                prefetch={false}
                href="/commercial/devis/nouveau"
                className={linkSecondary}
              >
                + Nouveau devis
              </Link>
            ) : null}
          </div>
        }
      />

      <CommercialHubGrid
        modules={modules}
        counts={counts}
        urgency={{
          relances: overdue,
          factures: unpaid,
          showRapport: canCrm,
        }}
      />
    </PageShell>
  );
}
