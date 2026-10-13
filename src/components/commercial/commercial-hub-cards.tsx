import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Receipt,
  Tag,
  Users,
} from "lucide-react";
import {
  HUB_SECTIONS,
  type CommercialModule,
} from "@/lib/commercial/modules";
import { HubMiniRadial } from "@/components/commercial/hub-mini-radial";
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

const TONE_ICON: Record<CommercialModule["tone"], string> = {
  blue: "bg-msk-blue/10 text-msk-blue",
  coral: "bg-msk-coral/10 text-msk-coral",
  cyan: "bg-[#00ACEE]/12 text-[#1384CB]",
  ink: "bg-msk-ink/[0.06] text-msk-ink/70",
};

const TONE_CHART: Record<"coral" | "blue" | "ink", string> = {
  coral: "#FF5A3C",
  blue: "#1D73BC",
  ink: "#284393",
};

const cardShell =
  "group flex h-full flex-col rounded-xl border border-msk-ink/[0.08] bg-white p-4 shadow-sm transition hover:border-msk-blue/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40";

function kpiLabel(
  module: CommercialModule,
  count?: number | null,
): { value: string; hint?: string } | null {
  switch (module.id) {
    case "relances":
      if (count == null) return null;
      return count > 0
        ? { value: String(count), hint: "à faire" }
        : { value: "0", hint: "à jour" };
    case "scripts":
      return count != null
        ? {
            value: String(count),
            hint: count > 1 ? "modèles" : "modèle",
          }
        : null;
    case "prospects":
      return count != null
        ? {
            value: String(count),
            hint: count > 1 ? "prospects" : "prospect",
          }
        : null;
    case "devis":
      return count != null
        ? { value: String(count), hint: "ouverts" }
        : null;
    case "factures":
      return count != null
        ? {
            value: String(count),
            hint: count > 1 ? "à encaisser" : "à encaisser",
          }
        : null;
    case "clients":
      return count != null
        ? {
            value: String(count),
            hint: count > 1 ? "clients" : "client",
          }
        : null;
    case "offres":
      return module.badgeLabel
        ? { value: module.badgeLabel }
        : null;
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
  const Icon = ICONS[module.id] ?? FileText;
  const kpi = kpiLabel(module, count);

  return (
    <Link prefetch={false} href={module.href} className={cardShell}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            TONE_ICON[module.tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex min-w-0 items-start gap-2">
          {kpi ? (
            <div className="min-w-0 text-right">
              <p className="text-lg font-semibold tabular-nums leading-none text-msk-ink">
                {kpi.value}
              </p>
              {kpi.hint ? (
                <p className="mt-0.5 text-[11px] leading-tight text-msk-ink/45">
                  {kpi.hint}
                </p>
              ) : null}
            </div>
          ) : null}
          <ArrowRight
            className="mt-0.5 h-4 w-4 shrink-0 text-msk-blue/55 transition group-hover:translate-x-0.5 group-hover:text-msk-blue"
            aria-hidden
          />
        </div>
      </div>
      <h3 className="mt-3 text-base font-semibold text-msk-ink">
        {module.title}
      </h3>
      <p className="mt-1 flex-1 text-[13px] leading-snug text-msk-ink/50">
        {module.description}
      </p>
    </Link>
  );
}

export type HubUrgency = {
  relances: number;
  factures: number;
  showRapport: boolean;
};

/** Progression semaine → vendredi (0–5) pour le mini radial rapport. */
function rapportWeekProgress(): number {
  const d = new Date().getDay(); // 0 dim … 5 ven … 6 sam
  if (d === 0) return 0;
  if (d === 6) return 5;
  return d;
}

function UrgencyCard({
  href,
  tone,
  icon: Icon,
  value,
  label,
  chartValue,
  chartMax,
}: {
  href: string;
  tone: "coral" | "blue" | "ink";
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  chartValue: number;
  chartMax: number;
}) {
  const iconWrap =
    tone === "coral"
      ? "bg-msk-coral/10 text-msk-coral"
      : tone === "blue"
        ? "bg-msk-blue/10 text-msk-blue"
        : "bg-msk-ink/[0.06] text-msk-ink/70";

  return (
    <Link prefetch={false} href={href} className={cardShell}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            iconWrap,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 text-right">
            <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-msk-ink">
              {value}
            </p>
            <p className="mt-1 text-[11px] leading-tight text-msk-ink/45">
              {label}
            </p>
          </div>
          <ArrowRight
            className="mt-1 h-4 w-4 shrink-0 text-msk-blue/55 transition group-hover:translate-x-0.5 group-hover:text-msk-blue"
            aria-hidden
          />
        </div>
      </div>
      <div className="mt-auto flex justify-end pt-3">
        <HubMiniRadial
          value={chartValue}
          max={chartMax}
          color={TONE_CHART[tone]}
        />
      </div>
    </Link>
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

  const showUrgency =
    urgency.relances > 0 || urgency.factures > 0 || urgency.showRapport;

  const relancesScale = Math.max(5, urgency.relances);
  const facturesScale = Math.max(5, urgency.factures);

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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {urgency.relances > 0 ? (
              <UrgencyCard
                href="/crm/relances"
                tone="coral"
                icon={Bell}
                value={urgency.relances}
                label={
                  urgency.relances > 1
                    ? "relances à faire"
                    : "relance à faire"
                }
                chartValue={urgency.relances}
                chartMax={relancesScale}
              />
            ) : null}
            {urgency.factures > 0 ? (
              <UrgencyCard
                href="/commercial/factures"
                tone="blue"
                icon={Receipt}
                value={urgency.factures}
                label={
                  urgency.factures > 1
                    ? "factures à encaisser"
                    : "facture à encaisser"
                }
                chartValue={urgency.factures}
                chartMax={facturesScale}
              />
            ) : null}
            {urgency.showRapport ? (
              <UrgencyCard
                href="/crm/rapport-semaine"
                tone="ink"
                icon={Calendar}
                value="Ven. 17h"
                label="échéance rapport hebdo"
                chartValue={rapportWeekProgress()}
                chartMax={5}
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
