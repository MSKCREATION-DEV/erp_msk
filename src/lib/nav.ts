import {
  Home,
  Users,
  Shield,
  FileText,
  Briefcase,
  Calculator,
  FolderKanban,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  /** Route réelle — jamais d’ancre # (sinon double focus). */
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  /** Module non livré : pas de navigation, pas d’état actif. */
  soon?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "Principal",
    items: [
      {
        id: "accueil",
        href: "/accueil",
        label: "Accueil",
        icon: Home,
        permission: "home.view",
      },
      {
        id: "utilisateurs",
        href: "/administration/utilisateurs",
        label: "Utilisateurs",
        icon: Users,
        permission: "users.view",
      },
      {
        id: "crm",
        href: "/bientot/crm",
        label: "CRM",
        icon: Briefcase,
        permission: "crm.access",
        soon: true,
      },
      {
        id: "commercial",
        href: "/bientot/commercial",
        label: "Commercial",
        icon: FileText,
        permission: "com.access",
        soon: true,
      },
      {
        id: "compta",
        href: "/bientot/comptabilite",
        label: "Comptabilité",
        icon: Calculator,
        permission: "cpt.access",
        soon: true,
      },
      {
        id: "projets",
        href: "/bientot/projets",
        label: "Projets",
        icon: FolderKanban,
        permission: "prj.access",
        soon: true,
      },
    ],
  },
  {
    id: "others",
    label: "Autres",
    items: [
      {
        id: "administration",
        href: "/administration/utilisateurs",
        label: "Administration",
        icon: Shield,
        permission: "users.view",
      },
      {
        id: "parametres",
        href: "/bientot/parametres",
        label: "Paramètres",
        icon: Settings,
        permission: "cfg.org",
        soon: true,
      },
    ],
  },
];

/**
 * Un seul item actif à la fois.
 * - Accueil : exact
 * - Autres : match exact ou préfixe enfant
 * - Items `soon` : jamais actifs
 * - En cas d’égalité (ex. Utilisateurs vs Administration même href),
 *   on préfère l’item le plus spécifique (id utilisateurs si path users).
 */
export function isNavActive(
  pathname: string,
  item: NavItem,
  allItems: NavItem[],
): boolean {
  if (item.soon) return false;

  const candidates = allItems.filter(
    (i) =>
      !i.soon &&
      (pathname === i.href || pathname.startsWith(`${i.href}/`)),
  );

  if (candidates.length === 0) {
    return item.href === "/accueil" && pathname === "/accueil";
  }

  // Plus long href = plus spécifique
  const best = candidates.reduce((a, b) =>
    a.href.length >= b.href.length ? a : b,
  );

  // Si plusieurs items partagent le même href, départager
  const sameHref = candidates.filter((c) => c.href === best.href);
  if (sameHref.length > 1) {
    if (pathname.startsWith("/administration/utilisateurs")) {
      return item.id === "utilisateurs";
    }
    return item.id === sameHref[0]!.id;
  }

  return item.id === best.id;
}

export function flatNavItems(): NavItem[] {
  return NAV_GROUPS.flatMap((g) => g.items);
}
