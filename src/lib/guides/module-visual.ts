import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Calculator,
  FolderKanban,
  FolderOpen,
  Home,
  Network,
  Package,
  Settings,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/** Icône + accent MSK par module (pas de violet). */
export const MODULE_VISUAL: Record<
  string,
  { icon: LucideIcon; accent: string; soft: string }
> = {
  accueil: {
    icon: Home,
    accent: "text-msk-blue",
    soft: "from-[#2A3D8E]/12 via-msk-blue/10 to-[#00ACEE]/15",
  },
  administration: {
    icon: Settings,
    accent: "text-msk-ink",
    soft: "from-msk-ink/8 via-msk-blue/5 to-msk-chalk",
  },
  ged: {
    icon: FolderOpen,
    accent: "text-msk-blue",
    soft: "from-msk-blue/15 via-[#00ACEE]/10 to-white",
  },
  organisation: {
    icon: Network,
    accent: "text-msk-blue",
    soft: "from-[#2A3D8E]/10 to-msk-blue/8",
  },
  commercial: {
    icon: Briefcase,
    accent: "text-msk-blue",
    soft: "from-[#2A3D8E]/15 via-msk-blue/12 to-[#00ACEE]/20",
  },
  catalogue: {
    icon: BookOpen,
    accent: "text-msk-blue",
    soft: "from-msk-blue/10 to-[#00ACEE]/10",
  },
  comptabilite: {
    icon: Calculator,
    accent: "text-msk-ink",
    soft: "from-msk-ink/6 via-msk-blue/8 to-white",
  },
  rh: {
    icon: UsersRound,
    accent: "text-msk-blue",
    soft: "from-msk-blue/12 to-msk-chalk",
  },
  espace: {
    icon: UserRound,
    accent: "text-msk-blue",
    soft: "from-[#00ACEE]/12 via-msk-blue/8 to-white",
  },
  stocks: {
    icon: Package,
    accent: "text-msk-ink",
    soft: "from-msk-ink/5 to-msk-blue/8",
  },
  patrimoine: {
    icon: Briefcase,
    accent: "text-msk-ink",
    soft: "from-msk-blue/8 to-msk-chalk",
  },
  projets: {
    icon: FolderKanban,
    accent: "text-msk-blue",
    soft: "from-[#2A3D8E]/10 to-msk-blue/10",
  },
  anomalies: {
    icon: AlertTriangle,
    accent: "text-msk-coral",
    soft: "from-msk-coral/10 via-msk-chalk to-white",
  },
};

export function moduleVisual(moduleId: string) {
  return (
    MODULE_VISUAL[moduleId] ?? {
      icon: BookOpen,
      accent: "text-msk-blue",
      soft: "from-msk-blue/10 to-msk-chalk",
    }
  );
}
