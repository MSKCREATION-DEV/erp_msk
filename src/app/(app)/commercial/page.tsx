import type { Metadata } from "next";
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

  const [prospects, overdue, scripts, clients, openQuotes, unpaid] =
    await Promise.all([
      hasPermission(user, "crm.access")
        ? prisma.crmOpportunity.count({
            where: {
              ...dealScope,
              stage: { notIn: ["GAGNE", "PERDU"] },
            },
          })
        : Promise.resolve(0),
      hasPermission(user, "crm.access")
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
      hasPermission(user, "com.access")
        ? prisma.comClient.count({ where: clientWhere })
        : Promise.resolve(0),
      hasPermission(user, "com.access")
        ? prisma.comQuote.count({
            where: {
              ...quoteWhere,
              status: { in: ["BROUILLON", "ENVOYE"] },
            },
          })
        : Promise.resolve(0),
      hasPermission(user, "com.access")
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
        description="Choisissez un espace — suivi prospects, ventes et offres. Indicateurs en direct."
        breadcrumbs={[
          { label: "Accueil", href: "/accueil" },
          { label: "Commercial" },
        ]}
      />

      <CommercialHubGrid modules={modules} counts={counts} />
    </PageShell>
  );
}
