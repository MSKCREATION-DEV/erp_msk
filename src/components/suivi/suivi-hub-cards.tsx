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
import {
  SUIVI_HUB_SECTIONS,
  SUIVI_MODULES,
  type SuiviModule,
} from "@/lib/suivi/modules";
import {
  MetricNavCard,
  MetricNavKpi,
  type MetricNavTone,
} from "@/components/ui/metric-nav-card";
import { gridCards3, gridCards4 } from "@/lib/ui/layout-grids";
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

function ModuleCard({
  module,
  count,
}: {
  module: SuiviModule;
  count?: number | { value: number; hint: string } | null;
}) {
  const Icon = ICONS[module.id] ?? Users;
  const kpi = moduleKpi(module, count);
  return (
    <MetricNavCard
      href={module.href}
      icon={Icon}
      tone={module.tone as MetricNavTone}
      title={module.title}
      description={module.description}
      footer={
        kpi ? <MetricNavKpi value={kpi.value} hint={kpi.hint} /> : undefined
      }
    />
  );
}

/** Hub Menu Suivi — sections Pilotage / Clients / Trésorerie / Stocks (comme Commercial). */
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

  const bySection = (id: SuiviModule["section"]) =>
    modules.filter((m) => m.section === id);

  return (
    <div className="space-y-8">
      {SUIVI_HUB_SECTIONS.map((section) => {
        const items = bySection(section.id);
        if (items.length === 0) return null;
        return (
          <section key={section.id} aria-labelledby={`sv-hub-${section.id}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2
                id={`sv-hub-${section.id}`}
                className="text-lg font-semibold text-msk-ink"
              >
                {section.title}
              </h2>
              <p className="text-sm text-msk-ink/45">{section.subtitle}</p>
            </div>
            <div
              className={cn(
                section.id === "tresorerie" ? gridCards4 : gridCards3,
              )}
            >
              {items.map((m) => (
                <ModuleCard
                  key={m.id}
                  module={m}
                  count={counts?.[m.id] ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
