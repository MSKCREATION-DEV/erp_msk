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
  /** Notes d’affectation / système figées — pas d’édition journal. */
  locked?: boolean;
};

const OWNER_UUID_IN_BODY =
  /Ancien suivi\s*:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

/** UUID d’ancien suivi encore stockés dans d’anciennes notes. */
export function collectOwnerIdsFromActivityBodies(
  bodies: (string | null | undefined)[],
): string[] {
  const ids = new Set<string>();
  for (const body of bodies) {
    if (!body) continue;
    for (const m of body.matchAll(OWNER_UUID_IN_BODY)) {
      ids.add(m[1]!);
    }
  }
  return [...ids];
}

/** Remplace `Ancien suivi : <uuid>` par le nom commercial. */
export function humanizeAssignmentBody(
  body: string | null,
  nameById: Map<string, string>,
): string | null {
  if (!body) return body;
  return body.replace(OWNER_UUID_IN_BODY, (_full, id: string) => {
    const name = nameById.get(id);
    return name ? `Ancien suivi : ${name}` : "Ancien suivi : (ancien commercial)";
  });
}

function isAssignmentTraceSummary(summary: string): boolean {
  const s = summary.toLowerCase();
  return (
    s.startsWith("suivi réassigné") ||
    s.startsWith("suivi confié") ||
    s.startsWith("demande d'affectation") ||
    s.startsWith("demande d’affectation")
  );
}

function classifyActivity(
  type: CrmActivityType,
  summary: string,
): TimelineEntryKind {
  const s = summary.toLowerCase();
  if (s.startsWith("prospect créé")) return "creation";
  if (type === "RDV") return "rdv";
  if (
    isAssignmentTraceSummary(summary) ||
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
  /** Noms pour humaniser d’anciens corps `Ancien suivi : <uuid>`. */
  ownerNameById?: Map<string, string>;
}): ProspectTimelineEntry[] {
  const nameById = opts.ownerNameById ?? new Map<string, string>();
  const hasCreation = opts.activities.some((a) =>
    a.summary.toLowerCase().startsWith("prospect créé"),
  );

  const entries: ProspectTimelineEntry[] = opts.activities.map((a) => ({
    id: a.id,
    summary: a.summary,
    body: humanizeAssignmentBody(a.body, nameById),
    typeLabel: ACTIVITY_LABELS[a.type] ?? a.type,
    occurredAt: a.occurredAt,
    actorName: `${a.actor.firstName} ${a.actor.lastName}`,
    kind: classifyActivity(a.type, a.summary),
    activityType: a.type,
    locked: isAssignmentTraceSummary(a.summary),
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
      locked: true,
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
