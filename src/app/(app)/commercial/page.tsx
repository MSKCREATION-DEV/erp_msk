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
import { crmVisibility, dealOwnerScopeWhere } from "@/lib/crm/scope";
import { commercialTeamUserIds } from "@/lib/crm/team";
import { COMMERCIAL_MODULES } from "@/lib/commercial/modules";
import { canSeeCrmTeamView } from "@/lib/commercial/nav";
import { COM_DOCS_GATED } from "@/lib/commercial/gates";
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
  const vis = crmVisibility(user);
  const hubScopeHint =
    vis === "own"
      ? "Compteurs = mon portefeuille / mes relances. La liste Prospects reste partagée."
      : vis === "team"
        ? "Compteurs = périmètre équipe (à date)."
        : "Compteurs = périmètre entreprise (à date).";

  const canCrm = hasPermission(user, "crm.access");
  const canCom = hasPermission(user, "com.access");
  const canCreateProspect = hasPermission(user, "crm.prospect.create");
  const canCreateQuote = hasPermission(user, "com.devis.create");

  const taskAssigneeWhere =
    hasPermission(user, "crm.reports.global") || user.isSuperAdmin
      ? {}
      : hasPermission(user, "crm.view_team")
        ? { assigneeId: { in: [user.id, ...teamIds] } }
        : { assigneeId: user.id };

  const [prospects, sharedProspects, overdue, openRelances, scripts, clients, openQuotes, unpaid] =
    await Promise.all([
      canCrm
        ? prisma.crmOpportunity.count({
            where: {
              ...dealScope,
              stage: { notIn: ["GAGNE", "PERDU"] },
            },
          })
        : Promise.resolve(0),
      /** Total lecture partagée — uniquement pour clarifier le hub « own ». */
      canCrm && vis === "own"
        ? prisma.crmOpportunity.count({
            where: { stage: { notIn: ["GAGNE", "PERDU"] } },
          })
        : Promise.resolve(null as number | null),
      canCrm
        ? prisma.crmTask.count({
            where: {
              status: "OPEN",
              dueAt: { lt: new Date() },
              ...taskAssigneeWhere,
            },
          })
        : Promise.resolve(0),
      canCrm
        ? prisma.crmTask.count({
            where: {
              status: "OPEN",
              ...taskAssigneeWhere,
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
  }).map((m) => {
    if (m.id === "prospects") {
      return {
        ...m,
        description:
          vis === "own"
            ? "Liste partagée · le compteur = dossiers suivis par moi."
            : "Dossiers actifs du périmètre (hors Client / Perdu).",
      };
    }
    if (m.id === "relances") {
      return {
        ...m,
        description:
          vis === "own"
            ? "Mes relances ouvertes — en retard, aujourd’hui, sous 7 jours."
            : "Relances ouvertes du périmètre — en retard et à venir.",
      };
    }
    return m;
  });

  const prospectsHint =
    vis === "own" && sharedProspects != null
      ? prospects === 0
        ? `0 suivis · ${sharedProspects} visibles`
        : `${prospects} suivis · ${sharedProspects} visibles`
      : vis === "own"
        ? prospects === 1
          ? "suivi par moi"
          : "suivis par moi"
        : prospects === 1
          ? "dossier actif"
          : "dossiers actifs";

  const counts: Partial<
    Record<string, number | { value: number; hint: string }>
  > = {
    prospects: { value: prospects, hint: prospectsHint },
    relances: {
      value: overdue,
      hint:
        overdue > 0
          ? `en retard · ${openRelances} ouvertes`
          : openRelances > 0
            ? `${openRelances} ouvertes · 0 retard`
            : "aucune ouverte",
    },
    scripts,
    clients: {
      value: clients,
      hint:
        vis === "own" || !canCom
          ? clients === 1
            ? "mon client"
            : "mes clients"
          : clients === 1
            ? "client"
            : "clients",
    },
    devis: openQuotes,
    factures: unpaid,
  };

  return (
    <PageShell>
      <PageHeader
        title="Commercial"
        description={`Prospection, vente et pilotage — ${hubScopeHint}`}
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
            {canCreateQuote && !COM_DOCS_GATED ? (
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

      <CommercialHubGrid modules={modules} counts={counts} />
    </PageShell>
  );
}
