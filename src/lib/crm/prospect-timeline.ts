import type { CrmActivityType } from "@prisma/client";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";
import { isOutreachActivityType } from "@/lib/crm/follow-up-count";

export type TimelineEntryKind = "outreach" | "rdv" | "system" | "creation";

export type ProspectTimelineEntry = {
  id: string;
  summary: string;
  body: string | null;
  typeLabel: string;
  occurredAt: Date;
  actorName: string;
  kind: TimelineEntryKind;
  /** Présent si entrée = activité Prisma (modifiable / suppression). */
  activityType?: CrmActivityType;
};

function classifyActivity(
  type: CrmActivityType,
  summary: string,
): TimelineEntryKind {
  const s = summary.toLowerCase();
  if (s.startsWith("prospect créé")) return "creation";
  if (type === "RDV") return "rdv";
  if (
    s.startsWith("relance ") ||
    s.startsWith("statut :") ||
    s.startsWith("fiche mise") ||
    s.startsWith("passage en")
  ) {
    return "system";
  }
  if (type === "NOTE" || !isOutreachActivityType(type)) return "system";
  return "outreach";
}

export function buildProspectTimeline(opts: {
  activities: {
    id: string;
    type: CrmActivityType;
    summary: string;
    body: string | null;
    occurredAt: Date;
    actor: { firstName: string; lastName: string };
  }[];
  deal: {
    id: string;
    createdAt: Date;
    createdBy: { firstName: string; lastName: string };
  };
}): ProspectTimelineEntry[] {
  const hasCreation = opts.activities.some((a) =>
    a.summary.toLowerCase().startsWith("prospect créé"),
  );

  const entries: ProspectTimelineEntry[] = opts.activities.map((a) => ({
    id: a.id,
    summary: a.summary,
    body: a.body,
    typeLabel: ACTIVITY_LABELS[a.type] ?? a.type,
    occurredAt: a.occurredAt,
    actorName: `${a.actor.firstName} ${a.actor.lastName}`,
    kind: classifyActivity(a.type, a.summary),
    activityType: a.type,
  }));

  if (!hasCreation) {
    entries.push({
      id: `created-${opts.deal.id}`,
      summary: "Prospect créé",
      body: null,
      typeLabel: "Création",
      occurredAt: opts.deal.createdAt,
      actorName: `${opts.deal.createdBy.firstName} ${opts.deal.createdBy.lastName}`,
      kind: "creation",
    });
  }

  return entries.sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  );
}

export function timelineKindLabel(kind: TimelineEntryKind): string {
  switch (kind) {
    case "outreach":
      return "Relance";
    case "rdv":
      return "RDV";
    case "creation":
      return "Création";
    default:
      return "Système";
  }
}
