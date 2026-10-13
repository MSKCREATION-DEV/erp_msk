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
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  HUB_SECTIONS,
  type CommercialModule,
} from "@/lib/commercial/modules";
import { HubMiniRadial } from "@/components/commercial/hub-mini-radial";
import {
  MetricNavCard,
  MetricNavKpi,
  METRIC_NAV_TONE_CHART,
  type MetricNavTone,
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
      footer={
        kpi ? <MetricNavKpi value={kpi.value} hint={kpi.hint} /> : undefined
      }
    />
  );
}

export type HubUrgency = {
  relances: number;
  factures: number;
};

function UrgencyMetricCard({
  href,
  tone,
  icon,
  title,
  description,
  value,
  caption,
}: {
  href: string;
  tone: Exclude<MetricNavTone, "cyan">;
  icon: LucideIcon;
  title: string;
  description: string;
  value: number;
  caption: string;
}) {
  const scale = Math.max(5, value);

  return (
    <MetricNavCard
      href={href}
      icon={icon}
      tone={tone}
      title={title}
      description={description}
      footer={
        <HubMiniRadial
          value={value}
          max={scale}
          color={METRIC_NAV_TONE_CHART[tone]}
          centerLabel={value}
          caption={caption}
        />
      }
    />
  );
}

/** Hub Menu Commercial — urgences + sections (Pilotage en tête). */
export function CommercialHubGrid({
  modules,
  counts,
  urgency,
}: {
  modules: CommercialModule[];
  counts?: Partial<Record<string, number>>;
  urgency: HubUrgency;
}) {
  const bySection = (id: CommercialModule["section"]) =>
    modules.filter((m) => m.section === id);

  const showUrgency = urgency.relances > 0 || urgency.factures > 0;

  return (
    <div className="space-y-8">
      {showUrgency ? (
        <section aria-labelledby="hub-urgent">
          <div className="mb-3 flex items-baseline gap-2">
            <h2
              id="hub-urgent"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-msk-ink/40"
            >
              À traiter maintenant
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {urgency.relances > 0 ? (
              <UrgencyMetricCard
                href="/crm/relances"
                tone="coral"
                icon={Bell}
                title="Relances"
                description="À faire aujourd’hui, en retard, cette semaine."
                value={urgency.relances}
                caption={
                  urgency.relances > 1
                    ? "relances à faire"
                    : "relance à faire"
                }
              />
            ) : null}
            {urgency.factures > 0 ? (
              <UrgencyMetricCard
                href="/commercial/factures"
                tone="blue"
                icon={Receipt}
                title="Factures"
                description="Émission, paiements et solde à encaisser."
                value={urgency.factures}
                caption={
                  urgency.factures > 1
                    ? "factures à encaisser"
                    : "facture à encaisser"
                }
              />
            ) : null}
          </div>
        </section>
      ) : null}

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
