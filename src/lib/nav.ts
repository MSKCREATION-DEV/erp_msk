import {
  Home,
  Users,
  FileText,
  Briefcase,
  Calculator,
  FolderKanban,
  FolderOpen,
  Network,
  Settings,
  Palette,
  PenLine,
  UserRound,
  UsersRound,
  Package,
  AlertTriangle,
  BookOpen,
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
  /** Préfixes additionnels pour l’état actif (ex. Commercial couvre /crm, /catalogue). */
  alsoMatch?: string[];
};

export type NavGroup = {
  id: string;
  label: string;
  /** Groupe replié par défaut (ex. modules à venir). */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  items: NavItem[];
};

/**
 * Navigation regroupée pour rester lisible :
 * Principal → Administration → Compte → À venir (replié).
 */
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
        id: "guides",
        href: "/guides",
        label: "Guides",
        icon: BookOpen,
        permission: "home.view",
      },
      {
        id: "ged",
        href: "/ged",
        label: "GED",
        icon: FolderOpen,
        permission: "ged.view_scoped",
      },
      {
        id: "organisation",
        href: "/organisation",
        label: "Organisation",
        icon: Network,
        permission: "orgchart.view",
      },
      {
        id: "commercial",
        href: "/commercial",
        label: "Commercial",
        icon: Briefcase,
        /** Suivi + ventes + offres — une seule entrée (FLOW-COMMERCIAL-E2E). */
        permission: "com.access",
        alsoMatch: ["/crm", "/catalogue"],
      },
      {
        id: "comptabilite",
        href: "/comptabilite",
        label: "Comptabilité",
        icon: Calculator,
        permission: "cpt.access",
      },
      {
        id: "rh",
        href: "/rh",
        label: "RH",
        icon: UsersRound,
        permission: "rh.access",
      },
      {
        id: "stocks",
        href: "/stocks",
        label: "Stocks",
        icon: Package,
        permission: "stk.access",
      },
      {
        id: "patrimoine",
        href: "/patrimoine",
        label: "Patrimoine",
        icon: Briefcase,
        permission: "pat.access",
      },
      {
        id: "projets",
        href: "/projets",
        label: "Projets",
        icon: FolderKanban,
        permission: "prj.access",
      },
      {
        id: "anomalies",
        href: "/ops/anomalies",
        label: "Anomalies",
        icon: AlertTriangle,
        permission: "ops.access",
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      {
        id: "utilisateurs",
        href: "/administration/utilisateurs",
        label: "Utilisateurs",
        icon: Users,
        permission: "users.view",
      },
      {
        id: "charte",
        href: "/administration/charte",
        label: "Charte",
        icon: Palette,
        permission: "cfg.brand",
      },
      {
        id: "gabarits",
        href: "/administration/gabarits",
        label: "Gabarits",
        icon: FileText,
        permission: "cfg.templates",
      },
      {
        id: "contrats-eligibilite",
        href: "/administration/contrats-eligibilite",
        label: "Éligibilité contrats",
        icon: Settings,
        permission: "rh.payroll.run",
      },
      {
        id: "signatures-admin",
        href: "/administration/signatures",
        label: "Signatures",
        icon: PenLine,
        permission: "cfg.signatures",
      },
    ],
  },
  {
    id: "account",
    label: "Compte",
    items: [
      {
        id: "mon-espace",
        href: "/espace",
        label: "Mon espace",
        icon: UserRound,
        permission: "self.leave.request",
      },
      {
        id: "ma-signature",
        href: "/profil/signature",
        label: "Ma signature",
        icon: UserRound,
        permission: "self.signature.manage",
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
 */
export function isNavActive(
  pathname: string,
  item: NavItem,
  allItems: NavItem[],
): boolean {
  if (item.soon) return false;

  const candidates = allItems.filter((i) => {
    if (i.soon) return false;
    if (pathname === i.href || pathname.startsWith(`${i.href}/`)) return true;
    return (i.alsoMatch ?? []).some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
  });

  if (candidates.length === 0) {
    return item.href === "/accueil" && pathname === "/accueil";
  }

  const best = candidates.reduce((a, b) =>
    a.href.length >= b.href.length ? a : b,
  );

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
