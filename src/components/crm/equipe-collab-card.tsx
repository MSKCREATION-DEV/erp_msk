import Link from "next/link";
import { FileText, FolderOpen } from "lucide-react";
import { STAGE_LABELS, STAGE_ORDER, formatXof } from "@/lib/crm/labels";
import type { GoalProgressItem } from "@/lib/crm/goals";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { ActionLink } from "@/components/ui/action-link";
import { KpiRadial } from "@/components/crm/kpi-radial";
import { GoalsProgressStrip } from "@/components/crm/goals-progress-strip";
import { EquipeFocusName } from "@/components/crm/equipe-focus-name";
import { cn } from "@/lib/utils";

export function EquipeCollabCard({
  ownerId,
  name,
  total,
  caOpen,
  interesses,
  overdue,
  relancesFaites,
  byStage,
  goals,
  focused,
  periodLabel,
  baseQuery = "",
  rapportHref,
  prospectsHref,
  showStocks = true,
  showGoals = true,
}: {
  ownerId: string;
  name: string;
  total: number;
  caOpen: number;
  interesses: number;
  overdue: number;
  relancesFaites: number;
  byStage: Record<string, number>;
  goals: GoalProgressItem[];
  focused: boolean;
  periodLabel: string;
  baseQuery?: string;
  rapportHref: string;
  /** Lien Prospects avec période + owner. */
  prospectsHref: string;
  showStocks?: boolean;
  showGoals?: boolean;
}) {
  const subtitle = showStocks
    ? `${total} prospect${total > 1 ? "s" : ""} · montant en cours ${formatXof(caOpen)}`
    : `Activité · ${periodLabel.toLowerCase()}`;

  return (
    <Surface
      className={cn("space-y-4 p-5", focused && "ring-2 ring-msk-blue/25")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EquipeFocusName
          ownerId={ownerId}
          name={name}
          focused={focused}
          baseQuery={baseQuery}
          subtitle={subtitle}
        />
        <div className="flex flex-wrap gap-2">
          <ActionLink
            href={rapportHref}
            icon={FileText}
            variant="secondary"
            size="sm"
          >
            Rapport
          </ActionLink>
          <ActionLink
            href={prospectsHref}
            icon={FolderOpen}
            variant="secondary"
            size="sm"
          >
            Prospects
          </ActionLink>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
          Activité · {periodLabel}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiRadial
            label="Relances faites"
            value={relancesFaites}
            tone={relancesFaites > 0 ? "coral" : "blue"}
            hint={periodLabel.toLowerCase()}
          />
        </div>
      </div>

      {showStocks ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-msk-ink/35">
            Portefeuille à date
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiRadial
              label="Prospects"
              value={total}
              hint="hors clients"
            />
            <KpiRadial label="Intéressés" value={interesses} hint="à date" />
            <KpiRadial
              label="Retards"
              value={overdue}
              tone={overdue > 0 ? "coral" : "blue"}
              hint="à date"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {STAGE_ORDER.map((s) => {
              const n = byStage[s] ?? 0;
              if (n === 0) return null;
              const href =
                s === "GAGNE"
                  ? (() => {
                      const p = new URLSearchParams(baseQuery);
                      p.set("owner", ownerId);
                      p.set("event", "gagnes");
                      return `/commercial/clients?${p.toString()}`;
                    })()
                  : (() => {
                      const p = new URLSearchParams(baseQuery);
                      p.set("owner", ownerId);
                      p.set("view", "stock");
                      p.set(
                        "stages",
                        s === "DEVIS_ENVOYE" ? "DEVIS_ENVOYE,NEGOCIATION" : s,
                      );
                      return `/crm/prospects?${p.toString()}`;
                    })();
              return (
                <Link key={s} prefetch={false} href={href}>
                  <Badge
                    tone={
                      s === "PERDU"
                        ? "coral"
                        : s === "GAGNE"
                          ? "success"
                          : "muted"
                    }
                    className="transition hover:ring-2 hover:ring-msk-blue/20"
                  >
                    {STAGE_LABELS[s]} · {n}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {showGoals && goals.length > 0 ? (
        <GoalsProgressStrip
          progress={goals}
          title={`Objectifs · ${periodLabel}`}
          compact
          embedded
        />
      ) : null}
    </Surface>
  );
}
