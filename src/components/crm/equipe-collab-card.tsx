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
}: {
  ownerId: string;
  name: string;
  total: number;
  caOpen: number;
  interesses: number;
  overdue: number;
  /** Relances journalisées cette semaine (même métrique que Objectifs). */
  relancesFaites: number;
  byStage: Record<string, number>;
  goals: GoalProgressItem[];
  focused: boolean;
}) {
  return (
    <Surface
      className={cn("space-y-4 p-5", focused && "ring-2 ring-msk-blue/25")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EquipeFocusName
          ownerId={ownerId}
          name={name}
          focused={focused}
          subtitle={`${total} prospect${total > 1 ? "s" : ""} · montant en cours ${formatXof(caOpen)}`}
        />
        <div className="flex flex-wrap gap-2">
          <ActionLink
            href={`/crm/rapport-semaine?owner=${ownerId}`}
            icon={FileText}
            variant="secondary"
            size="sm"
          >
            Rapport
          </ActionLink>
          <ActionLink
            href={`/crm/prospects?owner=${ownerId}`}
            icon={FolderOpen}
            variant="secondary"
            size="sm"
          >
            Prospects
          </ActionLink>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiRadial label="Prospects" value={total} hint="hors clients" />
        <KpiRadial
          label="Intéressés"
          value={interesses}
          hint="à convertir"
        />
        <KpiRadial
          label="Retards"
          value={overdue}
          tone={overdue > 0 ? "coral" : "blue"}
          hint="relances dues"
        />
        <KpiRadial
          label="Relances faites"
          value={relancesFaites}
          tone={relancesFaites > 0 ? "coral" : "blue"}
          hint="cette semaine"
        />
      </div>

      {goals.length > 0 ? (
        <GoalsProgressStrip
          progress={goals}
          title="Objectifs semaine"
          compact
          embedded
        />
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {STAGE_ORDER.map((s) => {
          const n = byStage[s] ?? 0;
          if (n === 0) return null;
          const href =
            s === "GAGNE"
              ? `/commercial/clients`
              : `/crm/prospects?owner=${ownerId}&stages=${
                  s === "DEVIS_ENVOYE" ? "DEVIS_ENVOYE,NEGOCIATION" : s
                }`;
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
    </Surface>
  );
}
