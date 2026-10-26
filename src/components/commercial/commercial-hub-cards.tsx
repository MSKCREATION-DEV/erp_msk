import {
  BarChart3,
  Bell,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Receipt,
  Tag,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  HUB_SECTIONS,
  type CommercialModule,
} from "@/lib/commercial/modules";
import {
  MetricNavCard,
  MetricNavKpi,
  METRIC_NAV_TONE_CHART,
} from "@/components/ui/metric-nav-card";
import { HubMiniRadial } from "@/components/commercial/hub-mini-radial";
import { gridCards3, gridCards4 } from "@/lib/ui/layout-grids";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  prospects: Users,
  relances: Bell,
  scripts: MessageSquareText,
  offres: Tag,
  devis: FileSpreadsheet,
  factures: Receipt,
  clients: CheckCircle2,
  tableau: LayoutDashboard,
  equipe: BarChart3,
  rapport: FileText,
  objectifs: Target,
};

export type HubDualSlice = {
  value: number;
  caption: string;
  color?: string;
};

export type HubCount =
  | number
  | {
      value: number;
      hint: string;
    }
  | {
      /** Deux mini-jauges (ex. Prospects : total / suivis). */
      dual: [HubDualSlice, HubDualSlice];
    };

function moduleKpi(
  module: CommercialModule,
  count?: HubCount | null,
): { value: string; hint?: string } | null {
  if (count == null) return null;
  if (typeof count === "object" && "dual" in count) return null;

  const value = typeof count === "number" ? count : count.value;
  if (typeof count === "object") {
    return { value: String(value), hint: count.hint };
  }

  switch (module.id) {
    case "relances":
      return value > 0
        ? { value: String(value), hint: "en retard" }
        : { value: "0", hint: "aucun retard" };
    case "scripts":
      return {
        value: String(value),
        hint: value > 1 ? "modèles" : "modèle",
      };
    case "prospects":
      return {
        value: String(value),
        hint: value > 1 ? "prospects actifs" : "prospect actif",
      };
    case "devis":
      return { value: String(value), hint: "ouverts" };
    case "factures":
      return { value: String(value), hint: "à encaisser" };
    case "clients":
      return {
        value: String(value),
        hint: value > 1 ? "clients" : "client",
      };
    default:
      return null;
  }
}

function ModuleCard({
  module,
  count,
}: {
  module: CommercialModule;
  count?: HubCount | null;
}) {
  const dual =
    count && typeof count === "object" && "dual" in count ? count.dual : null;
  const kpi = moduleKpi(module, count);
  const dualMax = dual
    ? Math.max(5, dual[0].value, dual[1].value)
    : 5;

  return (
    <MetricNavCard
      href={module.href}
      icon={ICONS[module.id] ?? FileText}
      tone={module.tone}
      title={module.title}
      description={module.description}
      gated={module.gated}
      gatedHint={module.gatedHint}
      footer={
        dual && !module.gated ? (
          <div className="flex w-full min-w-0 flex-wrap items-end justify-end gap-1.5">
            <HubMiniRadial
              value={dual[0].value}
              max={dualMax}
              color={dual[0].color ?? METRIC_NAV_TONE_CHART.blue}
              centerLabel={dual[0].value}
              caption={dual[0].caption}
            />
            <HubMiniRadial
              value={dual[1].value}
              max={dualMax}
              color={dual[1].color ?? METRIC_NAV_TONE_CHART.coral}
              centerLabel={dual[1].value}
              caption={dual[1].caption}
            />
          </div>
        ) : kpi && !module.gated ? (
          <MetricNavKpi value={kpi.value} hint={kpi.hint} />
        ) : undefined
      }
    />
  );
}

/** Hub Menu Commercial — sections Pilotage / Prospection / Vente. */
export function CommercialHubGrid({
  modules,
  counts,
}: {
  modules: CommercialModule[];
  counts?: Partial<Record<string, HubCount>>;
}) {
  const bySection = (id: CommercialModule["section"]) =>
    modules.filter((m) => m.section === id);

  return (
    <div className="space-y-8">
      {HUB_SECTIONS.map((section) => {
        const items = bySection(section.id);
        if (items.length === 0) return null;
        return (
          <section key={section.id} aria-labelledby={`hub-${section.id}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2
                id={`hub-${section.id}`}
                className="text-lg font-semibold text-msk-ink"
              >
                {section.title}
              </h2>
              <p className="text-sm text-msk-ink/45">{section.subtitle}</p>
            </div>
            <div
              className={cn(
                section.id === "vente" ? gridCards4 : gridCards3,
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
