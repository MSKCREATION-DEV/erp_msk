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
} from "@/components/ui/metric-nav-card";
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

function moduleKpi(
  module: CommercialModule,
  count?: number | null,
): { value: string; hint?: string } | null {
  if (count == null) return null;

  switch (module.id) {
    case "relances":
      return count > 0
        ? { value: String(count), hint: "à faire" }
        : { value: "0", hint: "à jour" };
    case "scripts":
      return {
        value: String(count),
        hint: count > 1 ? "modèles" : "modèle",
      };
    case "prospects":
      return {
        value: String(count),
        hint: count > 1 ? "prospects" : "prospect",
      };
    case "devis":
      return { value: String(count), hint: "ouverts" };
    case "factures":
      return { value: String(count), hint: "à encaisser" };
    case "clients":
      return {
        value: String(count),
        hint: count > 1 ? "clients" : "client",
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
  count?: number | null;
}) {
  const kpi = moduleKpi(module, count);

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
        kpi && !module.gated ? (
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
  counts?: Partial<Record<string, number>>;
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
                "grid gap-3",
                section.id === "vente"
                  ? "sm:grid-cols-2 xl:grid-cols-4"
                  : "sm:grid-cols-2 xl:grid-cols-3",
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
