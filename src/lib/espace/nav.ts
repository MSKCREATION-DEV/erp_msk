import { hasPermission, type SessionUser } from "@/lib/rbac/resolve";

export type EspaceNavItem = {
  href: string;
  label: string;
  /** Préfixes additionnels pour l’état actif. */
  match?: string[];
};

/** Sous-nav Mon espace (5 entrées max — profil hors nav). */
export function espaceNavItems(user: SessionUser): EspaceNavItem[] {
  const items: EspaceNavItem[] = [
    { href: "/espace", label: "Vue d’ensemble" },
  ];
  if (hasPermission(user, "self.timesheet.submit")) {
    items.push({
      href: "/espace/heures",
      label: "Mes heures",
      match: ["/espace/heures"],
    });
  }
  if (hasPermission(user, "self.leave.request")) {
    items.push({
      href: "/espace/conges",
      label: "Mes congés",
      match: ["/espace/conges"],
    });
  }
  if (hasPermission(user, "self.absence.submit")) {
    items.push({
      href: "/espace/absences",
      label: "Mes absences",
      match: ["/espace/absences"],
    });
  }
  if (
    hasPermission(user, "self.documents.view") ||
    hasPermission(user, "self.payslip.view")
  ) {
    items.push({
      href: "/espace/documents",
      label: "Mes documents",
      match: ["/espace/documents"],
    });
  }
  return items;
}
