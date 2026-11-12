import {
  Package,
  Receipt,
  ArrowLeftRight,
  LayoutDashboard,
  Users,
  Wallet,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { SUIVI_MODULES, type SuiviModule } from "@/lib/suivi/modules";
import {
  MetricNavCard,
  MetricNavKpi,
  type MetricNavTone,
} from "@/components/ui/metric-nav-card";
import { gridCards4 } from "@/lib/ui/layout-grids";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  clients: Users,
  factures: Receipt,
  charges: Building2,
  comptes: Wallet,
  mouvements: ArrowLeftRight,
  stocks: Package,
};

export type SuiviHubCounts = Partial<
  Record<string, number | { value: number; hint: string }>
>;

function moduleKpi(
  module: SuiviModule,
  count?: number | { value: number; hint: string } | null,
): { value: string; hint?: string } | null {
  if (count == null) return null;
  if (typeof count === "object") {
    return { value: String(count.value), hint: count.hint };
  }
  switch (module.id) {
    case "dashboard":
      return { value: String(count), hint: "pilotage" };
    case "clients":
      return {
        value: String(count),
        hint: count > 1 ? "clients" : "client",
      };
    case "factures":
      return { value: String(count), hint: "à encaisser" };
    case "charges":
      return { value: String(count), hint: "à payer" };
    case "comptes":
      return { value: String(count), hint: "comptes" };
    case "mouvements":
      return { value: String(count), hint: "mouvements" };
    case "stocks":
      return { value: String(count), hint: "à zéro" };
    default:
      return { value: String(count) };
  }
}

export function SuiviHubGrid({
  counts,
  allowed,
}: {
  counts?: SuiviHubCounts;
  allowed: Set<string>;
}) {
  const modules = SUIVI_MODULES.filter(
    (m) => allowed.has(m.permission) || allowed.has("sv.access"),
  );

  return (
    <div className={cn(gridCards4, "gap-3")}>
      {modules.map((module) => {
        const Icon = ICONS[module.id] ?? Users;
        const kpi = moduleKpi(module, counts?.[module.id]);
        return (
          <MetricNavCard
            key={module.id}
            href={module.href}
            icon={Icon}
            tone={module.tone as MetricNavTone}
            title={module.title}
            description={module.description}
            footer={
              kpi ? (
                <MetricNavKpi value={kpi.value} hint={kpi.hint} />
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}
