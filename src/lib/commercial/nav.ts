import type { SessionUser } from "@/lib/rbac/resolve";
import { hasPermission } from "@/lib/rbac/resolve";
import { crmVisibility } from "@/lib/crm/scope";
import type { CommercialSubnavItem } from "@/components/commercial/commercial-subnav";

/** Vue Équipe : lead / manager — pas les collabs « own only ». */
export function canSeeCrmTeamView(user: SessionUser): boolean {
  return crmVisibility(user) !== "own";
}

/** Tabs Commercial — filtrés selon droits (Menu ≠ Tableau de bord). */
export function commercialNavItems(user: SessionUser): CommercialSubnavItem[] {
  const canCrm = hasPermission(user, "crm.access");
  const canTeam = canSeeCrmTeamView(user);
  const canScripts = hasPermission(user, "crm.scripts.view");
  const canCom = hasPermission(user, "com.access");
  const canCatalogue = hasPermission(user, "com.catalogue.view");

  const items: CommercialSubnavItem[] = [
    { href: "/commercial", label: "Menu" },
  ];

  if (canCrm) {
    items.push({ href: "/crm", label: "Tableau de bord" });
    items.push({
      href: "/crm/prospects",
      label: "Prospects",
      match: ["/commercial/prospects", "/crm/par-etapes"],
    });
    items.push({ href: "/crm/relances", label: "Relances" });
  }
  if (canScripts) {
    items.push({ href: "/crm/scripts", label: "Scripts" });
  }
  if (canCrm && canTeam) {
    items.push({ href: "/crm/equipe", label: "Vue Équipe" });
  }
  if (canCrm) {
    items.push({ href: "/crm/rapport-semaine", label: "Rapport" });
  }
  if (canCom) {
    items.push({ href: "/commercial/clients", label: "Clients" });
    items.push({ href: "/commercial/devis", label: "Devis" });
    items.push({ href: "/commercial/factures", label: "Factures" });
  }
  if (canCatalogue) {
    items.push({
      href: "/catalogue",
      label: "Offres",
      match: ["/commercial/offres"],
    });
  }

  return items;
}
