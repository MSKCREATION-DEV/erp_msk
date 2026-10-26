import Link from "next/link";
import type { UserStatus } from "@prisma/client";
import { FileText, FolderOpen, History } from "lucide-react";
import { STAGE_LABELS, STAGE_ORDER, formatXof } from "@/lib/crm/labels";
import type { GoalProgressItem } from "@/lib/crm/goals";
import {
  canHaveOperationalGoals,
  isOperationalCrmStatus,
} from "@/lib/crm/team";
import {
  USER_STATUS_LABEL,
  USER_STATUS_TONE,
} from "@/lib/users/status";
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
  status,
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
  status: UserStatus;
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
  prospectsHref: string;
  showStocks?: boolean;
  showGoals?: boolean;
}) {
  const operational = isOperationalCrmStatus(status);
  const statusLabel = USER_STATUS_LABEL[status] ?? status;
  const statusTone = USER_STATUS_TONE[status] ?? "muted";
  const historiqueObjectifsHref = `/crm/objectifs/${ownerId}`;

  if (!operational) {
    const associatedOpen = total;
    return (
      <Surface
        className={cn(
          "space-y-3 p-5",
          focused && "ring-2 ring-msk-blue/25",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-msk-ink">{name}</p>
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </div>
            <p className="mt-1 text-sm text-msk-ink/55">
              Compte {statusLabel.toLowerCase()} — plus d’activité
              opérationnelle.
              {associatedOpen > 0
                ? ` ${associatedOpen} prospect${associatedOpen > 1 ? "s" : ""} encore associé${associatedOpen > 1 ? "s" : ""} (hors Client / Perdu).`
                : " Aucun prospect ouvert encore associé."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionLink
            href={prospectsHref}
            icon={FolderOpen}
            variant="secondary"
            size="sm"
          >
            Voir les prospects associés
          </ActionLink>
          <ActionLink
            href={historiqueObjectifsHref}
            icon={History}
            variant="secondary"
            size="sm"
          >
            Consulter l’historique
          </ActionLink>
        </div>
      </Surface>
    );
  }

  const subtitle = showStocks
    ? `${total} prospect${total > 1 ? "s" : ""} actif${total > 1 ? "s" : ""} · montant en cours ${formatXof(caOpen)}`
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
            Prospects à date
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiRadial
              label="Prospects actifs"
              value={total}
              hint="hors Client / Perdu"
            />
            <KpiRadial
              label="Statut Intéressé"
              value={interesses}
              hint="stock à date"
            />
            <KpiRadial
              label="Relances en retard"
              value={overdue}
              tone={overdue > 0 ? "coral" : "blue"}
              hint="relance dépassée"
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

      {showGoals &&
      canHaveOperationalGoals(status) &&
      goals.length > 0 ? (
        <GoalsProgressStrip
          progress={goals}
          title={`Objectifs · ${periodLabel}`}
          detailHref={`/crm/objectifs/assigner/${ownerId}`}
          detailLabel="Assigner"
          compact
          embedded
        />
      ) : null}
    </Surface>
  );
}
