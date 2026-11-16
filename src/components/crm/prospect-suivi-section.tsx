import { ACTIVITY_LABELS } from "@/lib/crm/labels";
import type { CrmActivityType, CrmPipelineStage } from "@/generated/prisma/client";
import {
  followUpRequiredForStage,
  normalizeUiStage,
} from "@/lib/crm/guide-rules";
import { RelanceActions } from "@/components/crm/relance-actions";
import { cn } from "@/lib/utils";

type LastActivity = {
  type: CrmActivityType;
  summary: string;
  body: string | null;
  occurredAt: Date;
  actor: { firstName: string; lastName: string };
};

type OpenTask = {
  id: string;
  title: string;
  dueAt: Date;
};

export type ProspectSuiviSectionProps = {
  lastActivity?: LastActivity;
  nextAction: string | null;
  followUpAt: Date | null;
  followUpOverdue: boolean;
  probability: number | null;
  expectedCloseAt: Date | null;
  stage: CrmPipelineStage;
  tasks: OpenTask[];
  canMutate: boolean;
  opportunityId: string;
  orgName: string;
};

function FlatMeta({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
        {label}
      </p>
      <div className="mt-1 text-sm text-msk-ink">{children}</div>
    </div>
  );
}

export function ProspectSuiviSection({
  lastActivity,
  nextAction,
  followUpAt,
  followUpOverdue,
  probability,
  expectedCloseAt,
  stage,
  tasks,
  canMutate,
  opportunityId,
  orgName,
}: ProspectSuiviSectionProps) {
  const uiStage = normalizeUiStage(stage);
  const requireFollowUp = followUpRequiredForStage(uiStage);

  return (
    <>
      <div className="space-y-4">
        <FlatMeta label="Dernière action">
          {lastActivity ? (
            <p className="text-sm text-msk-ink">
              <span className="font-semibold">
                {ACTIVITY_LABELS[lastActivity.type]}
              </span>
              <span className="text-msk-ink/45">
                {" "}
                · {lastActivity.occurredAt.toLocaleString("fr-FR")}
                {" · "}
                {lastActivity.actor.firstName} {lastActivity.actor.lastName}
              </span>
            </p>
          ) : (
            <span className="text-msk-ink/40">—</span>
          )}
        </FlatMeta>

        {lastActivity ? (
          <FlatMeta label="Résumé">{lastActivity.summary}</FlatMeta>
        ) : null}

        {lastActivity?.body ? (
          <FlatMeta label="Commentaire détaillé">
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap pr-1 text-sm leading-relaxed text-msk-ink/80">
              {lastActivity.body}
            </p>
          </FlatMeta>
        ) : null}
      </div>

      <div className="mt-5 border-t border-msk-ink/6 pt-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <FlatMeta label="Prochaine action">{nextAction || "—"}</FlatMeta>
          <FlatMeta label="Prochaine relance">
            {followUpAt ? (
              <span
                className={cn(
                  followUpOverdue && "font-semibold text-msk-coral",
                )}
              >
                {followUpAt.toLocaleDateString("fr-FR")}
                {followUpOverdue ? " · En retard" : ""}
              </span>
            ) : (
              "—"
            )}
          </FlatMeta>
          {probability != null ? (
            <FlatMeta label="Probabilité">{probability} %</FlatMeta>
          ) : null}
          {expectedCloseAt ? (
            <FlatMeta label="Clôture prévue">
              {expectedCloseAt.toLocaleDateString("fr-FR")}
            </FlatMeta>
          ) : null}
        </dl>
      </div>

      <div className="mt-5 border-t border-msk-ink/6 pt-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-msk-ink/35">
          À traiter
        </p>
        {tasks.length > 0 ? (
          <ul className="divide-y divide-msk-ink/6">
            {tasks.map((t) => {
              const taskOverdue = t.dueAt < new Date();
              return (
                <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-msk-ink">
                        {t.title}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-xs",
                          taskOverdue
                            ? "font-medium text-msk-coral"
                            : "text-msk-ink/45",
                        )}
                      >
                        {t.dueAt.toLocaleDateString("fr-FR")}
                        {taskOverdue ? " · En retard" : ""}
                      </p>
                    </div>
                    {canMutate ? (
                      <RelanceActions
                        className="shrink-0"
                        taskId={t.id}
                        opportunityId={opportunityId}
                        requireFollowUp={requireFollowUp}
                        orgName={orgName}
                        title={t.title}
                        dueAt={t.dueAt}
                        showFicheLink={false}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-msk-ink/40">Aucune relance ouverte.</p>
        )}
      </div>
    </>
  );
}