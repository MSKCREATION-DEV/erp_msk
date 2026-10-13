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

function countBadge(
  module: CommercialModule,
  count?: number | null,
): string | null {
  switch (module.id) {
    case "relances":
      if (count == null) return null;
      return count > 0 ? `À faire ${count}` : "À jour";
    case "scripts":
      return count != null
        ? `${count} modèle${count > 1 ? "s" : ""}`
        : null;
    case "prospects":
      return count != null
        ? `${count} prospect${count > 1 ? "s" : ""}`
        : null;
    case "devis":
      return count != null ? `${count} devis` : null;
    case "factures":
      return count != null
        ? `${count} facture${count > 1 ? "s" : ""}`
        : null;
    case "clients":
      return count != null
        ? `${count} client${count > 1 ? "s" : ""}`
        : null;
    default:
      return module.badgeLabel ?? null;
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
  const badge = countBadge(module, count);

  return (
    <Link
      prefetch={false}
      href={module.href}
      className="group flex h-full flex-col rounded-xl border border-msk-ink/[0.08] bg-white p-4 shadow-sm transition hover:border-msk-blue/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full",
            TONE_ICON[module.tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <ArrowRight
          className="mt-1 h-4 w-4 shrink-0 text-msk-blue opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3 className="text-base font-semibold text-msk-ink">{module.title}</h3>
        {badge ? (
          <span className="text-sm font-semibold tabular-nums text-msk-ink/80">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 flex-1 text-[13px] leading-snug text-msk-ink/50">
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

function UrgencyCard({
  href,
  tone,
  icon: Icon,
  value,
  label,
  cta,
}: {
  href: string;
  tone: "coral" | "blue" | "ink";
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  cta: string;
}) {
  const wrap =
    tone === "coral"
      ? "border-msk-coral/25 bg-msk-coral/[0.06]"
      : tone === "blue"
        ? "border-msk-blue/20 bg-msk-blue/[0.05]"
        : "border-msk-ink/10 bg-msk-ink/[0.03]";
  const iconWrap =
    tone === "coral"
      ? "bg-msk-coral/15 text-msk-coral"
      : tone === "blue"
        ? "bg-msk-blue/12 text-msk-blue"
        : "bg-msk-ink/[0.08] text-msk-ink/65";

  return (
    <Link
      prefetch={false}
      href={href}
      className={cn(
        "group flex flex-col justify-between rounded-xl border p-4 transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-msk-blue/40 sm:min-h-[7.5rem]",
        wrap,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            iconWrap,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-msk-ink">
            {value}
          </p>
          <p className="mt-0.5 text-sm text-msk-ink/60">{label}</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-msk-blue group-hover:underline">
        {cta}
      </p>
    </Link>
  );
}

/** Hub Menu Commercial — urgences + sections (proposition v2, charte MSK). */
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
                label={`relance${urgency.relances > 1 ? "s" : ""} à faire`}
                cta="Traiter mes relances →"
              />
            ) : null}
            {urgency.factures > 0 ? (
              <UrgencyCard
                href="/commercial/factures"
                tone="blue"
                icon={Receipt}
                value={urgency.factures}
                label={`facture${urgency.factures > 1 ? "s" : ""} à encaisser`}
                cta="Voir les factures →"
              />
            ) : null}
            {urgency.showRapport ? (
              <UrgencyCard
                href="/crm/rapport-semaine"
                tone="ink"
                icon={Calendar}
                value={<span className="text-2xl sm:text-3xl">Ven. 17h</span>}
                label="échéance du rapport hebdo"
                cta="Préparer le rapport →"
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
